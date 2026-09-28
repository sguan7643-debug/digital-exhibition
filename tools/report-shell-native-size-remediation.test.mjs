import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const shell = read('src/components/ExhibitionShell.vue');
const report = read('src/pages/ReportDetailPage.vue');
const remoteDetail = read('src/components/RemoteAppDetailPage.vue');

assert.doesNotMatch(shell, /<template v-if="props\.page\.id === '10'">/,
  '报表详情不得绕过统一素材/应用分组侧栏');
assert.doesNotMatch(shell, /\.ui-update-report\{height:auto;min-height:1492px;overflow:visible\}/,
  '报表详情不得让整页滚动并撑大原生画布');
assert.match(shell, /\.exhibition-shell\{height:100vh;overflow:hidden;/,
  '报表详情必须通过统一壳层固定顶栏/左栏并只让主内容纵向滚动');
assert.match(shell, /\.page-frame\{[^}]*grid-template-columns:220px minmax\(0,1fr\)\}/,
  '报表详情必须复用统一的 220px 固定侧栏几何');
assert.match(shell, /main\{[^}]*overflow-y:auto;[^}]*background:#f5f7fa;/,
  '报表详情必须复用统一主内容纵向滚动区域');
assert.match(report, /RemoteAppDetailPage/, '报表详情必须复用统一远端应用详情组件');
assert.match(report, /icon="report"/, '报表详情必须声明报表类型图标');
assert.match(report, /useAppDetailProjection/, '报表详情必须使用飞书远端投影而非静态演示数据');
assert.match(remoteDetail, /class="product-detail remote-app-detail"/,
  '统一远端应用详情必须保留原生详情画布结构');
assert.match(remoteDetail, /AppDetailAuthoritativeBody/,
  '统一远端应用详情必须渲染权威业务内容区');

console.log('报表详情统一固定壳层与远端权威内容合同通过');
