import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFeishuAuthDispatcher } from '../server/feishu-auth-middleware.mjs';
import { createFeishuEntryAuthGuard, sanitizeFeishuEntryReturnTo } from '../src/integration/feishu-entry-auth-guard.js';

let appBasePath;
try {
  appBasePath = await import('../src/integration/app-base-path.js');
} catch {
  appBasePath = null;
}

const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8');
assert.doesNotMatch(appSource, /localStorage|sessionStorage|access_token|accessToken/i, '页面不得把飞书 token 写入浏览器存储或 DOM 逻辑');

const redirected = [];
const fetched = [];
const missingSessionGuard = createFeishuEntryAuthGuard({
  appBasePath: '/test2',
  location: new URL('https://test-pre-demo-seaoil.xdata.work/test2/apps?type=T005#apply'),
  fetchImpl: async (url, options = {}) => {
    fetched.push({ url: String(url), options });
    return new Response(JSON.stringify({ code: 'USER_AUTH_REQUIRED' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  },
  redirect: href => redirected.push(href)
});
const missingSession = await missingSessionGuard.ensureAuthorized();
assert.equal(missingSession.authorized, false);
assert.equal(missingSession.render, false);
assert.equal(fetched[0].url, '/api/v1/auth/feishu/session');
assert.deepEqual(fetched[0].options, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
assert.equal(redirected.length, 1);
const redirectUrl = new URL(redirected[0], 'https://test-pre-demo-seaoil.xdata.work');
assert.equal(redirectUrl.pathname, '/api/v1/auth/feishu/start');
assert.equal(redirectUrl.searchParams.get('returnTo'), '/test2/apps?type=T005#apply');
assert.doesNotMatch(redirected[0], /access_token|accessToken|Bearer|exhibition_feishu_session/i);

const validSessionGuard = createFeishuEntryAuthGuard({
  appBasePath: '/test2',
  location: new URL('https://test-pre-demo-seaoil.xdata.work/test2/workbench'),
  fetchImpl: async () => new Response(JSON.stringify({ authenticated: true, identity: { userId: 'u_test' } }), { status: 200 }),
  redirect: href => redirected.push(href)
});
assert.deepEqual(await validSessionGuard.ensureAuthorized(), { authorized: true, render: true });

const localRouteGuard = createFeishuEntryAuthGuard({
  appBasePath: '/',
  location: new URL('http://127.0.0.1:4173/workbench'),
  fetchImpl: async () => new Response(JSON.stringify({ code: 'USER_AUTH_REQUIRED' }), { status: 401 }),
  redirect: href => redirected.push(href)
});
assert.deepEqual(await localRouteGuard.ensureAuthorized(), { authorized: false, render: false }, '本地根路径也必须在渲染前探测 HttpOnly 会话');

let outOfBaseSessionProbes = 0;
const outOfBaseGuard = createFeishuEntryAuthGuard({
  appBasePath: '/test2',
  location: new URL('https://test-pre-demo-seaoil.xdata.work/workbench'),
  fetchImpl: async () => {
    outOfBaseSessionProbes += 1;
    return new Response(JSON.stringify({ authenticated: true }), { status: 200 });
  },
  redirect: () => assert.fail('out-of-base entries must fail closed before redirecting or mounting')
});
assert.deepEqual(await outOfBaseGuard.ensureAuthorized(), { authorized: false, render: false, reason: 'outside-app-base' },
  'out-of-base application paths must not become authorized without a session decision');
assert.equal(outOfBaseSessionProbes, 0, 'out-of-base application paths must not start a session or protected-data request');

assert.equal(sanitizeFeishuEntryReturnTo(new URL('https://test-pre-demo-seaoil.xdata.work/test2/'), '/test2'), '/test2/');
assert.equal(sanitizeFeishuEntryReturnTo(new URL('https://test-pre-demo-seaoil.xdata.work/test2/apps?x=1#detail'), '/test2'), '/test2/apps?x=1#detail');
for (const unsafe of [
  'https://evil.example/path',
  'https://test-pre-demo-seaoil.xdata.work//evil.example/path',
  'https://test-pre-demo-seaoil.xdata.work/%2F%2Fevil.example/path',
  'https://test-pre-demo-seaoil.xdata.work/test2/%5Cevil'
]) {
  assert.throws(() => sanitizeFeishuEntryReturnTo(new URL(unsafe), '/test2'), /非法/);
}

assert.ok(appBasePath, 'src/integration/app-base-path.js must expose the configured app-base contract');
assert.equal(appBasePath.normalizeAppBasePath('/'), '/');
assert.equal(appBasePath.normalizeAppBasePath('/test2/'), '/test2');
assert.equal(appBasePath.isPathWithinAppBase('/test2/workbench', '/test2'), true);
assert.equal(appBasePath.isPathWithinAppBase('/test20/workbench', '/test2'), false);
assert.equal(appBasePath.stripAppBasePath('/test2/apps', '/test2'), '/apps');
assert.equal(appBasePath.stripAppBasePath('/test2', '/test2'), '/');
assert.equal(appBasePath.prependAppBasePath('/apps?type=T005#apply', '/test2'), '/test2/apps?type=T005#apply');
assert.equal(appBasePath.prependAppBasePath('/workbench', '/'), '/workbench');

const emittedLinks = [
  { href: '/workbench', getAttribute(name) { return name === 'href' ? this.href : null; }, setAttribute(name, value) { if (name === 'href') this.href = value; } },
  { href: '/apps?category=RPA#results', getAttribute(name) { return name === 'href' ? this.href : null; }, setAttribute(name, value) { if (name === 'href') this.href = value; } },
  { href: '#main-content', getAttribute(name) { return name === 'href' ? this.href : null; }, setAttribute(name, value) { if (name === 'href') this.href = value; } }
];
appBasePath.prefixAppBaseLinks({ querySelectorAll: () => emittedLinks }, '/test2', {
  origin: 'https://test-pre-demo-seaoil.xdata.work',
  isAppRoute: pathname => ['/workbench', '/apps'].includes(pathname)
});
assert.deepEqual(emittedLinks.map(link => link.href), ['/test2/workbench', '/test2/apps?category=RPA#results', '#main-content'],
  'rendered internal href values must be base-prefixed before native new-tab or copy-link navigation');

const { bootstrapEntryAuthorization } = await import('../src/integration/entry-bootstrap.js');
let resolveFirstProbe;
let bootstrapProbeAttempts = 0;
let bootstrapMounts = 0;
const retryButton = { addEventListener(_event, handler) { this.retry = handler; } };
const entryRoot = {
  innerHTML: '',
  querySelector() { return retryButton; }
};
const boot = bootstrapEntryAuthorization({
  root: entryRoot,
  entryAuthGuard: {
    ensureAuthorized() {
      bootstrapProbeAttempts += 1;
      return bootstrapProbeAttempts === 1
        ? new Promise(resolve => { resolveFirstProbe = resolve; })
        : Promise.resolve({ authorized: true, render: true });
    }
  },
  mount() { bootstrapMounts += 1; }
});
assert.match(entryRoot.innerHTML, /role="status"/, 'the initial document must render an entry-only status while the session decision is pending');
assert.match(entryRoot.innerHTML, /aria-live="polite"/, 'the initial entry status must be announced politely without moving focus');
assert.match(entryRoot.innerHTML, /正在确认登录状态/, 'the initial entry status must explain that sign-in is being checked');
resolveFirstProbe({ authorized: false, render: true, reason: 'session-unavailable' });
await boot;
assert.equal(bootstrapMounts, 0, 'a transport/server probe failure must mount no application data surface');
assert.match(entryRoot.innerHTML, /重试登录检查/, 'a probe failure must render a retryable entry-only state');
await retryButton.retry();
assert.equal(bootstrapProbeAttempts, 2, 'entry retry must repeat only the session decision');
assert.equal(bootstrapMounts, 1, 'only a confirmed session may mount the application');

const failedProbeGuard = createFeishuEntryAuthGuard({
  appBasePath: '/test2',
  location: new URL('https://test-pre-demo-seaoil.xdata.work/test2/workbench'),
  fetchImpl: async () => { throw new TypeError('network unavailable'); },
  redirect: () => assert.fail('a transport failure must not redirect until a session decision is available')
});
const failedProbe = await failedProbeGuard.ensureAuthorized();
assert.equal(failedProbe.authorized, false);
assert.equal(failedProbe.render, true);
assert.equal(failedProbe.reason, 'session-unavailable');
assert.equal(typeof failedProbe.retry, 'function');

const dispatchCalls = [];
const dispatch = createFeishuAuthDispatcher({
  authService: {
    beginAuthorization(input) {
      dispatchCalls.push(['begin', input]);
      return { authorizationUrl: 'https://accounts.feishu.cn/authorize-test', stateCookie: 'state-cookie' };
    },
    async completeAuthorization() {
      throw new Error('not used');
    },
    resolveIdentity(cookieHeader) {
      dispatchCalls.push(['identity', cookieHeader]);
      if (cookieHeader.includes('valid-session')) return { userId: 'u_test', displayName: '测试用户', accessToken: 'must-not-leak' };
      return null;
    }
  }
});
const anonymousSession = await dispatch({ method: 'GET', url: '/api/v1/auth/feishu/session', headers: { cookie: '' } });
assert.equal(anonymousSession.status, 401);
assert.deepEqual(anonymousSession.body, { code: 'USER_AUTH_REQUIRED', message: '需要先完成飞书用户授权' });
const authorizedSession = await dispatch({ method: 'GET', url: '/api/v1/auth/feishu/session', headers: { cookie: 'exhibition_feishu_session=valid-session' } });
assert.equal(authorizedSession.status, 200);
assert.equal(authorizedSession.body.authenticated, true);
assert.equal(authorizedSession.body.identity.userId, 'u_test');
assert.doesNotMatch(JSON.stringify(authorizedSession), /accessToken|must-not-leak|Bearer/i);

const start = await dispatch({ method: 'GET', url: '/api/v1/auth/feishu/start?returnTo=%2Ftest2%2Fapps%3Ftype%3DT005%23apply' });
assert.equal(start.status, 302);
assert.deepEqual(dispatchCalls.at(-1), ['begin', { returnTo: '/test2/apps?type=T005#apply' }]);

console.log('Feishu entry guard probes HttpOnly session before root and /test2 renders, preserves safe return paths, and suppresses probe failures');
