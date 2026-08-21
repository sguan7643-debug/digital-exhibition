<script setup>
import { computed } from 'vue';

const props = defineProps({ page: { type: Object, required: true } });

const primaryNav = [
  ['/workbench', '⌂', '首页工作台'], ['/favorites', '▣', '素材中心'],
  ['/talent/people', '♙', '人才管理'], ['/apps', '▦', '应用中心'],
  ['/training', '▣', '培训课堂'], ['/points', '♢', '积分中心'],
  ['/certification', '♜', '数字化认证'], ['/operations', '◇', '运营管理'],
  ['/announcements', '▱', '公告通知'], ['/admin', '⎔', '后台管理']
];
const simpleNav = primaryNav.map(([route, glyph, label]) => [route, label, glyph]);
const categories = [
  ['RPA', '✿', 'purple'], ['大屏', '▱', 'blue'], ['驾驶舱', '◇', 'blue'],
  ['可视化报表', '▣', 'blue'], ['指标', '▥', 'orange'], ['数据集', '≋', 'blue'],
  ['AI', 'AI', 'green'], ['海能work应用', 'W', 'cyan']
];
const isCatalogue = computed(() => props.page.id === '01' || (Number(props.page.id) >= 7 && Number(props.page.id) <= 17));
const isTalent = computed(() => Number(props.page.id) >= 28);
function active(route) {
  return props.page.route === route || (route !== '/workbench' && props.page.route.startsWith(`${route}/`));
}
</script>

<template>
  <div class="exhibition-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <header class="topbar">
      <a class="brand" href="/workbench" aria-label="中国海油数智产品展厅首页">
        <img src="/assets/cnooc-logo.png" width="126" height="43" alt="中国海油 CNOOC" />
        <span>数智产品展厅</span>
      </a>
      <nav class="primary-nav" aria-label="主导航">
        <a v-for="([route, glyph, label]) in primaryNav" :key="route" :href="route" :aria-current="active(route) ? 'page' : undefined">
          <span class="nav-glyph" aria-hidden="true">{{ glyph }}</span>{{ label }}
        </a>
      </nav>
      <div class="top-actions" aria-label="快捷操作">
        <a class="action-link" href="/messages" aria-label="8 条未读消息"><span aria-hidden="true">♧</span><b>8</b><small>消息</small></a>
        <a class="action-link" href="/favorites"><span aria-hidden="true">☆</span><small>收藏</small></a>
        <a class="top-user" href="/profile">
          <img src="/assets/user-avatar.png" width="36" height="36" alt="" />
          <span><strong>张三丰</strong><small>物资采购中心</small></span><b aria-hidden="true">⌄</b>
        </a>
      </div>
    </header>

    <div class="page-frame">
      <aside class="sidebar">
        <template v-if="isCatalogue">
          <section class="catalogue-group">
            <h2><span aria-hidden="true">▣</span>素材中心<b aria-hidden="true">⌃</b></h2>
            <nav aria-label="素材分类">
              <a v-for="([label, glyph, tone]) in categories" :key="`material-${label}`" href="/favorites"><span :class="tone" aria-hidden="true">{{ glyph }}</span>{{ label }}</a>
            </nav>
          </section>
          <section class="catalogue-group app-group">
            <h2><span aria-hidden="true">▣</span>应用中心<b aria-hidden="true">⌃</b></h2>
            <nav aria-label="应用分类">
              <a v-for="([label, glyph, tone]) in categories" :key="`app-${label}`" href="/apps"><span :class="tone" aria-hidden="true">{{ glyph }}</span>{{ label }}</a>
            </nav>
          </section>
          <section class="scene-search" aria-labelledby="scene-search-title">
            <h2 id="scene-search-title">场景化搜索</h2>
            <label><span class="sr-only">搜索场景关键词</span><input type="search" placeholder="搜索场景或关键字" /><b aria-hidden="true">⌕</b></label>
            <div>
              <button type="button">全部场景</button><button type="button">生产运营</button>
              <button type="button">设备管理</button><button type="button">设备分析</button>
              <button type="button">安全环保</button><button type="button">供应链管理</button>
              <button type="button">人力资源</button><button type="button">财务管理</button>
              <button type="button">市场营销</button><button type="button">更多⌄</button>
            </div>
          </section>
        </template>
        <template v-else-if="isTalent">
          <nav class="simple-nav" aria-label="人才管理功能">
            <a href="/workbench"><span aria-hidden="true">⌂</span>首页工作台</a>
            <a href="/talent/people" :aria-current="props.page.id === '28' ? 'page' : undefined"><span aria-hidden="true">♙</span>人才管理</a>
            <a class="sub" href="/talent/people" :aria-current="props.page.id === '28' ? 'page' : undefined">人才库</a>
            <a class="sub" href="/talent/projects" :aria-current="props.page.id === '29' ? 'page' : undefined">人才项目管理</a>
            <a class="sub" href="/talent/progress" :aria-current="props.page.id === '30' ? 'page' : undefined">项目进度管理</a>
            <a href="/apps"><span aria-hidden="true">▦</span>应用中心</a>
            <a href="/training"><span aria-hidden="true">▣</span>培训课堂</a>
            <a href="/points"><span aria-hidden="true">♢</span>积分中心</a>
          </nav>
        </template>
        <nav v-else class="simple-nav" aria-label="平台功能">
          <a v-for="([route, label, glyph]) in simpleNav" :key="route" :href="route" :aria-current="active(route) ? 'page' : undefined"><span aria-hidden="true">{{ glyph }}</span>{{ label }}</a>
        </nav>
      </aside>
      <main id="main-content" tabindex="-1"><slot /></main>
    </div>
  </div>
</template>

<style scoped>
.skip-link{position:fixed;z-index:100;left:16px;top:-60px;padding:10px 16px;color:#fff;background:#075dcc;border-radius:4px}.skip-link:focus-visible{top:10px}
.topbar{height:63px;display:flex;align-items:center;padding:0 18px;background:#fff;border-bottom:1px solid #dce4ed}.brand{flex:0 0 277px;height:43px;display:flex;align-items:center;color:#172b4b;font-size:18px;font-weight:700;white-space:nowrap}.brand img{width:126px;height:43px;object-fit:contain;padding-right:13px;margin-right:13px;border-right:1px solid #cad4df}
.primary-nav{height:100%;display:flex;flex:1;min-width:0}.primary-nav a{min-width:82px;height:100%;position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 9px;color:#1d3152;font-size:13px;white-space:nowrap}.primary-nav a[aria-current='page']{color:#0869ee}.primary-nav a[aria-current='page']::after{content:'';position:absolute;left:15px;right:15px;bottom:0;height:3px;background:#1477ff}.nav-glyph{width:18px;color:currentColor;font-size:17px;text-align:center}
.top-actions{flex:0 0 250px;height:100%;display:flex;align-items:center;justify-content:flex-end;gap:16px;white-space:nowrap}.action-link{min-width:30px;height:54px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;color:#132a4c}.action-link>span{font-size:20px;line-height:20px}.action-link small{font-size:10px}.action-link>b{position:absolute;right:0;top:5px;width:15px;height:15px;display:grid;place-items:center;color:#fff;background:#f5222d;border-radius:50%;font-size:9px}.top-user{height:44px;display:flex;align-items:center;gap:8px;padding-left:13px;border-left:1px solid #dbe3ec}.top-user img{border-radius:50%}.top-user span{display:grid;gap:2px}.top-user strong{color:#132a4c;font-size:13px}.top-user small{color:#74869a;font-size:9px}.top-user>b{color:#18304f;font-size:12px}
.page-frame{min-height:calc(100vh - 63px);display:grid;grid-template-columns:220px minmax(0,1fr)}.sidebar{min-height:calc(100vh - 63px);background:#fff;border-right:1px solid #dce4ed;overflow:hidden}.catalogue-group{padding:9px 15px 8px;border-bottom:1px solid #e7edf3}.catalogue-group h2,.scene-search h2{height:28px;display:flex;align-items:center;gap:9px;margin:0;color:#203451;font-size:13px;font-weight:700}.catalogue-group h2>span{width:18px;color:#6e25ec;font-size:17px;text-align:center}.catalogue-group h2>b{margin-left:auto;color:#176ee6;font-weight:400}.catalogue-group nav{display:grid}.catalogue-group nav a{height:29px;display:flex;align-items:center;gap:10px;padding-left:1px;color:#223b5d;font-size:12px}.catalogue-group nav a>span{width:18px;height:18px;display:grid;place-items:center;color:#fff;border-radius:3px;font-size:10px;font-weight:700}.purple{background:#6d36e4}.blue{background:#1976ee}.orange{background:#ff5b24}.green{background:#0aaa54}.cyan{background:#0aa3d9}.app-group{padding-top:7px}
.scene-search{padding:10px 19px}.scene-search h2{font-size:14px}.scene-search label{height:31px;display:flex;align-items:center;padding:0 8px;border:1px solid #d7e1ec;border-radius:4px}.scene-search input{width:100%;min-width:0;border:0;outline:0;color:#51657e;font-size:11px}.scene-search label b{color:#56729a;font-size:16px}.scene-search>div{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 10px;padding-top:10px}.scene-search button{height:28px;border:1px solid #e5ebf2;color:#354e6d;background:#fff;border-radius:4px;font-size:11px}.scene-search button:first-child{color:#066cec;background:#eaf3ff;border-color:#eaf3ff}
.simple-nav{display:grid;padding-top:21px}.simple-nav a{height:58px;display:flex;align-items:center;gap:15px;padding:0 21px;color:#1d3353;border-left:3px solid transparent;font-size:14px;font-weight:600}.simple-nav a>span{width:20px;color:#18345b;font-size:20px;text-align:center}.simple-nav a[aria-current='page']{color:#0869ee;background:#eaf2ff;border-left-color:#096ef0}.simple-nav a[aria-current='page']>span{color:#0869ee}.simple-nav a.sub{height:40px;padding-left:60px;color:#607088;font-size:12px;font-weight:400}.simple-nav a.sub[aria-current='page']{color:#0869ee}
main{min-width:0;background:#f7f9fc;outline:none}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}a:focus-visible,button:focus-visible,input:focus-visible,main:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}
@media(max-width:1420px){.brand{flex-basis:220px}.primary-nav a{min-width:72px;padding-inline:5px}.top-actions{flex-basis:205px}.top-user small{display:none}}@media(max-width:1100px){.primary-nav a:nth-child(n+7){display:none}.page-frame{grid-template-columns:188px minmax(0,1fr)}.sidebar{overflow-y:auto}}@media(max-width:760px){.topbar{height:auto;min-height:63px;flex-wrap:wrap;padding-block:7px}.brand{flex:1}.top-actions{flex-basis:auto}.primary-nav{order:3;width:100%;overflow-x:auto}.primary-nav a{flex:0 0 auto;height:44px}.page-frame{grid-template-columns:1fr}.sidebar{min-height:auto;border-right:0;border-bottom:1px solid #dce4ed}.catalogue-group,.scene-search{display:none}.simple-nav{display:flex;overflow-x:auto;padding-top:0}.simple-nav a{flex:0 0 auto;height:48px;padding:0 14px;border-left:0;border-bottom:3px solid transparent}.simple-nav a[aria-current='page']{border-bottom-color:#096ef0}.simple-nav a.sub{padding-left:14px}}
</style>
