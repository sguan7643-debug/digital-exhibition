<script setup>
// Reference SHA-256: 6479C8AFB3EB22872C5CA17D58A29DC8504E8CF05E3284D5E49708B7894FF522
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { APP_CATEGORIES, APP_FIXTURES } from '../fixtures/mock-data.js';
import { createAppsController } from '../state/interaction-controllers.js';
import { routeSession } from '../state/session-store.js';
import PaginationControl from '../components/PaginationControl.vue';
import TypeLineIcon from '../components/TypeLineIcon.vue';
import { mapRemoteApp } from '../integration/app-read-model.js';

const props = defineProps({
  integrationData: { type: Object, default: null },
  integrationState: { type: String, default: 'mock' },
  operationExecutor: { type: Function, default: null }
});

const controller = routeSession.controller('apps',()=>createAppsController(APP_FIXTURES));
const queryDraft = computed({get:()=>controller.queryDraft,set:value=>{controller.queryDraft=value;}});
const displayApp = app => app.id === 'app-metric-001' ? { ...app, name: '库存周转分析报表', category: '库存', scene: '仓储物流', description: '统一监控各仓库周转情况，识别呆滞物料，提供优化建议和预警功能。' } : app;
const filteredApps = computed(() => controller.results.map(displayApp));
const pagedApps = computed(() => filteredApps.value.slice((controller.page - 1) * controller.pageSize, controller.page * controller.pageSize));
const filter = controller.filters;
const facets = computed(() => props.integrationData?.['APP-001']);
const categories = computed(() => facets.value?.types?.map(item => item.name).filter(Boolean) || APP_CATEGORIES);
const tags = computed(() => facets.value?.categories?.map(item => item.name).filter(Boolean) || [...new Set(controller.fixtures.map(app => app.tag))]);
const domains = computed(() => facets.value?.domains?.map(item => item.name).filter(Boolean) || [...new Set(controller.fixtures.map(app => app.domain))]);
const categoryIcons = Object.freeze({ RPA:'rpa', '大屏':'visual', '驾驶舱':'visual', '可视化报表':'report', '指标':'metric', '数据集':'dataset', AI:'ai', '海能work应用':'work' });
const appTypeStats = computed(() => categories.value.map(category => ({
  category,
  count: controller.fixtures.filter(app => app.category === category).length,
  icon: categoryIcons[category] || 'apps'
})));

watch(() => props.integrationData?.['APP-002']?.items, rows => {
  controller.fixtures = Array.isArray(rows) ? rows.map(mapRemoteApp) : [...APP_FIXTURES];
  controller.page = 1;
}, { immediate: true });

function syncUrl() {
  const query = new URLSearchParams(window.location.search);
  const category = query.get('category') || '';
  setCategory(APP_CATEGORIES.includes(category) ? category : '');
  controller.setFilter('scene', query.get('scene') || '');
}
function setCategory(category) { controller.setFilter('category', category); }
function submitSearch() { controller.setFilter('query', queryDraft.value); }
function resetFilters() {
  queryDraft.value = '';
  controller.reset();
  window.history.replaceState({}, '', window.location.pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
function setFilter(key, value) { controller.setFilter(key, value); }
function toggleFavorite(route) {
  const selected=routeSession.toggleRouteFavorite(route);
  controller.announcement = selected ? '已收藏应用' : '已取消收藏';
}
async function localAction(label, app) {
  if (label !== '立即使用' || !props.operationExecutor || props.integrationState === 'mock') {
    controller.announcement = `${app.name}：${label}为本地演示操作`;
    return;
  }
  controller.announcement = `${app.name}：正在校验访问权限`;
  try {
    const response = await props.operationExecutor('APP-004', {
      appId: app.id, launchMode: 'NEW_TAB', sourcePage: '/apps', requestedAt: '2026-09-03T00:00:00.000Z'
    });
    if (!response.data.allowed || !response.data.launchUrl) {
      controller.announcement = `${app.name}：${response.data.reasonMessage || '当前不可访问'}`;
      return;
    }
    controller.announcement = `${app.name}：访问校验通过，正在打开应用`;
    window.open(response.data.launchUrl, '_blank', 'noopener,noreferrer');
  } catch (error) {
    if (error?.status === 401) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/api/v1/auth/feishu/start?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    controller.announcement = `${app.name}：访问失败，请稍后重试`;
  }
}
function receiveCategory(event) { setCategory(event.detail); }
function receiveFilter(event) { controller.setFilter(event.detail.key, event.detail.value); }

onMounted(() => {
  syncUrl();
  window.addEventListener('xlt:apps-category', receiveCategory);
  window.addEventListener('xlt:apps-filter', receiveFilter);
  window.addEventListener('popstate', syncUrl);
});
onBeforeUnmount(() => {
  window.removeEventListener('xlt:apps-category', receiveCategory);
  window.removeEventListener('xlt:apps-filter', receiveFilter);
  window.removeEventListener('popstate', syncUrl);
});
</script>

<template>
  <article class="apps-page" data-visual-baseline="ui-update-0831-apps" aria-labelledby="apps-title">
    <p class="sr-only" aria-live="polite">{{ controller.announcement }}</p>
    <header><div><h1 id="apps-title">应用中心</h1><p>汇聚优质应用资源，助力业务高效协同与智能决策</p></div><a class="onboarding-link" href="/apps/onboarding/apply">应用上线申请</a></header>
    <section class="app-type-overview" aria-labelledby="app-type-overview-title">
      <h2 id="app-type-overview-title" class="sr-only">应用类型统计</h2>
      <button v-for="item in appTypeStats" :key="item.category" type="button" :aria-label="`${item.category}，共 ${item.count} 个应用`" :aria-pressed="filter.category === item.category" @click="setCategory(filter.category === item.category ? '' : item.category)">
        <span class="app-type-overview-icon"><TypeLineIcon :name="item.icon" :size="26" /></span>
        <span class="app-type-overview-copy"><strong>{{ item.category }}</strong><b>{{ item.count }}</b></span>
      </button>
    </section>
    <form class="apps-filter" aria-label="应用筛选" @submit.prevent="submitSearch" @reset.prevent="resetFilters"><label>应用名称或关键词<input v-model="queryDraft" type="search" placeholder="请输入应用名称或关键词" /></label><label>标签<select :value="filter.tag" @change="setFilter('tag', $event.target.value)"><option value="">请选择标签</option><option v-for="tag in tags" :key="tag">{{ tag }}</option></select></label><label>应用类型<select :value="filter.type" @change="setFilter('type', $event.target.value)"><option value="">请选择应用类型</option><option v-for="category in categories" :key="category">{{ category }}</option></select></label><label>主题域<select :value="filter.domain" @change="setFilter('domain', $event.target.value)"><option value="">请选择主题域</option><option v-for="domain in domains" :key="domain">{{ domain }}</option></select></label><button type="reset">重置</button><button type="submit">查询</button></form>
    <div class="apps-tools"><strong>全部应用 {{ filteredApps.length }} 个</strong><button type="button" @click="resetFilters">清空筛选</button><span v-if="filter.category" class="active-category">{{ filter.category }}</span><select :value="controller.sort" aria-label="排序" @change="controller.setSort($event.target.value)"><option value="default">综合排序</option><option value="usage-desc">使用量从高到低</option><option value="favorites-desc">收藏量从高到低</option><option value="name">名称排序</option></select><button type="button" aria-label="卡片视图" :aria-pressed="controller.view === 'grid'" @click="controller.setView('grid')"><AppIcon name="grid" :size="16" /></button><button type="button" aria-label="列表视图" :aria-pressed="controller.view === 'list'" @click="controller.setView('list')"><AppIcon name="list" :size="16" /></button></div>
    <section v-if="filteredApps.length" class="apps-grid" :class="{ 'list-view': controller.view === 'list' }" aria-label="应用列表"><article v-for="app in pagedApps" :key="app.id"><header><AppIcon :name="app.image" :size="52" /><div><h2><mark>{{ app.tag }}</mark>{{ app.name }}</h2><p><mark>{{ app.category }}</mark><mark>{{ app.scene }}</mark></p></div></header><p>{{ app.description }}</p><dl><div><dt>使用量</dt><dd>{{ app.usage.toLocaleString('zh-CN') }}</dd></div><div><dt>收藏</dt><dd>{{ app.favorites.toLocaleString('zh-CN') }}</dd></div><div><dt>负责部门</dt><dd>{{ app.department }}</dd></div><div><dt>负责人</dt><dd>{{ app.owner }}</dd></div><div><dt>开发者</dt><dd>{{ app.developer }}</dd></div></dl><footer><a :id="`app-${app.id}`" :data-session-focus="`app-${app.id}`" :href="app.route">查看详情</a><button type="button" @click="localAction('立即使用', app)">立即使用</button><button type="button" :aria-pressed="routeSession.isRouteFavorite(app.route)" @click="toggleFavorite(app.route)">{{ routeSession.isRouteFavorite(app.route) ? '已收藏' : '收藏' }}</button><button type="button" @click="localAction('申请试用', app)">申请试用</button></footer></article></section>
    <section v-else class="apps-empty" role="status"><h2>暂无符合条件的应用</h2><p>请调整筛选条件或清空筛选后重试。</p><button type="button" @click="resetFilters">清空筛选</button></section>
    <PaginationControl class="apps-pagination" :total="filteredApps.length" :page="controller.page" :page-size="controller.pageSize" :page-sizes="[10,20,50]" label="应用中心分页" @update:page="controller.setPage" @update:page-size="controller.setPageSize" />
  </article>
</template>

<style scoped>
.apps-page {
  min-height: 100%;
  overflow: visible;
  padding: 16px 39px 19px 18px;
  color: #183150;
}
.apps-page > header {
  height: 66px;
  display: flex;
  justify-content: space-between;
}
.apps-page h1 {
  margin: 0;
  color: #172843;
  font-size: 20px;
  line-height: 30px;
}
.apps-page > header p {
  margin: 2px 0 0;
  color: #60718a;
  font-size: 12px;
}
.app-type-overview {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 10px;
  margin: 2px 0 14px;
}
.app-type-overview > button {
  min-width: 0;
  min-height: 82px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  color: #17304f;
  background: #fff;
  border: 1px solid #dce5ef;
  border-radius: 7px;
  text-align: left;
  transition: border-color 0.18s ease, background 0.18s ease,
    box-shadow 0.18s ease;
}
.app-type-overview > button:hover {
  border-color: #8fb6d2;
  background: #f8fbfd;
}
.app-type-overview > button[aria-pressed="true"] {
  border-color: #0060a6;
  background: #eef7fc;
  box-shadow: 0 0 0 1px rgba(0, 96, 166, 0.08);
}
.app-type-overview-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  color: #0060a6;
  background: #f4f9fc;
  border: 1px solid #dce7ef;
  border-radius: 7px;
}
.app-type-overview-copy {
  min-width: 0;
  display: grid;
  gap: 5px;
}
.app-type-overview strong {
  overflow: hidden;
  color: #17304f;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-type-overview b {
  color: #102a4c;
  font-size: 22px;
  font-weight: 650;
  line-height: 1;
}
.apps-page > header button,
.apps-filter button,
.apps-grid footer button {
  color: #fff;
  background: #0060a6;
  border: 1px solid #0060a6;
  border-radius: 4px;
}
.apps-page > header button {
  width: 132px;
  height: 35px;
  padding: 0 16px;
  font-size: 12px;
}
.apps-filter {
  display: grid;
  grid-template-columns: 350px 250px 265px 250px 64px 64px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 2px 0 20px;
}
.apps-filter label {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #172843;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}
.apps-filter input,
.apps-filter select {
  height: 42px;
  min-width: 0;
  flex: 1;
  padding: 0 12px;
  color: #5a6e86;
  border: 1px solid #d8e2ec;
  border-radius: 4px;
  background: #fff;
  font-size: 14px;
  font-weight: 400;
}
.apps-filter input::placeholder {
  color: #a7b2c0;
  font-weight: 400;
}
.apps-filter button {
  height: 42px;
  padding: 0 15px;
  font-size: 14px;
  font-weight: 600;
}
.apps-filter button[type="reset"] {
  color: #0060a6;
  background: #fff;
}
.apps-tools {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 8px;
}
.apps-tools strong {
  font-size: 14px;
}
.apps-tools > button {
  border: 0;
  color: #0060a6;
  background: transparent;
  font-size: 11px;
}
.apps-tools select {
  width: 145px;
  height: 34px;
  margin-left: auto;
  padding: 0 11px;
  border: 1px solid #d9e2ec;
  background: #fff;
  color: #394e68;
}
.apps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 18px;
}
.apps-grid > article {
  height: 216px;
  padding: 14px 18px 9px;
  background: #fff;
  border: 1px solid #dce5ef;
  border-radius: 7px;
}
.apps-grid article > header {
  display: flex;
  gap: 17px;
}
.apps-grid h2 {
  margin: 3px 0 8px;
  color: #192840;
  font-size: 16px;
  font-weight: 600;
}
.apps-grid mark {
  margin-right: 8px;
  padding: 3px 6px;
  color: #0060a6;
  background: #e9f3ff;
  font-size: 9px;
}
.apps-grid article > p {
  margin: 9px 0;
  color: #53687f;
  font-size: 11px;
}
.apps-grid dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  margin: 0;
}
.apps-grid dl div {
  display: flex;
  gap: 8px;
  font-size: 10px;
}
.apps-grid dt {
  color: #62758a;
}
.apps-grid dd {
  margin: 0;
  color: #1c3150;
  font-weight: 400;
}
.apps-grid footer {
  display: flex;
  gap: 8px;
  margin-top: 9px;
}
.apps-grid footer a,
.apps-grid footer button {
  height: 28px;
  display: grid;
  place-items: center;
  padding: 0 13px;
  font-size: 10px;
}
.apps-grid footer a {
  color: #0060a6;
  border: 1px solid #91bbf4;
  border-radius: 4px;
}
.apps-grid footer button:nth-of-type(n + 2) {
  color: #26405f;
  background: #fff;
  border-color: transparent;
}
.apps-pagination {
  height: 54px;
  display: flex;
  align-items: center;
  gap: 42px;
  padding: 8px;
}
.apps-pagination > button {
  width: 44px;
  height: 34px;
  margin-left: auto;
  color: #0060a6;
  background: #fff;
  border: 1px solid #0060a6;
}
.apps-pagination label {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
}
.apps-pagination select,
.apps-pagination input {
  height: 34px;
  border: 1px solid #dae3ec;
  background: #fff;
}
.apps-pagination input {
  width: 45px;
  text-align: center;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid #ff9f1a;
  outline-offset: 2px;
}
@media (max-width: 1450px) {
  .app-type-overview {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .apps-filter {
    grid-template-columns: 1.35fr 1fr 1fr 1fr auto auto;
  }
  .apps-filter label {
    gap: 7px;
  }
}
@media (max-width: 1050px) {
  .app-type-overview {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .apps-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .apps-filter {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 700px) {
  .app-type-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .app-type-overview > button {
    min-height: 76px;
    padding: 9px;
  }
  .app-type-overview > button:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
  .apps-grid,
  .apps-filter {
    grid-template-columns: 1fr;
  }
  .apps-page {
    padding: 12px;
  }
}
.apps-page {
  padding: 16px 18px;
}
.app-card-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  flex: 0 0 48px;
  color: #173b63;
  background: #f8fafc;
  border: 1px solid #dce5ed;
  border-radius: 7px;
}
.app-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.app-title-row h2 {
  margin: 0;
}
.app-type-tag {
  color: #23835d !important;
  background: #e8f7f0 !important;
}
.app-tags {
  display: flex;
  gap: 6px;
  margin-top: 7px;
}
.apps-grid article > header > div {
  min-width: 0;
  flex: 1;
}
.apps-grid dl {
  margin-top: 9px;
}
.apps-grid dl div {
  align-items: center;
}
.apps-grid dt::before {
  content: "·";
  margin-right: 5px;
  color: #0060a6;
  font-weight: 800;
}
.apps-grid footer a {
  color: #fff !important;
  background: #0060a6 !important;
  border-color: #0060a6 !important;
}
.apps-page > header button:disabled {
  color: #8996a6;
  background: #e7ebf0;
  border-color: #e7ebf0;
  cursor: not-allowed;
}
.apps-tools button[aria-pressed="true"] {
  color: #fff;
  background: #0060a6;
  border-radius: 3px;
}
.active-category {
  padding: 3px 8px;
  color: #0060a6;
  background: #eaf3ff;
  border-radius: 3px;
  font-size: 10px;
}
.apps-grid.list-view {
  grid-template-columns: 1fr;
}
.apps-grid.list-view > article {
  height: auto;
  display: grid;
  grid-template-columns:
    minmax(360px, 1.25fr) minmax(240px, 1fr)
    minmax(300px, 1fr) minmax(380px, 1.15fr);
  align-items: center;
  gap: 22px;
  padding-block: 16px;
}
.apps-grid.list-view > article > header,
.apps-grid.list-view > article > p,
.apps-grid.list-view > article > dl,
.apps-grid.list-view > article > footer {
  min-width: 0;
  margin: 0;
}
.apps-grid.list-view > article > p {
  min-height: 0;
  line-height: 1.7;
}
.apps-grid.list-view > article > footer {
  padding-top: 0;
}
.apps-grid.list-view .app-title-row {
  align-items: flex-start;
}
.apps-grid.list-view h2 {
  line-height: 1.45;
}
.apps-grid.list-view .app-type-tag {
  max-width: 92px;
  line-height: 1.35;
  white-space: normal;
}
.apps-empty {
  min-height: 390px;
  display: grid;
  place-content: center;
  text-align: center;
  background: #fff;
  border: 1px solid #dce5ef;
}
.apps-empty h2 {
  font-size: 16px;
}
.apps-empty p {
  color: #60718a;
  font-size: 12px;
}
.apps-empty button {
  justify-self: center;
  height: 34px;
  padding: 0 18px;
  color: #0060a6;
  background: #fff;
  border: 1px solid #0060a6;
  border-radius: 4px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 1600px) {
  .apps-grid.list-view > article {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .apps-grid.list-view > article > p {
    align-self: center;
  }
}
@media (max-width: 900px) {
  .apps-grid.list-view > article {
    grid-template-columns: 1fr;
  }
}
.apps-page > header .onboarding-link {
  width: 176px;
  height: 44px;
  display: grid;
  place-items: center;
  padding: 0 16px;
  color: #fff;
  background: #0060a6;
  border: 1px solid #0060a6;
  border-radius: 5px;
  font-size: 15px;
  font-weight: 700;
}
.apps-grid > article {
  height: auto;
  min-height: 314px;
  display: flex;
  flex-direction: column;
  padding: 17px 18px 13px;
}
.apps-grid article > p {
  min-height: 44px;
  line-height: 1.7;
}
.apps-grid footer {
  margin-top: auto;
  padding-top: 12px;
}
.apps-grid.list-view > article {
  min-height: 0;
  display: grid;
}
@media (max-width: 1360px) and (min-width: 701px) {
  .apps-grid:not(.list-view) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .apps-filter {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.apps-page > header .onboarding-link {
  background: #0060a6;
  border-color: #0060a6;
}
.apps-grid dl .fact-wide {
  grid-column: 1/-1;
}
.apps-grid footer > a {
  color: #fff !important;
  background: #0060a6 !important;
  border-color: #0060a6 !important;
  border-radius: 4px;
}
.apps-grid footer .favorite-action {
  color: #26405f;
  background: #fff;
  border-color: #9fb4c9;
}
.apps-grid footer .access-action:disabled {
  color: #8a97a6 !important;
  background: #e8edf2 !important;
  border-color: #d9e0e7 !important;
  cursor: not-allowed;
}
.apps-grid footer {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
}
.apps-grid footer a,
.apps-grid footer button {
  min-width: 0;
  padding-inline: 5px;
  overflow: hidden;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.apps-grid :is(mark, p, dt, dd) {
  font-weight: 400;
}
</style>
