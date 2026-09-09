<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
const tableRegionSelector = '.table-scroll,.talent-table-scroll,.talent-body main>section,.progress-table,.point-table,.admin-table,.app-admin-table,.notice-table,.log-panel';
function decorateHorizontalScrollRegions() {
  document.querySelectorAll('#main-content table').forEach((table,index) => {
    const region = table.closest(tableRegionSelector) || table.parentElement;
    if (!region) return;
    const caption = table.querySelector('caption')?.textContent?.trim();
    const heading = region.querySelector('h2')?.textContent?.trim();
    region.classList.add('horizontal-scroll-region');
    region.tabIndex = 0;
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', `${caption || heading || `数据表 ${index + 1}`}，可左右滚动`);
  });
}
async function refreshHorizontalScrollRegions() {
  await nextTick();
  decorateHorizontalScrollRegions();
}
onMounted(() => {
  window.addEventListener('popstate', syncShellFilters);
  window.addEventListener('resize', decorateHorizontalScrollRegions);
  refreshHorizontalScrollRegions();
});
watch(() => props.page.route, refreshHorizontalScrollRegions, { flush:'post' });
onBeforeUnmount(() => {
  window.removeEventListener('popstate', syncShellFilters);
  window.removeEventListener('resize', decorateHorizontalScrollRegions);
});
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
        <template v-if="isCatalogue">
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
.exhibition-shell{height:100vh;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}
.exhibition-shell{height:100dvh;min-height:100svh}
.skip-link{position:fixed;z-index:100;left:16px;top:-60px;padding:10px 16px;color:#fff;background:#0060a6;border-radius:4px}.skip-link:focus-visible{top:10px}
.mobile-nav-toggle,.mobile-drawer-header,.mobile-primary-nav,.sidebar-backdrop{display:none}
.topbar{height:63px;display:flex;align-items:center;padding:0 18px;background:#0060a6;border-bottom:1px solid #143f6b;color:#fff}.brand{flex:0 0 190px;height:43px;display:flex;align-items:center;color:#fff;font-size:19px;font-weight:700;letter-spacing:.04em;white-space:nowrap}
.primary-nav{height:100%;display:flex;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;scroll-padding-inline:8px}.primary-nav::-webkit-scrollbar{width:0;height:0;display:none}.primary-nav a{min-width:82px;height:100%;position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 9px;color:rgba(255,255,255,.82);font-size:14px;white-space:nowrap;transition:color .16s ease,background-color .16s ease}.primary-nav a:hover{color:#fff;background:rgba(255,255,255,.055)}.primary-nav a[aria-current='page']{color:#fff}.primary-nav a[aria-current='page']::after{content:'';position:absolute;left:15px;right:15px;bottom:0;height:3px;background:#fff}.nav-glyph{width:22px;height:24px;color:currentColor;opacity:.92}
.top-actions{flex:0 0 218px;height:100%;display:flex;align-items:center;justify-content:flex-end;gap:15px;white-space:nowrap}.action-link{width:32px;height:44px;position:relative;display:grid;place-items:center;color:#fff}.action-link :deep(.type-line-icon){overflow:visible;stroke-width:1.7}.action-link[aria-current='page']{color:#b9dcff}.top-user{height:44px;display:flex;align-items:center;gap:8px;padding-left:12px;border-left:1px solid rgba(255,255,255,.2)}.top-user>img{width:38px;height:38px;border-radius:50%;filter:saturate(.7)}.top-user span{display:grid;gap:2px}.top-user strong{color:#fff;font-size:13px}.top-user small{color:rgba(255,255,255,.72);font-size:11px}
.action-link:first-child::after{content:'8';position:absolute;right:-1px;top:7px;min-width:14px;height:14px;display:grid;place-items:center;padding:0 2px;color:#fff;background:#e7382f;border:2px solid #073866;border-radius:999px;font-size:8px;font-weight:700;line-height:1}
.page-frame{min-height:0;overflow:hidden;display:grid;background:#f5f7fa;grid-template-columns:220px minmax(0,1fr)}.sidebar{min-height:0;position:relative;background:#fff;border-right:1px solid #d9e2ec;overflow-y:auto}.catalogue-group{padding:11px 15px 10px;border-bottom:1px solid #e4eaf1}.group-heading{height:30px;display:flex;align-items:center;justify-content:space-between}.catalogue-group h2,.scene-search h2{height:30px;display:flex;align-items:center;gap:9px;margin:0;color:#102d50;font-size:13px;font-weight:700}.catalogue-group h2>img{width:20px;height:20px;object-fit:contain;filter:grayscale(1) contrast(1.9) sepia(.65) saturate(2.7) hue-rotate(166deg);mix-blend-mode:multiply}.group-toggle{width:28px;height:28px;display:grid;place-items:center;padding:0;color:#304d6e;background:transparent;border:0;border-radius:3px}.group-chevron{width:7px;height:7px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translate(-1px,-1px)}.group-toggle[aria-expanded=false] .group-chevron{transform:rotate(-45deg)}.catalogue-group nav{display:grid;gap:1px;padding-top:3px}.catalogue-group nav a,.catalogue-group nav button{height:30px;display:flex;align-items:center;gap:10px;padding:0 7px;color:#324a67;background:transparent;border:0;border-radius:4px;text-align:left;font-size:12px}.catalogue-group nav a:hover,.catalogue-group nav button:hover{background:#f1f5f9;color:#0060a6}.catalogue-group nav button[aria-pressed=true]{color:#0060a6;background:#eaf1f8;font-weight:600}.catalogue-group nav a>img,.catalogue-group nav button>img{width:17px;height:17px;object-fit:contain;filter:grayscale(1) contrast(1.9) sepia(.65) saturate(2.7) hue-rotate(166deg);mix-blend-mode:multiply}.app-group{padding-top:9px}
.catalogue-line-icon{color:#173b63;stroke-width:1.8}.catalogue-line-icon.heading-icon{color:#102f54;stroke-width:1.9}
.scene-search{padding:13px 19px 18px}.scene-search h2{font-size:14px}.scene-search label{height:34px;display:flex;align-items:center;padding:0 9px;border:1px solid #ccd8e5;border-radius:4px;background:#fff}.scene-search input{width:100%;min-width:0;border:0;outline:0;color:#3e5571;font-size:11px;background:transparent}.scene-search>div{display:grid;grid-template-columns:repeat(2,1fr);gap:7px 9px;padding-top:11px}.scene-search button{height:29px;border:1px solid #dce4ed;color:#314b6c;background:#fff;border-radius:4px;font-size:11px}.scene-search button:hover{border-color:#9db3ca;background:#f6f8fb}.scene-search button[aria-pressed=true]{color:#fff;background:#0060a6;border-color:#0060a6}.scene-search button:disabled{color:#8d99a7;background:#f1f3f6}
.simple-nav{display:grid;padding-top:17px}.simple-nav a{height:58px;display:flex;align-items:center;gap:15px;padding:0 21px;color:#1d3353;border-left:3px solid transparent;font-size:14px;font-weight:600}.simple-nav a>img{width:22px;height:24px;object-fit:contain}.simple-nav a[aria-current='page']{color:#0060a6;background:#eaf2ff;border-left-color:#0060a6}.simple-nav a.section-current{color:#0060a6}.simple-nav a.sub{height:40px;padding-left:60px;color:#607088;font-size:12px;font-weight:400}.simple-nav a.sub[aria-current='page']{color:#0060a6;background:#eaf2ff;border-left-color:#0060a6}
main{min-width:0;min-height:0;overflow-y:auto;background:#f5f7fa;outline:none}.platform-footer{min-height:56px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;margin-top:12px;padding:16px 24px 18px;color:#77899c;background:#f5f7fa;border-top:1px solid #dce4ec;font-size:12px;line-height:1.5;text-align:center;letter-spacing:.01em}.platform-footer p{margin:0}main :deep(.profile-page>.copyright){display:none}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}a:focus-visible,button:focus-visible,main:focus-visible{outline:3px solid #ffb648;outline-offset:2px}
.standard-shell .page-frame{grid-template-columns:220px minmax(0,1fr)}
.ui-update-report{height:100vh;overflow:hidden}
.ui-update-report .page-frame{grid-template-columns:220px minmax(0,1fr)}
.ui-update-report main{overflow-y:auto;background:#fff}
@media(min-width:1421px){.primary-nav a{min-width:0;flex:1 1 0}}
@media(max-width:1420px){.brand{flex-basis:160px}.primary-nav a{flex:0 0 auto;min-width:72px;padding-inline:5px}.top-actions{flex-basis:205px}.top-user small{display:none}}@media(max-width:1100px){.page-frame{grid-template-columns:220px minmax(0,1fr)}.sidebar{overflow-y:auto}}
@media(min-width:1001px) and (max-width:1280px){
  .topbar{padding-inline:10px}
  .brand{flex-basis:145px;font-size:17px}
  .primary-nav{overflow-x:auto}
  .primary-nav a{min-width:0;flex:1 1 auto;gap:4px;padding-inline:3px;font-size:13px}
  .nav-glyph{width:18px;height:20px}
  .top-actions{flex-basis:145px;gap:4px}
  .top-user{padding-left:7px}
  .top-user span{display:none}
}
@media(max-width:760px){
  .exhibition-shell{grid-template-rows:calc(56px + env(safe-area-inset-top)) minmax(0,1fr)}
  .exhibition-shell .topbar{height:calc(56px + env(safe-area-inset-top));min-height:calc(56px + env(safe-area-inset-top));flex-wrap:nowrap;padding:env(safe-area-inset-top) max(10px,env(safe-area-inset-right)) 0 max(10px,env(safe-area-inset-left));position:relative;z-index:60}
  .mobile-nav-toggle{width:44px;height:44px;display:grid;place-content:center;gap:5px;flex:0 0 44px;padding:0;color:#fff;background:transparent;border:0;border-radius:6px}
  .mobile-nav-toggle span{width:21px;height:2px;display:block;background:currentColor;border-radius:2px}
  .brand{height:56px;min-width:0;flex:1 1 auto;padding-left:5px;overflow:hidden;font-size:17px;text-overflow:ellipsis}
  .primary-nav{display:none}
  .top-actions{height:56px;flex:0 0 auto;gap:0}
  .action-link{width:44px;height:44px}
  .top-user{width:44px;height:44px;justify-content:center;padding:0;border-left:0}
  .top-user>img{width:32px;height:32px}
  .top-user span{display:none}
  .page-frame,.standard-shell .page-frame,.certification-shell .page-frame{grid-template-columns:1fr;overflow:hidden}
  .sidebar{width:min(88vw,340px);max-height:none;min-height:0;position:fixed;z-index:56;left:0;top:calc(56px + env(safe-area-inset-top));bottom:0;overflow-y:auto;overscroll-behavior:contain;padding-bottom:env(safe-area-inset-bottom);border-right:1px solid #d6e0ea;border-bottom:0;box-shadow:8px 0 28px rgba(2,35,70,.2);transform:translateX(-102%);visibility:hidden;transition:transform .22s ease,visibility 0s linear .22s}
  .sidebar.mobile-open{transform:translateX(0);visibility:visible;transition:transform .22s ease}
  .sidebar-backdrop{display:block;position:fixed;z-index:55;inset:calc(56px + env(safe-area-inset-top)) 0 0;background:rgba(4,24,49,.42);border:0}
  .mobile-drawer-header{min-height:56px;position:sticky;z-index:2;top:0;display:flex;align-items:center;justify-content:space-between;padding:0 16px;color:#102d50;background:#fff;border-bottom:1px solid #dfe6ee;font-size:17px}
  .mobile-drawer-close{width:44px;height:44px;position:relative;padding:0;background:transparent;border:0;border-radius:6px}
  .mobile-drawer-close::before,.mobile-drawer-close::after{content:'';position:absolute;left:21px;top:11px;width:2px;height:22px;background:#173b63;border-radius:2px}
  .mobile-drawer-close::before{transform:rotate(45deg)}.mobile-drawer-close::after{transform:rotate(-45deg)}
  .mobile-primary-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;padding:10px 12px;border-bottom:1px solid #e3e9ef}
  .mobile-primary-nav a{min-width:0;min-height:46px;display:flex;align-items:center;gap:8px;padding:6px 9px;color:#233d5b;border-radius:6px;font-size:14px}
  .mobile-primary-nav a[aria-current='page']{color:#0060a6;background:#eaf3fb;font-weight:700}
  .mobile-primary-nav img{width:20px;height:22px;object-fit:contain}
  .catalogue-group{padding:10px 12px}
  .group-heading{height:44px}.group-toggle{width:44px;height:44px}
  .catalogue-group h2,.scene-search h2{height:44px;font-size:16px}
  .catalogue-group nav{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}
  .catalogue-group nav a,.catalogue-group nav button{height:44px;min-width:0;padding:0 9px;font-size:14px}
  .scene-search{padding:10px 12px 18px}
  .scene-search label{height:44px}.scene-search input{font-size:16px}
  .scene-search>div{gap:8px}.scene-search button{min-height:44px;font-size:14px}
  .simple-nav{display:grid;grid-template-columns:1fr;padding:8px 0;overflow:visible}
  .simple-nav a,.simple-nav a.sub{min-height:48px;height:auto;padding:10px 18px;border-left:3px solid transparent;border-bottom:0;font-size:15px}
  .simple-nav a.sub{padding-left:55px}
  .simple-nav a[aria-current='page']{border-left-color:#0060a6;border-bottom:0}
  main{overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
}
@media(min-width:761px) and (max-width:940px){.page-frame,.standard-shell .page-frame{grid-template-columns:220px minmax(0,1fr)}.catalogue-group{padding-inline:9px}.scene-search{padding-inline:10px}}
@media(min-width:941px) and (max-width:1600px){.page-frame,.standard-shell .page-frame{grid-template-columns:220px minmax(0,1fr)}.catalogue-group{padding-inline:11px}.scene-search{padding-inline:13px}}
@media(min-width:761px) and (max-width:1000px){.topbar{padding-inline:8px}.brand{flex-basis:140px;font-size:15px}.primary-nav{overflow:hidden}.primary-nav a{min-width:0;flex:1 1 0;gap:0;padding-inline:3px;font-size:13px}.nav-glyph{display:none}.top-actions{flex-basis:132px;gap:2px}.action-link{width:32px}.top-user{gap:0;padding-left:6px}.top-user>img{width:32px;height:32px}.top-user span{display:none}}
@media(min-width:761px){.certification-shell .page-frame{grid-template-columns:220px minmax(0,1fr)}}
main{background:#f5f7fa}
.catalogue-group nav a,.catalogue-group nav button{height:34px;font-size:14px}.scene-search input,.scene-search button{font-size:13px}.scene-search button{min-height:32px}.simple-nav a.sub{font-size:14px}
.brand{font-size:20px}
.primary-nav a{font-size:15px}
.top-user>img{filter:none;opacity:1}
.top-user strong{font-size:14px}.top-user small{font-size:12px}
.catalogue-group h2,.scene-search h2{height:34px;font-size:16px;font-weight:700}
.group-heading{height:34px}
.catalogue-group nav a,.catalogue-group nav button{height:36px;gap:9px;font-size:15px;font-weight:400}
.scene-search input,.scene-search button{font-size:14px}.scene-search button{font-weight:400}
.simple-nav a{font-size:15px}.simple-nav a.sub{font-size:15px}
@media(min-width:761px) and (max-width:1000px){.primary-nav a{font-size:14px}}
@media(min-width:761px) and (max-width:940px){.catalogue-group nav a,.catalogue-group nav button{gap:7px;padding-inline:4px;font-size:14px}.scene-search>div{gap:7px 5px}.scene-search button{padding-inline:2px}}
@media(max-width:760px){
  .exhibition-shell .topbar{height:calc(56px + env(safe-area-inset-top));min-height:calc(56px + env(safe-area-inset-top))}
  .exhibition-shell .page-frame{grid-template-columns:1fr}
  .brand{font-size:17px}
  .group-heading,.catalogue-group h2,.scene-search h2{height:44px}
  .catalogue-group nav a,.catalogue-group nav button{height:44px;font-size:14px}
  .scene-search input{font-size:16px}
  .scene-search button{min-height:44px;font-size:14px}
  .platform-footer{min-height:50px;margin-top:8px;padding:14px 12px 16px;font-size:11px}
  .platform-footer{padding-block-end:max(16px,env(safe-area-inset-bottom))}
}
@media(min-width:1001px) and (max-width:1280px){
  .brand{flex-basis:145px;font-size:17px}
  .primary-nav a{font-size:13px}
}
@media(min-width:761px) and (max-width:1000px){
  .brand{flex-basis:140px;font-size:15px}
  .primary-nav a{font-size:13px}
}
@media(prefers-reduced-motion:reduce){.sidebar{transition:none!important}}
</style>
