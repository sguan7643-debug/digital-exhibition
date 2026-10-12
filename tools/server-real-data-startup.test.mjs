import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as viteBuild } from 'vite';
import {
  createFeishuMiddlewareStack,
  feishuReadOnlyProxy,
  runFeishuStartupPrewarmSequence
} from '../server/feishu-vite-plugin.mjs';
import {
  createTestDeploymentServer,
  startTestDeploymentServer
} from '../server/test-deployment-server.mjs';

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginSource = await readFile(resolve(projectRoot, 'server/feishu-vite-plugin.mjs'), 'utf8');
assert.match(pluginSource, /cacheContractGeneration = 'deh-real-data-v3'/, '持久快照必须随合同代次隔离');
assert.match(pluginSource, /baselineGeneration[\s\S]*namespace: snapshotNamespace/, '正式字典 baseline hash 必须进入快照 namespace');

function fakeFeishuResponse(url) {
  if (String(url).includes('/auth/v3/tenant_access_token/internal')) {
    return new Response(JSON.stringify({ code: 0, tenant_access_token: 'test-token', expire: 7200 }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({
    code: 0,
    data: { items: [], total: 0, has_more: false, page_token: '' }
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}

function createLifecycleOptions(counters, overrides = {}) {
  return {
    appId: 'cli_startup_lifecycle_test',
    appSecret: 'startup-lifecycle-secret',
    baseToken: 'startup-lifecycle-base',
    persistentCacheEnabled: false,
    requirePersistentCache: false,
    fetchImpl: async url => {
      counters.feishuRequests += 1;
      return fakeFeishuResponse(url);
    },
    startupPrewarm: async () => {
      counters.prewarmStarts += 1;
      return { state: 'ready' };
    },
    ...overrides
  };
}

function createViteServerHarness(httpServer) {
  const middlewares = [];
  return {
    httpServer,
    middlewares: {
      use(middleware) {
        middlewares.push(middleware);
      }
    },
    installedMiddlewares: middlewares
  };
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', error => error ? reject(error) : resolve());
  });
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
}

const stackCounters = { prewarmStarts: 0, feishuRequests: 0 };
const stack = createFeishuMiddlewareStack(createLifecycleOptions(stackCounters));
await delay(25);
assert.deepEqual(
  stackCounters,
  { prewarmStarts: 0, feishuRequests: 0 },
  '仅构造 middleware stack 不得启动预热或飞书请求'
);
assert.equal(typeof stack.startPrewarm, 'function', 'middleware stack 必须暴露显式启动入口');
assert.equal(typeof stack.close, 'function', 'middleware stack 必须暴露幂等关闭入口');
const stackStartA = stack.startPrewarm();
const stackStartB = stack.startPrewarm();
assert.equal(stackStartA, stackStartB, '重复显式启动必须复用同一个预热 Promise');
await stackStartA;
assert.equal(stackCounters.prewarmStarts, 1, '显式预热只能启动一次');
assert.equal(stackCounters.feishuRequests, 0, '受控启动器不得意外调用真实飞书 client');
const stackCloseA = stack.close();
const stackCloseB = stack.close();
assert.equal(stackCloseA, stackCloseB, '重复关闭必须复用同一个关闭 Promise');
await stackCloseA;

let skippedOnboarding = 0;
await runFeishuStartupPrewarmSequence({
  homepagePrewarm: async () => ({ state: 'ready' }),
  onboardingPrewarm: async () => { skippedOnboarding += 1; },
  shouldContinue: () => false
});
assert.equal(skippedOnboarding, 0, '关闭后不得启动附加预热');

let releasePrewarm;
const drainingCounters = { prewarmStarts: 0, feishuRequests: 0 };
const drainingStack = createFeishuMiddlewareStack(createLifecycleOptions(drainingCounters, {
  startupPrewarm: () => new Promise(resolve => { releasePrewarm = resolve; })
}));
const drainingStart = drainingStack.startPrewarm();
await delay(5);
let closeSettled = false;
const drainingClose = drainingStack.close().then(() => { closeSettled = true; });
await delay(5);
assert.equal(closeSettled, false, '关闭必须等待已启动的预热收敛');
releasePrewarm({ state: 'ready' });
await Promise.all([drainingStart, drainingClose]);
assert.equal(closeSettled, true);

const pluginConstructionCounters = { prewarmStarts: 0, feishuRequests: 0 };
feishuReadOnlyProxy(createLifecycleOptions(pluginConstructionCounters));
await delay(25);
assert.deepEqual(
  pluginConstructionCounters,
  { prewarmStarts: 0, feishuRequests: 0 },
  'Vite 配置创建插件时不得构造并启动飞书预热'
);

const buildRoot = await mkdtemp(join(tmpdir(), 'deh-vite-build-no-prewarm-'));
const originalFetch = globalThis.fetch;
let buildFetches = 0;
globalThis.fetch = async () => {
  buildFetches += 1;
  throw new Error('Vite build 不得请求飞书或其他运行时上游');
};
try {
  await import(`../vite.config.js?startup-side-effect=${Date.now()}`);
  assert.equal(buildFetches, 0, '仅导入 Vite 配置不得产生网络请求');
  await viteBuild({
    root: projectRoot,
    configFile: resolve(projectRoot, 'vite.config.js'),
    logLevel: 'silent',
    build: { outDir: buildRoot, emptyOutDir: true }
  });
  assert.equal(buildFetches, 0, 'Vite build 不得产生飞书预热或网络请求');
} finally {
  globalThis.fetch = originalFetch;
  await rm(buildRoot, { recursive: true, force: true });
}

for (const hookName of ['configureServer', 'configurePreviewServer']) {
  const counters = { prewarmStarts: 0, feishuRequests: 0 };
  const plugin = feishuReadOnlyProxy(createLifecycleOptions(counters));
  const httpServer = createHttpServer((_request, response) => response.end('ok'));
  const viteServer = createViteServerHarness(httpServer);
  plugin[hookName](viteServer);
  await delay(25);
  assert.equal(counters.prewarmStarts, 0, `${hookName} 在 HTTP listener 启动前不得预热`);
  assert.ok(viteServer.installedMiddlewares.length > 0, `${hookName} 必须保持既有 middleware 安装行为`);

  await listen(httpServer);
  await delay(25);
  assert.equal(counters.prewarmStarts, 1, `${hookName} 必须在 listening 后启动一次预热`);

  plugin[hookName](viteServer);
  await delay(10);
  assert.equal(counters.prewarmStarts, 1, `${hookName} 重复挂载不得重复预热`);
  await close(httpServer);
}

const closedBeforeListeningCounters = { prewarmStarts: 0, feishuRequests: 0 };
const closedBeforeListeningPlugin = feishuReadOnlyProxy(createLifecycleOptions(closedBeforeListeningCounters));
const neverStartedHttpServer = createHttpServer();
const neverStartedViteServer = createViteServerHarness(neverStartedHttpServer);
closedBeforeListeningPlugin.configureServer(neverStartedViteServer);
neverStartedHttpServer.emit('close');
neverStartedHttpServer.emit('listening');
await delay(10);
assert.equal(closedBeforeListeningCounters.prewarmStarts, 0, 'listener 启动前关闭时不得遗留延迟预热');

const root = await mkdtemp(join(tmpdir(), 'deh-startup-lifecycle-'));
const dist = join(root, 'dist');
await mkdir(dist, { recursive: true });
await writeFile(join(dist, 'index.html'), '<!doctype html><title>startup lifecycle</title>', 'utf8');
const config = { host: '127.0.0.1', port: 0, appBase: '/test2', staticDir: dist };

try {
  const createCounters = { prewarmStarts: 0, feishuRequests: 0 };
  const createdServer = createTestDeploymentServer({
    config,
    feishuOptions: createLifecycleOptions(createCounters)
  });
  await delay(25);
  assert.deepEqual(
    createCounters,
    { prewarmStarts: 0, feishuRequests: 0 },
    '仅 createTestDeploymentServer 不得启动预热或飞书请求'
  );
  await assert.rejects(
    () => createdServer.startPrewarm(),
    error => error?.code === 'SERVER_NOT_LISTENING',
    '测试服务未监听时不得显式启动预热'
  );
  await listen(createdServer);
  const createdStartA = createdServer.startPrewarm();
  const createdStartB = createdServer.startPrewarm();
  assert.equal(createdStartA, createdStartB, '测试服务重复预热必须复用同一 Promise');
  await createdStartA;
  assert.equal(createCounters.prewarmStarts, 1);
  await close(createdServer);
  await assert.rejects(
    () => createdServer.startPrewarm(),
    error => error?.code === 'SERVER_CLOSED',
    '服务关闭后不得重新启动预热'
  );

  const startCounters = { prewarmStarts: 0, feishuRequests: 0 };
  const startedServer = await startTestDeploymentServer({
    config,
    feishuOptions: createLifecycleOptions(startCounters)
  });
  await delay(25);
  assert.equal(startedServer.listening, true, 'startTestDeploymentServer 必须先完成真实监听');
  assert.equal(startCounters.prewarmStarts, 1, '真实测试服务监听后必须自动且仅启动一次预热');
  await startedServer.startPrewarm();
  assert.equal(startCounters.prewarmStarts, 1, '自动启动后再次显式调用不得重复预热');
  await close(startedServer);
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log('server startup prewarm lifecycle is side-effect free before listening, explicit, idempotent, and close-safe');
