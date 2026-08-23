import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const globalStyle = read('src/style.css');
const app = read('src/App.vue');
const shell = read('src/components/ExhibitionShell.vue');
const announcements = read('src/pages/AnnouncementsPage.vue');
const talentProjects = read('src/pages/TalentProjectsPage.vue');

function collectSource(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? collectSource(path)
      : /\.(vue|css)$/.test(name) ? [readFileSync(path, 'utf8')] : [];
  }).join('\n');
}

const source = collectSource(fileURLToPath(new URL('../src', import.meta.url)));

assert.match(app, /function normalizeInitialRoute\(\)/,
  '应用必须显式规范化首次进入的根路径');
assert.match(app, /window\.location\.pathname === '\/'[\s\S]*history\.replaceState\([\s\S]*'\/workbench'/,
  '根路径必须用 replaceState 初始化为工作台，不能先渲染不存在页面');

assert.match(globalStyle, /--form-control-focus:#086fe8/,
  '全局表单焦点必须使用冻结蓝色体系');
assert.match(globalStyle, /--form-control-ring:rgba\(8,112,232,\.18\)/,
  '全局表单焦点外环必须使用单层低对比蓝色');
assert.match(globalStyle, /:where\(input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),select,textarea\)\{[^}]*border-color:var\(--form-control-border\)/,
  'input/select/textarea 必须共享默认边框合同');
assert.match(globalStyle, /:where\(input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),select,textarea\):hover:not\(:disabled\)\{[^}]*border-color:var\(--form-control-hover\)/,
  '表单控件必须共享 hover 状态');
assert.match(globalStyle, /:where\(input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),select,textarea\):focus-visible\{outline:0!important;border-color:var\(--form-control-focus\)!important;box-shadow:0 0 0 2px var\(--form-control-ring\)!important\}/,
  '键盘焦点必须是单层蓝色边框与外环，且不改变控件尺寸');
assert.match(globalStyle, /:where\(input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),select,textarea\):disabled\{[^}]*cursor:not-allowed/,
  '表单控件必须共享 disabled 状态');
assert.match(globalStyle, /:where\(input,select,textarea\)\[aria-invalid=true\]\{[^}]*border-color:var\(--form-control-error\)!important/,
  '表单控件必须共享 error 状态');
assert.match(globalStyle, /\.scene-search label:focus-within,\.date-range:focus-within\{[^}]*box-shadow:0 0 0 2px var\(--form-control-ring\)/,
  '场景搜索与日期范围必须由组合外层承载 focus-within');
assert.match(globalStyle, /:is\(\.scene-search label,\.date-range\):focus-within input\{outline:0!important;box-shadow:none!important/,
  '组合控件内层 input 不得重复绘制第二个焦点框');
assert.match(announcements, /class="date-range"/);
assert.match(shell, /class="scene-search"/);
assert.match(talentProjects, /name="name"[^>]*:aria-invalid="Boolean\(controller\.errors\.name\)"/,
  '抽屉表单校验错误必须暴露 aria-invalid 并使用全局 error 合同');

assert.doesNotMatch(source,
  /[^{}]*(?:input|select|textarea)[^{}]*:focus-visible[^{}]*\{[^}]*#ff9f1a/i,
  '页面级 input/select/textarea 不得继续绘制橙色焦点框');
assert.doesNotMatch(source,
  /(?:^|[},])\s*:focus-visible\{[^}]*#ff9f1a/im,
  '含表单页面不得用无边界的橙色 :focus-visible 覆盖全局表单合同');

console.log('默认路由与全局表单控件五态、组合焦点视觉合同通过');
