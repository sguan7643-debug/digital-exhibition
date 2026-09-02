import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeIntegrationError } from '../src/integration/safe-proxy-client.js';
import { createDataState, reduceDataState } from '../src/integration/data-state.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appSource = await readFile(path.join(root, 'src', 'App.vue'), 'utf8');
const bannerSource = await readFile(path.join(root, 'src', 'components', 'IntegrationAuthBanner.vue'), 'utf8');
const messagesSource = await readFile(path.join(root, 'src', 'pages', 'MessagesPage.vue'), 'utf8');
const favoritesSource = await readFile(path.join(root, 'src', 'pages', 'FavoritesPage.vue'), 'utf8');
const pointsSource = await readFile(path.join(root, 'src', 'pages', 'PointsPage.vue'), 'utf8');
const pointDetailsSource = await readFile(path.join(root, 'src', 'pages', 'PointsDetailsPage.vue'), 'utf8');
const workbenchSource = await readFile(path.join(root, 'src', 'pages', 'WorkbenchPage.vue'), 'utf8');

assert.deepEqual(normalizeIntegrationError({ status: 401 }), { state: 'authentication-required', retryable: false });
const state = reduceDataState(createDataState({ mode: 'remote' }), {
  type: 'fail', code: 'authentication-required', error: 'USER_AUTH_REQUIRED'
});
assert.equal(state.state, 'authentication-required');
assert.equal(state.announcement, '需要先完成飞书登录');

for (const route of ['/workbench', '/messages', '/favorites', '/profile', '/points', '/points/details']) {
  assert.ok(appSource.includes(`'${route}'`), `${route} 必须登记真实身份接口加载配置`);
}
for (const operationId of ['COM-001', 'COM-002', 'WB-001', 'MSG-001', 'MSG-002', 'FAV-001', 'FAV-002', 'WB-003', 'PTS-001', 'PTS-002', 'PTS-003']) {
  assert.ok(appSource.includes(`'${operationId}'`), `${operationId} 必须从页面进入真实代理`);
}
assert.ok(appSource.includes('/api/v1/auth/feishu/start?returnTo='));
assert.ok(appSource.includes('integrationAuthRequired'));
assert.ok(bannerSource.includes('登录飞书并读取本人数据'));
assert.ok(messagesSource.includes("integrationData?.['MSG-001']"));
assert.ok(messagesSource.includes("integrationData?.['MSG-002']"));
assert.ok(messagesSource.includes('真实消息写操作尚未开放'));
assert.ok(favoritesSource.includes("integrationData?.['FAV-001']"));
assert.ok(favoritesSource.includes("integrationData?.['FAV-002']"));
assert.ok(favoritesSource.includes("operationExecutor('APP-004'"));
assert.ok(favoritesSource.includes('真实收藏取消写操作尚未开放'));
assert.ok(pointsSource.includes("integrationData?.['PTS-001']"));
assert.ok(pointsSource.includes("integrationData?.['PTS-003']"));
assert.ok(pointDetailsSource.includes("integrationData?.['PTS-002']"));
assert.ok(pointDetailsSource.includes('PaginationControl'));
assert.ok(pointDetailsSource.includes('真实导出写操作尚未开放'));
assert.ok(workbenchSource.includes("integrationData?.['WB-001']"));
assert.ok(workbenchSource.includes('appTypeOverview'));
assert.ok(workbenchSource.includes('lastUpdatedAt'));

console.log('authenticated pages enter real proxy reads and expose an explicit same-origin Feishu login path');
