import { createHash, timingSafeEqual } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { access, chmod, mkdir, open, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { REPRESENTATIVE_CACHE_OPERATION_IDS } from './feishu-read-cache-policies.mjs';

const SNAPSHOT_VERSION = 1;
const DEFAULT_DIRECTORY = '/home/seaoil/pre-demo/runtime-cache/';
const DEFAULT_MAX_DISK_BYTES = 3 * 1024 * 1024 * 1024;
const CAPACITY_PRUNE_RATIO = 0.8;
const CAPACITY_STOP_RATIO = 0.95;
const REPRESENTATIVE_OPERATION_IDS = new Set(REPRESENTATIVE_CACHE_OPERATION_IDS);
const FORBIDDEN_KEY = /(authorization|cookie|secret|password|credential|密钥|令牌|口令|密码|凭证)/i;

function finitePositive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function forbiddenKey(key) {
  const text = String(key || '');
  if (FORBIDDEN_KEY.test(text)) return true;
  const compact = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!compact.endsWith('token')) return false;
  return !['pagetoken', 'nextpagetoken'].includes(compact);
}

function sanitize(value, seen = new WeakSet(), forbiddenValues = []) {
  if (typeof value === 'string') return forbiddenValues.some(secret => value.includes(secret)) ? undefined : value;
  if (value == null || ['number', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'bigint') return String(value);
  if (typeof value !== 'object') return undefined;
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => sanitize(item, seen, forbiddenValues)).filter(item => item !== undefined);
  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenKey(key)) continue;
    const safe = sanitize(nested, seen, forbiddenValues);
    if (safe !== undefined) output[key] = safe;
  }
  return output;
}

function normalizeEntry(entry, now, forbiddenValues = []) {
  if (!entry || typeof entry !== 'object') return null;
  const key = String(entry.key || '');
  const operationId = String(entry.operationId || '');
  const freshUntil = Number(entry.freshUntil);
  const staleUntil = Number(entry.staleUntil);
  if (!key || !/^[A-Z]+-[0-9]{3}$/.test(operationId)) return null;
  if (!Number.isFinite(freshUntil) || !Number.isFinite(staleUntil) || staleUntil <= now) return null;
  const value = sanitize(entry.value, new WeakSet(), forbiddenValues);
  if (!value || typeof value !== 'object') return null;
  return {
    key,
    operationId,
    value,
    createdAt: Number(entry.createdAt) || now,
    lastAccessedAt: Number(entry.lastAccessedAt) || Number(entry.createdAt) || now,
    freshUntil,
    staleUntil,
    dependencies: [...new Set((Array.isArray(entry.dependencies) ? entry.dependencies : []).map(String).filter(Boolean))]
  };
}

function documentChecksum(document) {
  return createHash('sha256').update(JSON.stringify({
    version: document.version,
    namespace: document.namespace,
    writtenAt: document.writtenAt,
    entries: document.entries
  })).digest('hex');
}

function checksumMatches(document) {
  const expected = String(document?.checksum || '');
  if (!/^[a-f0-9]{64}$/.test(expected)) return false;
  const actual = documentChecksum(document);
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function assertCurrentProcessOwnership(info, target) {
  if (typeof process.getuid !== 'function' || typeof process.getgid !== 'function') return;
  if (info.uid === process.getuid() && info.gid === process.getgid()) return;
  throw Object.assign(new Error(`缓存路径 owner/group 与服务进程不一致：${target}`), { code: 'CACHE_OWNERSHIP_MISMATCH' });
}

export function snapshotNamespace({ appId = '', baseToken = '' } = {}) {
  return createHash('sha256').update(`${String(appId)}\u0000${String(baseToken)}`).digest('hex').slice(0, 32);
}

export function createPersistentReadCache(options = {}) {
  const enabled = options.enabled !== false;
  const directory = resolve(String(options.directory || DEFAULT_DIRECTORY));
  const filePath = join(directory, 'feishu-read-cache-v1.json');
  const namespace = String(options.namespace || 'default');
  const requiredOwner = String(options.requiredOwner || '').trim();
  const forbiddenValues = [...new Set((Array.isArray(options.forbiddenValues) ? options.forbiddenValues : [])
    .map(value => String(value || '')).filter(value => value.length >= 8))];
  const now = options.now || Date.now;
  const maxDiskBytes = Math.min(DEFAULT_MAX_DISK_BYTES, finitePositive(options.maxDiskBytes, DEFAULT_MAX_DISK_BYTES));
  const pruneAtBytes = Math.min(maxDiskBytes, finitePositive(options.pruneAtBytes, Math.floor(maxDiskBytes * CAPACITY_PRUNE_RATIO)));
  const stopAtBytes = Math.min(maxDiskBytes, Math.max(pruneAtBytes, finitePositive(options.stopAtBytes, Math.floor(maxDiskBytes * CAPACITY_STOP_RATIO))));
  // Atomic replacement temporarily keeps the old snapshot and the new temp file.
  // Capping one generation at half the directory budget keeps that overlap <= 3GB.
  const maxSnapshotBytes = Math.max(1, Math.floor(maxDiskBytes / 2));
  const debounceMs = Math.max(0, Number(options.debounceMs ?? 100));
  let timer = null;
  let writeChain = Promise.resolve();
  let pendingProvider = null;
  let lastError = null;
  let restoredEntries = 0;
  let writes = 0;
  let prunedEntries = 0;
  let suspendedWrites = 0;
  let discardedSnapshots = 0;
  let writeSuspended = false;
  let integrityFailures = 0;

  async function ensureDirectory() {
    if (!enabled) return;
    if (requiredOwner && userInfo().username !== requiredOwner) {
      throw Object.assign(new Error('缓存目录必须由专用服务账号管理'), { code: 'CACHE_RUNTIME_USER_MISMATCH' });
    }
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    assertCurrentProcessOwnership(await stat(directory), directory);
  }

  async function removeOrphanedTemporaryFiles() {
    if (!enabled) return;
    const prefix = `${filePath}.`;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const candidate = join(directory, entry.name);
      if (!entry.isFile() || !candidate.startsWith(prefix) || !entry.name.endsWith('.tmp')) continue;
      await rm(candidate, { force: true });
    }
  }

  async function directoryFileBytes() {
    let total = 0;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      total += (await stat(join(directory, entry.name))).size;
    }
    return total;
  }

  async function restore() {
    if (!enabled) return [];
    try {
      await ensureDirectory();
      await removeOrphanedTemporaryFiles();
      const info = await stat(filePath);
      if (!info.isFile() || info.size <= 0 || info.size > maxSnapshotBytes) return [];
      assertCurrentProcessOwnership(info, filePath);
      await chmod(filePath, 0o600);
      const document = JSON.parse(await readFile(filePath, 'utf8'));
      if (document?.version !== SNAPSHOT_VERSION || document?.namespace !== namespace || !Array.isArray(document.entries)) return [];
      if (!checksumMatches(document)) {
        integrityFailures += 1;
        lastError = 'CACHE_INTEGRITY_FAILED';
        return [];
      }
      const timestamp = now();
      const entries = document.entries.map(entry => normalizeEntry(entry, timestamp, forbiddenValues)).filter(Boolean);
      restoredEntries = entries.length;
      return entries;
    } catch (error) {
      if (error?.code !== 'ENOENT') lastError = String(error?.code || error?.message || 'SNAPSHOT_RESTORE_FAILED');
      return [];
    }
  }

  async function writeSnapshotUnchecked(entries) {
    if (!enabled) return;
    await ensureDirectory();
    await removeOrphanedTemporaryFiles();
    const normalized = (Array.isArray(entries) ? entries : [])
      .map(entry => normalizeEntry(entry, now(), forbiddenValues))
      .filter(Boolean)
      .sort((left, right) => Number(right.lastAccessedAt) - Number(left.lastAccessedAt));
    const document = {
      version: SNAPSHOT_VERSION,
      namespace,
      writtenAt: new Date(now()).toISOString(),
      entries: normalized
    };
    const serialize = () => {
      document.checksum = documentChecksum(document);
      return `${JSON.stringify(document)}\n`;
    };
    let payload = serialize();
    const currentDirectoryBytes = await directoryFileBytes();
    let projectedBytes = currentDirectoryBytes + Buffer.byteLength(payload, 'utf8');
    while ((Buffer.byteLength(payload, 'utf8') > maxSnapshotBytes || projectedBytes > pruneAtBytes) && document.entries.length) {
      let removeAt = -1;
      for (let index = document.entries.length - 1; index >= 0; index -= 1) {
        if (!REPRESENTATIVE_OPERATION_IDS.has(document.entries[index].operationId)) {
          removeAt = index;
          break;
        }
      }
      if (removeAt < 0) break;
      document.entries.splice(removeAt, 1);
      prunedEntries += 1;
      payload = serialize();
      projectedBytes = currentDirectoryBytes + Buffer.byteLength(payload, 'utf8');
    }
    if (Buffer.byteLength(payload, 'utf8') > maxSnapshotBytes || projectedBytes > stopAtBytes || projectedBytes > maxDiskBytes) {
      suspendedWrites += 1;
      writeSuspended = true;
      lastError = 'CACHE_CAPACITY_REVIEW_REQUIRED';
      return false;
    }
    const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      const handle = await open(temporary, 'wx', 0o600);
      try {
        await handle.writeFile(payload, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await chmod(temporary, 0o600);
      await rename(temporary, filePath);
      await chmod(filePath, 0o600);
      assertCurrentProcessOwnership(await stat(filePath), filePath);
      try {
        const directoryHandle = await open(directory, 'r');
        try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
      } catch {}
    } finally {
      await rm(temporary, { force: true }).catch(() => {});
    }
    writes += 1;
    writeSuspended = false;
    lastError = null;
    return Object.freeze({ written: true, keys: Object.freeze(document.entries.map(entry => entry.key)) });
  }

  async function writeSnapshot(entries) {
    try {
      return await writeSnapshotUnchecked(entries);
    } catch (error) {
      lastError = String(error?.code || error?.message || 'SNAPSHOT_WRITE_FAILED');
      throw error;
    }
  }

  function enqueue(provider) {
    if (!enabled || typeof provider !== 'function') return;
    pendingProvider = provider;
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      const current = pendingProvider;
      pendingProvider = null;
      writeChain = writeChain.then(() => writeSnapshot(current?.() || [])).catch(error => {
        lastError = String(error?.code || error?.message || 'SNAPSHOT_WRITE_FAILED');
        return false;
      });
    }, debounceMs);
    timer.unref?.();
  }

  async function flush(provider) {
    if (!enabled) return true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const current = provider || pendingProvider;
    pendingProvider = null;
    const settledWriteChain = writeChain.then(value => value, () => false);
    if (typeof current === 'function') {
      writeChain = settledWriteChain.then(() => writeSnapshot(current()));
      return await writeChain;
    }
    const priorResult = await settledWriteChain;
    return priorResult !== false;
  }

  async function clear() {
    if (!enabled) return;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingProvider = null;
    await writeChain;
    await rm(filePath, { force: true });
  }

  async function discardSnapshot() {
    if (!enabled) return Object.freeze({ discarded: false });
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingProvider = null;
    await writeChain.catch(() => false);
    try {
      await rm(filePath, { force: true });
      discardedSnapshots += 1;
      writeSuspended = true;
      lastError ||= 'CACHE_SNAPSHOT_DISCARDED';
      return Object.freeze({ discarded: true });
    } catch (error) {
      lastError = String(error?.code || error?.message || 'CACHE_SNAPSHOT_DISCARD_FAILED');
      throw error;
    }
  }

  async function checkHealth() {
    if (!enabled) return Object.freeze({ ...metrics(), healthy: true });
    try {
      await ensureDirectory();
      await access(directory, fsConstants.R_OK | fsConstants.W_OK | fsConstants.X_OK);
      try {
        const snapshotInfo = await stat(filePath);
        if (!snapshotInfo.isFile()) throw Object.assign(new Error('缓存快照路径不是普通文件'), { code: 'CACHE_SNAPSHOT_PATH_INVALID' });
        assertCurrentProcessOwnership(snapshotInfo, filePath);
        if ((snapshotInfo.mode & 0o777) !== 0o600) await chmod(filePath, 0o600);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      const currentDirectoryBytes = await directoryFileBytes();
      if (currentDirectoryBytes >= stopAtBytes || currentDirectoryBytes > maxDiskBytes) {
        writeSuspended = true;
        lastError = 'CACHE_CAPACITY_REVIEW_REQUIRED';
      }
      const requiresSnapshotRecovery = ['CACHE_CAPACITY_REVIEW_REQUIRED', 'CACHE_INTEGRITY_FAILED'].includes(String(lastError || ''));
      if (lastError && !requiresSnapshotRecovery) {
        const probe = `${filePath}.${process.pid}.${Date.now()}.health.tmp`;
        try {
          const handle = await open(probe, 'wx', 0o600);
          try {
            await handle.writeFile('health\n', 'utf8');
            await handle.sync();
          } finally {
            await handle.close();
          }
          await chmod(probe, 0o600);
          assertCurrentProcessOwnership(await stat(probe), probe);
          lastError = null;
          writeSuspended = false;
        } finally {
          await rm(probe, { force: true }).catch(() => {});
        }
      }
    } catch (error) {
      lastError = String(error?.code || error?.message || 'CACHE_HEALTH_CHECK_FAILED');
    }
    const current = metrics();
    return Object.freeze({ ...current, healthy: !current.lastError && !current.writeSuspended });
  }

  function metrics() {
    return Object.freeze({
      enabled, directory, filePath, maxDiskBytes, maxSnapshotBytes, pruneAtBytes, stopAtBytes,
      requiredOwner, restoredEntries, writes, prunedEntries, suspendedWrites, discardedSnapshots,
      writeSuspended, integrityFailures, lastError
    });
  }

  return Object.freeze({ restore, enqueue, flush, clear, discardSnapshot, metrics, checkHealth });
}
