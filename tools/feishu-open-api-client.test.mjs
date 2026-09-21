import assert from 'node:assert/strict';
import * as openApiClientModule from '../server/feishu-open-api-client.mjs';

const { createFeishuOpenApiClient } = openApiClientModule;

assert.equal(
  openApiClientModule.resolveFeishuUpstreamTimeoutMs?.(20_000),
  8_000,
  'an oversized Feishu upstream timeout must be capped at the approved 8-second deadline'
);
assert.equal(
  openApiClientModule.resolveFeishuUpstreamTimeoutMs?.(undefined),
  8_000,
  'the Feishu upstream timeout must default to the approved 8-second deadline'
);

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

// This fails if the upstream wrapper stops enforcing its supplied deadline.
const delayedFetch = (_url, options = {}) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    resolve(Response.json({ code: 0, tenant_access_token: 'delayed-token', expire: 7200 }));
  }, 50);
  options.signal?.addEventListener('abort', () => {
    clearTimeout(timer);
    reject(options.signal.reason);
  }, { once: true });
});

const timeoutClient = createFeishuOpenApiClient({
  appId: 'id', appSecret: 'secret', baseToken: 'base', fetchImpl: delayedFetch, upstreamTimeoutMs: 25
});
await assert.rejects(
  () => timeoutClient.listRecords('tblValid', { pageSize: 10 }),
  error => {
    assert.equal(error.code, 'FEISHU_UPSTREAM_TIMEOUT');
    assert.equal(error.status, 504);
    assert.equal(error.upstreamPath, '/auth/v3/tenant_access_token/internal');
    assert.equal(typeof error.elapsedMs, 'number');
    assert.ok(error.elapsedMs >= 0);
    assert.doesNotMatch(JSON.stringify(error), /id|secret|base|delayed-token/i);
    return true;
  }
);

let tenantTokenCalls = 0;
const singleFlightClient = createFeishuOpenApiClient({
  appId: 'id', appSecret: 'secret', baseToken: 'base',
  fetchImpl: async url => {
    if (String(url).endsWith('/auth/v3/tenant_access_token/internal')) {
      tenantTokenCalls += 1;
      await sleep(10);
      return Response.json({ code: 0, tenant_access_token: 'tenant-token', expire: 7200 });
    }
    return Response.json({ code: 0, data: { items: [], total: 0, has_more: false } });
  }
});
await Promise.all([
  singleFlightClient.listRecords('tblValid', { pageSize: 10 }),
  singleFlightClient.listRecords('tblOther', { pageSize: 10 })
]);
assert.equal(tenantTokenCalls, 1, 'concurrent cold reads must share one tenant-token request');

let diagnosticCalls = 0;
const diagnosticClient = createFeishuOpenApiClient({
  appId: 'id', appSecret: 'secret', baseToken: 'base',
  fetchImpl: async () => {
    diagnosticCalls += 1;
    return diagnosticCalls === 1
      ? Response.json({ code: 0, tenant_access_token: 'tenant-token', expire: 7200 })
      : Response.json({ code: 1254045, msg: 'FieldNameNotFound' }, { status: 400 });
  }
});
await assert.rejects(
  () => diagnosticClient.listRecords('tblValid', { pageSize: 10, fieldNames: ['missing-field'] }),
  error => error.code === 'FEISHU_RECORDS_FAILED'
    && error.upstreamCode === 1254045
    && error.upstreamMessage === 'FieldNameNotFound'
    && error.upstreamPath === '/bitable/v1/apps/{base}/tables/{tableId}/records'
);

const proxyDispatcher = { dispatch() {} };
let proxiedRequests = 0;
const proxyAwareClient = createFeishuOpenApiClient({
  appId: 'id', appSecret: 'secret', baseToken: 'base', proxyDispatcher,
  fetchImpl: async (_url, options = {}) => {
    assert.equal(options.dispatcher, proxyDispatcher, 'every Feishu client request must preserve the server proxy dispatcher');
    proxiedRequests += 1;
    return proxiedRequests === 1
      ? Response.json({ code: 0, tenant_access_token: 'tenant-token', expire: 7200 })
      : Response.json({ code: 0, data: { items: [], total: 0, has_more: false } });
  }
});
await proxyAwareClient.listRecords('tblProxy', { pageSize: 10 });
assert.equal(proxiedRequests, 2);

let activeLimitedRequests = 0;
let maxLimitedRequests = 0;
const limitedClient = createFeishuOpenApiClient({
  appId: 'id', appSecret: 'secret', baseToken: 'base', maxConcurrentRequests: 2,
  fetchImpl: async url => {
    if (String(url).endsWith('/auth/v3/tenant_access_token/internal')) {
      return Response.json({ code: 0, tenant_access_token: 'tenant-token', expire: 7200 });
    }
    activeLimitedRequests += 1;
    maxLimitedRequests = Math.max(maxLimitedRequests, activeLimitedRequests);
    await sleep(15);
    activeLimitedRequests -= 1;
    return Response.json({ code: 0, data: { items: [], total: 0, has_more: false } });
  }
});
await Promise.all(['tblL001', 'tblL002', 'tblL003', 'tblL004'].map(tableId => limitedClient.listRecords(tableId, { pageSize: 10 })));
assert.equal(maxLimitedRequests, 2, 'the Feishu client must cap concurrent upstream record requests');

let activeDefaultRequests = 0;
let maxDefaultRequests = 0;
const defaultConcurrencyClient = createFeishuOpenApiClient({
  appId: 'id', appSecret: 'secret', baseToken: 'base',
  fetchImpl: async url => {
    if (String(url).endsWith('/auth/v3/tenant_access_token/internal')) {
      return Response.json({ code: 0, tenant_access_token: 'tenant-token', expire: 7200 });
    }
    activeDefaultRequests += 1;
    maxDefaultRequests = Math.max(maxDefaultRequests, activeDefaultRequests);
    await sleep(15);
    activeDefaultRequests -= 1;
    return Response.json({ code: 0, data: { items: [], total: 0, has_more: false } });
  }
});
await Promise.all(Array.from({ length: 9 }, (_, index) => defaultConcurrencyClient.listRecords(`tblD00${index}`, { pageSize: 10 })));
assert.equal(maxDefaultRequests, 8, 'the default limiter must use the approved safe ceiling for first-screen fan-out');

const approvalInstanceId = 'INSTANCE_SENSITIVE_001';
const approvalTimeoutClient = createFeishuOpenApiClient({
  appId: 'id', appSecret: 'secret', baseToken: 'base', upstreamTimeoutMs: 25,
  fetchImpl: (url, options = {}) => {
    if (String(url).endsWith('/auth/v3/tenant_access_token/internal')) {
      return Promise.resolve(Response.json({ code: 0, tenant_access_token: 'tenant-token', expire: 7200 }));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(Response.json({ code: 0, data: {} })), 50);
      options.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(options.signal.reason);
      }, { once: true });
    });
  }
});
await assert.rejects(
  () => approvalTimeoutClient.getApprovalInstance(approvalInstanceId),
  error => {
    assert.equal(error.code, 'FEISHU_UPSTREAM_TIMEOUT');
    assert.equal(error.upstreamPath, '/approval/v4/instances/{instanceCode}');
    assert.doesNotMatch(JSON.stringify(error), new RegExp(approvalInstanceId));
    return true;
  }
);

console.log('Feishu upstream deadline and tenant-token single-flight passed');
