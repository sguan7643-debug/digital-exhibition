import assert from 'node:assert/strict';
import { createFeishuAuthDispatcher } from '../server/feishu-auth-middleware.mjs';
import { FeishuProxyError } from '../server/feishu-open-api-client.mjs';

const calls = [];
const authService = {
  beginAuthorization(input) {
    calls.push(['begin', input]);
    return { authorizationUrl: 'https://accounts.feishu.cn/authorize-test', stateCookie: 'state-cookie' };
  },
  async completeAuthorization(input) {
    calls.push(['complete', input]);
    return { redirectTo: '/workbench', sessionCookie: 'session-cookie', clearStateCookie: 'clear-cookie' };
  },
  resolveIdentity() {
    return null;
  }
};
const dispatch = createFeishuAuthDispatcher({ authService });

assert.equal(await dispatch({ method: 'GET', url: '/unrelated' }), null);
assert.deepEqual(await dispatch({ method: 'POST', url: '/api/v1/auth/feishu/start' }), {
  status: 405,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: { code: 'METHOD_NOT_ALLOWED', message: '飞书授权入口仅接受 GET' }
});

const start = await dispatch({ method: 'GET', url: '/api/v1/auth/feishu/start?returnTo=%2Fprofile' });
assert.equal(start.status, 302);
assert.equal(start.headers.Location, 'https://accounts.feishu.cn/authorize-test');
assert.deepEqual(start.headers['Set-Cookie'], ['state-cookie']);
assert.deepEqual(calls[0], ['begin', { returnTo: '/profile' }]);

const callback = await dispatch({
  method: 'GET',
  url: '/api/v1/auth/feishu/callback?code=code-test&state=state-test',
  headers: { cookie: 'exhibition_feishu_oauth_state=state-test' }
});
assert.equal(callback.status, 302);
assert.equal(callback.headers.Location, '/workbench');
assert.deepEqual(callback.headers['Set-Cookie'], ['session-cookie', 'clear-cookie']);
assert.deepEqual(calls[1], ['complete', { code: 'code-test', state: 'state-test', cookieHeader: 'exhibition_feishu_oauth_state=state-test' }]);

const failing = createFeishuAuthDispatcher({
  authService: {
    beginAuthorization() { throw new FeishuProxyError('USER_AUTH_NOT_CONFIGURED', 'sensitive upstream detail', 503); },
    async completeAuthorization() { throw new Error('not expected'); },
    resolveIdentity() { return null; }
  }
});
const failure = await failing({ method: 'GET', url: '/api/v1/auth/feishu/start' });
assert.equal(failure.status, 503);
assert.deepEqual(failure.body, { code: 'USER_AUTH_NOT_CONFIGURED', message: '飞书用户授权暂不可用' });
assert.doesNotMatch(JSON.stringify(failure), /sensitive upstream detail/);

const callbackFailure = createFeishuAuthDispatcher({
  defaultReturnTo: '/test2/apps?from=oauth',
  authService: {
    beginAuthorization() { throw new Error('not used'); },
    async completeAuthorization() { throw new FeishuProxyError('OAUTH_STATE_MISMATCH', 'sensitive state detail', 401); },
    resolveIdentity() { return null; },
    clearStateCookie() { return 'clear-state-cookie'; }
  }
});
const recoveredCallback = await callbackFailure({
  method: 'GET',
  url: '/api/v1/auth/feishu/callback?code=stale-code&state=stale-state',
  headers: { cookie: '' }
});
assert.equal(recoveredCallback.status, 302);
assert.equal(recoveredCallback.headers.Location, '/test2/apps?from=oauth&authError=OAUTH_STATE_MISMATCH');
assert.deepEqual(recoveredCallback.headers['Set-Cookie'], ['clear-state-cookie']);
assert.equal(recoveredCallback.body, null);
assert.doesNotMatch(JSON.stringify(recoveredCallback), /sensitive state detail/);

console.log('Feishu OAuth start and callback routes use redirects, HttpOnly cookies, internal recovery pages, and sanitized failures');
