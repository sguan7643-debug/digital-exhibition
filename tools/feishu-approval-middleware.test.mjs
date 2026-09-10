import assert from 'node:assert/strict';
import { createFeishuApprovalDispatcher } from '../server/feishu-approval-middleware.mjs';

const calls = [];
const session = { identity: { userId: 'u_test' }, accessToken: 'server-only' };
const service = {
  async ensureTestDefinition(value) { calls.push(['definition', value]); return { approvalCode: 'TEST_CODE' }; },
  async createInstance(body, value) { calls.push(['create', body, value]); return { instanceId: 'TEST_INSTANCE', status: 'PENDING' }; },
  async getInstance(id, value) { calls.push(['get', id, value]); return { instanceId: id, status: 'APPROVED' }; },
  async approveTestTask(id, value) { calls.push(['approve', id, value]); return { instanceId: id, status: 'APPROVED' }; },
  async handleEvent(body) { calls.push(['event', body]); return { accepted: true, duplicate: false }; }
};
const dispatch = createFeishuApprovalDispatcher({
  service,
  resolveUserSession: request => request.headers?.cookie === 'session=valid' ? session : null
});

const headers = { origin: 'http://127.0.0.1:4173', host: '127.0.0.1:4173', cookie: 'session=valid', 'content-type': 'application/json' };
assert.equal(await dispatch({ method: 'GET', url: '/other', headers }), null);

const unauthenticated = await dispatch({ method: 'POST', url: '/api/v1/approvals/instances', headers: { ...headers, cookie: '' }, body: {} });
assert.equal(unauthenticated.status, 401);
assert.equal(unauthenticated.body.code, 'USER_AUTH_REQUIRED');

const crossOrigin = await dispatch({ method: 'POST', url: '/api/v1/approvals/instances', headers: { ...headers, origin: 'https://evil.example' }, body: {} });
assert.equal(crossOrigin.status, 403);
assert.equal(crossOrigin.body.code, 'CROSS_ORIGIN_REQUEST_BLOCKED');

const created = await dispatch({
  method: 'POST', url: '/api/v1/approvals/instances', headers,
  body: { applicationType: 'T005', title: 'TEST_海能Work' }, bodyBytes: 72
});
assert.equal(created.status, 201);
assert.deepEqual(created.body, { instanceId: 'TEST_INSTANCE', status: 'PENDING' });
assert.deepEqual(calls[0], ['create', { applicationType: 'T005', title: 'TEST_海能Work' }, session]);

const status = await dispatch({ method: 'GET', url: '/api/v1/approvals/instances/TEST_INSTANCE', headers });
assert.equal(status.status, 200);
assert.equal(status.body.status, 'APPROVED');

const approved = await dispatch({ method: 'POST', url: '/api/v1/approvals/instances/TEST_INSTANCE/approve', headers, body: {} });
assert.equal(approved.status, 200);
assert.equal(approved.body.status, 'APPROVED');

const definition = await dispatch({ method: 'POST', url: '/api/v1/approvals/definitions/test', headers, body: {} });
assert.equal(definition.status, 200);
assert.equal(definition.body.approvalCode, 'TEST_CODE');

const event = await dispatch({ method: 'POST', url: '/api/v1/approvals/events', headers, body: { eventId: 'evt-1', instanceId: 'TEST_INSTANCE', status: 'APPROVED' } });
assert.equal(event.status, 200);

const oversized = await dispatch({ method: 'POST', url: '/api/v1/approvals/instances', headers, body: {}, bodyBytes: 256 * 1024 + 1 });
assert.equal(oversized.status, 413);
assert.equal(oversized.body.code, 'REQUEST_TOO_LARGE');

const wrongContent = await dispatch({ method: 'POST', url: '/api/v1/approvals/instances', headers: { ...headers, 'content-type': 'text/plain' }, body: {} });
assert.equal(wrongContent.status, 415);

const wrongMethod = await dispatch({ method: 'DELETE', url: '/api/v1/approvals/instances/TEST_INSTANCE', headers });
assert.equal(wrongMethod.status, 405);

console.log('Feishu approval routes enforce same-origin JSON, authenticated sessions, 256 KiB bodies, methods, and exact route dispatch');
