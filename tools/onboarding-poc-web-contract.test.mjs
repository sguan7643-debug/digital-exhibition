import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const apply = await readFile(new URL('../src/pages/OnboardingApplyPage.vue', import.meta.url), 'utf8');
const status = await readFile(new URL('../src/pages/OnboardingPage.vue', import.meta.url), 'utf8');
const apps = await readFile(new URL('../src/pages/AppsPage.vue', import.meta.url), 'utf8');
const profile = await readFile(new URL('../src/pages/ProfilePage.vue', import.meta.url), 'utf8');
const client = await readFile(new URL('../src/integration/onboarding-approval.js', import.meta.url), 'utf8');

assert.match(apps, /href=["']\/apps\/onboarding\/apply["'][^>]*>应用上线申请/);
assert.match(apps, /href=["']\/apps\/onboarding\/status["'][^>]*>我的申请/);
assert.match(profile, /href=["']\/apps\/onboarding\/status["'][^>]*>我的申请/);

assert.match(apply, /accept=["'][^"']*\.webp/);
assert.match(apply, /PNG\s*\/\s*JPEG\s*\/\s*WebP[^<]*5MB/i);
assert.match(apply, /PDF\s*\/\s*DOCX\s*\/\s*XLSX\s*\/\s*PNG\s*\/\s*JPEG[^<]*3[^<]*20MB/i);
assert.doesNotMatch(apply, /\.svg|ZIP|RAR|最多\s*5\s*个/);
assert.match(apply, /uploadOnboardingFile/);
assert.match(apply, /applicationId/);
assert.match(apply, /继续确认提交结果/);

assert.match(client, /createOnboardingAttempt/);
assert.match(client, /confirmOnboardingAttempt/);
assert.match(client, /listOnboardingApplications/);
assert.match(client, /getOnboardingApplication/);
assert.match(client, /syncOnboardingApplication/);
assert.match(client, /\/api\/v1\/onboarding\/applications/);

assert.match(status, /applicationId/);
assert.match(status, /我的上线申请/);
assert.match(status, /刷新审批状态/);
assert.match(status, /暂无审批跟踪编号/);
assert.match(status, /businessId/);
assert.match(status, /resourceId/);
assert.match(status, /授权用户/);
assert.match(status, /授权部门/);
assert.match(status, /SHA-256/);
assert.match(status, /<table/);
assert.match(status, /@media\s*\(max-width:\s*760px\)/);
assert.match(status, /\.icon-file>div\{grid-template-columns:minmax\(0,1fr\)/);
assert.match(status, /\.icon-file code\{[^}]*word-break:break-all/);
assert.match(apply, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.heading-actions a\s*\{\s*min-height:\s*44px/);
assert.doesNotMatch(status, /setInterval|WebSocket|EventSource/);
assert.match(status, /:focus-visible/);
assert.match(status, /role=["']status["']/);

console.log('onboarding approved Web entry, upload, list/detail, responsive, keyboard, and screen-reader contract passed');
