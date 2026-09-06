<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  BadgeCheck, BookOpenCheck, Boxes, ChartNoAxesCombined,
  House, LayoutGrid, Megaphone, ShieldCheck, Trophy, UsersRound
} from '@lucide/vue';
import { createShellController } from '../state/interaction-controllers.js';
import TypeLineIcon from './TypeLineIcon.vue';

const props = defineProps({ page: { type: Object, required: true } });
const shellState = createShellController();
const sceneDraft = ref(new URLSearchParams(window.location.search).get('scene') || '');
const selectedCategory = ref(new URLSearchParams(window.location.search).get('category') || '');

const basePrimaryNav = [
  ['/workbench', House, '首页工作台', '/assets/nav-workbench.png'], ['/favorites', Boxes, '素材中心', '/assets/nav-materials.png'],
  ['/talent/people', UsersRound, '人才管理', '/assets/nav-talent.png'], ['/apps', LayoutGrid, '应用中心', '/assets/nav-apps.png'],
  ['/training', BookOpenCheck, '培训课堂', '/assets/nav-training.png'], ['/points', Trophy, '积分中心', '/assets/nav-points.png'],
  ['/certification', BadgeCheck, '数字化认证', '/assets/nav-certification.png'], ['/operations', ChartNoAxesCombined, '运营管理', '/assets/nav-operations.png'],
  ['/announcements', Megaphone, '公告通知', '/assets/nav-announcements.png'], ['/admin', ShieldCheck, '后台管理', '/assets/nav-admin.png']
];
const shellVariant = computed(() => props.page.id === '01' ? 'ui-update-workbench' : props.page.id === '07' ? 'ui-update-apps' : props.page.id === '10' ? 'ui-update-report' : '');
const primaryNav = basePrimaryNav;
const simpleNav = basePrimaryNav.map(([route, , label, sidebarIcon]) => [route, label, sidebarIcon]);
const categories = [
  ['RPA', '/assets/category-rpa.png'], ['大屏', '/assets/category-screen.png'], ['驾驶舱', '/assets/category-cockpit.png'],
  ['可视化报表', '/assets/category-report.png'], ['指标', '/assets/category-metric.png'], ['数据集', '/assets/category-dataset.png'],
  ['AI', '/assets/category-ai.png'], ['海能work应用', '/assets/category-work.png']
];
const isCatalogue = computed(() => props.page.id === '01' || (Number(props.page.id) >= 7 && Number(props.page.id) <= 17));
const isTalent = computed(() => Number(props.page.id) >= 28);
function active(route) {
  if (route === '/talent/people' && props.page.route.startsWith('/talent/')) return true;
  return props.page.route === route || (route !== '/workbench' && props.page.route.startsWith(`${route}/`));
}
function setCategory(label) {
  if (props.page.id !== '07') {
    window.history.pushState({}, '', `/apps?category=${encodeURIComponent(label)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }
  const next = new URL(window.location.href);
  next.searchParams.set('category', label);
  window.history.replaceState({}, '', `${next.pathname}${next.search}`);
  selectedCategory.value = label;
  window.dispatchEvent(new CustomEvent('xlt:apps-category', { detail: label }));
}
function setScene(scene) {
  if (props.page.id === '01') {
    sceneDraft.value = scene;
    window.dispatchEvent(new CustomEvent('xlt:workbench-filter', { detail: scene ? { key:'scene', value:scene } : { key:'reset' } }));
    return;
  }
  if (props.page.id !== '07') {
    const suffix = scene ? `?scene=${encodeURIComponent(scene)}` : '';
    window.history.pushState({}, '', `/apps${suffix}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }
  const next = new URL(window.location.href);
  scene ? next.searchParams.set('scene', scene) : next.searchParams.delete('scene');
  window.history.replaceState({}, '', `${next.pathname}${next.search}`);
  sceneDraft.value = scene;
  window.dispatchEvent(new CustomEvent('xlt:apps-filter', { detail: { key: 'scene', value: scene } }));
}
function submitSceneSearch() {
  if (props.page.id === '01') {
    window.dispatchEvent(new CustomEvent('xlt:workbench-filter', { detail: { key:'query', value:sceneDraft.value } }));
    return;
  }
  setScene(sceneDraft.value);
}
function syncShellFilters() {
  const query = new URLSearchParams(window.location.search);
  sceneDraft.value = query.get('scene') || '';
  selectedCategory.value = query.get('category') || '';
}
onMounted(() => window.addEventListener('popstate', syncShellFilters));
onBeforeUnmount(() => window.removeEventListener('popstate', syncShellFilters));
</script>

<template>
  <div class="exhibition-shell" :class="[{ 'standard-shell': !isCatalogue, 'certification-shell': props.page.id === '27' }, shellVariant]">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <header class="topbar">
      <a class="brand" href="/workbench" aria-label="数智产品展厅首页">
        <span>数智产品展厅</span>
      </a>
      <nav class="primary-nav" aria-label="主导航">
        <a v-for="([route, icon, label]) in primaryNav" :key="route" :href="route" :aria-current="active(route) ? 'page' : undefined">
          <component :is="icon" class="nav-glyph" :size="22" :stroke-width="1.8" aria-hidden="true" />{{ label }}
        </a>
      </nav>
      <div class="top-actions" aria-label="快捷操作">
        <a class="action-link" href="/messages" aria-label="8 条未读消息"><TypeLineIcon name="message" :size="24" /></a>
        <a class="action-link" href="/favorites" aria-label="收藏"><TypeLineIcon name="favorite" :size="23" /></a>
        <a class="top-user" href="/profile">
          <img src="/assets/top-avatar.png" width="38" height="38" alt="" />
          <span><strong>张三丰</strong><small>物资采购中心</small></span>
        </a>
      </div>
    </header>

    <div class="page-frame">
      <aside class="sidebar" aria-label="左侧导航">
        <p class="sr-only" aria-live="polite">{{ shellState.announcement }}</p>
        <div id="sidebar-content">
        <template v-if="props.page.id === '10'">
          <section class="catalogue-group report-catalogue"><div class="group-heading"><h2><AppIcon name="catalogue-materials" :size="24" />素材中心</h2></div><nav aria-label="素材中心分类"><a v-for="label in ['PPA','大屏','驾驶舱','可视化报表','指标','数据集','AI','海能work应用']" :key="`report-material-${label}`" href="/favorites">{{ label }}</a></nav></section>
          <section class="catalogue-group app-group report-catalogue"><div class="group-heading"><h2><AppIcon name="catalogue-apps" :size="24" />应用中心</h2></div><nav aria-label="应用中心分类"><a v-for="label in ['PPA','大屏','资产','指标','数据开发','数据集','AI','数据中心(23)']" :key="`report-app-${label}`" href="/apps">{{ label }}</a></nav></section>
          <section class="catalogue-group report-catalogue"><div class="group-heading"><h2>基础能力</h2></div><nav aria-label="基础能力"><a v-for="label in ['服务编排','连接器','事件流','智能生成','API','连接中心(18)']" :key="label" href="/apps">{{ label }}</a></nav></section>
          <section class="scene-search report-scene" aria-label="场景化运营"><h2>场景化运营</h2><div><button v-for="label in ['经营分析决策大厅','安全管理','生产管理','设备管理','物资管理','HSE管理','HSE管理','人力资源','财务管理','党群管理','更多']" :key="label" type="button">{{ label }}</button></div></section>
        </template>
        <template v-else-if="isCatalogue">
          <section class="catalogue-group">
            <div class="group-heading"><h2><TypeLineIcon class="catalogue-line-icon heading-icon" name="materials" :size="20" />素材中心</h2><button class="group-toggle" type="button" :aria-expanded="String(shellState.materialsExpanded)" aria-controls="materials-group-menu" :aria-label="shellState.materialsExpanded?'收起素材中心子菜单':'展开素材中心子菜单'" @click="shellState.toggleGroup('materials')"><span class="group-chevron" aria-hidden="true"></span></button></div>
            <nav id="materials-group-menu" v-show="shellState.materialsExpanded" aria-label="素材中心子菜单">
              <a v-for="([label], index) in categories" :key="`material-${label}`" href="/favorites"><TypeLineIcon class="catalogue-line-icon" :name="['rpa','visual','visual','report','metric','dataset','ai','work'][index]" :size="18" />{{ label }}</a>
            </nav>
          </section>
          <section class="catalogue-group app-group">
            <div class="group-heading"><h2><TypeLineIcon class="catalogue-line-icon heading-icon" name="apps" :size="20" />应用中心</h2><button class="group-toggle" type="button" :aria-expanded="String(shellState.appsExpanded)" aria-controls="apps-group-menu" :aria-label="shellState.appsExpanded?'收起应用中心子菜单':'展开应用中心子菜单'" @click="shellState.toggleGroup('apps')"><span class="group-chevron" aria-hidden="true"></span></button></div>
            <nav id="apps-group-menu" v-show="shellState.appsExpanded" aria-label="应用分类">
              <button v-for="([label], index) in categories" :key="`app-${label}`" type="button" :aria-pressed="selectedCategory === label" @click="setCategory(label)"><TypeLineIcon class="catalogue-line-icon" :name="['rpa','visual','visual','report','metric','dataset','ai','work'][index]" :size="18" />{{ label }}</button>
            </nav>
          </section>
          <section class="scene-search" aria-labelledby="scene-search-title">
            <h2 id="scene-search-title">场景化搜索</h2>
            <label><span class="sr-only">搜索场景关键词</span><input v-model="sceneDraft" type="search" placeholder="搜索场景或关键字" @keydown.enter.prevent="submitSceneSearch" /></label>
            <div>
              <button type="button" :aria-pressed="!sceneDraft" @click="setScene('')">全部场景</button><button type="button" :aria-pressed="sceneDraft === '生产运营'" @click="setScene('生产运营')">生产运营</button>
              <button type="button" :aria-pressed="sceneDraft === '设备管理'" @click="setScene('设备管理')">设备管理</button><button type="button" :aria-pressed="sceneDraft === '设备分析'" @click="setScene('设备分析')">设备分析</button>
              <button type="button" :aria-pressed="sceneDraft === '安全环保'" @click="setScene('安全环保')">安全环保</button><button type="button" :aria-pressed="sceneDraft === '供应链管理'" @click="setScene('供应链管理')">供应链管理</button>
              <button type="button" :aria-pressed="sceneDraft === '人力资源'" @click="setScene('人力资源')">人力资源</button><button type="button" :aria-pressed="sceneDraft === '财务管理'" @click="setScene('财务管理')">财务管理</button>
              <button type="button" :aria-pressed="sceneDraft === '市场营销'" @click="setScene('市场营销')">市场营销</button><button type="button" disabled title="全部冻结场景已展示">更多</button>
            </div>
          </section>
        </template>
        <template v-else-if="isTalent">
          <nav class="simple-nav" aria-label="人才管理功能">
            <a href="/workbench"><AppIcon name="nav-workbench" :size="22" />首页工作台</a>
            <a class="section-current" href="/talent/people"><AppIcon name="nav-talent" :size="22" />人才管理</a>
            <a class="sub" href="/talent/projects" :aria-current="props.page.id === '29' ? 'page' : undefined">人才项目管理</a>
            <a class="sub" href="/talent/progress" :aria-current="props.page.id === '30' ? 'page' : undefined">项目进度管理</a>
            <a class="sub" href="/talent/people" :aria-current="props.page.id === '28' ? 'page' : undefined">人才库</a>
            <a href="/apps"><AppIcon name="nav-apps" :size="22" />应用中心</a>
            <a href="/training"><AppIcon name="nav-training" :size="22" />培训课堂</a>
            <a href="/points"><AppIcon name="nav-points" :size="22" />积分中心</a>
          </nav>
        </template>
        <nav v-else class="simple-nav" aria-label="平台功能">
          <a v-for="([route, label, icon]) in simpleNav" :key="route" :href="route" :aria-current="active(route) ? 'page' : undefined"><AppIcon :name="icon" :size="22" />{{ label }}</a>
        </nav>
        </div>
      </aside>
      <main id="main-content" tabindex="-1"><slot /></main>
    </div>
  </div>
</template>

<style scoped>
.exhibition-shell{height:100vh;overflow:hidden;display:grid;grid-template-rows:auto minmax(0,1fr)}
.skip-link{position:fixed;z-index:100;left:16px;top:-60px;padding:10px 16px;color:#fff;background:#075dcc;border-radius:4px}.skip-link:focus-visible{top:10px}
.topbar{height:69px;display:flex;align-items:center;padding:0 22px;color:#fff;background:#00396e;border-bottom:0}.brand{flex:0 0 198px;height:43px;display:flex;align-items:center;color:#fff;font-size:26px;font-weight:700;white-space:nowrap}
.primary-nav{height:100%;display:flex;flex:1;min-width:0}.primary-nav a{min-width:82px;height:100%;position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 9px;color:#fff;font-size:13px;white-space:nowrap}.primary-nav a[aria-current='page']{color:#fff}.primary-nav a[aria-current='page']::after{content:'';position:absolute;left:15px;right:15px;bottom:0;height:3px;background:#fff}.nav-glyph{width:22px;height:24px;color:currentColor;flex:0 0 auto}
.top-actions{flex:0 0 218px;height:100%;display:flex;align-items:center;justify-content:flex-end;gap:15px;white-space:nowrap}.action-link{width:30px;height:44px;position:relative;display:grid;place-items:center;color:#fff}.action-icon{width:24px;height:24px;color:currentColor}.top-user{height:44px;display:flex;align-items:center;gap:8px;padding-left:12px;border-left:1px solid rgba(255,255,255,.28)}.top-user>img{width:38px;height:38px;border-radius:50%}.top-user span{display:grid;gap:2px}.top-user strong{color:#fff;font-size:13px}.top-user small{color:#d8e9fb;font-size:9px}
.page-frame{min-height:0;overflow:hidden;display:grid;grid-template-columns:220px minmax(0,1fr)}.sidebar{min-height:0;position:relative;background:#fff;border-right:1px solid #dce4ed;overflow-y:auto}.catalogue-group{padding:9px 15px 8px;border-bottom:1px solid #e7edf3}.group-heading{height:28px;display:flex;align-items:center;justify-content:space-between}.catalogue-group h2,.scene-search h2{height:28px;display:flex;align-items:center;gap:9px;margin:0;color:#203451;font-size:13px;font-weight:700}.catalogue-group h2>.app-icon{width:22px;height:22px}.group-toggle{width:28px;height:28px;display:grid;place-items:center;padding:0;color:#47617f;background:transparent;border:0;border-radius:3px}.group-chevron{width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg) translate(-1px,-1px)}.group-toggle[aria-expanded=false] .group-chevron{transform:rotate(-45deg)}.catalogue-group nav{display:grid}.catalogue-group nav a,.catalogue-group nav button{height:29px;display:flex;align-items:center;gap:10px;padding-left:1px;color:#223b5d;background:transparent;border:0;text-align:left;font-size:12px}.catalogue-group nav button[aria-pressed=true]{color:#086fe8;background:#eaf3ff}.catalogue-group nav :is(a,button)>.app-icon{width:18px;height:18px}.app-group{padding-top:7px}
.scene-search{padding:10px 19px}.scene-search h2{font-size:14px}.scene-search label{height:31px;display:flex;align-items:center;padding:0 8px;border:1px solid #d7e1ec;border-radius:4px}.scene-search input{width:100%;min-width:0;border:0;outline:0;color:#51657e;font-size:11px}.scene-search>div{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 10px;padding-top:10px}.scene-search button{height:28px;border:1px solid #e5ebf2;color:#354e6d;background:#fff;border-radius:4px;font-size:11px}.scene-search button[aria-pressed=true]{color:#066cec;background:#eaf3ff;border-color:#eaf3ff}.scene-search button:disabled{color:#9ca8b6;background:#f2f4f6}
.simple-nav{display:grid;padding-top:17px}.simple-nav a{height:58px;display:flex;align-items:center;gap:15px;padding:0 21px;color:#1d3353;border-left:3px solid transparent;font-size:14px;font-weight:600}.simple-nav a>.app-icon{width:22px;height:22px}.simple-nav a[aria-current='page']{color:#0869ee;background:#eaf2ff;border-left-color:#096ef0}.simple-nav a.section-current{color:#0869ee}.simple-nav a.sub{height:40px;padding-left:60px;color:#607088;font-size:12px;font-weight:400}.simple-nav a.sub[aria-current='page']{color:#0869ee;background:#eaf2ff;border-left-color:#096ef0}
main{min-width:0;min-height:0;overflow-y:auto;background:#fff;outline:none}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}a:focus-visible,button:focus-visible,main:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}
.standard-shell .page-frame{grid-template-columns:220px minmax(0,1fr)}
@media(max-width:1420px){.brand{flex-basis:160px}.primary-nav{overflow-x:auto;scrollbar-width:thin}.primary-nav a{flex:0 0 auto;min-width:72px;padding-inline:5px}.top-actions{flex-basis:205px}.top-user small{display:none}}@media(max-width:1100px){.primary-nav{overflow-x:auto}.page-frame{grid-template-columns:220px minmax(0,1fr)}.sidebar{overflow-y:auto}}@media(max-width:760px){.topbar{width:100%;min-width:0;height:auto;min-height:69px;flex-wrap:wrap;overflow-x:hidden;padding-block:7px}.brand{min-width:0;flex:1 1 0}.top-actions{flex:0 0 auto}.primary-nav{order:3;width:100%;max-width:100%;flex:0 0 100%;overflow-x:auto}.primary-nav a{flex:0 0 auto;height:44px}.page-frame,.standard-shell .page-frame{grid-template-columns:1fr}.sidebar{min-height:auto;border-right:0;border-bottom:1px solid #dce4ed}.simple-nav{display:flex;overflow-x:auto;padding-top:0}.simple-nav a{flex:0 0 auto;height:48px;padding:0 14px;border-left:0;border-bottom:3px solid transparent}.simple-nav a[aria-current='page']{border-bottom-color:#096ef0}.simple-nav a.sub{padding-left:14px}}
@media(min-width:761px) and (max-width:940px){.page-frame,.standard-shell .page-frame{grid-template-columns:150px minmax(0,1fr)}.catalogue-group{padding-inline:9px}.scene-search{padding-inline:10px}}
@media(min-width:941px) and (max-width:1600px){.page-frame,.standard-shell .page-frame{grid-template-columns:220px minmax(0,1fr)}.catalogue-group{padding-inline:11px}.scene-search{padding-inline:13px}}
@media(min-width:761px) and (max-width:1000px){.topbar{padding-inline:4px}.brand{flex-basis:125px;font-size:12px}.primary-nav{overflow:hidden}.primary-nav a{min-width:0;flex:1 1 0;gap:2px;padding-inline:1px;font-size:8px}.nav-glyph{width:14px;height:16px}.top-actions{flex-basis:105px;gap:4px}.action-link{width:20px}.action-icon{width:18px;height:18px}.top-user{gap:4px;padding-left:4px}.top-user>img{width:26px;height:26px}.top-user strong{font-size:9px}}
.certification-shell .page-frame{grid-template-columns:242px minmax(0,1fr)}
main{background:#f7f9fc}
.ui-update-report .report-catalogue nav a{padding-left:12px}
.ui-update-workbench .page-frame{grid-template-columns:220px minmax(0,1fr)}.ui-update-workbench .sidebar{border-color:#d5dee8}.ui-update-workbench main{background:#f7f9fc}
.ui-update-apps .page-frame{grid-template-columns:220px minmax(0,1fr)}.ui-update-apps .sidebar{border-color:#d5dee8}.ui-update-apps .catalogue-group{padding-top:11px;padding-bottom:10px}.ui-update-apps .catalogue-group nav :is(a,button){height:30px}.ui-update-apps .scene-search{padding-top:12px}.ui-update-apps main{background:#fff}
.ui-update-report{height:auto;min-height:1492px;overflow:visible}.ui-update-report .page-frame{min-height:1423px;grid-template-columns:166px minmax(0,1fr);overflow:visible}.ui-update-report .sidebar,.ui-update-report main{overflow:visible}.ui-update-report .catalogue-group{padding:13px 17px 9px}.ui-update-report .catalogue-group h2{font-size:11px}.ui-update-report .report-catalogue nav a{height:30px;padding-left:12px;font-size:10px}.ui-update-report .report-scene{padding:12px 17px}.ui-update-report .report-scene>div{grid-template-columns:repeat(2,1fr);gap:5px}.ui-update-report .report-scene button{height:26px;padding:0 4px;font-size:8px}.ui-update-report main{background:#fff}
.topbar{height:63px;padding:0 18px;background:#0060a6;border-bottom:1px solid #143f6b}
.page-frame{background:#f5f7fa}
.catalogue-group h2,.scene-search h2{height:34px;font-size:16px;font-weight:700}
.catalogue-group nav a,.catalogue-group nav button{height:36px;font-size:15px;font-weight:400}
.catalogue-line-icon{color:#173b63;stroke-width:1.8}.catalogue-line-icon.heading-icon{color:#102f54;stroke-width:1.9}
.scene-search button[aria-pressed=true]{color:#fff;background:#0060a6;border-color:#0060a6}
main{background:#f5f7fa}
@media(max-width:940px){.catalogue-group nav a,.catalogue-group nav button{font-size:14px}}
</style>
