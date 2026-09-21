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

console.log('Feishu proxy dispatcher selection and fetch propagation passed');
