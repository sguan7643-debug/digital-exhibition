import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../src/pages/', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');

const admin=read('AdminPage.vue');
const certification=read('CertificationPage.vue');
const people=read('TalentPeoplePage.vue');
const projects=read('TalentProjectsPage.vue');
const progress=read('TalentProgressPage.vue');
assert.match(admin,/import\s+TypeLineIcon\s+from/,'后台应用类型图标必须复用统一线稿图标');
assert.match(certification,/function\s+openBooking\(item\s*=\s*["']报表["']\)/,
  '认证页面必须保留预约入口');
assert.match(people,/\.talent-people[\s\S]*?:is\([\s\S]*?\.talent-body\s*>\s*main[\s\S]*?border-color:\s*#f4faff/,
  '人才库必须使用统一低对比边框层级');
assert.match(projects,/\.talent-projects\s+:is\([^}]*border-color:#f4faff/,
  '人才项目必须使用统一低对比边框层级');
assert.match(progress,/\.progress-page>section\{[^}]*border:1px solid #f4faff/,
  '项目进度必须使用统一低对比边框层级');
assert.match(people,/@click="openCreate"/,'新增人才按钮必须可打开创建抽屉');
assert.match(people,/controller\.creating[\s\S]*?class="talent-create-form"/,
  '新增人才必须在右侧抽屉展示字段表单');
assert.doesNotMatch(admin,/新增应用类型/,'后台管理必须移除新增应用类型入口');
assert.match(admin,/class="sort-input"[\s\S]{0,80}type="number"/,'后台排序必须使用数字输入控件');
assert.match(certification, /@click="openBooking\(item\)"/,'认证考试类别必须可点击预约');
assert.match(certification, /class="hero-visual"[\s\S]*?object-fit:\s*cover/,'认证横幅插画必须铺满右侧区域');

console.log('后台、认证与人才页 fresh 低对比边框视觉合同通过');
