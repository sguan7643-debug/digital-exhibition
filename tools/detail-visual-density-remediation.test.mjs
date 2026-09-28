import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const style = read("src/style.css");
const app = read("src/App.vue");
const remoteDetail = read("src/components/RemoteAppDetailPage.vue");
const authoritativeBody = read("src/components/AppDetailAuthoritativeBody.vue");
const liveSections = read("src/components/AppDetailLiveSections.vue");
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
  assert.match(source, /import RemoteAppDetailPage from/, `${page} 必须复用统一远端详情组件`);
  assert.match(source, /useAppDetailProjection/, `${page} 必须使用飞书远端应用投影`);
  assert.match(
    source,
    new RegExp(`RemoteAppDetailPage[^>]+icon="${icon}"`),
    `${page} 必须关联正确的应用类型图标`,
  );
  assert.doesNotMatch(source, /class="detail-illustration"/, `${page} 不得保留 Hero 装饰插图`);
}

assert.match(remoteDetail, /import TypeLineIcon from/, "统一详情组件必须复用线稿图标组件");
assert.match(remoteDetail, /class="detail-logo detail-type-icon"/, "统一详情组件必须使用标准图标容器");
assert.match(remoteDetail, /<TypeLineIcon :name="icon"/, "统一详情组件必须渲染页面声明的图标");
assert.match(remoteDetail, /AppDetailRemoteFacts/, "统一详情组件必须展示真实应用基础信息");
assert.match(remoteDetail, /AppDetailAuthoritativeBody/, "统一详情组件必须展示权威业务详情");
assert.match(authoritativeBody, /projection\.remoteMode/, "权威详情仅可由远端模式驱动");
for (const section of ["核心功能", "字段定义", "流程步骤", "预览", "视频", "附件", "使用指南", "相关培训"]) {
  assert.ok(authoritativeBody.includes(section), `权威详情缺少内容区：${section}`);
}
assert.match(app, /<app-detail-live-sections[\s\S]*Number\(page\.id\) >= 8[\s\S]*Number\(page\.id\) <= 16/,
  "九类应用详情必须挂载真实关联素材、附件和评论区");
assert.match(liveSections, /startSameOriginDownload/, "详情下载必须使用同源安全下载通道");
assert.match(liveSections, /测试申请使用/, "详情必须保留 TEST_ 隔离的申请使用验证入口");
assert.match(liveSections, /测试申请复用/, "详情必须保留 TEST_ 隔离的申请复用验证入口");
assert.match(liveSections, /测试收藏/, "详情必须保留 TEST_ 隔离的收藏验证入口");
assert.match(liveSections, /测试评论/, "详情必须保留 TEST_ 隔离的评论验证入口");

console.log("应用详情统一远端投影、线稿图标与真实业务区合同通过");
