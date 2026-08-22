import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const workbench = read('src/pages/WorkbenchPage.vue');
const apps = read('src/pages/AppsPage.vue');
const training = read('src/pages/TrainingPage.vue');
const certification = read('src/pages/CertificationPage.vue');
const shell = read('src/components/ExhibitionShell.vue');
const talent = read('src/pages/TalentPeoplePage.vue');
const globalStyle = read('src/style.css');
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
assert.match(shell, /\.primary-nav\{overflow-x:auto/);
assert.doesNotMatch(shell, /primary-nav a:nth-child\(n\+7\)[^{]*\{[^}]*display\s*:\s*none/);
for (const asset of ['category-rpa.png', 'category-screen.png', 'category-cockpit.png', 'category-report.png', 'category-metric.png', 'category-dataset.png', 'category-ai.png', 'category-work.png']) {
  assert.match(shell, new RegExp(asset.replace('.', '\\.')));
}
assert.doesNotMatch(shell, /class="action-link"[^>]*>[\s\S]{0,180}<small>/);

for (const text of ['应用名称或关键词', '请输入应用名称或关键词', '标签', '请选择标签', '应用类型', '请选择应用类型', '主题域', '请选择主题域']) {
  assert.ok(apps.includes(text), `应用中心筛选视觉合同缺少：${text}`);
}
assert.match(apps, /grid-template-columns:350px 250px 265px 250px 64px 64px/);

for (const text of ['人才库', '所属部门：', '领域\/专业：', '责任科室：', '本期是否在库：', '轮岗计划-开始时间', '轮岗计划-结束时间', '人才详情']) {
  assert.ok(talent.includes(text), `人才库权威视觉合同缺少：${text}`);
}
assert.match(talent, /grid-template-columns:215px 128px 146px 132px 177px 60px 60px/);
assert.match(talent, /tbody tr:first-child\{background:#eef5ff\}/);
assert.doesNotMatch(talent, />×</);

assert.match(shell, /@media\(min-width:761px\) and \(max-width:940px\)\{[^}]*grid-template-columns:150px/,
  '845–932px 原生参考必须保留 150px 目录栏');
assert.match(shell, /@media\(min-width:941px\) and \(max-width:1600px\)\{[^}]*grid-template-columns:180px/,
  '963–1548px 原生参考必须保留 180px 目录栏');
assert.match(shell, /\.exhibition-shell\{height:100vh;overflow:hidden;display:grid;grid-template-rows:auto minmax\(0,1fr\)\}/,
  '页面壳必须锁定 viewport，禁止 document 整体纵向滚动');
assert.match(shell, /\.page-frame\{min-height:0;[^}]*grid-template-columns:220px minmax\(0,1fr\)\}/,
  '固定顶栏下方区域必须允许右侧滚动容器收缩');
assert.match(shell, /\.sidebar\{min-height:0;[^}]*overflow-y:auto/,
  '左侧导航必须固定在壳层并在自身内容超高时独立滚动');
assert.match(shell, /main\{min-width:0;min-height:0;overflow-y:auto/,
  '只有右侧主要内容区域可以纵向滚动');
assert.match(shell, /'certification-shell': props\.page\.id === '27'/,
  '数字化认证必须有冻结参考专属的壳层视觉几何标识');
assert.match(shell, /\.certification-shell \.topbar\{height:90px\}/,
  '数字化认证参考要求 90px 顶部导航高度');
assert.match(shell, /\.certification-shell \.page-frame\{grid-template-columns:242px minmax\(0,1fr\)\}/,
  '数字化认证参考要求 242px 左侧导航宽度');
assert.match(certification, /\.cert-page\{padding:17px 23px 17px 15px/,
  '最低 SSIM 的数字化认证页必须按冻结参考保留左 15px、右 23px 内容边距');
assert.doesNotMatch(globalStyle, /@media\(max-width:1000px\)\{\.product-detail/,
  '845–963px 原生详情参考不能触发产品详情堆叠，避免整页高度膨胀');
assert.match(globalStyle, /grid-template-columns:86px minmax\(0,1fr\) 330px/,
  '宽幅详情页必须为同排三按钮与插画预留 330px，避免 Hero 纵向膨胀');
assert.match(globalStyle, /@media\(min-width:761px\) and \(max-width:1000px\)[\s\S]*grid-template-columns:72px minmax\(0,1fr\) 240px/,
  '窄幅参考仍保持三栏，但操作区收敛为 240px');
assert.match(globalStyle, /@media\(min-width:761px\) and \(max-width:1000px\)[\s\S]*min-width:68px/,
  '窄幅详情操作按钮必须同排，不能因 92px 最小宽度换行');
assert.match(globalStyle, /\.rpa-detail \.detail-hero\{min-height:225px;padding:14px 18px 8px\}/,
  'RPA Hero 必须按 1228px 原生长页密度收敛');
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

console.log('Phase 1 视觉合同：复合 Hero 清除、统一壳层、应用/人才关键几何与 30 页校准表通过');
