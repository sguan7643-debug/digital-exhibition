import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PAGE_MATRIX, resolvePage } from '../src/fixtures/pages.js';

const appsSource = await readFile(new URL('../src/pages/AppsPage.vue', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8');
const applySource = await readFile(new URL('../src/pages/OnboardingApplyPage.vue', import.meta.url), 'utf8');

assert.equal(PAGE_MATRIX.length, 30, 'the frozen 30-page visual matrix must remain unchanged');
assert.equal(resolvePage('/apps/onboarding/apply')?.id, '31');
assert.match(appsSource, /href=["']\/apps\/onboarding\/apply["']/);
assert.doesNotMatch(appsSource, /应用上线申请为本地演示操作/);
assert.match(appSource, /import OnboardingApplyPage from ['"]\.\/pages\/OnboardingApplyPage\.vue['"]/);
assert.match(appSource, /<onboarding-apply-page v-else-if="page\.id === '31'"/);
assert.match(applySource, /<form[^>]*@submit\.prevent="submitApplication"/);
assert.match(applySource, /href="\/apps"/);
assert.match(applySource, /href="\/apps\/onboarding\/status"/);

const contactSection = applySource.match(/<legend><span>5<\/span>接入人信息<\/legend>([\s\S]*?)<\/fieldset>/)?.[1] || '';
assert.ok(contactSection.indexOf('所属部门') < contactSection.indexOf('接入人'), '所属部门必须排在接入人之前');

const permissionSection = applySource.match(/<legend><span>6<\/span>应用权限开通<\/legend>([\s\S]*?)<\/fieldset>/)?.[1] || '';
assert.ok(permissionSection.indexOf('适用部门') < permissionSection.indexOf('适用用户'), '适用部门必须排在适用用户之前');
assert.match(applySource, /<legend><span>8<\/span>附件上传（选填）<\/legend>/);
assert.doesNotMatch(applySource, /组件上传（选填）/);

console.log('onboarding application interaction contract passed');
