import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const workbench = read('src/pages/WorkbenchPage.vue');
const apps = read('src/pages/AppsPage.vue');
const training = read('src/pages/TrainingPage.vue');
const certification = read('src/pages/CertificationPage.vue');
const shell = read('src/components/ExhibitionShell.vue');
const typeLineIcon = read('src/components/TypeLineIcon.vue');
const talent = read('src/pages/TalentPeoplePage.vue');
const globalStyle = read('src/style.css');
const detailSources = [
  'ToolDetailPage.vue', 'HainengWorkDetailPage.vue', 'ReportDetailPage.vue',
  'DashboardDetailPage.vue', 'DatasetDetailPage.vue', 'MetricDetailPage.vue',
  'AiDetailPage.vue', 'EadDetailPage.vue', 'RpaDetailPage.vue'
].map(file => read(`src/pages/${file}`));
const calibration = JSON.parse(read('src/fixtures/visual-calibration-results.json'));
const manifest = JSON.parse(read('src/fixtures/asset-manifest.json'));

for (const composite of [
  'workbench-hero-reference.png',
  'training-hero-reference.png',
  'certification-hero-reference.png'
]) {
  assert.ok(!existsSync(new URL(`public/assets/${composite}`, root)), `${composite} 不得作为复合截图存在`);
  assert.doesNotMatch(workbench + training + certification, new RegExp(composite.replace('.', '\\.')));
}

for (const label of ['上午好，张三丰', '活动总数', '报名中', '即将开始', '工具学习', '考试预约']) {
  assert.ok((workbench + training + certification).includes(label), `复合截图替换后缺少真实 HTML：${label}`);
}
for (const atomic of [
  'hero-ocean.png', 'training-hero-illustration.png', 'certification-hero-illustration.png',
  'training-stat-total.png', 'training-stat-registered.png', 'training-stat-soon.png'
]) {
  assert.ok(existsSync(new URL(`public/assets/${atomic}`, root)), `缺少权威 UI 原子素材：${atomic}`);
}

assert.doesNotMatch(shell, /\.standard-shell \.topbar\s*\{/);
assert.match(shell, /\.standard-shell \.page-frame\{grid-template-columns:220px/);
assert.match(shell, /\.primary-nav\{[^}]*overflow-x:auto/);
assert.doesNotMatch(shell, /primary-nav a:nth-child\(n\+7\)[^{]*\{[^}]*display\s*:\s*none/);
assert.match(shell, /TypeLineIcon/);
for (const icon of ['materials', 'apps', 'visual', 'report', 'rpa', 'dataset', 'metric', 'ai', 'work', 'ead', 'tools']) {
  assert.ok(typeLineIcon.includes(`name === '${icon}'`) || (icon === 'tools' && typeLineIcon.includes('v-else')), `统一线稿图标缺少：${icon}`);
}
assert.doesNotMatch(shell, /class="action-link"[^>]*>[\s\S]{0,180}<small>/);

for (const text of ['应用名称或关键词', '请输入应用名称或关键词', '标签', '请选择标签', '应用类型', '请选择应用类型', '主题域', '请选择主题域']) {
  assert.ok(apps.includes(text), `应用中心筛选视觉合同缺少：${text}`);
}
assert.match(apps, /\.apps-filter\{[^}]*display:flex;[^}]*flex-wrap:wrap/, '筛选项按可用宽度换行');

for (const text of ['人才库', '所属部门：', '领域\/专业：', '责任科室：', '本期是否在库：', '轮岗计划-开始时间', '轮岗计划-结束时间', '人才详情']) {
  assert.ok(talent.includes(text), `人才库权威视觉合同缺少：${text}`);
}
assert.match(talent, /grid-template-columns:\s*minmax\(260px,\s*1\.5fr\)\s+repeat\(4,\s*minmax\(160px,\s*1fr\)\)\s+80px\s+80px/,
  '人才筛选栏必须使用可读的弹性列宽，不得回退到早期窄列');
assert.match(talent, /tbody tr\[aria-selected=(?:"true"|true)\]\s*\{\s*background:\s*#eef5ff/,
  '人才库只能高亮用户实际选中的行，初始不得伪造首行选中');
assert.doesNotMatch(talent, />×</);

assert.match(shell, /@media\(min-width:761px\) and \(max-width:940px\)\{[^}]*grid-template-columns:220px/,
  '窄桌面仍须保留统一的 220px 目录栏');
assert.match(shell, /@media\(min-width:941px\) and \(max-width:1600px\)\{[^}]*grid-template-columns:220px/,
  '941–1600px 参考必须保留获批的 220px 固定目录栏');
assert.match(shell, /\.exhibition-shell\{height:100vh;overflow:hidden;display:grid;grid-template-columns:minmax\(0,1fr\);grid-template-rows:auto minmax\(0,1fr\)\}/,
  '页面壳必须锁定 viewport，禁止 document 整体纵向滚动');
assert.match(shell, /\.page-frame\{min-height:0;[^}]*grid-template-columns:220px minmax\(0,1fr\)\}/,
  '固定顶栏下方区域必须允许右侧滚动容器收缩');
assert.match(shell, /\.sidebar\{min-height:0;[^}]*overflow-y:auto/,
  '左侧导航必须固定在壳层并在自身内容超高时独立滚动');
assert.match(shell, /main\{min-width:0;min-height:0;overflow-y:auto/,
  '只有右侧主要内容区域可以纵向滚动');
assert.match(shell, /'certification-shell': props\.page\.id === '27'/,
  '数字化认证必须有冻结参考专属的壳层视觉几何标识');
assert.doesNotMatch(shell, /\.certification-shell \.topbar\{/,
  '数字化认证应直接继承全站 63px 顶部导航高度，不得单独覆盖');
assert.match(shell, /\.certification-shell \.page-frame\{grid-template-columns:220px minmax\(0,1fr\)\}/,
  '数字化认证应与全站共享 220px 左侧导航宽度');
assert.equal((shell.match(/\.certification-shell \.topbar\{/g) || []).length, 0,
  '数字化认证壳层不得保留独立顶栏几何规则');
assert.match(certification, /:global\(#main-content\)\s*>\s*\.cert-page\s*\{[\s\S]*?padding:\s*18px 20px 28px/,
  '数字化认证页必须使用统一内容边距并让横幅充满可用区域');
assert.match(shell, /@media\(min-width:761px\) and \(max-width:1000px\)\{[\s\S]*?\.primary-nav a\{[^}]*flex:0 0 auto/,
  '中等分辨率顶栏必须保持不压缩的导航项，并通过基础横向滚动保持全部目的地可达');
assert.doesNotMatch(shell, /@media\(min-width:761px\) and \(max-width:1000px\)[\s\S]*?font-size:(?:8|9)px/,
  '中等分辨率下不得把顶栏文字压缩到 8–9px');
assert.match(globalStyle, /\.product-detail \.file-list\{[^}]*table-layout:fixed/,
  '详情表格必须在右侧主内容宽度内布局，禁止撑出横向滚动');
assert.match(globalStyle, /@media\(min-width:761px\) and \(max-width:1000px\)\{[\s\S]*\.product-detail \.detail-metrics div\{min-width:0;padding:0 4px\}/,
  '窄幅详情指标必须允许收缩并保持七列完整可见');
assert.match(globalStyle, /\.product-detail \.training-row article,\.product-detail \.related-row article\{min-width:0/,
  '详情卡片必须允许网格收缩，禁止右侧内容被裁掉');
assert.doesNotMatch(globalStyle, /@media\(max-width:1000px\)\{\.product-detail/,
  '845–963px 原生详情参考不能触发产品详情堆叠，避免整页高度膨胀');
for (const source of detailSources) {
  assert.match(source, /TypeLineIcon/, '每个应用详情必须使用统一线稿类型图标');
  assert.doesNotMatch(source, /class="detail-illustration"/, '应用详情 Hero 不得保留装饰插图');
}
assert.match(globalStyle, /\.product-detail \.detail-logo\.detail-type-icon\s*\{[^}]*width:74px;[^}]*height:74px/,
  '应用详情图标必须使用统一的 74px 方形线稿容器');
assert.match(globalStyle, /\.product-detail\s*>\s*\.detail-hero\s*\{\s*min-height:0/,
  '删除 Hero 插图后详情头部必须按内容自适应高度');
assert.match(globalStyle, /@media\(min-width:761px\) and \(max-width:1000px\)[\s\S]*min-width:68px/,
  '窄幅详情操作按钮必须同排，不能因 92px 最小宽度换行');
assert.match(globalStyle, /\.rpa-detail \.detail-hero\{min-height:218px;padding:11px 18px 4px\}/,
  'RPA Hero 必须按 fresh 1228px 对照收敛到 225px 实际盒高');
assert.match(globalStyle, /\.rpa-detail \.file-list th,\.rpa-detail \.file-list td\{height:19px/,
  'RPA 培训与附件表格必须保持冻结参考的紧凑行高');
assert.match(globalStyle, /\.rpa-detail \.related-row article\{min-height:52px/,
  'RPA 关联素材卡必须保持冻结参考的紧凑高度');

assert.equal(calibration.schema, 'xlt-phase-1-visual-calibration-v1');
assert.equal(calibration.result, 'failed');
assert.equal(calibration.rows.length, 30);
for (const row of calibration.rows) {
  assert.match(row.id, /^\d{2}$/);
  assert.match(row.referenceFileSha256, /^[A-F0-9]{64}$/);
  assert.match(row.referenceRgbSha256, /^[A-F0-9]{64}$/);
  assert.match(row.screenshotFileSha256, /^[A-F0-9]{64}$/);
  assert.match(row.screenshotRgbSha256, /^[A-F0-9]{64}$/);
  assert.equal(row.status, 'failed');
  assert.ok(row.rawFloatSsim === null || (row.rawFloatSsim >= 0 && row.rawFloatSsim < 0.95));
}

assert.equal(manifest.schema, 'xlt-mp-as-au-v1');
assert.equal(manifest.result, 'failed');
assert.equal(manifest.pages.length, 30);
assert.equal(manifest.technicalMapping.referencedAssetCount, manifest.assets.length);
assert.equal(manifest.technicalMapping.sourceCoordinateMapped, manifest.assets.length);
assert.equal(manifest.technicalMapping.coverage, 1);
assert.ok(manifest.pages.every(page => page.userConfirmation === 'pending'));
for (const asset of manifest.assets) {
  assert.match(asset.id, /^AS-/);
  assert.match(asset.fileSha256, /^[A-F0-9]{64}$/);
  assert.match(asset.rgbSha256, /^[A-F0-9]{64}$/);
  assert.ok(asset.source?.reference && asset.source.rect.length === 4);
  assert.equal(asset.userConfirmation, 'pending');
}
assert.ok(manifest.uses.length > 0);
assert.ok(manifest.uses.every(use => /^AU-/.test(use.id) && /^MP-/.test(use.pageId) && /^AS-/.test(use.assetId)));
assert.equal(manifest.globalVisibleUnmapped, 'unknown_nonzero');

const rpaVideo = manifest.assets.find(asset => asset.file === 'public/assets/rpa-video.png');
assert.ok(rpaVideo, 'RPA 视频封面必须登记到素材审计');
assert.deepEqual(rpaVideo.source.rect, [218, 513, 1135, 192],
  'RPA 视频封面必须来自冻结 RPA 参考的完整原子视频区域，不能保留透明错位填充');
assert.equal(rpaVideo.source.method, 'exact-atomic-crop');
assert.equal(rpaVideo.disposition, 'approved-source-atomic-crop');

console.log('Phase 1 视觉合同：复合 Hero 清除、统一壳层、应用/人才关键几何与 30 页校准表通过');
