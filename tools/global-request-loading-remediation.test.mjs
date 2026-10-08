import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { beginRequest, endRequest, getRequestActivity, trackRequest } from '../src/integration/request-status.js';

const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8');
const styleSource = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

assert.doesNotMatch(appSource, /request-activity-banner|integration-toast-stack/, '数据缺失和恢复提示气泡不得重新出现');
assert.match(appSource, /v-if="requestActivity\.isLoading"[\s\S]*?class="request-loading-toast"/, '请求处理中必须保留轻量 loading 气泡');
assert.doesNotMatch(appSource, /class="global-request-loading"/, '登录后的业务请求不得渲染全屏遮罩');
assert.doesNotMatch(appSource, /requestOverlay\.value\?\.focus/, '业务请求提示不得抢夺当前焦点');
assert.doesNotMatch(appSource, /@click\.stop\.prevent/, '业务请求提示不得拦截页面点击');
assert.doesNotMatch(appSource, /@keydown\.stop\.prevent/, '业务请求提示不得拦截键盘操作');
assert.doesNotMatch(appSource, /class="integration-toast-close"/, '已取消的数据恢复气泡不得重新展示');
assert.doesNotMatch(appSource, /dismissIntegrationRecovery/, '已取消的数据恢复气泡不得保留关闭交互');
assert.doesNotMatch(appSource, /正式飞书数据正在首次同步，请稍后重试/, '首次同步提示不得作为页面气泡展示');
assert.match(appSource, /resolveActiveRetryScope\(envelope\)/, '所有受影响请求成功后必须自动关闭恢复提示');

assert.doesNotMatch(styleSource, /request-activity-banner|integration-toast-stack/, '数据缺失提示气泡样式不得进入正式构建');
assert.match(styleSource, /\.request-loading-toast/, 'loading 气泡样式必须保留');
assert.doesNotMatch(styleSource, /\.integration-toast-close/, '已取消的数据恢复气泡样式不得重新进入正式构建');

const first = beginRequest('正在查询审批状态');
assert.equal(getRequestActivity().activeCount, 1);
assert.deepEqual(getRequestActivity().labels, ['正在查询审批状态']);
const second = beginRequest('正在提交审批');
assert.equal(getRequestActivity().activeCount, 2);
assert.deepEqual(getRequestActivity().labels, ['正在查询审批状态', '正在提交审批']);
endRequest(first);
assert.equal(getRequestActivity().activeCount, 1);
assert.deepEqual(getRequestActivity().labels, ['正在提交审批']);
endRequest(second);
assert.equal(getRequestActivity().isLoading, false);

await assert.rejects(
  () => trackRequest(async () => { throw new Error('boom'); }, '失败请求'),
  /boom/
);
assert.equal(getRequestActivity().isLoading, false, '失败请求结束后提示必须消失');

console.log('request loading bubble remains visible while missing-data and first-sync bubbles stay removed');
