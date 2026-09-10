import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PAGE_MATRIX, resolvePage } from '../src/fixtures/pages.js';

const appsSource = await readFile(new URL('../src/pages/AppsPage.vue', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8');
const applySource = await readFile(new URL('../src/pages/OnboardingApplyPage.vue', import.meta.url), 'utf8');

for (const [field, value] of [
  ['applicant', 'linmm'],
  ['department', '物资采购中心'],
  ['phone', '13900000000'],
  ['email', 'linmm@example.com'],
  ['name', 'TEST_RPA_应用上架联调'],
  ['applicationCode', 'RPA-TEST-20260910'],
  ['type', 'T003'],
  ['domain', 'BD003'],
  ['summary', 'TEST_RPA 应用上架审批联调'],
  ['scenario', '用于验证数智展厅 RPA 应用上架审批流程'],
  ['collaboration', 'TEST_内部研发联调'],
  ['webAddress', 'http://127.0.0.1:4174/rpa-test'],
  ['mobileAddress', 'app://test-rpa'],
  ['contact', 'linmm'],
  ['contactDepartment', '物资采购中心'],
  ['contactPhone', '13800000000'],
  ['contactEmail', 'linmm@example.com'],
  ['users', 'linmm'],
  ['accessDepartment', '物资采购中心'],
  ['roles', '测试用户'],
  ['remarks', 'TEST_应用上架联调记录'],
]) {
  assert.ok(applySource.includes(`${field}: "${value}"`), `表单 ${field} 必须提供联调默认值`);
}

assert.equal(PAGE_MATRIX.length, 30, 'the frozen 30-page visual matrix must remain unchanged');
assert.equal(resolvePage('/apps/onboarding/apply')?.id, '32');
assert.match(appsSource, /href=["']\/apps\/onboarding\/apply["']/);
assert.doesNotMatch(appsSource, /应用上线申请为本地演示操作/);
assert.match(appSource, /import OnboardingApplyPage from ['"]\.\/pages\/OnboardingApplyPage\.vue['"]/);
assert.match(appSource, /<onboarding-apply-page v-else-if="page\.id === '32'"/);
assert.match(applySource, /<form[^>]*@submit\.prevent="submitApplication"/);
assert.match(applySource, /submitOnboarding\(/);
assert.match(applySource, /approvalResult\.value\.instanceId/);
assert.match(applySource, /new URLSearchParams\(\{ source: approvalResult\.value\.kind \}\)/);
assert.match(applySource, /import \{ submitOnboarding \}/);
assert.match(applySource, /rpaRequest:\s*buildRpaApprovalRequest\(\)/);
assert.match(applySource, /Object\.values\(selectedFiles\)\.flat\(\)/);
assert.match(applySource, /申请人联系电话:\s*form\.phone/);
assert.match(applySource, /申请人联系邮箱:\s*form\.email/);
assert.match(applySource, /接入人所属部门ID:\s*departmentId\(form\.contactDepartment\)/);
for (const [fieldName, valueSource] of [
  ['应用名称', 'form.name'],
  ['所属部门ID', 'departmentId(form.department)'],
  ['所属业务域ID', 'form.domain'],
  ['摘要', 'form.summary'],
  ['应用简介', 'form.scenario'],
  ['开发合作方信息', 'form.collaboration'],
  ['应用URL地址', 'form.webAddress'],
  ['移动端地址', 'form.mobileAddress'],
  ['申请人AD账号', 'form.applicant'],
  ['接入人AD账号', 'form.contact'],
  ['联系电话', 'form.contactPhone'],
  ['联系邮箱', 'form.contactEmail'],
  ['适用用户AD账号', 'form.users'],
  ['适用部门ID', 'departmentId(form.accessDepartment)'],
  ['适用角色', 'form.roles'],
  ['备注说明', 'form.remarks'],
  ['应用编码', 'form.applicationCode'],
]) {
  assert.ok(
    applySource.includes(`${fieldName}: ${valueSource}`),
    `表单字段 ${fieldName} 必须进入后端 request`
  );
}
const basicInfoSection = applySource.match(/<legend><span>2<\/span>应用基础信息<\/legend>([\s\S]*?)<\/fieldset>/)?.[1] || '';
assert.ok(
  basicInfoSection.indexOf('应用名称') < basicInfoSection.indexOf('应用编码') &&
    basicInfoSection.indexOf('应用编码') < basicInfoSection.indexOf('应用类型'),
  '应用编码输入框必须紧随应用名称并位于应用类型之前'
);
assert.match(applySource, /:disabled="submitting"/);
assert.match(applySource, /if \(submitting\.value\) return;/, '重复点击提交时必须复用当前请求，禁止重复发起审批');
assert.match(applySource, /:aria-busy="submitting"/, '表单必须向辅助技术暴露提交中的忙碌状态');
assert.match(applySource, /v-if="submitting"[^>]*class="submit-loading"/, '接口等待期间必须显示可见 loading');
assert.match(applySource, /正在提交审批，请稍候/);
assert.match(applySource, /class="submit-spinner"/);
assert.match(applySource, /finally\s*\{[\s\S]*?submitting\.value = false;[\s\S]*?\}/, '请求结束后必须关闭 loading');
assert.match(applySource, /v-if="submitted" class="submit-success" role="status"/, '成功后必须显示成功提示');
assert.match(applySource, /v-if="submitError" class="submit-error" role="alert"/, '失败后必须显示失败提示');
assert.match(applySource, /href="\/apps"/);
assert.match(applySource, /:href="statusHref"/);
assert.match(applySource, /const feishuAuthHref = computed\(/);
assert.match(applySource, /\/api\/v1\/auth\/feishu\/start\?returnTo=/);
assert.match(applySource, /data-native-navigation[^>]*>飞书授权<\/a>/);
assert.match(appSource, /anchor\.hasAttribute\(['"]data-native-navigation['"]\)/);
const headingActions = applySource.match(/<div class="heading-actions">([\s\S]*?)<\/div>/)?.[1] || '';
assert.ok(
  headingActions.indexOf('飞书授权') >= 0 &&
    headingActions.indexOf('飞书授权') < headingActions.indexOf('返回应用中心'),
  '飞书授权按钮必须位于返回应用中心左侧'
);

const contactSection = applySource.match(/<legend><span>5<\/span>接入人信息<\/legend>([\s\S]*?)<\/fieldset>/)?.[1] || '';
assert.ok(contactSection.indexOf('所属部门') < contactSection.indexOf('接入人'), '所属部门必须排在接入人之前');

const permissionSection = applySource.match(/<legend><span>6<\/span>应用权限开通<\/legend>([\s\S]*?)<\/fieldset>/)?.[1] || '';
assert.ok(permissionSection.indexOf('适用部门') < permissionSection.indexOf('适用用户'), '适用部门必须排在适用用户之前');
assert.match(applySource, /<legend><span>8<\/span>附件上传（选填）<\/legend>/);
assert.doesNotMatch(applySource, /组件上传（选填）/);

const viteSource = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
assert.match(viteSource, /['"]\/api\/processInstanceStart['"]\s*:\s*\{/);
assert.match(viteSource, /FEISHU_APPROVAL_BACKEND_URL\s*\|\|\s*['"]http:\/\/10\.151\.23\.119:28080['"]/);
assert.match(viteSource, /target:\s*approvalBackendUrl/);
assert.match(viteSource, /changeOrigin:\s*true/);
assert.doesNotMatch(viteSource, /workflowProxy/);

console.log('onboarding application interaction contract passed');
