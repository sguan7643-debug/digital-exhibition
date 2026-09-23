import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const userId = String(process.env.FEISHU_VERIFY_AD_ACCOUNT || '').trim();
if (!userId) throw new Error('缺少 FEISHU_VERIFY_AD_ACCOUNT');

const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const service = createFeishuReadOnlyService({ client: createFeishuOpenApiClient(), identifierContract });
const context = { identity: { userId, adAccount: userId, openId: userId, tenantKey: 'configured-tenant' } };
const operations = [
  ['COM-001', {}, context],
  ['COM-002', { platform: 'WEB' }, context],
  ['COM-005', { dictTypes: ['APPLICATION_TYPE', 'BUSINESS_DOMAIN', 'SCENE', 'MATERIAL_CATEGORY'], includeDisabled: false }, context],
  ['WB-001', { hotLimit: 4, courseLimit: 3, noticeLimit: 4 }, context],
  ['WB-002', { page: 1, pageSize: 20 }, context]
];

const warmupStartedAt = performance.now();
await service.prewarm({ identities: [context] });
const warmupMs = performance.now() - warmupStartedAt;

function percentile(values, percentileValue) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * percentileValue) - 1);
  return sorted[index];
}

const results = [];
for (const [operationId, input, requestContext] of operations) {
  const samples = [];
  for (let offset = 0; offset < 32; offset += 8) {
    const batch = Array.from({ length: 8 }, async () => {
      const startedAt = performance.now();
      const result = await service.execute(operationId, input, requestContext);
      const elapsedMs = performance.now() - startedAt;
      if (result.code !== 'OK' || result.dataStale || result.cacheStatus !== 'fresh') {
        throw new Error(`${operationId} 未返回新鲜热态数据`);
      }
      return elapsedMs;
    });
    samples.push(...await Promise.all(batch));
  }
  const averageMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  results.push({
    operationId,
    samples: samples.length,
    averageMs: Number(averageMs.toFixed(2)),
    p95Ms: Number(percentile(samples, 0.95).toFixed(2)),
    maxMs: Number(Math.max(...samples).toFixed(2)),
    passed: percentile(samples, 0.95) <= 2_000
  });
}

const report = {
  verifiedAt: new Date().toISOString(),
  source: 'formal Feishu Bitable read-only',
  warmupMs: Number(warmupMs.toFixed(2)),
  concurrency: 8,
  results,
  passed: results.every(result => result.passed)
};
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
