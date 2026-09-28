import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFeishuOpenApiClient } from '../server/feishu-open-api-client.mjs';
import { createFeishuOnboardingPocOrchestrator } from '../server/feishu-onboarding-poc-orchestrator.mjs';

const baseToken = 'poc-base-token';
const expectedFingerprint = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(baseToken)).then(buffer => Buffer.from(buffer).toString('hex'));
const session = { identity: { userId: 'u_test', openId: 'ou_test' }, accessToken: 'user-access-token' };

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function clientFor(mode, calls) {
  return createFeishuOpenApiClient({
    appId: 'app-id', appSecret: 'app-secret', baseToken,
    async fetchImpl(url, init = {}) {
      const pathname = new URL(String(url)).pathname;
      calls.push([init.method || 'GET', pathname]);
      if (pathname.endsWith('/authen/v1/user_info')) {
        if (mode === 'fake-token') return json(401, { code: 99991663, msg: 'invalid token' });
        if (mode === 'missing-user') return json(200, { code: 0, data: { user_id: 'u_someone_else', open_id: 'ou_someone_else' } });
        return json(200, { code: 0, data: { user_id: 'u_test', open_id: 'ou_test', name: 'POC User' } });
      }
      if (pathname.endsWith('/auth/v3/tenant_access_token/internal')) return json(200, { code: 0, tenant_access_token: 'tenant-token', expire: 7200 });
      if (pathname.includes('/contact/v3/users/')) {
        if (mode === 'permission-denied') return json(403, { code: 99991672, msg: 'forbidden' });
        return json(200, { code: 0, data: { user: { user_id: 'u_test', open_id: 'ou_test', status: { is_activated: mode !== 'unavailable', is_frozen: false, is_resigned: false } } } });
      }
      throw new Error(`unexpected read-only preflight URL: ${pathname}`);
    }
  });
}

for (const [mode, expectedCode] of [
  ['fake-token', 'POC_IDENTITY_PREFLIGHT_FAILED'],
  ['missing-user', 'POC_IDENTITY_MISMATCH'],
  ['permission-denied', 'POC_APPROVER_CAPABILITY_FORBIDDEN'],
  ['unavailable', 'POC_APPROVER_UNAVAILABLE']
]) {
  const calls = [];
  const writes = { schema: 0, record: 0, media: 0, approval: 0 };
  const adminClient = {
    schemaWriteEnabled: true,
    async listTables() { return []; },
    async listFields() { return []; },
    async createTable() { writes.schema += 1; },
    async createField() { writes.schema += 1; },
    async createRecord() { writes.record += 1; },
    async uploadMedia() { writes.media += 1; },
    async createApprovalInstance() { writes.approval += 1; }
  };
  const dir = mkdtempSync(join(tmpdir(), `onboarding-preflight-${mode}-`));
  try {
    const orchestrator = createFeishuOnboardingPocOrchestrator({
      adminClient,
      identityClient: clientFor(mode, calls),
      baseToken,
      expectedFingerprint,
      ledgerFile: join(dir, 'ledger.json')
    });
    await assert.rejects(() => orchestrator.execute({ session }), error => error?.code === expectedCode, `${mode} must fail closed during read-only preflight`);
    assert.deepEqual(writes, { schema: 0, record: 0, media: 0, approval: 0 }, `${mode} must produce zero writes`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const successCalls = [];
const successClient = clientFor('success', successCalls);
const actor = await successClient.preflightOnboardingPocActor({ session });
assert.deepEqual({ userId: actor.userId, openId: actor.openId, active: actor.active }, { userId: 'u_test', openId: 'ou_test', active: true });
assert.deepEqual(successCalls.filter(([method, pathname]) => pathname.includes('/authen/') || pathname.includes('/contact/')).map(([method]) => method), ['GET', 'GET'], 'identity and approver capability checks must be read-only');

console.log('onboarding POC preflight rejects invalid identity/capability with zero schema, record, media, or approval writes');
