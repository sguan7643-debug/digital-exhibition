import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const style = read('src/style.css');
const rpa = read('src/pages/RpaDetailPage.vue');
const report = read('src/pages/ReportDetailPage.vue');
const dashboard = read('src/pages/DashboardDetailPage.vue');

assert.match(style, /\.rpa-detail \.detail-crumb,\.report-detail \.detail-crumb\{height:21px\}/,
  'RPA 与报表面包屑必须按 fresh 对照收敛到 21px，且不得影响未验证的详情路由');
assert.match(style, /\.rpa-detail \.rpa-video\{width:1135px;max-width:100%;height:192px/,
  'RPA 视频必须使用冻结原子素材的 1135×192 原生几何，禁止被全宽拉伸');
assert.match(rpa, /class="preview-wide rpa-video"[^>]*width="1135" height="192"/,
  'RPA 视频 DOM 必须保留原子素材原生尺寸');

assert.match(report, /class="detail-panel usage-panel"/,
  '报表使用说明必须使用冻结参考的紧凑文件行布局');
assert.match(style, /\.product-detail \.usage-panel \.related-row article\{min-height:44px;[^}]*border:0/,
  '使用说明不得复用 75px 关联卡片，避免后续区块累计下移');
assert.match(style, /\.report-detail figcaption\{position:absolute;width:1px/,
  '报表冻结参考未显示截图说明，说明文字必须仅保留为可访问名称');
assert.match(style, /\.report-detail \.info-grid div\{min-height:33px/,
  '报表简介表格必须使用 fresh 对照的紧凑行高');
assert.doesNotMatch(dashboard, /class="detail-panel usage-panel"/,
  '驾驶舱 fresh 对照不得套用报表紧凑说明区而造成纵向回退');

assert.match(style, /\.metric-detail \.detail-crumb\{height:32px\}/,
  '本批 RPA/报表共享密度修复不得改动尚未证实改善的指标页纵向基线');

console.log('应用详情页族 fresh 视觉密度红绿合同通过');
