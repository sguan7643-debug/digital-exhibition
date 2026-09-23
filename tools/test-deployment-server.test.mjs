import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createTestDeploymentServer,
  normalizeServerConfig
} from '../server/test-deployment-server.mjs';

const root = await mkdtemp(join(tmpdir(), 'deh-test-server-'));
const dist = join(root, 'dist');
await mkdir(join(dist, 'assets'), { recursive: true });
await writeFile(join(dist, 'index.html'), '<!doctype html><title>DEH TEST PACKAGE</title><div id="app"></div>', 'utf8');
await writeFile(join(dist, 'assets', 'app.js'), 'globalThis.__DEH_TEST__=true;', 'utf8');

const config = normalizeServerConfig({ host: '127.0.0.1', port: 0, appBase: '/test2', staticDir: dist });
assert.equal(config.appBase, '/test2');
assert.equal(config.port, 0);

const server = createTestDeploymentServer({ config, prewarm: false });
await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', error => error ? reject(error) : resolve()));
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;

try {
  const rootResponse = await fetch(`${origin}/`, { redirect: 'manual' });
  assert.equal(rootResponse.status, 302);
  assert.equal(rootResponse.headers.get('location'), '/test2/');

  const appResponse = await fetch(`${origin}/test2/`);
  assert.equal(appResponse.status, 200);
  assert.match(await appResponse.text(), /DEH TEST PACKAGE/);

  const assetResponse = await fetch(`${origin}/assets/app.js`);
  assert.equal(assetResponse.status, 200);
  assert.match(await assetResponse.text(), /__DEH_TEST__/);

  const sessionResponse = await fetch(`${origin}/api/v1/auth/feishu/session`);
  assert.equal(sessionResponse.status, 401);
  assert.equal((await sessionResponse.json()).code, 'USER_AUTH_REQUIRED');

  const traversalResponse = await fetch(`${origin}/test2/%2e%2e/server/test-deployment-server.mjs`);
  assert.equal(traversalResponse.status, 404);
} finally {
  await new Promise(resolve => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}

console.log('test deployment server serves /test2, redirects root, mounts /api/v1, and blocks traversal');
