import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../src/pages/', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');

const admin=read('AdminPage.vue');
const certification=read('CertificationPage.vue');
const people=read('TalentPeoplePage.vue');
const projects=read('TalentProjectsPage.vue');
const progress=read('TalentProgressPage.vue');
assert.match(admin,/import\s+RemoteRecordPage\s+from/,'后台管理必须复用统一远端记录组件');
assert.match(admin,/:record="props\.integrationData"/,'后台管理必须展示受控集成接口返回的数据');
assert.match(certification,/function\s+openBooking\(\)/,
  '认证页面必须保留预约入口的受控反馈');
assert.match(certification,/:disabled="remoteBookingBlocked"[\s\S]*@click="openBooking\(\)"/,
  '正式预约写入未启用时，预约入口必须禁用且不可伪造成功');
assert.match(people,/\.talent-people[\s\S]*?:is\([\s\S]*?\.talent-body\s*>\s*main[\s\S]*?border-color:\s*#f4faff/,
  '人才库必须使用统一低对比边框层级');
assert.match(projects,/\.talent-projects\s+:is\([^}]*border-color:#f4faff/,
  '人才项目必须使用统一低对比边框层级');
assert.match(progress,/\.progress-page>section\{[^}]*border:1px solid #f4faff/,
  '项目进度必须使用统一低对比边框层级');
assert.match(people,/@click="openCreate"/,'新增人才按钮必须可打开创建抽屉');
assert.match(people,/controller\.creating[\s\S]*?class="talent-create-form"/,
  '新增人才必须在右侧抽屉展示字段表单');
assert.doesNotMatch(admin,/新增应用类型|sort-input/,'只读后台管理不得暴露未接入的新增或排序写操作');
assert.match(certification, /正式预约写入接口尚未启用/,'认证预约必须明确告知当前真实能力边界');
assert.match(certification, /class="hero-visual"[\s\S]*?object-fit:\s*cover/,'认证横幅插画必须铺满右侧区域');

console.log('后台、认证与人才页 fresh 低对比边框视觉合同通过');
