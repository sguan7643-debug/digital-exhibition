import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');

assert.match(
  app,
  /const showControlledWritePanel = computed\(\(\) => import\.meta\.env\.DEV && new URLSearchParams\(window\.location\.search\)\.get\('test-write-panel'\) === '1'\);/,
  '写接口联调面板必须仅在开发环境且显式请求时启用'
);
assert.match(
  app,
  /<controlled-write-panel\s+v-if="showControlledWritePanel"/,
  '业务页面默认不得挂载 TEST_ 写接口联调面板'
);

console.log('controlled write panel visibility boundary passed');
