<script setup>
// Reference SHA-256: E11BA453D013006EE96D19695AC3770A794DEF4DB32B71D993A4158F7BC23ADD
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { APP_CATEGORIES, APP_FIXTURES } from '../fixtures/mock-data.js';
import { createAppsController } from '../state/interaction-controllers.js';
import { routeSession } from '../state/session-store.js';

const controller = routeSession.controller('apps',()=>createAppsController(APP_FIXTURES));
const queryDraft = ref('');
const filteredApps = computed(() => controller.results);
const filter = controller.filters;
const tags = [...new Set(APP_FIXTURES.map(app => app.tag))];
const domains = [...new Set(APP_FIXTURES.map(app => app.domain))];

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
  const selected=routeSession.toggleFavorite(route);
  controller.announcement = selected ? '已收藏应用' : '已取消收藏';
}
function localAction(label, app) { controller.announcement = `${app.name}：${label}为本地演示操作`; }
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
  <article class="apps-page" aria-labelledby="apps-title">
    <p class="sr-only" aria-live="polite">{{ controller.announcement }}</p>
    <header><div><h1 id="apps-title">应用中心</h1><p>汇聚优质应用资源，助力业务高效协同与智能决策</p></div><button type="button" disabled title="当前演示未开放应用上线申请">应用上线申请</button></header>
    <form class="apps-filter" aria-label="应用筛选" @submit.prevent="submitSearch" @reset.prevent="resetFilters"><label>应用名称或关键词<input v-model="queryDraft" type="search" placeholder="请输入应用名称或关键词" /></label><label>标签<select :value="filter.tag" @change="setFilter('tag', $event.target.value)"><option value="">请选择标签</option><option v-for="tag in tags" :key="tag">{{ tag }}</option></select></label><label>应用类型<select :value="filter.type" @change="setFilter('type', $event.target.value)"><option value="">请选择应用类型</option><option v-for="category in APP_CATEGORIES" :key="category">{{ category }}</option></select></label><label>主题域<select :value="filter.domain" @change="setFilter('domain', $event.target.value)"><option value="">请选择主题域</option><option v-for="domain in domains" :key="domain">{{ domain }}</option></select></label><button type="reset">重置</button><button type="submit">查询</button></form>
    <div class="apps-tools"><strong>全部应用 {{ filteredApps.length }} 个</strong><button type="button" @click="resetFilters">清空筛选</button><span v-if="filter.category" class="active-category">{{ filter.category }}</span><select :value="controller.sort" aria-label="排序" @change="controller.setSort($event.target.value)"><option value="default">综合排序</option><option value="usage-desc">使用量从高到低</option><option value="favorites-desc">收藏量从高到低</option><option value="name">名称排序</option></select><button type="button" aria-label="卡片视图" :aria-pressed="controller.view === 'grid'" @click="controller.setView('grid')">卡片</button><button type="button" aria-label="列表视图" :aria-pressed="controller.view === 'list'" @click="controller.setView('list')">列表</button></div>
    <section v-if="filteredApps.length" class="apps-grid" :class="{ 'list-view': controller.view === 'list' }" aria-label="应用列表"><article v-for="app in filteredApps" :key="app.id"><header><img :src="`/assets/${app.image}`" width="58" height="58" alt="" /><div><h2>{{ app.name }}</h2><mark>{{ app.category }}</mark><mark>{{ app.scene }}</mark></div></header><p>{{ app.description }}</p><dl><div><dt>使用量</dt><dd>{{ app.usage.toLocaleString('zh-CN') }}</dd></div><div><dt>收藏</dt><dd>{{ app.favorites.toLocaleString('zh-CN') }}</dd></div><div><dt>所属部门</dt><dd>{{ app.department }}</dd></div><div><dt>负责人</dt><dd>{{ app.owner }}</dd></div><div><dt>开发部门/单位</dt><dd>{{ app.developerDepartment }}</dd></div><div><dt>开发者</dt><dd>{{ app.developer }}</dd></div></dl><footer><a :id="`app-${app.id}`" :data-session-focus="`app-${app.id}`" :href="app.route">查看详情</a><button type="button" @click="localAction('立即使用', app)">立即使用</button><button type="button" :aria-pressed="routeSession.favorites.has(app.route)" @click="toggleFavorite(app.route)">{{ routeSession.favorites.has(app.route) ? '已收藏' : '收藏' }}</button><button type="button" @click="localAction('申请复用', app)">申请复用</button></footer></article></section>
    <section v-else class="apps-empty" role="status"><h2>暂无符合条件的应用</h2><p>请调整筛选条件或清空筛选后重试。</p><button type="button" @click="resetFilters">清空筛选</button></section>
    <footer class="apps-pagination"><strong>共 {{ filteredApps.length }} 条</strong><button type="button" aria-current="page" disabled>1</button><label>每页<select disabled><option>12条/页</option></select></label><label>跳至<input value="1" inputmode="numeric" aria-label="跳转页码" disabled />页</label></footer>
  </article>
</template>

<style scoped>
.apps-page{padding:16px 39px 19px 18px;color:#183150}.apps-page>header{height:66px;display:flex;justify-content:space-between}.apps-page h1{margin:0;color:#172843;font-size:20px;line-height:30px}.apps-page>header p{margin:2px 0 0;color:#60718a;font-size:12px}.apps-page>header button,.apps-filter button,.apps-grid footer button{color:#fff;background:#086fe8;border:1px solid #086fe8;border-radius:4px}.apps-page>header button{width:132px;height:35px;padding:0 16px;font-size:12px}.apps-filter{display:grid;grid-template-columns:350px 250px 265px 250px 64px 64px;align-items:center;justify-content:space-between;gap:12px;margin:2px 0 20px}.apps-filter label{min-width:0;display:flex;align-items:center;gap:12px;color:#172843;font-size:12px;font-weight:600;white-space:nowrap}.apps-filter input,.apps-filter select{height:36px;min-width:0;flex:1;padding:0 12px;color:#5a6e86;border:1px solid #d8e2ec;border-radius:4px;background:#fff;font-size:11px}.apps-filter input::placeholder{color:#a7b2c0;font-weight:400}.apps-filter button{height:36px;padding:0 15px;font-size:12px}.apps-filter button[type=reset]{color:#086fe8;background:#fff}.apps-tools{height:34px;display:flex;align-items:center;gap:14px;margin:0 0 8px}.apps-tools strong{font-size:14px}.apps-tools>button{border:0;color:#086ce7;background:transparent;font-size:11px}.apps-tools select{width:145px;height:34px;margin-left:auto;padding:0 11px;border:1px solid #d9e2ec;background:#fff;color:#394e68}.apps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 18px}.apps-grid>article{height:216px;padding:14px 18px 9px;background:#fff;border:1px solid #dce5ef;border-radius:7px}.apps-grid article>header{display:flex;gap:17px}.apps-grid h2{margin:3px 0 8px;color:#192840;font-size:16px}.apps-grid mark{margin-right:8px;padding:3px 6px;color:#0870e8;background:#e9f3ff;font-size:9px}.apps-grid article>p{margin:9px 0;color:#53687f;font-size:11px}.apps-grid dl{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:0}.apps-grid dl div{display:flex;gap:8px;font-size:10px}.apps-grid dt{color:#62758a}.apps-grid dd{margin:0;color:#1c3150;font-weight:700}.apps-grid footer{display:flex;gap:8px;margin-top:9px}.apps-grid footer a,.apps-grid footer button{height:28px;display:grid;place-items:center;padding:0 13px;font-size:10px}.apps-grid footer a{color:#0870e8;border:1px solid #91bbf4;border-radius:4px}.apps-grid footer button:nth-of-type(n+2){color:#26405f;background:#fff;border-color:transparent}.apps-pagination{height:54px;display:flex;align-items:center;gap:42px;padding:8px}.apps-pagination>button{width:44px;height:34px;margin-left:auto;color:#0870e8;background:#fff;border:1px solid #0870e8}.apps-pagination label{display:flex;gap:8px;align-items:center;font-size:11px}.apps-pagination select,.apps-pagination input{height:34px;border:1px solid #dae3ec;background:#fff}.apps-pagination input{width:45px;text-align:center}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:1450px){.apps-filter{grid-template-columns:1.35fr 1fr 1fr 1fr auto auto}.apps-filter label{gap:7px}}@media(max-width:1050px){.apps-grid{grid-template-columns:repeat(2,1fr)}.apps-filter{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.apps-grid,.apps-filter{grid-template-columns:1fr}.apps-page{padding:12px}}
.apps-page{padding:16px 18px}
.apps-page>header button:disabled{color:#8996a6;background:#e7ebf0;border-color:#e7ebf0;cursor:not-allowed}.apps-tools button[aria-pressed=true]{color:#fff;background:#086fe8;border-radius:3px}.active-category{padding:3px 8px;color:#086fe8;background:#eaf3ff;border-radius:3px;font-size:10px}.apps-grid.list-view{grid-template-columns:1fr}.apps-grid.list-view>article{height:auto;display:grid;grid-template-columns:260px minmax(180px,1fr) minmax(320px,1.3fr);gap:16px}.apps-empty{min-height:390px;display:grid;place-content:center;text-align:center;background:#fff;border:1px solid #dce5ef}.apps-empty h2{font-size:16px}.apps-empty p{color:#60718a;font-size:12px}.apps-empty button{justify-self:center;height:34px;padding:0 18px;color:#086fe8;background:#fff;border:1px solid #086fe8;border-radius:4px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
</style>
