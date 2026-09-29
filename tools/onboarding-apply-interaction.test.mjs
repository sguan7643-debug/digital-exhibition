import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PAGE_MATRIX, resolvePage } from '../src/fixtures/pages.js';
import { getPageIntegrationContract } from '../src/integration/page-integration-matrix.js';
import { buildPageReadRequestPlan } from '../src/integration/page-read-request-plan.js';
import { createVerifiedReadOperationContracts } from '../src/integration/operation-contract-schemas.js';

const appsSource = await readFile(new URL('../src/pages/AppsPage.vue', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8');
const applySource = await readFile(new URL('../src/pages/OnboardingApplyPage.vue', import.meta.url), 'utf8');

for (const field of [
  'applicant', 'department', 'phone', 'email', 'name', 'applicationCode', 'type', 'domain',
  'summary', 'scenario', 'collaboration', 'webAddress', 'mobileAddress', 'contact',
  'contactDepartment', 'contactPhone', 'contactEmail', 'users', 'accessDepartment', 'roles', 'remarks'
]) {
  assert.ok(applySource.includes(`${field}: ""`), `表单 ${field} 不得内置模拟业务值`);
}

assert.equal(PAGE_MATRIX.length, 30, 'the frozen 30-page visual matrix must remain unchanged');
assert.equal(resolvePage('/apps/onboarding/apply')?.id, '32');
assert.deepEqual(getPageIntegrationContract('/apps/onboarding/apply').readOperationIds, ['COM-003', 'COM-004', 'COM-005']);
const directoryPlan = buildPageReadRequestPlan({
  route: '/apps/onboarding/apply',
  readOperationIds: ['COM-003', 'COM-004', 'COM-005'],
  operationContracts: createVerifiedReadOperationContracts()
});
assert.deepEqual(directoryPlan.operationIds, ['COM-003', 'COM-004', 'COM-005']);
assert.equal(directoryPlan.inputByOperation['COM-004'].pageSize, 100);
assert.match(appsSource, /href=["']\/apps\/onboarding\/apply["']/);
assert.doesNotMatch(appsSource, /应用上线申请为本地演示操作/);
assert.match(appSource, /import OnboardingApplyPage from ['"]\.\/pages\/OnboardingApplyPage\.vue['"]/);
assert.match(appSource, /<onboarding-apply-page[\s\S]*?v-else-if="page\.id === '32'"/);
assert.match(appSource, /:integration-data="integrationEnvelope\.data"/);
assert.match(appSource, /:integration-state="integrationEnvelope\.state"/);
assert.match(applySource, /<form[^>]*@submit\.prevent="submitApplication"/);
assert.match(applySource, /submitOnboarding\(/);
assert.match(applySource, /approvalResult\.value\.applicationId/);
assert.match(applySource, /query\.set\("applicationId", approvalResult\.value\.applicationId\)/);
assert.match(applySource, /uploadOnboardingFile\(/);
assert.match(applySource, /confirmOnboardingAttempt\(/);
assert.match(applySource, /import \{[^}]*submitOnboarding[^}]*\} from ["']\.\.\/integration\/onboarding-approval\.js["']/);
assert.match(applySource, /value:\s*normalizeApplicationType\(item\.value\)/, '飞书应用类型编码必须转换为现有审批类型编码');
assert.match(applySource, /rpaRequest:\s*buildRpaApprovalRequest\(\)/);
assert.match(applySource, /Object\.values\(selectedFiles\)\.flat\(\)/);
for (const tableName of [
  '可视化驾驶舱详情',
  '可视化报表详情',
  '海能work应用详情',
  '工具应用详情',
  'RPA应用详情',
  'EAD应用详情',
  'AI应用详情',
  '数据集应用详情',
  '指标应用详情',
]) {
  assert.ok(applySource.includes(`tableName: "${tableName}"`), `应用类型必须绑定详情表：${tableName}`);
}
assert.match(applySource, /const applicationDetailSchemas = Object\.freeze\(/);
assert.match(applySource, /props\.integrationData\?\.\["COM-003"\]\?\.items/);
assert.match(applySource, /props\.integrationData\?\.\["COM-004"\]\?\.items/);
assert.match(applySource, /window\.fetch\(["']\/api\/v1\/auth\/feishu\/session["']/);
assert.match(applySource, /form\.applicant\s*=\s*userId/);
assert.match(applySource, /<input[^>]*readonly[^>]*:value="applicantDisplay"/);
assert.doesNotMatch(applySource, /<select\s+v-model="form\.applicant"/, '申请人不得由客户端下拉框切换');
assert.match(applySource, /v-for="department in departmentOptions"/);
assert.match(applySource, /userOptions\.value\.find\(\(item\) => item\.adAccount === form\.applicant\)/);
assert.match(applySource, /v-for="user in contactUserOptions"/);
assert.match(applySource, /v-for="user in applicableUserOptions"/);
assert.doesNotMatch(applySource, />接入人<b>\*<\/b><input/);
assert.doesNotMatch(applySource, />适用用户<input/);
assert.match(applySource, /const detailDrafts = reactive\(/);
assert.match(applySource, /v-for="field in activeDetailSchema\.fields"/);
assert.match(applySource, /detailFields:\s*buildDetailFields\(\)/);
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
assert.match(applySource, /:disabled="submitting \|\| directoryDisabled \|\| uploadBusy"/);
assert.match(applySource, /if \(submitting\.value\) return;/, '重复点击提交时必须复用当前请求，禁止重复发起审批');
assert.match(applySource, /:aria-busy="submitting"/, '表单必须向辅助技术暴露提交中的忙碌状态');
assert.match(applySource, /v-if="submitting"[^>]*class="submit-loading"/, '接口等待期间必须显示可见 loading');
assert.match(applySource, /正在提交审批，请稍候/);
assert.match(applySource, /class="submit-spinner"/);
assert.match(applySource, /finally\s*\{[\s\S]*?submitting\.value = false;[\s\S]*?\}/, '请求结束后必须关闭 loading');
assert.match(applySource, /v-if="submitted" class="submit-success" role="status"/, '成功后必须显示成功提示');
assert.match(applySource, /v-if="submitError" class="submit-error"[^>]*role="alert"/, '失败后必须显示失败提示');
assert.match(applySource, /请检查以下\s*\{\{\s*validationErrors\.length\s*\}\}\s*项/, '阻塞校验必须提供错误摘要');
assert.match(applySource, /validationErrors\.value\s*=\s*controls\.map/, '错误摘要必须来自真实无效控件');
assert.equal((applySource.match(/type="tel"[^>]*pattern="\(\?:\\x2B\?86\(\?:\\x20\|\\x2D\)\?\)\?1\[3-9\]\[0-9\]\{9\}"/g) || []).length, 2, '申请人和接入人手机号必须使用同一格式校验');
assert.match(applySource, /control\.validity\?\.patternMismatch/, '手机号格式错误必须进入可见错误摘要');
assert.match(applySource, /await removeOnboardingFile\(item\.result\.uploadId\)/, '移除已上传文件必须等待服务端确认');
assert.doesNotMatch(applySource, /removeOnboardingFile\([^)]*\)\.catch\(\(\) => null\)/, '移除失败不得静默冒充成功');
assert.match(applySource, /href="\/apps"/);
assert.match(applySource, /:href="statusHref"/);
assert.doesNotMatch(applySource, /const feishuAuthHref = computed\(/, '申请页不得保留未使用的飞书授权 URL');
assert.doesNotMatch(applySource, /feishu-auth-link|>飞书授权<\/a>/, '申请页不得展示或保留可聚焦的飞书授权入口');
const headingActions = applySource.match(/<div class="heading-actions">([\s\S]*?)<\/div>/)?.[1] || '';
assert.match(headingActions, /class="back-link"[^>]*href="\/apps"[^>]*>返回应用中心<\/a>/, '标题区必须保留返回应用中心入口');
assert.doesNotMatch(headingActions, /飞书授权|data-native-navigation/, '标题区不得留下授权入口或原生导航残留');

const contactSection = applySource.match(/<legend><span>5<\/span>接入人信息<\/legend>([\s\S]*?)<\/fieldset>/)?.[1] || '';
assert.ok(contactSection.indexOf('所属部门') < contactSection.indexOf('接入人'), '所属部门必须排在接入人之前');

const permissionSection = applySource.match(/<legend><span>6<\/span>应用权限开通<\/legend>([\s\S]*?)<\/fieldset>/)?.[1] || '';
assert.ok(permissionSection.indexOf('适用部门') < permissionSection.indexOf('适用用户'), '适用部门必须排在适用用户之前');
assert.match(permissionSection, /适用部门[\s\S]*?:required="form\.type === 'T005'"/, '海能Work 的适用部门必须必填');
assert.match(permissionSection, /适用用户[\s\S]*?:required="form\.type === 'T005'"/, '海能Work 的适用用户必须必填');
assert.match(applySource, /<legend><span>8<\/span>申请附件（选填）<\/legend>/);
assert.match(applySource, /PNG \/ JPEG \/ WebP，最多 1 个，不超过 5MB/);
assert.match(applySource, /PDF \/ DOCX \/ XLSX \/ PNG \/ JPEG，最多 3 个，每个不超过 20MB/);
assert.doesNotMatch(applySource, /\.svg|ZIP|RAR|最多 5 个/);

const viteSource = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
assert.match(viteSource, /['"]\/api\/processInstanceStart['"]\s*:\s*\{/);
assert.match(viteSource, /FEISHU_APPROVAL_BACKEND_URL\s*\|\|\s*['"]http:\/\/10\.151\.23\.119:28080['"]/);
assert.match(viteSource, /target:\s*approvalBackendUrl/);
assert.match(viteSource, /changeOrigin:\s*true/);
assert.doesNotMatch(viteSource, /workflowProxy/);

console.log('onboarding application interaction contract passed');
