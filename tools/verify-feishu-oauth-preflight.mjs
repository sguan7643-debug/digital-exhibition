import assert from 'node:assert/strict';

const localOrigin = process.env.EXHIBITION_ORIGIN || 'http://127.0.0.1:4173';
const expectedCallback = new URL('/api/v1/auth/feishu/callback', localOrigin).toString();
const startUrl = new URL('/api/v1/auth/feishu/start', localOrigin);
startUrl.searchParams.set('returnTo', '/workbench');

const startResponse = await fetch(startUrl, { redirect: 'manual' });
assert.ok([302, 303].includes(startResponse.status), `OAuth start returned HTTP ${startResponse.status}`);

const location = startResponse.headers.get('location');
assert.ok(location, 'OAuth start did not return a Location header');

const authorizationUrl = new URL(location);
assert.equal(authorizationUrl.protocol, 'https:');
assert.equal(authorizationUrl.hostname, 'accounts.feishu.cn');
assert.equal(authorizationUrl.pathname, '/open-apis/authen/v1/authorize');
assert.equal(authorizationUrl.searchParams.get('redirect_uri'), expectedCallback);
assert.ok(authorizationUrl.searchParams.get('state'), 'OAuth authorization URL has no state');

const authorizationResponse = await fetch(authorizationUrl, { redirect: 'manual' });
const responseText = await authorizationResponse.text();
const error20029 = responseText.includes('20029');
const invalidRedirect = /重定向.{0,24}(?:有误|错误|无效)|invalid.{0,24}redirect/is.test(responseText);
const callbackWhitelisted = authorizationResponse.status < 400 && !error20029 && !invalidRedirect;

const result = {
  passed: callbackWhitelisted,
  localOrigin,
  startStatus: startResponse.status,
  authorizationHost: authorizationUrl.hostname,
  authorizationPath: authorizationUrl.pathname,
  callback: expectedCallback,
  authorizationStatus: authorizationResponse.status,
  error20029,
  invalidRedirect,
  callbackWhitelisted
};

console.log(JSON.stringify(result, null, 2));
if (!callbackWhitelisted) process.exitCode = 1;
