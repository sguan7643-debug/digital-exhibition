import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/App.vue');
const pkg = JSON.parse(read('package.json'));

for (const token of [
  './integration/page-integration-matrix.js',
  './integration/runtime-config.js',
  './integration/page-data-source.js',
  './integration/safe-proxy-client.js',
  'createVerifiedReadOperationContracts',
  'createVerifiedWriteOperationContracts',
  'IntegrationAuthBanner',
  'ControlledWritePanel',
]) assert.ok(app.includes(token), `UI 合并不得移除接口边界：${token}`);

assert.ok(pkg.scripts['test:integration'], '必须保留完整接口回归入口');
assert.ok(pkg.scripts['test:browser:30-routes'], '必须保留 30 路由浏览器入口');
assert.ok(!app.includes('MaterialsPage'), '不得加入范围外素材中心路由');
assert.ok(!app.includes('OnboardingApplyPage'), '不得加入范围外上架申请路由');
console.log('UI 同步接口保护合同通过');
