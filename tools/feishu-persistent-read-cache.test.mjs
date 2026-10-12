import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPersistentReadCache } from '../server/feishu-persistent-read-cache.mjs';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';

const temporaryRoot = await mkdtemp(join(tmpdir(), 'deh-persistent-cache-'));
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const identifierContract = loadFeishuIdentifierContract(join(sourceRoot, 'server', 'contracts', 'feishu-base-identifiers.json'));
let clock = Date.parse('2026-10-08T08:00:00.000Z');

try {
  const ownershipStore = createPersistentReadCache({
    enabled: true,
    directory: join(temporaryRoot, 'wrong-owner'),
    namespace: 'owner-test',
    requiredOwner: '__not_the_current_service_user__',
    now: () => clock
  });
  assert.deepEqual(await ownershipStore.restore(), [], '运行账号不匹配时不得启用持久快照');
  assert.equal(ownershipStore.metrics().lastError, 'CACHE_RUNTIME_USER_MISMATCH');

  const sensitiveDirectory = join(temporaryRoot, 'sensitive');
  const sensitiveStore = createPersistentReadCache({
    enabled: true,
    directory: sensitiveDirectory,
    namespace: 'tenant-fingerprint',
    forbiddenValues: ['EXACT_RUNTIME_SECRET'],
    now: () => clock,
    debounceMs: 0
  });
  await sensitiveStore.flush(() => [{
    key: 'COM-005\u0000scope', operationId: 'COM-005', createdAt: clock,
    freshUntil: clock + 60_000, staleUntil: clock + 900_000,
    dependencies: ['应用类型配置'],
    value: {
      code: 'OK', data: {
        safe: 'business-data', nextPageToken: 'PAGE_CURSOR', tenantAccessToken: 'SECRET_VALUE', fileToken: 'FILE_TOKEN_VALUE',
        cookie: 'COOKIE_VALUE', '应用密钥': 'CHINESE_SECRET', genericValue: 'prefix-EXACT_RUNTIME_SECRET-suffix',
        attachmentBody: Buffer.from('BINARY_VALUE')
      }
    }
  }]);
  const sensitivePath = join(sensitiveDirectory, 'feishu-read-cache-v1.json');
  const snapshotText = await readFile(sensitivePath, 'utf8');
  assert.match(snapshotText, /business-data/);
  assert.match(snapshotText, /PAGE_CURSOR|nextPageToken/);
  assert.doesNotMatch(snapshotText, /SECRET_VALUE|FILE_TOKEN_VALUE|COOKIE_VALUE|CHINESE_SECRET|EXACT_RUNTIME_SECRET|BINARY_VALUE|tenantAccessToken|fileToken|cookie|应用密钥/);
  assert.ok(sensitiveStore.metrics().maxSnapshotBytes * 2 <= sensitiveStore.metrics().maxDiskBytes);
  const orphanedTemp = `${sensitivePath}.orphan.tmp`;
  await writeFile(orphanedTemp, 'partial snapshot', 'utf8');
  await createPersistentReadCache({ enabled: true, directory: sensitiveDirectory, namespace: 'tenant-fingerprint', now: () => clock }).restore();
  await assert.rejects(() => stat(orphanedTemp), error => error.code === 'ENOENT');
  if (process.platform !== 'win32') {
    assert.equal((await stat(sensitiveDirectory)).mode & 0o777, 0o700);
    assert.equal((await stat(sensitivePath)).mode & 0o777, 0o600);
  }
  await writeFile(sensitivePath, snapshotText.replace('business-data', 'tampered-data'), 'utf8');
  const tamperedStore = createPersistentReadCache({ enabled: true, directory: sensitiveDirectory, namespace: 'tenant-fingerprint', now: () => clock });
  assert.deepEqual(await tamperedStore.restore(), [], '完整性校验失败的快照不得恢复');
  assert.equal(tamperedStore.metrics().lastError, 'CACHE_INTEGRITY_FAILED');

  const capacityDirectory = join(temporaryRoot, 'capacity');
  const capacityStore = createPersistentReadCache({
    enabled: true,
    directory: capacityDirectory,
    namespace: 'capacity-test',
    now: () => clock,
    maxDiskBytes: 4_096,
    pruneAtBytes: 2_200,
    stopAtBytes: 3_800,
    debounceMs: 0
  });
  const capacityEntry = (operationId, suffix, size) => ({
    key: `${operationId}\u0000${suffix}`, operationId, createdAt: clock,
    freshUntil: clock + 60_000, staleUntil: clock + 900_000,
    dependencies: ['应用索引'], value: { code: 'OK', data: { payload: suffix.repeat(size) } }
  });
  await capacityStore.flush(() => [
    capacityEntry('COM-005', 'r', 700),
    capacityEntry('ANN-002', 'a', 700),
    capacityEntry('TRN-001', 'b', 700)
  ]);
  const capacityDocument = JSON.parse(await readFile(join(capacityDirectory, 'feishu-read-cache-v1.json'), 'utf8'));
  assert.ok(capacityDocument.entries.some(entry => entry.operationId === 'COM-005'), '容量降级不得优先淘汰代表 operation');
  assert.ok(capacityDocument.entries.length < 3, '达到 2.4GB 等比例阈值时应先淘汰非代表性 LRU 项');
  assert.ok(capacityStore.metrics().prunedEntries > 0);

  const generationCapacityDirectory = join(temporaryRoot, 'generation-capacity');
  const generationCapacityStore = createPersistentReadCache({
    enabled: true,
    directory: generationCapacityDirectory,
    namespace: 'generation-capacity-test',
    now: () => clock,
    maxDiskBytes: 4_096,
    pruneAtBytes: 2_000,
    stopAtBytes: 3_800,
    debounceMs: 0
  });
  const committedGeneration = { ...capacityEntry('ANN-002', 'old', 300), key: 'ANN-002\u0000same-key', committed: true };
  const candidateGeneration = { ...capacityEntry('ANN-002', 'new', 300), key: 'ANN-002\u0000same-key', committed: false };
  const generationWrite = await generationCapacityStore.flush(() => [committedGeneration, candidateGeneration]);
  assert.ok(generationWrite.committedKeys.includes(committedGeneration.key), '容量压力下必须保留旧 committed generation');
  assert.ok(!generationWrite.candidateKeys.includes(candidateGeneration.key), '容量压力下必须先裁剪未提交 candidate');
  const generationRestore = await createPersistentReadCache({
    enabled: true,
    directory: generationCapacityDirectory,
    namespace: 'generation-capacity-test',
    now: () => clock,
    debounceMs: 0
  }).restore();
  assert.equal(generationRestore.length, 1);
  assert.equal(generationRestore[0].value.data.payload.startsWith('old'), true, '重启只能恢复旧 committed generation');

  const homepageCapacityDirectory = join(temporaryRoot, 'homepage-capacity');
  const homepageCapacityStore = createPersistentReadCache({
    enabled: true,
    directory: homepageCapacityDirectory,
    namespace: 'homepage-capacity-test',
    now: () => clock,
    maxDiskBytes: 8_192,
    pruneAtBytes: 3_000,
    stopAtBytes: 7_500,
    debounceMs: 0
  });
  await homepageCapacityStore.flush(() => [
    capacityEntry('WB-001', 'w', 700),
    capacityEntry('WB-002', 's', 700),
    capacityEntry('ANN-002', 'a', 700),
    capacityEntry('TRN-001', 't', 700)
  ]);
  const homepageCapacityDocument = JSON.parse(await readFile(join(homepageCapacityDirectory, 'feishu-read-cache-v1.json'), 'utf8'));
  assert.ok(homepageCapacityDocument.entries.some(entry => entry.operationId === 'WB-001'), '容量降级必须保留首页 WB-001 快照');
  assert.ok(homepageCapacityDocument.entries.some(entry => entry.operationId === 'WB-002'), '容量降级必须保留首页 WB-002 快照');
  assert.ok(homepageCapacityDocument.entries.length < 4, '容量降级应先淘汰非首页依赖项');

  const suspendedDirectory = join(temporaryRoot, 'capacity-suspended');
  const suspendedStore = createPersistentReadCache({
    enabled: true,
    directory: suspendedDirectory,
    namespace: 'capacity-suspended',
    now: () => clock,
    maxDiskBytes: 4_096,
    pruneAtBytes: 2_200,
    stopAtBytes: 3_800,
    debounceMs: 0
  });
  await suspendedStore.flush(() => [capacityEntry('COM-005', 'x', 5_000)]);
  assert.equal(suspendedStore.metrics().lastError, 'CACHE_CAPACITY_REVIEW_REQUIRED');
  assert.equal(suspendedStore.metrics().suspendedWrites, 1, '代表数据无法完整容纳时应停止快照而不是删字段');
  assert.equal(suspendedStore.metrics().writeSuspended, true);
  assert.equal((await suspendedStore.checkHealth()).healthy, false, '容量暂停必须持续报告缓存运行不健康');
  await assert.rejects(() => stat(join(suspendedDirectory, 'feishu-read-cache-v1.json')), error => error.code === 'ENOENT');

  const invalidationDirectory = join(temporaryRoot, 'write-invalidation');
  const invalidationStore = createPersistentReadCache({
    enabled: true,
    directory: invalidationDirectory,
    namespace: 'write-invalidation',
    now: () => clock,
    maxDiskBytes: 4_096,
    pruneAtBytes: 2_200,
    stopAtBytes: 3_800,
    debounceMs: 0
  });
  await invalidationStore.flush(() => [capacityEntry('COM-005', 'old', 300)]);
  await writeFile(join(invalidationDirectory, 'capacity-filler.bin'), Buffer.alloc(3_600));
  assert.equal(await invalidationStore.flush(() => []), false, '容量故障应拒绝覆盖旧快照');
  await invalidationStore.discardSnapshot();
  const restartedInvalidationStore = createPersistentReadCache({
    enabled: true,
    directory: invalidationDirectory,
    namespace: 'write-invalidation',
    now: () => clock,
    maxDiskBytes: 4_096,
    pruneAtBytes: 2_200,
    stopAtBytes: 3_800,
    debounceMs: 0
  });
  assert.deepEqual(await restartedInvalidationStore.restore(), [], '写后失效提交失败时旧快照必须被隔离，重启不得复活旧数据');

  const runtimeFailureDirectory = join(temporaryRoot, 'runtime-failure');
  const runtimeFailureStore = createPersistentReadCache({
    enabled: true,
    directory: runtimeFailureDirectory,
    namespace: 'runtime-failure',
    now: () => clock,
    debounceMs: 0
  });
  const runtimeEntries = () => [capacityEntry('COM-005', 'healthy', 10)];
  await runtimeFailureStore.flush(runtimeEntries);
  assert.equal((await runtimeFailureStore.checkHealth()).healthy, true);
  await rm(runtimeFailureDirectory, { recursive: true, force: true });
  await writeFile(runtimeFailureDirectory, 'path blocker', 'utf8');
  const failedRuntimeHealth = await runtimeFailureStore.checkHealth();
  assert.equal(failedRuntimeHealth.healthy, false, 'ready 后缓存路径损坏必须被实时健康检查发现');
  assert.ok(failedRuntimeHealth.lastError);
  await assert.rejects(
    () => runtimeFailureStore.flush(runtimeEntries),
    '运行期快照写入失败必须显式拒绝，不能把任务标记为 completed'
  );
  await rm(runtimeFailureDirectory, { force: true });
  await runtimeFailureStore.flush(runtimeEntries);
  assert.equal((await runtimeFailureStore.checkHealth()).healthy, true, '成功重写快照后才允许恢复健康');

  const integratedDirectory = join(temporaryRoot, 'integrated');
  const input = { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false };
  const tenantA = { identity: { tenantKey: 'tenant-a', userId: 'user-a', permissions: ['read'] } };
  const tenantB = { identity: { tenantKey: 'tenant-b', userId: 'user-b', permissions: ['read'] } };
  let firstUpstreamCalls = 0;
  const firstStore = createPersistentReadCache({ enabled: true, directory: integratedDirectory, namespace: 'base-a', now: () => clock, debounceMs: 0 });
  const firstService = createFeishuReadOnlyService({
    identifierContract, persistentCache: firstStore, cacheNow: () => clock, now: () => new Date(clock), realtimeAuthorization: false,
    client: { async listRecords() { firstUpstreamCalls += 1; return { items: [], total: 0, hasMore: false, nextPageToken: '' }; } }
  });
  const first = await firstService.execute('COM-005', input, tenantA);
  assert.equal(first.code, 'OK');
  assert.ok(firstUpstreamCalls > 0);
  await firstService.flushPersistentCache();
  firstService.close();

  let restoredUpstreamCalls = 0;
  const restoredStore = createPersistentReadCache({ enabled: true, directory: integratedDirectory, namespace: 'base-a', now: () => clock, debounceMs: 0 });
  const restoredService = createFeishuReadOnlyService({
    identifierContract, persistentCache: restoredStore, cacheNow: () => clock, now: () => new Date(clock), realtimeAuthorization: false,
    client: { async listRecords() { restoredUpstreamCalls += 1; throw Object.assign(new Error('upstream unavailable'), { code: 'UPSTREAM_DOWN', status: 503 }); } }
  });
  const restored = await restoredService.execute('COM-005', input, tenantA);
  assert.equal(restored.cacheStatus, 'fresh');
  assert.equal(restoredUpstreamCalls, 0, '进程重启后应从持久快照恢复且不回源');
  const restoredStartup = await restoredService.getStartupCacheState();
  assert.equal(restoredStartup.completed, true, 'readiness 前必须完成持久快照恢复');
  assert.ok(restoredStartup.restoredEntries >= 1 && restoredStartup.usableEntries >= 1, '恢复完成后必须存在可实际命中的缓存项');
  await assert.rejects(() => restoredService.execute('COM-005', input, tenantB), error => error.code === 'UPSTREAM_DOWN');
  assert.ok(restoredUpstreamCalls > 0, '不同租户不得复用已恢复的缓存');
  restoredService.close();

  const prewarmRestartDirectory = join(temporaryRoot, 'prewarm-restart');
  const prewarmStore = createPersistentReadCache({ enabled: true, directory: prewarmRestartDirectory, namespace: 'base-prewarm', now: () => clock, debounceMs: 0 });
  const prewarmSourceService = createFeishuReadOnlyService({
    identifierContract, persistentCache: prewarmStore, cacheNow: () => clock, now: () => new Date(clock), realtimeAuthorization: false,
    client: { async listRecords() { return { items: [], total: 0, hasMore: false, nextPageToken: '' }; } }
  });
  await prewarmSourceService.prewarm();
  prewarmSourceService.close();
  let restartPrewarmReads = 0;
  const restartPrewarmService = createFeishuReadOnlyService({
    identifierContract,
    persistentCache: createPersistentReadCache({ enabled: true, directory: prewarmRestartDirectory, namespace: 'base-prewarm', now: () => clock, debounceMs: 0 }),
    cacheNow: () => clock,
    now: () => new Date(clock),
    realtimeAuthorization: false,
    client: { async listRecords() { restartPrewarmReads += 1; throw Object.assign(new Error('upstream unavailable'), { code: 'UPSTREAM_DOWN', status: 503 }); } }
  });
  const restartPrewarm = await restartPrewarmService.prewarm();
  assert.equal(restartPrewarm.source, 'persistent-snapshot');
  assert.deepEqual(restartPrewarm.verifiedHits.sort(), ['COM-005', 'WB-002']);
  assert.equal(restartPrewarmReads, 0, '服务重启后 readiness 预热必须先实际命中持久快照，不得让全部普通读取重新冷启动');
  restartPrewarmService.close();

  const dependencyCalls = new Map();
  const dependencyService = createFeishuReadOnlyService({
    identifierContract, cacheNow: () => clock, now: () => new Date(clock), realtimeAuthorization: false,
    client: {
      async listRecords(tableId) {
        const tableName = [...identifierContract.byName.values()].find(table => table.tableId === tableId)?.name || tableId;
        dependencyCalls.set(tableName, (dependencyCalls.get(tableName) || 0) + 1);
        return { items: [], total: 0, hasMore: false, nextPageToken: '' };
      }
    }
  });
  await dependencyService.execute('ANN-002', { page: 1, pageSize: 10 }, tenantA);
  await dependencyService.execute('TAL-002', { page: 1, pageSize: 10 }, tenantA);
  const beforeTalent = [...dependencyCalls.values()].reduce((sum, value) => sum + value, 0);
  dependencyService.invalidateTables(['公告通知']);
  await dependencyService.execute('TAL-002', { page: 1, pageSize: 10 }, tenantA);
  assert.equal([...dependencyCalls.values()].reduce((sum, value) => sum + value, 0), beforeTalent, '无关 operation 缓存必须保留');
  await dependencyService.execute('ANN-002', { page: 1, pageSize: 10 }, tenantA);
  assert.ok([...dependencyCalls.values()].reduce((sum, value) => sum + value, 0) > beforeTalent, '写后应只失效依赖目标表的缓存');
  dependencyService.close();

  let releaseInflight;
  let announceStarted;
  const inflightStarted = new Promise(resolve => { announceStarted = resolve; });
  const inflightGate = new Promise(resolve => { releaseInflight = resolve; });
  let inflightAnnouncementCalls = 0;
  const inflightService = createFeishuReadOnlyService({
    identifierContract,
    realtimeAuthorization: false,
    client: {
      async listRecords(tableId) {
        const tableName = [...identifierContract.byName.values()].find(table => table.tableId === tableId)?.name || tableId;
        if (tableName === '公告通知') {
          inflightAnnouncementCalls += 1;
          if (inflightAnnouncementCalls === 1) {
            announceStarted();
            await inflightGate;
          }
        }
        return { items: [], total: 0, hasMore: false, nextPageToken: '' };
      }
    }
  });
  const inflightRead = inflightService.execute('ANN-002', { page: 1, pageSize: 10 }, tenantA);
  await inflightStarted;
  inflightService.invalidateTables(['公告通知']);
  releaseInflight();
  await inflightRead;
  const callsAfterInflight = inflightAnnouncementCalls;
  assert.ok(callsAfterInflight >= 2, '写入失效必须使在途旧读取在任务内重新读取后才能提交缓存');
  await inflightService.execute('ANN-002', { page: 1, pageSize: 10 }, tenantA);
  assert.equal(inflightAnnouncementCalls, callsAfterInflight, '重新读取并提交的新结果必须可由后续相同请求直接命中');
  inflightService.close();
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

console.log('persistent snapshot restore, secret/binary exclusion, tenant isolation, and precise invalidation passed');
