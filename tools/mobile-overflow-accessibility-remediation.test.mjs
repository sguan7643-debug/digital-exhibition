import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const h5 = read('src/h5.css');
const shell = read('src/components/ExhibitionShell.vue');
const gallery = read('src/components/BusinessPreviewGallery.vue');

assert.doesNotMatch(h5, /html,\s*\n\s*body,\s*\n\s*#app\s*\{[^}]*overflow:\s*hidden/s,
  '移动适配不得用根级 overflow:hidden 掩盖页面宽度缺陷');
assert.doesNotMatch(h5, /#main-content\s*\{[^}]*overflow-x:\s*hidden/s,
  '主内容不得用 overflow-x:hidden 裁掉不可达内容');
assert.match(shell, /@media\(max-width:760px\)\{[\s\S]*\.ui-update-workbench \.page-frame,[\s\S]*\.ui-update-apps \.page-frame,[\s\S]*\.ui-update-report \.page-frame,[\s\S]*\.certification-shell \.page-frame\{grid-template-columns:minmax\(0,1fr\)/,
  '所有路由壳层变体必须在 760px 下最终归一为单列');
assert.match(shell, /\.ui-update-report\{height:100dvh;min-height:0;overflow:hidden\}/,
  '报表详情移动壳必须恢复固定顶栏和主内容局部纵向滚动');
assert.match(shell, /\.topbar\{height:auto;min-height:63px;overflow:visible/,
  '移动顶栏必须按两行内容增高，不得裁掉横向导航');
assert.match(shell, /\.certification-shell \.page-frame\{[^}]*grid-template-rows:minmax\(0,auto\) minmax\(0,1fr\)/,
  '移动侧栏与主内容必须分配可达的独立纵向区域');
for (const selector of ['.talent-body main>form','.progress-page>section>form']) {
  assert.ok(h5.includes(selector), `窄屏单列合同必须覆盖真实筛选表单 ${selector}`);
}

assert.match(shell, /function decorateHorizontalScrollRegions\(\)/,
  '共享壳必须统一增强宽表的局部滚动语义');
assert.match(shell, /region\.classList\.add\('horizontal-scroll-region'\)[\s\S]*region\.tabIndex\s*=\s*0[\s\S]*setAttribute\('role',\s*'region'\)[\s\S]*setAttribute\('aria-label'/,
  '局部滚动区必须可聚焦并提供 role 与名称');
for (const token of ['.table-scroll','.talent-body main>section','.progress-table','.point-table','.admin-table','.app-admin-table','.notice-table']) {
  assert.ok(shell.includes(token), `共享滚动增强必须覆盖 ${token}`);
}

assert.match(gallery, /<caption>\{\{ card\.title \}\}趋势数据<\/caption>/,
  '趋势图必须提供可感知标题');
assert.match(gallery, /<th scope="col">周期<\/th>[\s\S]*<th scope="col">实际值<\/th>[\s\S]*<th scope="col">目标值<\/th>/,
  '趋势图必须提供类别、实际值与目标值的完整文本等价表格');
assert.match(gallery, /v-for="\(period,periodIndex\) in periods"/,
  '趋势图文本等价信息必须逐项覆盖全部周期');

console.log('360px 路由壳、局部横向滚动与图表文本等价合同通过');
