import { createHash, timingSafeEqual } from 'node:crypto';
import { chmod, open, readFile, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_FILE = '/home/seaoil/pre-demo/runtime-cache/feishu-read-cache-v1.json';
const DEFAULT_OPERATIONS = Object.freeze(['COM-001', 'COM-004', 'APP-001', 'APP-002', 'HOM-001', 'WB-002']);

function checksum(document) {
  return createHash('sha256').update(JSON.stringify({
    version: document.version,
    namespace: document.namespace,
    writtenAt: document.writtenAt,
    entries: document.entries
  })).digest('hex');
}

function assertValidSnapshot(document) {
  if (!document || !Array.isArray(document.entries)) throw new Error('CACHE_SNAPSHOT_INVALID');
  const expected = String(document.checksum || '');
  const actual = checksum(document);
  if (!/^[a-f0-9]{64}$/.test(expected)
      || !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'))) {
    throw new Error('CACHE_INTEGRITY_FAILED');
  }
}

export async function clearReadCacheOperations({
  filePath = DEFAULT_FILE,
  operationIds = DEFAULT_OPERATIONS,
  now = () => new Date()
} = {}) {
  const target = resolve(String(filePath));
  const selected = new Set(operationIds.map(String).filter(Boolean));
  let document;
  try {
    document = JSON.parse(await readFile(target, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return Object.freeze({ filePath: target, removed: 0, remaining: 0, missing: true });
    throw error;
  }
  assertValidSnapshot(document);
  const previousCount = document.entries.length;
  document.entries = document.entries.filter(entry => !selected.has(String(entry?.operationId || '')));
  document.writtenAt = now().toISOString();
  document.checksum = checksum(document);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    const handle = await open(temporary, 'wx', 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(document)}\n`, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await chmod(temporary, 0o600);
    await rename(temporary, target);
    await chmod(target, 0o600);
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
  return Object.freeze({
    filePath: target,
    removed: previousCount - document.entries.length,
    remaining: document.entries.length,
    missing: false
  });
}

function argumentValue(name) {
  const prefix = `${name}=`;
  return process.argv.slice(2).find(value => value.startsWith(prefix))?.slice(prefix.length);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const filePath = argumentValue('--file') || process.env.FEISHU_READ_CACHE_FILE || DEFAULT_FILE;
  const operationIds = (argumentValue('--operations') || DEFAULT_OPERATIONS.join(','))
    .split(',').map(value => value.trim()).filter(Boolean);
  try {
    const result = await clearReadCacheOperations({ filePath, operationIds });
    process.stdout.write(`READ_CACHE_CLEANED=${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`READ_CACHE_CLEAN_FAILED=${String(error?.message || error)}\n`);
    process.exitCode = 1;
  }
}
