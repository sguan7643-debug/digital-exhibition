import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const shell = read('src/components/ExhibitionShell.vue');
const workbench = read('src/pages/WorkbenchPage.vue');
const workbenchAuthority = workbench;

for (const label of ['应用中心', '全部应用', '可视化', '报表', 'RPA', '数据集', '指标', 'AI', '海能work应用', 'EAD', '其他工具', '场景化搜索']) {
  assert.ok(shell.includes(label), `工作台侧栏缺少：${label}`);
}

for (const content of [
  '数据截至：',
  '最后更新：',
  'appTypeOverview',
  'hotApps',
  'courses',
  'announcements',
  '应用访问次数',
  '应用使用次数',
  '收藏应用数'
]) {
  assert.ok(workbenchAuthority.includes(content), `工作台缺少权威内容：${content}`);
}
assert.match(workbench, /remote\?\.greeting\.text\|\|'欢迎使用数智产品展厅'/,
  '工作台问候语必须绑定真实首页数据，不能固化测试人员姓名');

assert.match(workbench, /\/assets\/hero-ocean\.png/,
  '工作台保留权威 Hero 原子插图');
assert.match(workbench, /const heroAvatarUrl=computed/,
  '工作台头像必须通过受控的同源地址投影');
assert.match(workbench, /url\.origin===window\.location\.origin/,
  '工作台不得让浏览器直接请求飞书头像外链');
assert.match(workbench, /assets\/top-avatar\.png/,
  '远端头像不可同源加载时必须回退到本地默认头像');
assert.doesNotMatch(workbench, /:src="remote\.profile\.avatarUrl"/,
  '工作台不得把飞书头像地址直接绑定到浏览器图片请求');
assert.match(workbench, /mapRemoteApp\(item\)/,
  '热门应用必须使用统一远端应用映射');
assert.match(workbench, /item\.coverUrl\|\|''/,
  '培训课程图片必须优先使用远端素材地址');
assert.doesNotMatch(workbench, /2026年8月19日/);
assert.match(
  workbench,
  /\.notice-panel li a\{[^}]*grid-template-columns:104px minmax\(0,1fr\) 104px/,
  '公告通知行必须为放大后的分类标签和时间保留稳定列宽'
);
assert.match(
  workbench,
  /\.notice-panel mark\{[^}]*min-width:90px[^}]*white-space:nowrap/,
  '公告分类标签不得因字号放大而换行或挤压列表标题'
);

console.log('首页工作台权威布局与原子资产合同测试通过');
