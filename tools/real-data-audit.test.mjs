import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePage } from '../src/fixtures/pages.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const root = fileURLToPath(new URL('../', import.meta.url));
function collect(directory, extension) {
  const result = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) result.push(...collect(path, extension));
    else if (path.endsWith(extension)) result.push(relative(root, path).replaceAll('\\', '/'));
  }
  return result.sort();
}

const app = read('src/App.vue');
const shell = read('src/components/ExhibitionShell.vue');
const announcements = read('src/pages/AnnouncementsPage.vue');
const certification = read('src/pages/CertificationPage.vue');
const talentPeople = read('src/pages/TalentPeoplePage.vue');
const points = read('src/pages/PointsPage.vue');
const pointsDetails = read('src/pages/PointsDetailsPage.vue');
const messages = read('src/pages/MessagesPage.vue');
const workbench = read('src/pages/WorkbenchPage.vue');
const operations = read('src/pages/OperationsPage.vue');
const profile = read('src/pages/ProfilePage.vue');
const noticeDetail = read('src/pages/NoticeDetailPage.vue');
const apps = read('src/pages/AppsPage.vue');
const materials = read('src/pages/MaterialsPage.vue');
const training = read('src/pages/TrainingPage.vue');
const appDetailLiveSections = read('src/components/AppDetailLiveSections.vue');
const appReadModel = read('src/integration/app-read-model.js');
const onboarding = read('src/pages/OnboardingPage.vue');

const fixturesSource = read('src/fixtures/pages.js');
const declaredRoutes = [...fixturesSource.matchAll(/route:\s*'([^']+)'/g)].map((match) => match[1]);
assert.equal(declaredRoutes.length, 32, 'pages.js 必须实际声明 32 条路由');
assert.equal(new Set(declaredRoutes).size, 32, 'pages.js 的 32 条路由不得重复');
const declaredPages = declaredRoutes.map((route) => resolvePage(route));
assert.ok(declaredPages.every(Boolean), 'pages.js 声明的每条路由都必须可解析');

const pageFiles = collect(join(root, 'src/pages'), '.vue');
const componentFiles = collect(join(root, 'src/components'), '.vue');
const pageImports = new Map(
  [...app.matchAll(/import\s+(\w+)\s+from\s+'\.\/pages\/([^']+\.vue)'/g)]
    .map((match) => [match[1], `src/pages/${match[2]}`]),
);
const kebab = (value) => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const importedPageTags = new Set([...pageImports.keys()].map(kebab));
assert.equal(pageImports.size, 32, 'App.vue 必须导入 32 个路由页面组件');
assert.deepEqual([...pageImports.values()].sort(), pageFiles, '32 路由页面文件必须全部且仅被 App.vue 挂载');
for (const page of declaredPages) {
  const branch = new RegExp(`<([a-z][\\w-]*)\\b[^>]*v-(?:else-)?if=["']page\\.id === ["']${page.id}["'][^>]*>`, 's').exec(app);
  assert.ok(branch, `${page.route} 缺少 page.id=${page.id} 的页面分支`);
  assert.ok(importedPageTags.has(branch[1]), `${page.route} 未挂载已登记页面组件`);
}
assert.ok(componentFiles.length > 0, '共享组件扫描清单不能为空');
const productionViewSources = [...pageFiles, ...componentFiles].map((path) => [path, read(path)]);
assert.equal(productionViewSources.length, pageFiles.length + componentFiles.length, '全部页面和共享组件必须进入扫描');

assert.doesNotMatch(shell, /aria-label="8 条未读消息"|content\s*:\s*['"]8['"]/, '顶栏未读数不得写死为 8');
assert.match(shell, /unreadCount/, '顶栏未读数必须来自运行时权威数据');
assert.match(app, /:unread-count="shellUnreadCount"/, '应用壳必须接收会话隔离的权威未读数');

assert.doesNotMatch(announcements, /↓\s*5|↑\s*3/, '公告趋势不得展示无合同依据的固定值');
assert.match(announcements, /unreadStat\s*\?\?\s*["']—["']/, '公告缺失统计必须显示准确空态');

assert.doesNotMatch(certification, /工作日 09:00—17:30|Cert@haiyou\.com|010-8888-0000/, '认证联系方式不得使用固定示例');
assert.match(certification, /remoteOverview\.value\.contact/, '认证联系方式必须读取 CER-001 contact');

assert.doesNotMatch(talentPeople, /2026年培训计划|AI前沿技术培训计划|海上平台智能监测项目|数据中台建设项目|参与项目数量：3/, '人才详情不得展示固定培训或项目数据');
assert.match(talentPeople, /selectedPerson\.tagList/, '人才标签必须保留真实集合语义');

assert.doesNotMatch(points, /2,850|6,420|应用建设.+1320|培训学习.+780|每日首次使用应用可获得积分/, '积分页不得回退到静态业务数据');
assert.match(points, /integrationState/, '积分页必须按真实集成状态展示');
assert.match(app, /<points-page[^>]*:integration-state="integrationEnvelope\.state"/s, '积分页必须接收真实集成状态');
assert.doesNotMatch(pointsDetails, /summary\s*\|\|\s*\{\s*income:\s*0/, '积分明细缺失汇总不得伪装为零');

assert.doesNotMatch(messages + workbench, /2025-\$\{/, '真实消息或公告时间不得固定拼接 2025 年');
assert.doesNotMatch(operations, /metric\.value\s*\?\?\s*0|changeRate\s*\?\?\s*0|activity\.activeRate\s*\?\?\s*0/, '运营指标缺失时不得伪装为零');
assert.doesNotMatch(profile + noticeDetail, /©\s*2025|class="(?:copyright|notice-footer)"/, '业务页面不得保留过期且重复的固定页脚');
assert.doesNotMatch(apps, /Number\(item\.count\)\s*\|\|\s*0/, '应用类型统计缺失值不得伪装为零');
assert.doesNotMatch(materials, /downloadCount\s*\|\|\s*0|暂无素材说明/, '素材字段缺失时必须使用准确空态');
assert.doesNotMatch(training, /registeredCount\s*\?\?\s*0|时间待定|讲师待定|暂无课程简介/, '培训字段缺失时必须使用准确空态');

assert.doesNotMatch(appDetailLiveSections, /downloadCount\s*\|\|\s*0|暂无素材说明/, '应用详情共享区不得把缺失下载量或说明伪装成真实值');
assert.doesNotMatch(appReadModel, /Number\(record\.(?:usageCount|favoriteCount)\s*\|\|\s*0\)/, '应用映射不得把缺失使用量或收藏量伪装成零');
assert.doesNotMatch(materials, /未命名素材|未分类业务域|materialType\s*\|\|[^\n]*['"]其他['"]/, '素材缺失字段不得生成默认业务文字');
assert.doesNotMatch(profile, /String\(value\.(?:pointBalance|favoriteCount|appVisitCount|appUseCount)\)/, '个人统计缺失值不得显示 undefined');
assert.doesNotMatch(onboarding, /Number\(value\s*\|\|\s*0\)/, '申请附件大小缺失不得显示 0 B');

console.log(`32 路由、${pageFiles.length} 个页面组件与 ${componentFiles.length} 个共享组件真实数据审计回归通过`);
