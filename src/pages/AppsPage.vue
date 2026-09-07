<script setup>
// Reference SHA-256: 6479C8AFB3EB22872C5CA17D58A29DC8504E8CF05E3284D5E49708B7894FF522
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { APP_CATEGORIES, APP_FIXTURES } from '../fixtures/mock-data.js';
import { createAppsController } from '../state/interaction-controllers.js';
import { routeSession } from '../state/session-store.js';
import PaginationControl from '../components/PaginationControl.vue';
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
    <header><div><h1 id="apps-title">应用中心</h1><p>汇聚优质应用资源，助力业务高效协同与智能决策</p></div><button class="onboarding-link" type="button" @click="controller.announcement='应用上线申请为本地演示操作'">应用上线申请</button></header>
    <form class="apps-filter" aria-label="应用筛选" @submit.prevent="submitSearch" @reset.prevent="resetFilters"><label>应用名称或关键词<input v-model="queryDraft" type="search" placeholder="请输入应用名称或关键词" /></label><label>标签<select :value="filter.tag" @change="setFilter('tag', $event.target.value)"><option value="">请选择标签</option><option v-for="tag in tags" :key="tag">{{ tag }}</option></select></label><label>应用类型<select :value="filter.type" @change="setFilter('type', $event.target.value)"><option value="">请选择应用类型</option><option v-for="category in categories" :key="category">{{ category }}</option></select></label><label>主题域<select :value="filter.domain" @change="setFilter('domain', $event.target.value)"><option value="">请选择主题域</option><option v-for="domain in domains" :key="domain">{{ domain }}</option></select></label><button type="reset">重置</button><button type="submit">查询</button></form>
    <div class="apps-tools"><strong>全部应用 {{ filteredApps.length }} 个</strong><button type="button" @click="resetFilters">清空筛选</button><span v-if="filter.category" class="active-category">{{ filter.category }}</span><select :value="controller.sort" aria-label="排序" @change="controller.setSort($event.target.value)"><option value="default">综合排序</option><option value="usage-desc">使用量从高到低</option><option value="favorites-desc">收藏量从高到低</option><option value="name">名称排序</option></select><button type="button" aria-label="卡片视图" :aria-pressed="controller.view === 'grid'" @click="controller.setView('grid')"><AppIcon name="grid" :size="16" /></button><button type="button" aria-label="列表视图" :aria-pressed="controller.view === 'list'" @click="controller.setView('list')"><AppIcon name="list" :size="16" /></button></div>
    <section v-if="filteredApps.length" class="apps-grid" :class="{ 'list-view': controller.view === 'list' }" aria-label="应用列表"><article v-for="app in pagedApps" :key="app.id"><header><AppIcon :name="app.image" :size="52" /><div><h2><mark>{{ app.tag }}</mark>{{ app.name }}</h2><p><mark>{{ app.category }}</mark><mark>{{ app.scene }}</mark></p></div></header><p>{{ app.description }}</p><dl><div><dt>使用量</dt><dd>{{ app.usage.toLocaleString('zh-CN') }}</dd></div><div><dt>收藏</dt><dd>{{ app.favorites.toLocaleString('zh-CN') }}</dd></div><div><dt>负责部门</dt><dd>{{ app.department }}</dd></div><div><dt>负责人</dt><dd>{{ app.owner }}</dd></div><div><dt>开发者</dt><dd>{{ app.developer }}</dd></div></dl><footer><a :id="`app-${app.id}`" :data-session-focus="`app-${app.id}`" :href="app.route">查看详情</a><button type="button" @click="localAction('立即使用', app)">立即使用</button><button type="button" :aria-pressed="routeSession.isRouteFavorite(app.route)" @click="toggleFavorite(app.route)">{{ routeSession.isRouteFavorite(app.route) ? '已收藏' : '收藏' }}</button><button type="button" @click="localAction('申请试用', app)">申请试用</button></footer></article></section>
    <section v-else class="apps-empty" role="status"><h2>暂无符合条件的应用</h2><p>请调整筛选条件或清空筛选后重试。</p><button type="button" @click="resetFilters">清空筛选</button></section>
    <PaginationControl class="apps-pagination" :total="filteredApps.length" :page="controller.page" :page-size="controller.pageSize" :page-sizes="[10,20,50]" label="应用中心分页" @update:page="controller.setPage" @update:page-size="controller.setPageSize" />
  </article>
</template>

<style scoped>
.apps-page{min-height:882px;padding:23px 26px 14px 38px;color:#0c2a50;background:#fff}.apps-page>header{height:70px;display:flex;justify-content:space-between}.apps-page h1{margin:0;color:#0b2c55;font-size:24px;line-height:32px}.apps-page>header p{margin:5px 0 0;color:#244a72;font-size:13px}.apps-page>header button,.apps-filter button,.apps-grid footer button{color:#fff;background:#003d7b;border:1px solid #003d7b;border-radius:4px}.apps-page>header button{width:126px;height:36px;margin-top:12px;padding:0 14px;font-size:12px}.apps-filter{display:grid;grid-template-columns:345px 250px 275px 260px 68px 68px;align-items:center;gap:20px;margin:0 0 11px}.apps-filter label{min-width:0;height:36px;display:flex;align-items:center;gap:10px;padding:0 13px;color:#173b65;border:1px solid #cbd8e6;border-radius:5px;font-size:12px;font-weight:700;white-space:nowrap}.apps-filter input,.apps-filter select{height:34px;min-width:0;flex:1;padding:0 8px;color:#526b86;border:0;background:#fff;font-size:11px}.apps-filter button{height:36px;padding:0 15px;font-size:12px}.apps-filter button[type=reset]{color:#26496c;background:#fff;border-color:#cbd8e6}.apps-tools{height:42px;display:flex;align-items:center;gap:14px}.apps-tools strong{font-size:13px}.apps-tools>button{border:0;color:#075bb4;background:transparent;font-size:11px}.apps-tools select{width:140px;height:31px;margin-left:auto;padding:0 11px;border:1px solid #d2dce8;border-radius:4px;background:#fff;color:#294a6e}.apps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px 18px}.apps-grid>article{height:208px;padding:14px 16px 10px;background:#fff;border:1px solid #d8e1eb;border-radius:6px}.apps-grid article>header{display:flex;gap:15px}.apps-grid article>header>img{width:52px;height:52px;padding:7px;border:1px solid #dce5ee;border-radius:6px;object-fit:contain}.apps-grid h2{margin:1px 0 7px;color:#102e55;font-size:14px}.apps-grid h2 mark{margin-right:7px;color:#188964;background:#dff5ed}.apps-grid mark{margin-right:7px;padding:3px 6px;color:#116d83;background:#e2f4f6;border-radius:3px;font-size:9px}.apps-grid article>p{height:28px;margin:9px 0;color:#4c6682;font-size:11px;line-height:16px}.apps-grid dl{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0}.apps-grid dl div{display:flex;gap:10px;font-size:10px}.apps-grid dt{color:#58718d}.apps-grid dd{margin:0;color:#173b63}.apps-grid footer{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:10px}.apps-grid footer a,.apps-grid footer button{height:29px;display:grid;place-items:center;padding:0 8px;font-size:10px;white-space:nowrap}.apps-grid footer a{color:#fff;background:#003d7b;border:1px solid #003d7b;border-radius:4px}.apps-grid footer button:nth-of-type(2){color:#173b63;background:#fff;border-color:#cad7e5}.apps-pagination{height:52px;margin-top:1px}.apps-grid.list-view{grid-template-columns:1fr}.apps-grid.list-view>article{height:auto}.apps-tools button[aria-pressed=true]{color:#fff;background:#003d7b;border-radius:3px}.active-category{padding:3px 8px;color:#075bb4;background:#eaf3ff;border-radius:3px;font-size:10px}.apps-empty{min-height:390px;display:grid;place-content:center;text-align:center;background:#fff;border:1px solid #dce5ef}.apps-empty h2{font-size:16px}.apps-empty p{color:#60718a;font-size:12px}.apps-empty button{justify-self:center;height:34px;padding:0 18px;color:#086fe8;background:#fff;border:1px solid #086fe8;border-radius:4px}button:focus-visible,a:focus-visible{outline:3px solid #1b77d2;outline-offset:2px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:1450px){.apps-filter{grid-template-columns:1.35fr 1fr 1fr 1fr auto auto;gap:10px}}@media(max-width:1050px){.apps-grid{grid-template-columns:repeat(2,1fr)}.apps-filter{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.apps-grid,.apps-filter{grid-template-columns:1fr}.apps-page{padding:12px}}
.onboarding-link{width:176px;height:44px;font-size:15px;font-weight:700}
.apps-filter label{height:auto;padding:0;border:0;font-size:14px;font-weight:600}.apps-filter input,.apps-filter select{height:42px;border:1px solid #d8e2ec;border-radius:4px;font-size:14px;font-weight:400}.apps-filter button{height:42px;font-size:14px;font-weight:600}
.apps-grid>article{height:auto;min-height:314px}.apps-grid.list-view>article{display:grid;grid-template-columns:minmax(260px,1fr) minmax(360px,1.3fr) minmax(280px,1fr) minmax(380px,1.3fr);align-items:center;gap:18px;min-height:126px}.apps-grid.list-view>article>p,.apps-grid.list-view>article>dl,.apps-grid.list-view>article>footer{margin:0}
@media(max-width:1600px){.apps-grid.list-view>article{grid-template-columns:repeat(2,minmax(0,1fr))}}
.apps-grid dd{font-weight:400}.apps-grid h2{font-weight:600}
</style>
