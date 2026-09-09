import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const style = read("src/style.css");
const details = Object.entries({
  RpaDetailPage: "rpa",
  ReportDetailPage: "report",
  DashboardDetailPage: "visual",
  DatasetDetailPage: "dataset",
  MetricDetailPage: "metric",
  AiDetailPage: "ai",
  EadDetailPage: "ead",
  HainengWorkDetailPage: "work",
  ToolDetailPage: "tools",
}).map(([page, icon]) => ({ page, icon, source: read(`src/pages/${page}.vue`) }));

assert.match(
  style,
  /\.product-detail \.detail-hero,\.product-detail \.detail-panel,\.product-detail \.detail-comment\{background:#fafcff;/,
  "详情页内容表面必须保持统一的蓝白色",
);
assert.match(
  style,
  /\.detail-logo\.detail-type-icon\s*\{[^}]*width:\s*74px;[^}]*height:\s*74px;[^}]*color:\s*var\(--xlt-navy-900\)/,
  "详情页类型图标必须使用统一尺寸与深蓝线稿色",
);
assert.match(
  style,
  /\.product-detail \.detail-illustration\s*\{\s*display:\s*none!important;/,
  "详情页 Hero 装饰插图必须从布局中移除",
);

for (const { page, icon, source } of details) {
  assert.match(source, /import TypeLineIcon from/, `${page} 必须复用统一线稿图标组件`);
  assert.match(source, /class="detail-logo detail-type-icon"/, `${page} 必须使用统一详情图标容器`);
  assert.match(
    source,
    new RegExp(`TypeLineIcon\\s+name="${icon}"`),
    `${page} 必须关联正确的应用类型图标`,
  );
  assert.doesNotMatch(source, /class="detail-illustration"/, `${page} 不得保留 Hero 装饰插图`);
}

const rpa = details.find(({ page }) => page === "RpaDetailPage").source;
assert.match(
  style,
  /\.rpa-detail \.rpa-video\{width:1135px;max-width:100%;height:192px/,
  "RPA 视频必须保留清晰素材的原生几何",
);
assert.match(
  rpa,
  /class="preview-wide rpa-video"[\s\S]{0,180}width="1135"[\s\S]{0,80}height="192"/,
  "RPA 视频 DOM 必须声明原生尺寸",
);
assert.match(rpa, /rpaDisplayUrl/, "RPA Hero 必须显示应用 URL");
assert.match(
  rpa,
  /class="file-list rpa-training-list"[\s\S]*rpa-video\.png/,
  "RPA 培训行必须使用同源视频素材作为缩略图",
);
for (const heading of ["文件名称", "文件大小", "上传时间", "上传人", "操作"]) {
  assert.ok(rpa.includes(heading), `RPA 附件资料缺少表头：${heading}`);
}

const report = details.find(({ page }) => page === "ReportDetailPage").source;
const dashboard = details.find(({ page }) => page === "DashboardDetailPage").source;
for (const [label, source, variant] of [
  ["报表", report, "report"],
  ["驾驶舱", dashboard, "dashboard"],
]) {
  assert.match(
    source,
    new RegExp(`BusinessPreviewGallery\\s+variant="${variant}"`),
    `${label}演示区必须使用清晰业务图表组件`,
  );
  assert.doesNotMatch(
    source,
    new RegExp(`${variant}-previews\\.png`),
    `${label}演示区不得拉伸低分辨率拼接图`,
  );
  assert.match(source, /IndicatorBuildDialog/, `${label}详情必须提供个性化指标构建申请弹框`);
  assert.match(source, /个性化指标构建/, `${label}详情必须展示个性化指标构建操作`);
  assert.doesNotMatch(source, /申请复用/, `${label}详情不得保留旧的申请复用文案`);
}
assert.match(report, /id="usage"/, "报表使用说明必须提供直接进入锚点");

const dataset = details.find(({ page }) => page === "DatasetDetailPage").source;
assert.doesNotMatch(dataset, /申请复用/, "数据集详情必须删除申请复用按钮");

console.log("应用详情统一图标、清晰预览与访问操作合同通过");
