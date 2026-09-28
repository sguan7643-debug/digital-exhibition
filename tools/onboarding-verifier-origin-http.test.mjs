import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createFeishuOnboardingNodeMiddleware } from '../server/feishu-onboarding-middleware.mjs';
import { createOnboardingVerifierApi, resolveOnboardingVerifierTargets } from './onboarding-verifier-api.mjs';

const session = { identity: { userId: 'u_verifier' }, accessToken: 'server-only' };
const service = {
  async list() { return { items: [{ applicationId: 'TEST_APPLICATION' }], total: 1 }; },
  async get(applicationId) { return { applicationId, instanceId: 'TEST_INSTANCE' }; },
  async sync(applicationId) { return { applicationId, instanceId: 'TEST_INSTANCE', status: 'APPROVED' }; },
  async grantFileAccess(applicationId, fileId) { return { applicationId, fileId, url: '/download' }; },
  async submit() { return {}; },
  async uploadFile() { return {}; },
  async removeUploadedFile() { return {}; },
  async confirmAttempt() { return {}; }
};
const middleware = createFeishuOnboardingNodeMiddleware({ service, resolveUserSession: () => session });
const server = createServer((request, response) => middleware(request, response, () => {
  if (request.url === '/test2/apps/onboarding/apply') {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end('<!doctype html><title>Application onboarding</title>');
    return;
  }
  response.statusCode = 404;
  response.end();
}));
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

try {
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  let lastRequestHeaders = new Headers();
  const request = {
    async fetch(url, options = {}) {
      lastRequestHeaders = new Headers(options.headers);
      const response = await fetch(url, {
        method: options.method,
        headers: lastRequestHeaders,
        body: options.data == null ? undefined : JSON.stringify(options.data)
      });
      return { status: () => response.status, json: () => response.json() };
    }
  };
  const targets = resolveOnboardingVerifierTargets({
    legacyBaseUrl: baseUrl,
    appPublicBase: '/test2/'
  });
  assert.equal(targets.apiBaseUrl, baseUrl);
  assert.equal(targets.appBaseUrl, `${baseUrl}/test2`);
  assert.equal(targets.apiUrl('/api/v1/onboarding/applications'), `${baseUrl}/api/v1/onboarding/applications`);
  assert.equal(targets.appUrl('/apps/onboarding/apply'), `${baseUrl}/test2/apps/onboarding/apply`);

  const legacySubpathTargets = resolveOnboardingVerifierTargets({ legacyBaseUrl: `${baseUrl}/test2/` });
  assert.equal(legacySubpathTargets.apiBaseUrl, baseUrl);
  assert.equal(legacySubpathTargets.appBaseUrl, `${baseUrl}/test2`);

  const explicitTargets = resolveOnboardingVerifierTargets({
    legacyBaseUrl: `${baseUrl}/ignored/`,
    apiBaseUrl: `${baseUrl}/`,
    appBaseUrl: `${baseUrl}/test2/`
  });
  assert.equal(explicitTargets.apiBaseUrl, baseUrl);
  assert.equal(explicitTargets.appBaseUrl, `${baseUrl}/test2`);

  for (const invalid of [`${baseUrl}/test2?`, `${baseUrl}/test2#`]) {
    assert.throws(() => resolveOnboardingVerifierTargets({ legacyBaseUrl: invalid }), /query|fragment/i);
    assert.throws(() => resolveOnboardingVerifierTargets({ apiBaseUrl: invalid }), /query|fragment/i);
    assert.throws(() => resolveOnboardingVerifierTargets({ appBaseUrl: invalid }), /query|fragment/i);
  }
  assert.throws(() => resolveOnboardingVerifierTargets({ legacyBaseUrl: baseUrl, appPublicBase: '/test2?' }), /query|fragment/i);
  assert.throws(() => resolveOnboardingVerifierTargets({ legacyBaseUrl: baseUrl, appPublicBase: '/test2#' }), /query|fragment/i);

  const appPage = await fetch(targets.appUrl('/apps/onboarding/apply'));
  assert.equal(appPage.status, 200);
  assert.match(appPage.headers.get('content-type') || '', /^text\/html/);

  const api = createOnboardingVerifierApi({ request, apiBaseUrl: targets.apiBaseUrl });

  assert.equal((await api('/api/v1/onboarding/applications')).status, 200);
  assert.equal((await api('/api/v1/onboarding/applications/TEST_APPLICATION')).status, 200);
  assert.equal((await api('/api/v1/onboarding/applications/TEST_APPLICATION/sync', { method: 'POST', body: {} })).status, 200);
  assert.equal((await api('/api/v1/onboarding/applications/TEST_APPLICATION/files/TEST_FILE/grant', { method: 'POST', body: { mode: 'DOWNLOAD' } })).status, 200);

  const lockedOriginResponse = await api('/api/v1/onboarding/applications', {
    headers: {
      origin: 'https://evil-lower.example',
      ORIGIN: 'https://evil-upper.example',
      'X-Verifier-Test': 'preserved'
    }
  });
  assert.equal(lockedOriginResponse.status, 200);
  assert.equal(lastRequestHeaders.get('origin'), baseUrl);
  assert.equal(lastRequestHeaders.get('x-verifier-test'), 'preserved');

  const malicious = await fetch(`${baseUrl}/api/v1/onboarding/applications`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(malicious.status, 403);
  assert.equal((await malicious.json()).code, 'CROSS_ORIGIN_REQUEST_BLOCKED');

  assert.throws(() => resolveOnboardingVerifierTargets({
    apiBaseUrl: baseUrl,
    appBaseUrl: 'https://different-origin.example/test2'
  }), /same origin/i);
} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log('live verifier supports a /test2 app base with root /api/v1 endpoints and preserves strict same-origin transport');
