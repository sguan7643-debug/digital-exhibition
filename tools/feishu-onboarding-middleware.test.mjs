import assert from 'node:assert/strict';
import { createFeishuOnboardingDispatcher } from '../server/feishu-onboarding-middleware.mjs';

const session = { identity: { userId: 'u_owner' }, accessToken: 'server-only' };
const calls = [];
const service = {
  async uploadFile(body, value) { calls.push(['upload', body, value]); return { uploadId: 'TEST_UPLOAD' }; },
  async removeUploadedFile(id, value) { calls.push(['remove', id, value]); return { removed: true }; },
  async submit(body, value) { calls.push(['submit', body, value]); return { applicationId: 'TEST_APPLICATION', instanceId: 'INSTANCE', status: 'PENDING' }; },
  async confirmAttempt(id, value) { calls.push(['confirm', id, value]); return { applicationId: 'TEST_APPLICATION', instanceId: 'INSTANCE', status: 'PENDING' }; },
  async list(value) { calls.push(['list', value]); return { items: [], total: 0 }; },
  async get(id, value) { calls.push(['get', id, value]); return { applicationId: id }; },
  async sync(id, value) { calls.push(['sync', id, value]); return { applicationId: id, status: 'APPROVED' }; },
  async grantFileAccess(id, fileId, mode, value) { calls.push(['grant', id, fileId, mode, value]); return { url: '/api/v1/files/content/grant' }; }
};
const dispatch = createFeishuOnboardingDispatcher({ service, resolveUserSession: request => request.headers.cookie === 'session=valid' ? session : null });
const headers = { origin: 'http://127.0.0.1:4173', host: '127.0.0.1:4173', cookie: 'session=valid', 'content-type': 'application/json' };

assert.equal(await dispatch({ method: 'GET', url: '/other', headers }), null);
assert.equal((await dispatch({ method: 'GET', url: '/api/v1/onboarding/applications', headers })).status, 200);
const callsBeforeSpoof = calls.length;
const spoofed = await dispatch({ method: 'POST', url: '/api/v1/onboarding/applications', headers, body: { attemptId: 'TEST_ATTEMPT_SPOOF', application: { applicant: 'u_other' } } });
assert.equal(spoofed.status, 403);
assert.equal(spoofed.body.code, 'ONBOARDING_APPLICANT_MISMATCH');
assert.equal(calls.length, callsBeforeSpoof, 'middleware must reject applicant spoofing before invoking the service');
assert.equal((await dispatch({ method: 'POST', url: '/api/v1/onboarding/applications', headers, body: { attemptId: 'TEST_ATTEMPT_A' } })).status, 201);
assert.equal((await dispatch({ method: 'GET', url: '/api/v1/onboarding/applications/TEST_APPLICATION', headers })).status, 200);
assert.equal((await dispatch({ method: 'POST', url: '/api/v1/onboarding/applications/TEST_APPLICATION/sync', headers, body: {} })).body.status, 'APPROVED');
assert.equal((await dispatch({ method: 'POST', url: '/api/v1/onboarding/attempts/TEST_ATTEMPT_A/confirm', headers, body: {} })).status, 200);
assert.equal((await dispatch({ method: 'POST', url: '/api/v1/onboarding/applications/TEST_APPLICATION/files/TEST_UPLOAD/grant', headers, body: { mode: 'DOWNLOAD' } })).body.url, '/api/v1/files/content/grant');
assert.equal((await dispatch({ method: 'POST', url: '/api/v1/onboarding/uploads', headers, body: { attemptId: 'TEST_ATTEMPT_A' }, bodyBytes: 10 })).status, 201);
const reverseProxyHeaders = {
  ...headers,
  origin: 'https://test-pre-demo-seaoil.xdata.work',
  host: '127.0.0.1:4173',
  'x-forwarded-host': 'test-pre-demo-seaoil.xdata.work',
  'x-forwarded-proto': 'https'
};
assert.equal(
  (await dispatch({ method: 'POST', url: '/api/v1/onboarding/uploads', headers: reverseProxyHeaders, body: { attemptId: 'TEST_ATTEMPT_PROXY' }, bodyBytes: 10 })).status,
  201,
  'loopback Node 服务必须接受 Nginx 转发的同源 HTTPS 上传请求'
);
const previousPublicOrigin = process.env.EXHIBITION_PUBLIC_ORIGIN;
process.env.EXHIBITION_PUBLIC_ORIGIN = 'https://test-pre-demo-seaoil.xdata.work';
try {
  assert.equal(
    (await dispatch({
      method: 'POST',
      url: '/api/v1/onboarding/uploads',
      headers: { ...headers, origin: 'https://test-pre-demo-seaoil.xdata.work' },
      body: { attemptId: 'TEST_ATTEMPT_PUBLIC_ORIGIN' },
      bodyBytes: 10
    })).status,
    201,
    '显式配置的公网来源必须在多层代理未传递 X-Forwarded-Host 时仍可上传'
  );
  assert.equal(
    (await dispatch({ method: 'POST', url: '/api/v1/onboarding/uploads', headers: { ...headers, origin: 'https://evil.example' }, body: {}, bodyBytes: 10 })).status,
    403,
    '公网来源白名单不得放开其他来源'
  );
} finally {
  if (previousPublicOrigin === undefined) delete process.env.EXHIBITION_PUBLIC_ORIGIN;
  else process.env.EXHIBITION_PUBLIC_ORIGIN = previousPublicOrigin;
}
assert.equal((await dispatch({ method: 'DELETE', url: '/api/v1/onboarding/uploads/TEST_UPLOAD', headers })).status, 200);
assert.equal((await dispatch({ method: 'GET', url: '/api/v1/onboarding/applications', headers: { ...headers, cookie: '' } })).status, 401);
assert.equal((await dispatch({ method: 'GET', url: '/api/v1/onboarding/applications', headers: { ...headers, origin: 'https://evil.example' } })).status, 403);
assert.equal((await dispatch({ method: 'POST', url: '/api/v1/onboarding/uploads', headers, body: {}, bodyBytes: 30 * 1024 * 1024 + 1 })).status, 413);

console.log('onboarding middleware exposes authenticated same-origin list/detail/sync/attempt/upload/grant routes');
