import assert from 'node:assert/strict';
import { buildApplicationWriteInput, launchApplication, resolveLiveApplicationId } from '../src/integration/application-actions.js';

const data = { 'APP-003': { appId: 'APP-REAL-001' } };
assert.equal(resolveLiveApplicationId(data), 'APP-REAL-001');
assert.equal(resolveLiveApplicationId({}), '');
const input = buildApplicationWriteInput('APP-005', 'APP-REAL-001', { reason: 'TEST_申请使用' }, { randomId: () => 'uuid-1', now: () => '2026-09-10T09:00:00.000Z' });
assert.match(input.businessKey, /^TEST_APP_USE_/);
assert.match(input.idempotencyKey, /^TEST_IDEM_APP_USE_/);
assert.deepEqual(input.fields, { 应用ID: 'APP-REAL-001', 申请理由: 'TEST_申请使用', 状态: '待处理', 申请时间: '2026-09-10T09:00:00.000Z' });

const denied = await launchApplication(async () => ({ data: { allowed: false, reasonMessage: '尚未授权', launchUrl: null } }), 'APP-REAL-001', { now: () => '2026-09-10T09:00:00.000Z' });
assert.deepEqual(denied, { launched: false, message: '尚未授权' });
let opened = '';
const allowed = await launchApplication(async () => ({ data: { allowed: true, launchUrl: 'https://allowed.example/app', openMode: 'NEW_TAB' } }), 'APP-REAL-001', { now: () => '2026-09-10T09:00:00.000Z', open: url => { opened = url; } });
assert.equal(allowed.launched, true);
assert.equal(opened, 'https://allowed.example/app');

console.log('application use/reuse builders use canonical IDs and TEST_ idempotency; launch waits for server permission');
