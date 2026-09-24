import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { beginRequest, endRequest, getRequestActivity, trackRequest } from '../src/integration/request-status.js';

const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8');
const styleSource = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

assert.match(appSource, /class="request-activity-banner"/, '登录后的活跃请求必须渲染醒目的非阻塞提示');
assert.match(appSource, /role="status"/, '请求提示必须以 status 向辅助技术播报');
assert.match(appSource, /aria-live="polite"/, '请求提示必须使用 polite live region');
assert.match(appSource, /aria-busy="true"/, '请求提示必须明确暴露 busy 状态');
assert.doesNotMatch(appSource, /class="global-request-loading"/, '登录后的业务请求不得渲染全屏遮罩');
assert.doesNotMatch(appSource, /requestOverlay\.value\?\.focus/, '业务请求提示不得抢夺当前焦点');
assert.doesNotMatch(appSource, /@click\.stop\.prevent/, '业务请求提示不得拦截页面点击');
assert.doesNotMatch(appSource, /@keydown\.stop\.prevent/, '业务请求提示不得拦截键盘操作');
assert.match(appSource, /requestActivity\.activeCount\s*>\s*1/, '并发请求必须显示请求数量');
assert.match(appSource, /正在处理\s*\{\{\s*requestActivity\.activeCount\s*\}\}\s*项请求/, '并发请求文案必须为“正在处理 N 项请求”');
assert.match(appSource, /页面其他区域仍可继续使用/, '请求提示必须明确说明页面并未被锁定');
assert.match(appSource, /class="integration-toast-close"/, '持久请求气泡必须提供统一关闭按钮');
assert.match(appSource, /aria-label="关闭数据请求提示"/, '关闭按钮必须有可访问名称');
assert.match(appSource, /@click="dismissIntegrationRecovery"/, '点击关闭按钮必须隐藏当前请求气泡');
assert.match(appSource, /resolveActiveRetryScope\(envelope\)/, '所有受影响请求成功后必须自动关闭恢复提示');

const bannerRule = styleSource.match(/\.request-activity-banner\{[^}]+\}/)?.[0] || '';
assert.doesNotMatch(bannerRule, /position:fixed|inset:0|pointer-events:auto/, '请求提示不得覆盖视口或接管指针事件');
assert.match(styleSource, /\.request-activity-banner__bar\{[^}]+border-radius:50%/, '请求提示必须包含清晰的加载进度标识');
assert.match(styleSource, /\.integration-toast-close\{[^}]*position:absolute[^}]*border-radius:50%/, '气泡关闭按钮必须位于气泡右上角并显示为小圆形图标');
assert.match(styleSource, /\.integration-toast-close:focus-visible\{[^}]*outline:/, '气泡关闭按钮必须提供清晰的键盘焦点');
assert.match(styleSource, /@media\(prefers-reduced-motion:reduce\)[\s\S]*animation:none/, '必须尊重 reduced-motion');

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

console.log('authenticated request activity remains visible without blocking the page');
