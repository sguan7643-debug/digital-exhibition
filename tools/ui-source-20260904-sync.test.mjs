import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APP_FIXTURES } from "../src/fixtures/mock-data.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const shell = read("src/components/ExhibitionShell.vue");
const icons = read("src/components/TypeLineIcon.vue");
const app = read("src/App.vue");
const apps = read("src/pages/AppsPage.vue");
const favorites = read("src/pages/FavoritesPage.vue");
const announcements = read("src/pages/AnnouncementsPage.vue");
const certification = read("src/pages/CertificationPage.vue");
const admin = read("src/pages/AdminPage.vue");
const training = read("src/pages/TrainingPage.vue");
const points = read("src/pages/PointsPage.vue");
const talent = read("src/pages/TalentPeoplePage.vue");
const talentProjects = read("src/pages/TalentProjectsPage.vue");
const report = read("src/pages/ReportDetailPage.vue");
const dashboard = read("src/pages/DashboardDetailPage.vue");
const operations = read("src/pages/OperationsPage.vue");
const dataset = read("src/pages/DatasetDetailPage.vue");
const indicatorDialog = read("src/components/IndicatorBuildDialog.vue");
const preview = read("src/components/BusinessPreviewGallery.vue");
const style = read("src/style.css");

for (const [name, source] of Object.entries({
  shell,
  style,
  apps,
  favorites,
  announcements,
  certification,
  talent,
  indicatorDialog,
})) {
  assert.doesNotMatch(source, /#(?:003c73|073e78|063d77)\b/i,
    `${name} 不得继续使用旧主色`);
}
assert.match(style, /--xlt-navy-900:\s*#0060a6/i,
  "全局主色变量必须统一为 #0060A6");
assert.match(shell, /\.topbar\{height:69px;[^}]*background:#00396e/i,
  "顶栏必须遵循用户后续批准的 69px 深蓝统一新版样式");

assert.doesNotMatch(shell, /top-(?:message|favorite(?:-active)?)\.png/,
  "顶栏消息与收藏不得继续使用包含文字和角标的位图");
for (const name of ["message", "favorite"]) {
  assert.match(icons, new RegExp(`["']${name}["']`), `缺少顶栏线稿图标：${name}`);
  assert.match(shell, new RegExp(`TypeLineIcon\\s+name="${name}"`));
}
assert.match(shell, /\.catalogue-group h2,\.scene-search h2\{[^}]*font-size:16px;[^}]*font-weight:700/,
  "左侧栏三个板块标题必须放大并加粗");
assert.match(shell, /\.catalogue-group nav a,\.catalogue-group nav button\{[^}]*height:36px;[^}]*font-size:15px;[^}]*font-weight:400/,
  "左侧栏分类文字必须放大并保持常规字重");
assert.match(shell, /max-width:940px\)[^}]*\{\.catalogue-group nav a,\.catalogue-group nav button\{[^}]*font-size:14px/,
  "150px 中屏侧栏必须保留防溢出的字号回退");

for (const token of [
  "--xlt-font-caption: clamp(13px",
  "--xlt-font-body: clamp(15px",
  "--xlt-font-page-title: clamp(26px",
]) assert.ok(style.includes(token), `缺少响应式字号令牌：${token}`);
assert.match(style, /select:not\(\[multiple\]\)\s*\{[^}]*appearance:none;[^}]*background-image:/s,
  "筛选下拉必须使用统一深蓝线稿箭头");
assert.match(style, /\.notice-filters select:not\(\[multiple\]\)\s*\{[^}]*#0060a6[^}]*#0060a6/s,
  "公告筛选下拉图标必须与公告主按钮使用同一蓝色");
assert.match(style, /\.notice-filters input\[type="date"\]::\-webkit-calendar-picker-indicator\s*\{[^}]*filter:/s,
  "公告日期筛选图标必须使用统一蓝色处理");

assert.match(report, /BusinessPreviewGallery\s+variant="report"/);
assert.match(dashboard, /BusinessPreviewGallery\s+variant="dashboard"/);
assert.doesNotMatch(report + dashboard, /(?:report|dashboard)-previews\.png/);
assert.match(preview, /收入与利润总览/);

assert.doesNotMatch(apps, /class="app-type-overview"/,
  "应用中心默认首屏不得保留后来被权威参考撤销的类型统计区");
assert.match(apps, /props\.integrationData\?\.\['APP-001'\]/,
  "应用中心仍须保留真实筛选元数据适配");
assert.match(apps, /props\.integrationData\?\.\['APP-002'\]\?\.items/,
  "应用中心仍须保留真实应用列表适配");
assert.match(apps, /\.onboarding-link\s*\{[^}]*width:\s*176px;[^}]*height:\s*44px;[^}]*font-size:\s*15px;[^}]*font-weight:\s*700/s,
  "应用上架申请按钮必须更大、更醒目");
assert.match(apps, /\.apps-filter label\s*\{[^}]*font-size:\s*14px;[^}]*font-weight:\s*600/s,
  "应用筛选标签字号与字重必须统一");
assert.match(apps, /\.apps-filter input,[\s\S]*?\.apps-filter select\s*\{[^}]*height:\s*42px;[^}]*font-size:\s*14px;[^}]*font-weight:\s*400/s,
  "应用筛选输入框与下拉框字号、高度必须统一");
assert.match(apps, /\.apps-grid\.list-view\s*>\s*article\s*\{[^}]*grid-template-columns:[^}]*minmax\(360px,[^}]*minmax\(380px/s,
  "应用列表视图必须为标题、简介、数据和操作保留独立列宽");
assert.match(apps, /@media\s*\(max-width:\s*1600px\)[\s\S]*?\.apps-grid\.list-view\s*>\s*article\s*\{[^}]*repeat\(2,/,
  "应用列表视图必须在中等宽度主动收敛，避免文字与按钮截断");
assert.match(style, /\.detail-hero-side\s*\{[^}]*grid-template-columns:\s*repeat\(2,[^}]*gap:\s*10px 12px/s,
  "详情页操作按钮必须使用稳定的两列布局");
assert.match(style, /\.detail-hero-side \.metric-build-trigger\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/,
  "个性化指标构建按钮必须占满独立一行");
assert.match(report + dashboard, /:aria-label="`下载 \$\{name\}`"[\s\S]*?>\s*下载\s*<\/button>/,
  "附件操作列必须显示简洁下载按钮，并保留完整无障碍名称");
assert.match(points, /grid-template-columns:40px minmax\(0,1fr\) 108px 118px/,
  "最近积分动态必须为积分与时间保留稳定列宽");
assert.match(points, /\.dynamic-panel li>b\{[^}]*white-space:nowrap/,
  "积分数值与单位不得断行");
assert.match(talent, /grid-template-columns: minmax\(260px, 1\.5fr\) repeat\(4, minmax\(160px, 1fr\)\) 80px 80px/,
  "人才筛选栏必须使用可读的弹性列宽");
assert.match(talent, /grid-template-columns: minmax\(0, 1fr\) clamp\(520px, 38vw, 680px\)/,
  "新增人才抽屉必须提供足够表单宽度");
assert.match(talentProjects, /grid-template-columns:minmax\(280px,1\.5fr\) repeat\(4,minmax\(160px,1fr\)\) 80px 80px/,
  "人才项目筛选栏必须使用可读的弹性列宽");
assert.match(operations, /\.ranking li\{[^}]*min-height:29px;[^}]*font-size:14px;line-height:1\.4/,
  "热门应用排行必须使用清晰字号与行距");
assert.match(announcements, /td\s*\{[^}]*height:\s*74px;[^}]*font-size:\s*14px/s,
  "公告列表必须使用清晰字号与行高");
assert.match(admin, /\.backend-page table\s*\{[^}]*font-size:\s*14px/s,
  "后台配置表必须使用可读字号");

assert.match(certification, /<a\s+class="hero-primary"\s+href="#study">\s*工具学习/);
assert.match(certification, /\.hero-primary\s*\{[^}]*color:\s*#fff\s*!important;[^}]*background:\s*#0060a6/);
assert.match(certification, /\.hero-visual img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover/);
assert.match(certification, /<section\s+id="study"\s+class="learning-card"[\s\S]*?class="learning-filters"[\s\S]*?认证方向 \/ 应用类型[\s\S]*?场景域搜索/,
  "认证方向与场景域搜索必须合并进工具学习模块");
assert.match(certification, /class="platform-service"[\s\S]*?数字化认证平台[\s\S]*?认证服务/,
  "数字化认证平台与认证服务必须合并为一个画布模块");
assert.doesNotMatch(certification, /class="cert-filter"/,
  "认证页面不得保留独立旧筛选侧栏");
assert.match(certification, /@click="openBooking\(item\)"/);

assert.doesNotMatch(admin, /新增应用类型/);
assert.match(admin, /TypeLineIcon/);
assert.match(admin, /class="sort-input"[\s\S]{0,90}type="number"[\s\S]{0,90}min="1"/);

assert.doesNotMatch(training, /training-course-\d+\.png/);
assert.match(training, /<dl class="course-status">[\s\S]*?报名人数[\s\S]*?活动形式/,
  "培训卡片必须分段展示报名状态");
assert.match(training, /\.course-grid\s*>\s*article\s*\{[^}]*min-height:\s*340px/,
  "培训卡片必须使用更方正、可容纳分段文字的最终高度");
assert.match(apps, /\.apps-grid\s*>\s*article\s*\{[^}]*min-height:\s*314px/,
  "应用卡片必须提高纵向比例");
assert.match(favorites, /\.favorite-grid\s*\{[\s\S]*?repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
  "我的收藏必须与应用中心保持同一桌面三列卡片排版");
assert.match(favorites, /class="detail-action"[\s\S]{0,150}>查看详情<\/a/,
  "收藏卡片查看详情必须使用独立、可校准的操作类");
assert.match(favorites, /\.favorite-grid footer \.detail-action,[\s\S]*?color:\s*#fff;[\s\S]*?background:\s*#0060a6/,
  "收藏查看详情必须保持白字深蓝底的可读对比度");
assert.match(favorites, /@media\s*\(max-width:\s*1000px\)[\s\S]*?\.favorite-grid footer\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  "收藏操作区在中窄分辨率必须收敛为两列，避免文字被裁切");
assert.match(points, /class="source-icon"[\s\S]{0,180}<AppIcon[^>]*:size="52"/,
  "积分来源的手绘矢量图标必须进入统一尺寸容器");
assert.match(points, /\.source-icon\{width:64px;height:64px;display:grid;place-items:center;/,
  "积分来源图标容器必须统一水平与垂直对齐");
assert.match(points, /@media\(max-width:1100px\)\{\.point-layout\{grid-template-columns:1fr\}/,
  "积分内容区必须在中等分辨率提前收敛，避免来源卡片挤压");

for (const appFixture of APP_FIXTURES) {
  assert.ok(appFixture.department?.trim(), `${appFixture.name} 缺少负责部门`);
  assert.ok(appFixture.developerDepartment?.trim(), `${appFixture.name} 缺少开发部门`);
}
for (const source of [apps, favorites]) {
  const departmentIndex = source.indexOf("<dt>负责部门</dt>");
  assert.ok(departmentIndex >= 0 && departmentIndex < source.indexOf("<dt>负责人</dt>") &&
    source.indexOf("<dt>负责人</dt>") < source.indexOf("<dt>开发者</dt>"),
  "应用卡片字段必须按负责部门、负责人、开发者顺序展示");
}
for (const source of [apps, favorites]) {
  assert.match(source, /(?:apps|favorite)-grid dd\s*\{[^}]*font-weight:\s*400/s,
    "应用与收藏卡片事实字段必须使用常规字重");
  assert.match(source, /(?:apps-grid h2|favorite-title-row h2)\s*\{[^}]*font-weight:\s*600/s,
    "应用与收藏卡片仅标题保留加粗层级");
}
assert.match(favorites, /APP_FIXTURES\.map\(\(app\)\s*=>\s*\[app\.route, app\.department\]\)/,
  "收藏卡片负责部门必须复用应用元数据");

for (const source of [report, dashboard]) {
  assert.match(source, /IndicatorBuildDialog/);
  assert.match(source, /个性化指标构建/);
  assert.doesNotMatch(source, /申请复用/);
}
assert.doesNotMatch(dataset, /申请复用|个性化指标构建/,
  "数据集详情不得提供申请复用或指标构建操作");
for (const field of ["指标名称", "数据范围", "构建目标", "指标口径", "期望完成时间", "补充说明"]) {
  assert.ok(indicatorDialog.includes(field), `指标构建弹框缺少字段：${field}`);
}
assert.match(indicatorDialog, /reportValidity\(\)/);
assert.match(indicatorDialog, /type="submit">发起申请/);

assert.match(talent, /role="dialog"/);

assert.match(announcements, /class="publish-notice"[^>]*href="\/operations\/announcements\/notice-001\/edit"[^>]*>\s*发布公告/,
  "公告通知页面必须提供发布公告入口");

console.log("30 路由 UI 源同步视觉合同通过");
