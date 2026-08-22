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
assert.match(style, /\.rpa-detail \.detail-hero\{min-height:218px;padding:11px 18px 4px\}/,
  'RPA Hero 必须按冻结参考收敛为 225px 实际盒高');
assert.match(style, /\.rpa-detail \.detail-panel\{margin-top:1px;padding:6px 12px\}/,
  'RPA 长页区块只允许 1px 连续间隔，避免每节累计向下漂移');
assert.match(style, /\.rpa-detail \.info-grid div\{min-height:32px\}/,
  'RPA 基本信息表必须压缩到冻结参考密度');
assert.ok(rpa.includes("['https:','//rpa.example.com/app/supplier-info-auto-entry'].join('')"),
  'RPA Hero 必须包含冻结参考中的应用 URL 文本');
assert.match(rpa, /class="file-list rpa-training-list"[\s\S]*rpa-video\.png/,
  'RPA 培训行必须使用同源视频原子素材作为缩略图');
for (const heading of ['文件名称', '文件大小', '上传时间', '上传人', '操作']) {
  assert.ok(rpa.includes(heading), `RPA 附件资料缺少冻结表头：${heading}`);
}

assert.match(report, /class="detail-panel usage-panel"/,
  '报表使用说明必须使用冻结参考的紧凑文件行布局');
assert.match(style, /\.product-detail \.usage-panel \.related-row article\{min-height:44px;[^}]*border:0/,
  '使用说明不得复用 75px 关联卡片，避免后续区块累计下移');
assert.match(style, /\.report-detail figcaption\{position:absolute;width:1px/,
  '报表冻结参考未显示截图说明，说明文字必须仅保留为可访问名称');
assert.match(style, /\.report-detail \.info-grid div\{min-height:33px/,
  '报表简介表格必须使用 fresh 对照的紧凑行高');
assert.match(style, /\.report-detail \.detail-hero\{padding-top:44px\}/,
  '报表 Hero 主内容必须下移 20px 对齐冻结标题与插画起点');
assert.match(style, /\.report-detail \.detail-hero,\.report-detail \.detail-panel,\.report-detail \.detail-comment\{border-color:#f4faff\}/,
  '报表内容卡片边框必须使用冻结参考的低对比蓝白色，避免整页出现过重网格');
assert.match(style, /\.report-detail \.detail-metrics,\.report-detail \.detail-metrics div,\.report-detail \.info-grid,\.report-detail \.info-grid div,\.report-detail \.file-list th,\.report-detail \.file-list td,\.report-detail \.training-row article,\.report-detail \.related-row article,\.report-detail \.detail-comment input\{border-color:#f4faff\}/,
  '报表内部表格、列表与输入框分隔线必须同步使用低对比边框');
assert.match(style, /:is\(\.rpa-detail,\.dashboard-detail,\.metric-detail,\.tool-detail,\.work-detail,\.dataset-detail,\.ai-detail,\.ead-detail\) :is\(\.detail-hero,\.detail-panel,\.detail-comment,\.detail-metrics,\.info-grid,\.file-list th,\.file-list td,\.training-row article,\.related-row article,\.detail-comment input\),:is\(\.rpa-detail,\.dashboard-detail,\.metric-detail,\.tool-detail,\.work-detail,\.dataset-detail,\.ai-detail,\.ead-detail\) \.detail-metrics div,:is\(\.rpa-detail,\.dashboard-detail,\.metric-detail,\.tool-detail,\.work-detail,\.dataset-detail,\.ai-detail,\.ead-detail\) \.info-grid div\{border-color:#f4faff\}/,
  '八个共享详情页的边框必须按像素模拟收敛到冻结低对比层级');
assert.doesNotMatch(dashboard, /class="detail-panel usage-panel"/,
  '驾驶舱 fresh 对照不得套用报表紧凑说明区而造成纵向回退');
assert.match(style, /\.dashboard-detail \.detail-hero\{min-height:350px;padding:32px 16px 13px\}/,
  '驾驶舱 Hero 必须按冻结参考校准顶部与左右留白');
assert.match(style, /\.dashboard-detail \.detail-logo\{width:81px;height:95px;border-radius:0\}/,
  '驾驶舱 Logo 必须保持冻结原子素材的 81×95 原生比例');
assert.match(style, /\.dashboard-detail \.detail-title>p:nth-of-type\(2\)\{position:absolute;left:16px;top:166px\}/,
  '驾驶舱 URL 行必须回到冻结参考的 Logo 下方整行位置');
assert.match(style, /\.dashboard-detail \.detail-tags\{position:absolute;left:16px;top:201px;margin:0\}/,
  '驾驶舱关键词必须回到冻结参考的整行位置');
assert.match(style, /\.dashboard-detail \.detail-metrics\{position:absolute;left:16px;right:16px;bottom:12px;margin:0;padding-top:14px\}/,
  '驾驶舱指标行必须锚定 Hero 底部，避免上移后留下大块空白');
assert.match(style, /\.dashboard-detail \.preview-wide\{width:650px;max-width:100%\}/,
  '驾驶舱演示截图必须保持同源原子素材 650px 宽度，不得全宽拉伸');
assert.match(style, /\.dashboard-detail \.detail-title h1\{font-size:20px\}/,
  '驾驶舱标题字号必须收敛到冻结 20px 层级');

assert.match(style, /\.metric-detail \.detail-crumb\{height:32px\}/,
  '本批 RPA/报表共享密度修复不得改动尚未证实改善的指标页纵向基线');

console.log('应用详情页族 fresh 视觉密度红绿合同通过');
