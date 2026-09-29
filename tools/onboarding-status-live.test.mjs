import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/pages/OnboardingPage.vue', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8');
assert.match(source, /getOnboardingApplication/);
assert.match(source, /listOnboardingApplications/);
assert.match(source, /syncOnboardingApplication/);
assert.match(source, /new URLSearchParams\(window\.location\.search\)/);
assert.match(source, /PENDING/);
assert.match(source, /applicationId/);
assert.match(source, /我的上线申请/);
assert.match(source, /resourceId/);
assert.match(source, /暂无审批跟踪编号/);
assert.match(source, /APPROVED/);
assert.match(source, /REJECTED/);
assert.match(source, /CANCELLED/);
assert.match(source, /currentNodeLabel/);
assert.match(source, /applicationTypeName/);
assert.match(source, /businessDomainName/);
assert.match(source, /authorizedUserNames/);
assert.match(source, /role="status"/);
assert.match(source, /@click="refreshStatus\(false\)"/);
assert.doesNotMatch(source, /const steps=\[/);
assert.match(source, /data-detail-return/, '详情返回列表必须复用历史记录以恢复来源滚动与焦点');
assert.match(source, /:data-session-focus="`onboarding-application-/, '列表详情链接必须提供可恢复的焦点标识');
assert.match(
  appSource,
  /<onboarding-page[^>]*:key="activeHref"/,
  '列表与详情仅改变 applicationId query 时必须重建页面，避免复用旧的列表模式'
);
console.log('onboarding status page is driven by the returned real approval instance status');
