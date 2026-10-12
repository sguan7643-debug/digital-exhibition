import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { beginRequest, endRequest, getRequestActivity, trackRequest } from '../src/integration/request-status.js';

const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8');
const styleSource = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
const proxySource = await readFile(new URL('../src/integration/safe-proxy-client.js', import.meta.url), 'utf8');

assert.match(appSource, /<teleport[^>]+to="body"[\s\S]*?class="request-loading-overlay"/, '全局 Loading 必须传送到 body 并覆盖完整视口');
assert.match(appSource, /v-if="[^"\n]*requestActivity\.isLoading[^"\n]*"/, '遮罩必须由全局前台请求状态控制');
assert.match(appSource, /:inert="requestActivity\.isLoading"/, '请求期间必须让底层应用壳失去交互能力');
assert.match(appSource, /:aria-busy="requestActivity\.isLoading/, '请求期间必须向辅助技术暴露忙碌状态');
assert.match(appSource, /role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/, 'Loading 必须提供完整且礼貌的状态播报');
assert.match(appSource, /正在处理\s*\{\{\s*requestActivity\.activeCount\s*\}\}\s*项请求/, '遮罩必须显示当前并发请求数量');
assert.match(appSource, /请稍候，完成后将自动恢复页面/, '遮罩必须说明会自动恢复');
assert.match(appSource, /request-loading-active/, '应用必须同步全局滚动锁状态');
assert.match(appSource, /classList\.remove\(['"]request-loading-active['"]\)/, '组件卸载时必须清理滚动锁');
assert.doesNotMatch(appSource, /request-loading-toast|页面其他区域仍可继续使用/, '旧右上角气泡及非阻塞文案必须删除');

assert.match(styleSource, /body\.request-loading-active\s*\{[^}]*overflow\s*:\s*hidden/i, '全页面 Loading 必须锁定文档滚动');
assert.match(styleSource, /\.request-loading-overlay\s*\{[^}]*position\s*:\s*fixed[^}]*inset\s*:\s*0[^}]*z-index\s*:\s*3000/is, '遮罩必须固定覆盖全视口并高于现有导航层');
assert.match(styleSource, /\.request-loading-overlay\s*\{[^}]*pointer-events\s*:\s*all/is, '遮罩必须接收指针事件并阻止点击穿透');
assert.match(styleSource, /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)[^{]*\{[^}]*\.request-loading-spinner\s*\{[^}]*animation\s*:\s*none/is, '减少动画模式必须停止旋转');
assert.doesNotMatch(styleSource, /\.request-loading-toast/, '正式样式不得残留右上角 Loading 气泡');

assert.match(proxySource, /requestOptions\.silent\s*\?\s*null\s*:\s*beginRequest/, '静默请求不得进入全局前台请求计数');

const first = beginRequest('读取首页');
const second = beginRequest('读取个人信息');
assert.equal(getRequestActivity().activeCount, 2, '并发请求必须合并到同一计数');
endRequest(first);
assert.equal(getRequestActivity().activeCount, 1, '任一请求结束前遮罩必须继续保持');
endRequest(second);
assert.equal(getRequestActivity().isLoading, false, '最后一个请求结束后遮罩必须关闭');

await assert.rejects(() => trackRequest(async () => { throw new Error('boom'); }, '失败请求'), /boom/);
assert.equal(getRequestActivity().isLoading, false, '失败请求也必须在 finally 中关闭遮罩');

console.log('DEH-FULL-PAGE-LOADING-20261011 full-page loading contract passed');
