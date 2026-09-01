<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { HOT_APP_FIXTURES, createWorkbenchController } from '../state/workbench-profile-controllers.js';
const controller=createWorkbenchController(HOT_APP_FIXTURES);
const filteredHotApps=computed(()=>controller.results);
function receiveWorkbenchFilter(event){const {key,value}=event.detail;if(key==='reset')controller.reset();else if(key==='query')controller.setQuery(value);else if(key==='scene')controller.setScene(value);}
function overviewHref(label){const categories={'数据集':'数据集','帆软报表':'可视化报表','RPA机器人':'RPA','AI智能体':'AI'};return categories[label]?`/apps?category=${encodeURIComponent(categories[label])}`:'/apps';}
onMounted(()=>window.addEventListener('xlt:workbench-filter',receiveWorkbenchFilter));
onBeforeUnmount(()=>window.removeEventListener('xlt:workbench-filter',receiveWorkbenchFilter));
const overview = [
  ['数据集', '186'], ['帆软报表', '92'], ['RPA机器人', '64'],
  ['EAD应用', '18'], ['AI智能体', '27'], ['其他应用', '35']
];
const courses = [
  ['数说心智 · 数智应用案例分享', '分享最新应用实践与创新案例', '/assets/training-ai.png', '立即参加'],
  ['取经会 · 采购合规效率交流会', '交流采购合规与提效经验', '/assets/training-procurement.png', '立即参加'],
  ['AI社区 · 大模型在采购场景的应用', '探讨AI赋能采购业务实践', '/assets/training-community.png', '进入活动']
];
const notices = [
  ['系统上线', '【新应用上线】供应商风险预警应用已发布上线', '05-08 09:32', 'blue'],
  ['系统更新', '【功能更新】库存分析看板新增多维度筛选功能', '05-07 16:20', 'blue'],
  ['功能更新', '【系统维护】系统将于本周六凌晨进行维护升级', '05-06 18:15', 'blue']
];
const usage = [
  ['应用使用数', '18', '12', 'up'], ['报表查看次数', '236', '8', 'up'],
  ['数据查询次数', '326', '3', 'down'], ['收藏应用数', '12', '5', 'up']
];
</script>

<template>
  <div class="workbench-page" data-visual-baseline="ui-update-0831-workbench"><p class="sr-only" aria-live="polite">{{ controller.announcement }}</p>
    <section class="hero-panel" aria-labelledby="greeting-title">
      <img class="hero-avatar" src="/assets/user-avatar.png" width="78" height="78" alt="张三丰头像" />
      <div class="greeting">
        <h1 id="greeting-title">上午好，张三丰</h1>
        <p>欢迎来到数智产品展厅平台，探索更卓越的应用，助力业务高效运营！</p>
        <small>数据截至：2025-05-08　　最后更新：10:18</small>
      </div>
    </section>

    <section class="panel overview-panel" aria-labelledby="overview-title">
      <h2 id="overview-title">应用类型概览</h2>
      <div class="overview-list">
        <a v-for="([label, total]) in overview" :key="label" :href="overviewHref(label)" class="overview-item">
          <span><small>{{ label }}</small><strong>{{ total }}</strong></span>
        </a>
      </div>
    </section>

    <div class="dashboard-grid">
      <section class="panel hot-panel" aria-labelledby="hot-title">
        <header><h2 id="hot-title">热门应用推荐</h2><a href="/apps">查看更多　›</a></header>
        <div class="hot-list">
          <article v-for="app in filteredHotApps" :key="app.id" class="hot-card">
            <h3>{{ app.name }}</h3><mark>{{ app.type }}</mark><p>{{ app.description }}</p><small>使用量　{{ app.count }}</small>
            <a :href="app.route" :aria-label="`立即使用 ${app.name}`">立即使用</a>
          </article>
          <p v-if="!filteredHotApps.length" class="hot-empty" role="status">暂无符合条件的热门应用</p>
        </div>
      </section>

      <section class="panel course-panel" aria-labelledby="course-title">
        <header><h2 id="course-title">培训课堂</h2><a href="/training">查看更多　›</a></header>
        <ul>
          <li v-for="([name, description, icon, action]) in courses" :key="name">
            <AppIcon :name="icon" :size="58" /><span><strong>{{ name }}</strong><small>{{ description }}</small></span><a href="/training">{{ action }}</a>
          </li>
        </ul>
      </section>

      <section class="panel notice-panel" aria-labelledby="notice-title">
        <header><h2 id="notice-title">公告通知</h2><a href="/announcements">查看更多　›</a></header>
        <ul>
          <li v-for="([type, title, time, tone], index) in notices" :key="title">
            <a :href="index === 0 ? '/announcements/notice-001' : '/announcements'">
              <mark :class="tone">{{ type }}</mark><span>{{ title }}</span><time :datetime="`2025-${time.replace(' ', 'T')}`">{{ time }}</time>
            </a>
          </li>
        </ul>
      </section>

      <section class="panel usage-panel" aria-labelledby="usage-title">
        <header><h2 id="usage-title">我的使用统计</h2><a href="/profile">查看详情　›</a></header>
        <div class="usage-list">
          <article v-for="([label, total, increase, direction]) in usage" :key="label">
            <span><small>{{ label }}</small><strong>{{ total }}</strong><em>较上周 <i :class="direction">{{ direction === 'down' ? '↓' : '↑' }}</i> {{ increase }}%</em></span>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.workbench-page{padding:18px 24px 14px;color:#09254b}.panel,.hero-panel{background:#fff;border:1px solid #d9e1eb;border-radius:7px;box-shadow:0 1px 3px rgb(11 48 86 / 3%)}
.hero-panel{height:159px;display:flex;align-items:flex-start}.hero-avatar{width:78px;height:78px;margin:27px 0 0 27px;border-radius:50%;filter:grayscale(1);opacity:.75}.greeting{margin-left:41px;padding-top:27px}.greeting h1{margin:0 0 10px;color:#09254b;font-size:29px;font-weight:700;letter-spacing:1px}.greeting p{color:#243f62;font-size:14px;line-height:22px}.greeting small{display:block;margin-top:20px;color:#657a96;font-size:12px}
.overview-panel{height:143px;margin-top:12px;padding:17px 20px}.panel h2{margin:0;color:#102a4e;font-size:18px}.overview-list{height:78px;display:grid;grid-template-columns:repeat(6,1fr);margin-top:13px}.overview-item{display:grid;place-items:center;border-right:1px solid #dce3ec}.overview-item:last-child{border-right:0}.overview-item span{display:grid;gap:11px;text-align:center}.overview-item small{color:#1f3a5d;font-size:14px}.overview-item strong{color:#09244a;font-size:29px;font-weight:500}
.dashboard-grid{display:grid;grid-template-columns:1.06fr .94fr;grid-template-areas:'hot course' 'notice usage';gap:10px;margin-top:10px}.hot-panel{grid-area:hot;height:322px}.course-panel{grid-area:course;height:322px}.notice-panel{grid-area:notice;height:185px}.usage-panel{grid-area:usage;height:185px}.panel>header{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 20px}.panel>header a{color:#0758b7;font-size:12px}
.hot-list{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:0 28px 16px}.hot-card{height:233px;position:relative;padding:19px 13px 12px;border:1px solid #dce3ec;border-radius:6px}.hot-card h3{height:24px;margin:0;color:#10294c;font-size:14px;text-align:center}.hot-card mark{display:block;width:max-content;margin:0 auto;padding:3px 10px;color:#286aa9;background:#e8f1fb;border-radius:9px;font-size:10px}.hot-card p{height:64px;margin:18px 0 4px;color:#657893;font-size:11px;line-height:19px}.hot-card small{display:block;color:#5d718c;font-size:11px}.hot-card>a{position:absolute;left:13px;right:13px;bottom:13px;height:28px;display:grid;place-items:center;color:#0757b9;border:1px solid #2a66ad;border-radius:3px;font-size:12px}
.course-panel ul{list-style:none;margin:0;padding:0 28px}.course-panel li{height:82px;display:flex;align-items:center;gap:18px;border-bottom:1px solid #dfe6ee}.course-panel li:last-child{border-bottom:0}.course-panel li img{width:46px;height:46px;object-fit:contain}.course-panel li span{min-width:0;display:grid;gap:7px;flex:1}.course-panel li strong{color:#10294d;font-size:14px}.course-panel li small{color:#637892;font-size:11px}.course-panel li>a{color:#0759bb;font-size:12px}
.notice-panel ul{list-style:none;margin:0;padding:0 20px}.notice-panel li a{height:37px;display:grid;grid-template-columns:90px minmax(0,1fr) 84px;align-items:center;color:#183757;font-size:11px}.notice-panel mark{justify-self:start;padding:4px 9px;color:#155f9e;background:#eaf2fb;border-radius:3px;font-size:10px}.notice-panel li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.notice-panel time{color:#4f6682;text-align:right}
.usage-list{height:127px;display:grid;grid-template-columns:repeat(4,1fr);align-items:center}.usage-list article{height:92px;display:grid;place-items:center;border-right:1px solid #dce3ec}.usage-list article:last-child{border-right:0}.usage-list span{display:grid;gap:9px;text-align:center}.usage-list small{color:#415976;font-size:12px}.usage-list strong{color:#09244a;font-size:29px;font-weight:500}.usage-list em{color:#667a93;font-size:11px;font-style:normal}.usage-list i{color:#078778;font-style:normal}.usage-list i.down{color:#e41d2d}
@media(max-width:1250px){.overview-list{gap:0}.dashboard-grid{grid-template-columns:1fr;grid-template-areas:'hot' 'course' 'notice' 'usage'}.hot-panel,.course-panel,.notice-panel,.usage-panel{height:auto}.workbench-page{overflow:auto}}
@media(max-width:760px){.workbench-page{padding:10px}.hero-avatar{margin-left:15px}.greeting{margin-left:14px}.greeting h1{font-size:21px}.greeting p{max-width:300px}.overview-panel{height:auto}.overview-list{grid-template-columns:repeat(2,1fr)}.hot-list{grid-template-columns:repeat(2,1fr)}.usage-list{grid-template-columns:1fr;height:auto}.usage-list article{border-right:0;border-bottom:1px solid #e1e8ef}.notice-panel li a{grid-template-columns:75px minmax(0,1fr)}.notice-panel time{display:none}}
.hot-empty{grid-column:1/-1;min-height:200px;display:grid;place-items:center;color:#60718a}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
</style>
