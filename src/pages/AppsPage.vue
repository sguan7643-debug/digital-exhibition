<script setup>
// Reference SHA-256: E11BA453D013006EE96D19695AC3770A794DEF4DB32B71D993A4158F7BC23ADD
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { APP_CATEGORIES, APP_FIXTURES } from "../fixtures/mock-data.js";
import {
  categoryIconName,
  applicationAccessMode,
  createAppsController,
  normalizeAppCategory,
} from "../state/interaction-controllers.js";
import { routeSession } from "../state/session-store.js";
import PaginationControl from "../components/PaginationControl.vue";
import TypeLineIcon from "../components/TypeLineIcon.vue";
import { projectApplicationCards } from "../integration/app-read-model.js";
import { buildApplicationWriteInput, launchApplication } from "../integration/application-actions.js";
import ClampedText from "../components/ClampedText.vue";
import OverflowTags from "../components/OverflowTags.vue";

const props = defineProps({
  integrationData: { type: Object, default: null },
  integrationState: { type: String, default: 'mock' },
  operationExecutor: { type: Function, default: null },
  actionExecutor: { type: Function, default: null },
  testWritesEnabled: { type: Boolean, default: false },
});

const controller = routeSession.controller("apps", () =>
  createAppsController(APP_FIXTURES),
);
const remoteMode = computed(() => props.integrationState !== 'mock');
const remoteApps = computed(() => Array.isArray(props.integrationData?.['APP-002']?.items)
  ? projectApplicationCards(props.integrationData['APP-002'].items.filter((item) =>
      ['已上架', '审核通过', 'ONLINE', 'PUBLISHED', 'APPROVED'].includes(String(item.status || '').toUpperCase())))
  : []);
const displayedApps = computed(() => remoteMode.value ? remoteApps.value : APP_FIXTURES);
watch(() => [props.integrationState, props.integrationData?.['APP-002']?.items], ([state, items]) => {
  if (state !== 'mock') controller.replaceFixtures(displayedApps.value);
}, { immediate: true });
const queryDraft = computed({
  get: () => controller.queryDraft,
  set: (value) => {
    controller.queryDraft = value;
  },
});
const filteredApps = computed(() => controller.results);
const pagedApps = computed(() => controller.pagedResults);
const appTypeStats = computed(() =>
  APP_CATEGORIES.map((category) => ({
    category,
    labelParts: category === "海能work应用" ? ["海能work", "应用"] : [category],
    count: (remoteMode.value ? displayedApps.value : APP_FIXTURES).filter(
      (app) => normalizeAppCategory(app.category) === category,
    ).length,
    icon: categoryIconName(category),
  })),
);
const filter = controller.filters;
const tags = computed(() => [...new Set(displayedApps.value.map((app) => app.tag).filter(Boolean))]);
const domains = computed(() => [...new Set(displayedApps.value.map((app) => app.domain).filter(Boolean))]);

function syncUrl() {
  const query = new URLSearchParams(window.location.search);
  setCategory(normalizeAppCategory(query.get("category") || ""));
  controller.setFilter("scene", query.get("scene") || "");
}
function setCategory(category) {
  controller.setFilter("category", category);
}
function submitSearch() {
  controller.setFilter("query", queryDraft.value);
}
function resetFilters() {
  queryDraft.value = "";
  controller.reset();
  window.history.replaceState(
    { ...window.history.state },
    "",
    window.location.pathname,
  );
  window.dispatchEvent(new PopStateEvent("popstate"));
}
function setFilter(key, value) {
  controller.setFilter(key, value);
}
function toggleFavorite(route) {
  const selected = routeSession.toggleRouteFavorite(route);
  controller.announcement = selected ? "已收藏应用" : "已取消收藏";
}
function localAction(label, app) {
  controller.announcement = `${app.name}：${label}为本地演示操作`;
}
async function launch(app) {
  if (!remoteMode.value) {
    localAction('立即使用', app);
    return;
  }
  try {
    const result = await launchApplication(props.operationExecutor, app.appId || app.id, { sourcePage: '/apps' });
    controller.announcement = `${app.name}：${result.message}`;
  } catch (error) {
    controller.announcement = `${app.name}：${error.message || '应用启动失败'}`;
  }
}
async function requestUse(app) {
  if (!remoteMode.value) {
    localAction('申请使用', app);
    return;
  }
  if (!props.testWritesEnabled || !props.actionExecutor) {
    controller.announcement = `${app.name}：TEST_ 申请通道未启用`;
    return;
  }
  try {
    const input = buildApplicationWriteInput('APP-005', app.appId || app.id, { reason: 'TEST_应用中心申请使用' });
    await props.actionExecutor('APP-005', input, { confirmed: true });
    controller.announcement = `${app.name}：TEST_ 申请已由服务端确认`;
  } catch (error) {
    controller.announcement = `${app.name}：申请失败，${error.message || '请稍后重试'}`;
  }
}
function openCard(event) {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (event.target.closest?.('a,button,input,select,textarea,.catalog-description[tabindex],.catalog-tags[tabindex],[role="tooltip"]')) return;
  if (window.getSelection?.()?.toString()) return;
  event.currentTarget.querySelector('.card-title-link')?.click();
}
function receiveCategory(event) {
  setCategory(event.detail);
}
function receiveFilter(event) {
  controller.setFilter(event.detail.key, event.detail.value);
}

onMounted(() => {
  syncUrl();
  window.addEventListener("xlt:apps-category", receiveCategory);
  window.addEventListener("xlt:apps-filter", receiveFilter);
  window.addEventListener("popstate", syncUrl);
});
onBeforeUnmount(() => {
  window.removeEventListener("xlt:apps-category", receiveCategory);
  window.removeEventListener("xlt:apps-filter", receiveFilter);
  window.removeEventListener("popstate", syncUrl);
});
</script>

<template>
  <article class="apps-page" aria-labelledby="apps-title">
    <p class="sr-only" aria-live="polite">{{ controller.announcement }}</p>
    <header>
      <div>
        <h1 id="apps-title">应用中心</h1>
        <p>汇聚优质应用资源，助力业务高效协同与智能决策</p>
      </div>
      <a class="onboarding-link" href="/apps/onboarding/apply">应用上线申请</a>
    </header>
    <section class="app-type-overview" aria-labelledby="app-type-overview-title">
      <h2 id="app-type-overview-title" class="sr-only">应用类型统计</h2>
      <button
        v-for="item in appTypeStats"
        :key="item.category"
        type="button"
        :aria-label="`${item.category}，共 ${item.count} 个应用`"
        :aria-pressed="filter.category === item.category"
        @click="setCategory(filter.category === item.category ? '' : item.category)"
      >
        <span class="app-type-overview-icon">
          <TypeLineIcon :name="item.icon" :size="26" />
        </span>
        <span class="app-type-overview-copy">
          <strong><span v-for="part in item.labelParts" :key="part" class="category-name-part">{{ part }}</span></strong>
          <b>{{ item.count }}</b>
        </span>
      </button>
    </section>
    <form
      class="apps-filter"
      aria-label="应用筛选"
      @submit.prevent="submitSearch"
      @reset.prevent="resetFilters"
    >
      <label
        >应用名称或关键词<input
          v-model="queryDraft"
          type="search"
          placeholder="请输入应用名称或关键词" /></label
      ><label
        >标签<select
          :value="filter.tag"
          @change="setFilter('tag', $event.target.value)"
        >
          <option value="">请选择标签</option>
          <option v-for="tag in tags" :key="tag">{{ tag }}</option>
        </select></label
      ><label
        >应用类型<select
          :value="filter.type"
          @change="setFilter('type', $event.target.value)"
        >
          <option value="">请选择应用类型</option>
          <option v-for="category in APP_CATEGORIES" :key="category">
            {{ category }}
          </option>
        </select></label
      ><label
        >主题域<select
          :value="filter.domain"
          @change="setFilter('domain', $event.target.value)"
        >
          <option value="">请选择主题域</option>
          <option v-for="domain in domains" :key="domain">{{ domain }}</option>
        </select></label
      >
      <div class="filter-actions"><button type="reset">重置</button><button type="submit">查询</button></div>
    </form>
    <div class="apps-tools">
      <div class="result-summary">
      <strong>全部应用 {{ filteredApps.length }} 个</strong
      ><button type="button" @click="resetFilters">清空筛选</button
      ><span v-if="filter.category" class="active-category">{{
        filter.category
      }}</span>
      </div>
      <div class="catalogue-controls">
      <select
        :value="controller.sort"
        aria-label="排序"
        @change="controller.setSort($event.target.value)"
      >
        <option value="default">综合排序</option>
        <option value="usage-desc">使用量从高到低</option>
        <option value="favorites-desc">收藏量从高到低</option>
        <option value="name">名称排序</option></select>
      <div class="view-switch" role="group" aria-label="显示方式">
      <button
        type="button"
        aria-label="卡片视图"
        :aria-pressed="controller.view === 'grid'"
        @click="controller.setView('grid')"
      >
        卡片</button
      ><button
        type="button"
        aria-label="列表视图"
        :aria-pressed="controller.view === 'list'"
        @click="controller.setView('list')"
      >
        列表
      </button>
      </div>
      </div>
    </div>
    <section
      v-if="filteredApps.length"
      class="application-grid"
      :class="{ 'list-view': controller.view === 'list' }"
      aria-label="应用列表"
    >
      <article v-for="app in pagedApps" :key="app.id" :data-app-id="app.id" class="application-card" @click="openCard">
        <button class="card-favorite" type="button" :aria-pressed="routeSession.isRouteFavorite(app.route)"
          :aria-label="`${routeSession.isRouteFavorite(app.route) ? '取消收藏' : '收藏'}：${app.name}`"
          :title="routeSession.isRouteFavorite(app.route) ? '取消收藏' : '收藏'"
          @click.stop="toggleFavorite(app.route)">
          <TypeLineIcon name="favorite" :size="21" />
        </button>
        <header>
          <span class="catalog-icon"
            ><TypeLineIcon :name="categoryIconName(app.category)" :size="40"
          /></span>
          <div class="catalog-copy">
            <div class="catalog-title-row">
              <h2><a :id="`app-${app.id}`" :data-session-focus="`app-${app.id}`" :href="app.route" class="card-title-link">{{ app.name }}</a></h2>
              <mark class="catalog-type-tag">{{ normalizeAppCategory(app.category) }}</mark>
            </div>
            <dl class="catalog-people">
              <div class="catalog-department" :title="`负责部门：${app.department}`"><dt class="sr-only">负责部门</dt><dd>{{ app.department }}</dd></div>
              <div class="catalog-developer" :title="`开发者：${app.developer}`"><dt class="sr-only">开发者</dt><svg class="person-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6-4 4 4 4m8-8 4 4-4 4m-3-11-2 14"/></svg><dd>{{ app.developer }}</dd></div>
              <div class="catalog-owner" :title="`负责人：${app.owner}`"><dt class="sr-only">负责人</dt><svg class="person-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="6" r="3"/><path d="M4 17v-2a6 6 0 0 1 12 0v2"/></svg><dd>{{ app.owner }}</dd></div>
            </dl>
            <ClampedText :text="app.description" :id="`app-description-${app.id}`" />
          </div>
          <OverflowTags :tags="app.sceneTags || [app.scene]" :id="`app-tags-${app.id}`" />
        </header>
        <footer>
          <dl class="catalog-metrics">
            <div><dt>使用量：</dt><dd>{{ app.usage.toLocaleString("zh-CN") }}</dd></div>
            <div><dt>收藏量：</dt><dd>{{ app.favorites.toLocaleString("zh-CN") }}</dd></div>
          </dl>
          <div class="catalog-actions">
            <a v-if="!remoteMode && applicationAccessMode(app.route) === 'direct'" class="card-access" :href="`${app.route}#usage`">立即使用</a>
            <button v-else-if="applicationAccessMode(app.route) === 'direct'" class="card-access" type="button" :disabled="!operationExecutor" @click="launch(app)">立即使用</button>
            <button v-else-if="applicationAccessMode(app.route) === 'apply'" class="card-access" type="button" @click="requestUse(app)">申请使用</button>
            <button v-else class="card-access" type="button" disabled>暂不可用</button>
          </div>
        </footer>
      </article>
    </section>
    <section v-else class="apps-empty" role="status">
      <h2>暂无符合条件的应用</h2>
      <p>请调整筛选条件或清空筛选后重试。</p>
      <button type="button" @click="resetFilters">清空筛选</button>
    </section>
    <PaginationControl
      class="apps-pagination"
      :total="filteredApps.length"
      :page="controller.page"
      :page-size="controller.pageSize"
      label="应用中心分页"
      @update:page="controller.setPage"
      @update:page-size="controller.setPageSize"
    />
  </article>
</template>

<style>
/* Card layout is isolated from the legacy apps-grid rules. */
#main-content .apps-page{min-height:100%;overflow:visible;padding:20px;color:#183150;container-type:inline-size}
#main-content .apps-page>header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
#main-content .apps-page h1{display:flex;align-items:center;gap:12px;margin:0;letter-spacing:.02em}
#main-content .apps-page h1::before{content:'';width:5px;height:26px;flex-shrink:0;border-radius:3px;background:#0060a6}
#main-content .apps-page>header p{margin-top:6px;color:#61758c;font-size:14px;line-height:22px}
#main-content .apps-page .onboarding-link{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 18px;background:#0060a6;color:#fff;border:1px solid #0060a6;border-radius:8px;font-size:14px;white-space:nowrap}
#main-content .app-type-overview{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:4px;margin-bottom:16px;padding:8px;background:#fff;border:1px solid #e2e9f0;border-radius:14px;box-shadow:0 3px 16px #16375106}
#main-content .app-type-overview>button{display:flex;align-items:center;gap:10px;min-width:0;min-height:68px;padding:10px 12px;color:#183150;background:#fff;border:1px solid transparent;border-radius:9px;text-align:left;cursor:pointer;transition:background-color .16s ease,border-color .16s ease}
#main-content .app-type-overview>button:hover{border-color:#aac8df;background:#f7fbfe}
#main-content .app-type-overview>button[aria-pressed=true]{color:#fff;border-color:#0060a6;background:#0060a6;box-shadow:0 3px 8px #0060a622}
#main-content .app-type-overview>button[aria-pressed=true] .app-type-overview-icon{color:#fff;background:#ffffff1f}
#main-content .app-type-overview>button[aria-pressed=true] :is(strong,b,.category-name-part){color:#fff}
#main-content .app-type-overview-icon{display:grid;place-items:center;flex:0 0 36px;height:36px;color:#0060a6;background:#edf5fb;border-radius:8px}
#main-content .app-type-overview-copy{display:grid;grid-template-rows:40px 26px;gap:3px;min-width:0;flex:1}
#main-content .app-type-overview strong{display:flex;flex-wrap:wrap;align-content:center;min-width:0;font-size:14px;font-weight:500;line-height:20px;overflow-wrap:normal}
#main-content .app-type-overview .category-name-part{white-space:nowrap}
#main-content .app-type-overview b{font-size:20px;line-height:1.3}
#main-content .apps-filter{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;padding:16px;margin:0 0 16px;background:#fff;border:1px solid #dce5ef;border-radius:10px;box-shadow:0 2px 8px #193b6405}
#main-content .apps-filter label{display:grid;flex:1 1 180px;align-items:start;gap:6px;min-width:0;color:#526b83;font-size:14px;line-height:22px;white-space:nowrap}
#main-content .apps-filter label:first-child{flex-basis:270px}
#main-content .filter-actions{display:flex;gap:8px;margin-left:auto;flex:0 0 auto}
#main-content .apps-filter :is(input,select){width:100%;min-width:0;height:40px;padding:0 12px;color:#334f69;border:1px solid #e0e7ef;background:#f8fafc;border-radius:8px;font-size:14px}
#main-content .apps-filter :is(input,select):focus{background:#fff}
#main-content .apps-filter button{height:40px;padding:0 18px;font-size:14px;color:#fff;background:#0060a6;border:1px solid #0060a6;border-radius:6px;cursor:pointer}
#main-content .apps-filter button[type=reset]{color:#0060a6;background:#fff}
#main-content .apps-tools{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;min-height:38px;font-size:14px}
#main-content .result-summary{display:flex;align-items:center;flex-wrap:wrap;gap:10px;min-width:0}
#main-content .apps-tools strong{font-size:14px}
#main-content .result-summary>button{padding:6px 0;color:#61758c;border:0;background:transparent;border-radius:6px;font-size:14px;cursor:pointer}
#main-content .result-summary>button:hover{color:#0060a6}
#main-content .catalogue-controls{display:flex;align-items:center;gap:12px;margin-left:auto}
#main-content .view-switch{display:flex;gap:3px;padding:3px;background:#e9eff5;border:1px solid #e0e7ef;border-radius:8px}
#main-content .apps-tools .view-switch button{min-height:30px;padding:3px 13px;color:#61758c;border:0;background:transparent;border-radius:5px;font-size:14px;line-height:22px;cursor:pointer}
#main-content .apps-tools .view-switch button[aria-pressed=true]{color:#0060a6;background:#fff;box-shadow:0 1px 4px #193b6414}
#main-content .apps-tools select{width:148px;height:38px;padding:0 10px;border:1px solid #dce5ef;border-radius:8px;background:#fff;font-size:14px}
#main-content .active-category{padding:4px 8px;color:#0060a6;background:#eaf3fc;border-radius:5px}
#main-content .application-grid{display:grid;grid-template-columns:minmax(min(100%,340px),1fr);gap:12px;align-items:stretch}
#main-content .application-card{position:relative;min-width:0;display:flex;flex-direction:column;gap:8px;padding:14px;background:#fff;border:1px solid #dfe8f0;border-radius:12px;box-shadow:0 4px 16px #193b640c;transition:box-shadow .18s ease,border-color .18s ease}
#main-content .application-card:hover,#main-content .application-card:focus-within{border-color:#aac8df;box-shadow:0 7px 22px #193b641a}
#main-content .application-card{cursor:pointer}
#main-content .application-card :is(p,mark,dt,dd,a,button){font-size:14px;font-weight:400;line-height:22px}
#main-content .application-card>header{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;align-items:start;margin:-14px -14px 0;padding:16px 14px;background:linear-gradient(110deg,#eef6fc 0%,#f8fbfe 65%,#fff 100%);border-radius:11px 11px 0 0}
#main-content .application-card>header>div{min-width:0}
#main-content .catalog-copy{display:grid;gap:8px;min-width:0}
#main-content .application-card>header>.catalog-tags{grid-column:1/-1;margin-top:0;min-width:0}
#main-content .catalog-icon{width:64px;height:64px;display:grid;place-items:center;color:#0060a6;background:#fff;border:1px solid #e0ebf6;border-radius:16px;box-shadow:0 3px 8px #0060a60c}
#main-content .catalog-title-row{padding-right:32px;line-height:26px;overflow-wrap:anywhere}
#main-content .catalog-title-row h2{display:inline;margin:0 8px 0 0;color:#173451;font-size:16px;font-weight:650;line-height:26px}
#main-content .application-card .card-title-link{font:inherit;color:inherit;text-decoration:none}
#main-content .application-card .card-title-link:hover{color:#0060a6;text-decoration:underline;text-underline-offset:4px}
#main-content .application-card mark{display:inline-block;margin:0;padding:1px 7px;color:#426581;background:#edf4fa;border-radius:5px;vertical-align:baseline;max-width:100%;overflow-wrap:anywhere}
#main-content .application-card .catalog-type-tag{color:#0060a6;background:#eaf3fc}
#main-content .application-card .card-favorite{position:absolute;z-index:2;top:10px;right:10px;display:grid;place-items:center;width:34px;height:34px;padding:0;color:#d99a00;background:transparent;border:0;border-radius:50%;cursor:pointer}
#main-content .application-card .card-favorite:hover{color:#d99a00;background:#fff4d6}
#main-content .application-card .card-favorite[aria-pressed=true]{color:#e6a700;background:#fff7df}
#main-content .card-favorite[aria-pressed=true] svg{fill:currentColor}
#main-content .catalog-people{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin:0;color:#526b83}
#main-content .catalog-people>div{display:flex;align-items:flex-start;gap:5px;flex:0 1 auto;min-width:0;max-width:100%}
#main-content .catalog-people .person-icon{width:15px;height:15px;flex:0 0 15px;margin-top:3px;fill:none;stroke:#7891a8;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
#main-content .catalog-people dd{display:block;margin:0;overflow:visible;white-space:normal;overflow-wrap:anywhere}
#main-content .catalog-people :is(.catalog-owner,.catalog-developer) dd{color:#34516d}
#main-content .catalog-metrics{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;min-width:0;margin:0;padding:0;color:#647a90;background:transparent}
#main-content .catalog-metrics>div{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 2px}
#main-content .catalog-metrics dd{margin:0;color:#34516d;font-variant-numeric:tabular-nums}
#main-content .application-card>footer{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;margin:auto -14px -14px;padding:10px 14px;background:transparent;border-top:1px solid #edf1f5;border-radius:0 0 11px 11px}
#main-content .catalog-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px}
#main-content .application-card>footer :is(a,button){display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:6px 14px;border-radius:7px;white-space:nowrap;cursor:pointer}
#main-content .application-card .card-access{color:#fff;background:#0060a6;border:1px solid #0060a6}
#main-content .application-card .card-access:hover:not(:disabled),#main-content .apps-filter button[type=submit]:hover{background:#00528e;border-color:#00528e}
#main-content .application-card .card-access:disabled{color:#8798a9;background:#f1f4f7;border-color:#e1e7ee;cursor:not-allowed}
#main-content .application-grid.list-view{grid-template-columns:1fr}
#main-content .application-grid.list-view>.application-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.55fr);gap:16px;align-items:center}
#main-content .application-grid.list-view>.application-card>header{margin:0;padding:10px;min-height:0;border:0;border-radius:8px}
#main-content .application-grid.list-view>.application-card>footer{min-width:0;margin:0;padding-top:38px;border:0;border-radius:8px}
#main-content .apps-empty{display:grid;place-content:center;min-height:320px;text-align:center;gap:12px;padding:24px;background:#fff;border:1px solid #dce5ef;border-radius:12px}
#main-content .apps-empty h2{margin:0;font-size:18px}
#main-content .apps-empty button{justify-self:center;padding:8px 16px;color:#0060a6;background:#fff;border:1px solid #0060a6;border-radius:6px}
#main-content .apps-page :is(button,a,[tabindex="0"]):focus-visible{outline:3px solid #ffb648;outline-offset:3px}
/* Fit up to four 340px cards, including gaps, and distribute remaining space evenly. */
@container(min-width:692px){#main-content .application-grid:not(.list-view){grid-template-columns:repeat(2,minmax(340px,1fr))}}
@container(min-width:1044px){#main-content .application-grid:not(.list-view){grid-template-columns:repeat(3,minmax(340px,1fr))}}
@container(min-width:1396px){#main-content .application-grid:not(.list-view){grid-template-columns:repeat(4,minmax(340px,1fr))}}
@container(max-width:1319px){#main-content .app-type-overview{grid-template-columns:repeat(5,minmax(0,1fr))}}
@container(max-width:979px){#main-content .app-type-overview{grid-template-columns:repeat(3,minmax(0,1fr))}}
@container(max-width:639px){#main-content .application-grid.list-view>.application-card{display:flex}#main-content .application-grid.list-view>.application-card>footer{width:100%;padding-top:10px}#main-content .app-type-overview{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){#main-content .apps-page{padding:12px}#main-content .apps-page>header{flex-wrap:wrap}#main-content .application-card>footer :is(a,button){min-height:44px}#main-content .application-card .card-favorite{width:40px;height:40px;top:8px;right:8px}}
@media(prefers-reduced-motion:reduce){#main-content .application-card{transition:none}}
@container(max-width:979px){#main-content .apps-filter label,#main-content .apps-filter label:first-child{flex-basis:calc(50% - 12px)}#main-content .filter-actions{flex-basis:100%;justify-content:flex-end}}
@container(max-width:639px){#main-content .apps-filter label,#main-content .apps-filter label:first-child{flex-basis:100%}#main-content .catalogue-controls{width:100%;justify-content:space-between;margin:0}}
@media(max-width:760px){#main-content .apps-tools>.result-summary,#main-content .apps-tools>.catalogue-controls{grid-column:1/-1}#main-content .apps-tools .view-switch button{min-height:38px}#main-content .catalogue-controls select{min-height:44px;min-width:0;flex:1;width:0}#main-content .filter-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}#main-content .catalogue-controls{gap:8px}}
</style>
