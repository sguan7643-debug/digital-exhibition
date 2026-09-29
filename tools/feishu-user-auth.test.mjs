import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFeishuUserAuthService } from '../server/feishu-user-auth-service.mjs';

const requests = [];
const fetchImpl = async (url, options = {}) => {
  requests.push({ url: String(url), options });
  if (String(url) === 'https://accounts.feishu.cn/oauth/v3/token') {
    return new Response(JSON.stringify({
      code: 0,
      access_token: 'user-token-must-stay-server-side',
      expires_in: 7200,
      token_type: 'Bearer',
      scope: 'contact:user.base:readonly'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(url) === 'https://open.feishu.cn/open-apis/authen/v1/user_info') {
    assert.equal(options.headers.Authorization, 'Bearer user-token-must-stay-server-side');
    return new Response(JSON.stringify({
      code: 0,
      data: {
        name: '测试用户',
        avatar_url: 'https://example.invalid/avatar.png',
        open_id: 'ou_test',
        union_id: 'on_test',
        user_id: 'u_test',
        tenant_key: 'tenant-test',
        employee_no: 'TEST_001',
        email: 'must-not-leak@example.invalid',
        mobile: '+8613800000000'
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  throw new Error(`unexpected request: ${url}`);
};

let sequence = 0;
const authorizedIdentities = [];
const service = createFeishuUserAuthService({
  appId: 'cli_test',
  appSecret: 'server-secret',
  redirectUri: 'http://127.0.0.1:4173/api/v1/auth/feishu/callback',
  fetchImpl,
  now: () => 1_000_000,
  randomId: () => `random-${++sequence}`,
  onAuthorized: identity => authorizedIdentities.push(identity)
});

const start = service.beginAuthorization({ returnTo: '/workbench?from=login' });
const authorizationUrl = new URL(start.authorizationUrl);
assert.equal(authorizationUrl.origin, 'https://accounts.feishu.cn');
assert.equal(authorizationUrl.pathname, '/open-apis/authen/v1/authorize');
assert.equal(authorizationUrl.searchParams.get('client_id'), 'cli_test');
assert.equal(authorizationUrl.searchParams.get('response_type'), 'code');
assert.equal(authorizationUrl.searchParams.get('redirect_uri'), 'http://127.0.0.1:4173/api/v1/auth/feishu/callback');
assert.equal(authorizationUrl.searchParams.get('state'), 'random-1');
assert.equal(authorizationUrl.searchParams.has('client_secret'), false);
assert.match(start.stateCookie, /^exhibition_feishu_oauth_state=random-1;/);
assert.match(start.stateCookie, /HttpOnly/);
assert.match(start.stateCookie, /SameSite=Lax/);

await assert.rejects(
  service.completeAuthorization({ code: 'code-valid', state: 'random-1', cookieHeader: '' }),
  error => error.code === 'OAUTH_STATE_MISMATCH' && error.status === 401
);
assert.equal(requests.length, 0);

const completed = await service.completeAuthorization({
  code: 'code-valid',
  state: 'random-1',
  cookieHeader: 'other=value; exhibition_feishu_oauth_state=random-1'
});
assert.equal(completed.redirectTo, '/workbench?from=login');
assert.match(completed.sessionCookie, /^exhibition_feishu_session=random-2;/);
assert.match(completed.sessionCookie, /HttpOnly/);
assert.match(completed.clearStateCookie, /Max-Age=0/);
assert.deepEqual(completed.identity, {
  userId: 'u_test',
  adAccount: 'u_test',
  openId: 'ou_test',
  unionId: 'on_test',
  displayName: '测试用户',
  avatarUrl: 'https://example.invalid/avatar.png',
  employeeNo: 'TEST_001',
  tenantKey: 'tenant-test',
  identityType: 'user_id'
});
assert.doesNotMatch(JSON.stringify(completed), /user-token|server-secret|must-not-leak|13800000000/);
assert.equal(authorizedIdentities.length, 1);
assert.equal(authorizedIdentities[0].identityType, 'user_id');

const tokenRequest = requests[0];
assert.equal(tokenRequest.url, 'https://accounts.feishu.cn/oauth/v3/token');
assert.match(String(tokenRequest.options.headers['Content-Type']), /application\/x-www-form-urlencoded/);
const tokenBody = new URLSearchParams(tokenRequest.options.body);
assert.equal(tokenBody.get('grant_type'), 'authorization_code');
assert.equal(tokenBody.get('client_id'), 'cli_test');
assert.equal(tokenBody.get('client_secret'), 'server-secret');
assert.equal(tokenBody.get('code'), 'code-valid');
assert.equal(tokenBody.get('redirect_uri'), 'http://127.0.0.1:4173/api/v1/auth/feishu/callback');

const identity = service.resolveIdentity('exhibition_feishu_session=random-2');
assert.deepEqual(identity, completed.identity);
assert.equal(service.resolveIdentity('exhibition_feishu_session=unknown'), null);
const serverSession = service.resolveSession('exhibition_feishu_session=random-2');
assert.deepEqual(serverSession.identity, completed.identity);
assert.equal(serverSession.accessToken, 'user-token-must-stay-server-side');
assert.doesNotMatch(JSON.stringify(completed), /accessToken|user-token/);
const currentProfile = await service.resolveSessionProfile('exhibition_feishu_session=random-2');
assert.deepEqual(currentProfile.contact, { phone: '+8613800000000', email: 'must-not-leak@example.invalid' });
assert.equal(requests.length, 2, 'current-user contact must reuse the freshly authorized profile cache');
assert.equal(service.resolveSession('exhibition_feishu_session=unknown'), null);

await assert.rejects(
  service.completeAuthorization({ code: 'code-valid', state: 'random-1', cookieHeader: 'exhibition_feishu_oauth_state=random-1' }),
  error => error.code === 'OAUTH_STATE_INVALID' && error.status === 401
);
assert.equal(requests.length, 2);

assert.throws(
  () => service.beginAuthorization({ returnTo: 'https://evil.example/' }),
  error => error.code === 'INVALID_RETURN_PATH' && error.status === 400
);

const missing = createFeishuUserAuthService({ fetchImpl });
assert.equal(missing.credentialsReady, false);
assert.throws(
  () => missing.beginAuthorization(),
  error => error.code === 'USER_AUTH_NOT_CONFIGURED' && error.status === 503
);

const persistenceDirectory = mkdtempSync(join(tmpdir(), 'xlt-feishu-auth-'));
const persistenceFile = join(persistenceDirectory, 'sessions.json');
let persistenceSequence = 0;
const persistentOptions = {
  appId: 'cli_test',
  appSecret: 'server-secret',
  redirectUri: 'http://127.0.0.1:4173/api/v1/auth/feishu/callback',
  fetchImpl,
  now: () => 2_000_000,
  randomId: () => `persisted-${++persistenceSequence}`,
  storeFile: persistenceFile
};
const beforeRestart = createFeishuUserAuthService(persistentOptions);
const persistedStart = beforeRestart.beginAuthorization({ returnTo: '/test2/apps/onboarding/apply' });
assert.match(persistedStart.stateCookie, /^exhibition_feishu_oauth_state=persisted-1;/);

const afterAuthorizationRestart = createFeishuUserAuthService(persistentOptions);
const persistedCompletion = await afterAuthorizationRestart.completeAuthorization({
  code: 'code-after-restart',
  state: 'persisted-1',
  cookieHeader: 'exhibition_feishu_oauth_state=persisted-1'
});
assert.equal(persistedCompletion.redirectTo, '/test2/apps/onboarding/apply');
assert.match(persistedCompletion.sessionCookie, /^exhibition_feishu_session=persisted-2;/);

const afterSessionRestart = createFeishuUserAuthService(persistentOptions);
assert.equal(afterSessionRestart.resolveSession('exhibition_feishu_session=persisted-2')?.identity?.userId, 'u_test');
assert.equal(afterSessionRestart.resolveSession('exhibition_feishu_session=persisted-2')?.accessToken, 'user-token-must-stay-server-side');
rmSync(persistenceDirectory, { recursive: true, force: true });

console.log('Feishu OAuth v3 keeps credentials and user token server-side, persists state/session across restart, validates state, and exposes only sanitized identity');
