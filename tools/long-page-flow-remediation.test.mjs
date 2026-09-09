import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const pageContracts = [
  ['src/pages/OnboardingApplyPage.vue', '.apply-page', /\.apply-page\s*\{[^}]*height:\s*auto;[^}]*min-height:\s*100%;[^}]*overflow:\s*visible;/s],
  ['src/pages/MessagesPage.vue', '.messages-page', /\.messages-page\{[^}]*height:auto;[^}]*min-height:[^;]+;[^}]*overflow:visible;/s],
  ['src/pages/TrainingPage.vue', '.training-page', /\.training-page\s*\{[^}]*height:\s*auto;[^}]*min-height:\s*100%;[^}]*overflow:\s*visible;/s],
  ['src/pages/MaterialsPage.vue', '.materials-page', /\.materials-page\{[^}]*min-height:100%;[^}]*overflow:visible;/s],
  ['src/pages/AppsPage.vue', '.apps-page', /\.apps-page\s*\{[^}]*min-height:\s*100%;[^}]*overflow:\s*visible;/s],
  ['src/pages/FavoritesPage.vue', '.favorites-page', /\.favorites-page\s*\{[^}]*min-height:[^;]+;[^}]*overflow:\s*visible;/s],
  ['src/pages/ReportDetailPage.vue', '.report-detail', /\.report-detail\s*\{[^}]*min-height:\s*100%;[^}]*overflow:\s*visible;/s],
  ['src/pages/WorkbenchPage.vue', '.workbench-page', /\.workbench-page\{[^}]*min-height:100%;[^}]*overflow:visible;/s],
  ['src/pages/ProfilePage.vue', '.profile-page', /\.profile-page\{[^}]*min-height:[^;]+;[^}]*overflow:visible;/s],
  ['src/pages/PointsPage.vue', '.points-page', /\.points-page\{[^}]*min-height:100%;[^}]*overflow:visible;/s],
  ['src/pages/CertificationPage.vue', '.cert-page', /\.cert-page\s*\{[^}]*min-height:\s*100%;[^}]*overflow:\s*visible;/s],
];

for (const [path, selector, contract] of pageContracts) {
  assert.match(read(path), contract, `${selector} must remain in the natural vertical document flow`);
}

const globalCss = read('src/style.css');
assert.match(
  globalCss,
  /#main-content \.product-detail > \.detail-panel,[\s\S]*?overflow-x:\s*auto;[\s\S]*?overflow-y:\s*visible;/,
  'detail panels may scroll horizontally for tables but must not create a nested vertical scroller',
);

const talentPeople = read('src/pages/TalentPeoplePage.vue');
assert.match(
  talentPeople,
  /\.talent-body\s*>\s*aside\s*\{[^}]*max-height:\s*none;[^}]*overflow:\s*visible;/s,
  '人才新增与详情抽屉不得再建立第二层纵向滚动容器',
);
assert.match(
  talentPeople,
  /\.talent-body\s*>\s*aside\s*>\s*header\s*\{[^}]*position:\s*static;/s,
  '人才抽屉标题必须参与完整页面内容流',
);
assert.match(
  talentPeople,
  /\.talent-create-form\s+footer\s*\{[^}]*position:\s*static;/s,
  '新增人才表单操作区必须参与完整页面内容流',
);

console.log('Long-page flow remediation contracts passed.');
