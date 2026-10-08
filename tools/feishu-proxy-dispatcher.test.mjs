import assert from 'node:assert/strict';
import {
  createFeishuProxyDispatcher,
  createFeishuProxyFetch,
  resolveProxyUrlForTarget
} from '../server/feishu-proxy-dispatcher.mjs';

const target = 'https://open.feishu.cn/open-apis/bitable/v1/apps/example/records';

assert.equal(
  resolveProxyUrlForTarget(target, { HTTPS_PROXY: 'http://proxy.example.test:8080' }),
  'http://proxy.example.test:8080/'
);
assert.equal(
  resolveProxyUrlForTarget(target, { HTTPS_PROXY: 'http://proxy.example.test:8080', NO_PROXY: 'open.feishu.cn' }),
  ''
);
assert.equal(
  resolveProxyUrlForTarget(target, { ALL_PROXY: 'http://proxy.example.test:8081', NO_PROXY: 'localhost,127.0.0.1' }),
  'http://proxy.example.test:8081/'
);
assert.equal(
  resolveProxyUrlForTarget(target, { HTTPS_PROXY: 'not a url' }),
  ''
);

const constructed = [];
class FakeProxyAgent {
  constructor(uri) {
    constructed.push(uri);
  }
}

const dispatcher = createFeishuProxyDispatcher({
  env: { HTTPS_PROXY: 'http://proxy.example.test:8080' },
  ProxyAgentClass: FakeProxyAgent
});
assert.ok(dispatcher instanceof FakeProxyAgent);
assert.deepEqual(constructed, ['http://proxy.example.test:8080/']);

let receivedInit;
const proxyFetch = createFeishuProxyFetch(async (_url, init) => {
  receivedInit = init;
  return Response.json({ code: 0 });
}, { dispatcher });
await proxyFetch(target, { method: 'GET' });
assert.equal(receivedInit.dispatcher, dispatcher, 'Feishu requests must receive the configured proxy dispatcher');

const fallbackCalls = [];
const loopbackProxyFetch = createFeishuProxyFetch(async (_url, init = {}) => {
  fallbackCalls.push(init);
  if (init.dispatcher) {
    throw new TypeError('fetch failed', {
      cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:10808'), { code: 'ECONNREFUSED' })
    });
  }
  return Response.json({ code: 0, source: 'direct' });
}, {
  env: { HTTPS_PROXY: 'http://127.0.0.1:10808' },
  ProxyAgentClass: FakeProxyAgent
});
const fallbackResponse = await loopbackProxyFetch(target, { method: 'POST', body: 'grant_type=authorization_code' });
assert.equal((await fallbackResponse.json()).source, 'direct');
assert.equal(fallbackCalls.length, 2, 'an unavailable loopback proxy must be retried once without the proxy');
assert.ok(fallbackCalls[0].dispatcher, 'the configured loopback proxy must remain the first attempt');
assert.equal(fallbackCalls[1].dispatcher, undefined, 'the fallback attempt must use the direct network path');

let remoteProxyAttempts = 0;
const remoteProxyFetch = createFeishuProxyFetch(async () => {
  remoteProxyAttempts += 1;
  throw new TypeError('fetch failed', {
    cause: Object.assign(new Error('connect ECONNREFUSED proxy.example.test:8080'), { code: 'ECONNREFUSED' })
  });
}, {
  env: { HTTPS_PROXY: 'http://proxy.example.test:8080' },
  ProxyAgentClass: FakeProxyAgent
});
await assert.rejects(() => remoteProxyFetch(target), /fetch failed/);
assert.equal(remoteProxyAttempts, 1, 'a configured remote proxy must fail closed instead of being bypassed');

console.log('Feishu proxy dispatcher selection and fetch propagation passed');
