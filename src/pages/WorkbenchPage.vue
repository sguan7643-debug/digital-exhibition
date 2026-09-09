<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { HOT_APP_FIXTURES, createWorkbenchController } from '../state/workbench-profile-controllers.js';
import { mapRemoteApp } from '../integration/app-read-model.js';
const props=defineProps({integrationData:{type:Object,default:null},operationExecutor:{type:Function,default:null}});
const controller=createWorkbenchController(HOT_APP_FIXTURES);
const remote=computed(()=>props.integrationData?.['WB-001']);
const remoteSearch=ref(null);
const searchState=ref('idle');
let searchRevision=0;
const remoteApps=computed(()=>remote.value?.hotApps?.map(item=>{const app=mapRemoteApp(item);return{id:app.id,name:app.name,type:app.category,scene:app.scene,description:app.description,count:Number(app.usage||0).toLocaleString('zh-CN'),route:app.route};})||null);
const filteredHotApps=computed(()=>{
  if(remoteSearch.value)return remoteSearch.value.map(item=>{const app=mapRemoteApp(item);return{id:app.id,name:app.name,type:app.category,scene:app.scene,description:app.description,count:Number(app.usage||0).toLocaleString('zh-CN'),route:app.route};});
  if(!remoteApps.value)return controller.results;
  const query=String(controller.query||'').toLocaleLowerCase('zh-CN');
  return remoteApps.value.filter(item=>(!query||`${item.name} ${item.description}`.toLocaleLowerCase('zh-CN').includes(query))&&(!controller.scene||item.scene===controller.scene));
});
async function runRemoteSearch(){
  if(!props.operationExecutor)return;
  const revision=++searchRevision;
  searchState.value='loading';
  try{
    const response=await props.operationExecutor('WB-002',{keyword:controller.query||'',scene:controller.scene||'',page:1,pageSize:20,sort:'RELEVANCE'});
    if(revision!==searchRevision)return;
    remoteSearch.value=response?.data?.items||[];
    searchState.value='normal';
  }catch(error){
    if(revision!==searchRevision)return;
    searchState.value=error?.code==='AUTHENTICATION_REQUIRED'?'authentication-required':'error';
  }
}
function receiveWorkbenchFilter(event){
  const {key,value}=event.detail;
  if(key==='reset')controller.reset();else if(key==='query')controller.setQuery(value);else if(key==='scene')controller.setScene(value);
  void runRemoteSearch();
}
function overviewHref(label){const categories={'数据集':'数据集','帆软报表':'可视化报表','RPA机器人':'RPA','AI智能体':'AI'};return categories[label]?`/apps?category=${encodeURIComponent(categories[label])}`:'/apps';}
onMounted(()=>window.addEventListener('xlt:workbench-filter',receiveWorkbenchFilter));
onBeforeUnmount(()=>window.removeEventListener('xlt:workbench-filter',receiveWorkbenchFilter));
const fallbackOverview = [
  ['数据集', '186'], ['帆软报表', '92'], ['RPA机器人', '64'],
  ['EAD应用', '18'], ['AI智能体', '27'], ['其他应用', '35']
];
const overview=computed(()=>remote.value?.appTypeOverview?.length?remote.value.appTypeOverview.map(item=>[item.typeName||item.typeCode,Number(item.count||0).toLocaleString('zh-CN')]):fallbackOverview);
const fallbackCourses = [
  ['数说心智 · 数智应用案例分享', '分享最新应用实践与创新案例', '/assets/training-ai.png', '立即参加'],
  ['取经会 · 采购合规效率交流会', '交流采购合规与提效经验', '/assets/training-procurement.png', '立即参加'],
  ['AI社区 · 大模型在采购场景的应用', '探讨AI赋能采购业务实践', '/assets/training-community.png', '进入活动']
];
const courses=computed(()=>remote.value?.courses?.length?remote.value.courses.map(item=>[item.title,item.summary||`${item.category} · ${item.instructorName}`,item.coverUrl||'/assets/training-ai.png','查看课程',`/training?courseId=${encodeURIComponent(item.courseId)}`]):fallbackCourses.map(item=>[...item,'/training']));
const fallbackNotices = [
  ['系统上线', '【新应用上线】供应商风险预警应用已发布上线', '05-08 09:32', 'blue'],
  ['系统更新', '【功能更新】库存分析看板新增多维度筛选功能', '05-07 16:20', 'blue'],
  ['功能更新', '【系统维护】系统将于本周六凌晨进行维护升级', '05-06 18:15', 'blue']
];
const notices=computed(()=>remote.value?.announcements?.length?remote.value.announcements.map(item=>[item.typeName,item.title,item.publishedAt?.replace('T',' ').slice(5,16)||'','blue',item.detailPath]):fallbackNotices.map((item,index)=>[...item,index===0?'/announcements/notice-001':'/announcements']));
const fallbackUsage = [
  ['应用使用数', '18', '12', 'up'], ['报表查看次数', '236', '8', 'up'],
  ['数据查询次数', '326', '3', 'down'], ['收藏应用数', '12', '5', 'up']
];
const usage=computed(()=>remote.value?[['应用访问次数',Number(remote.value.usage.appVisitCount||0).toLocaleString('zh-CN'),Math.abs(remote.value.usage.visitChange||0),remote.value.usage.visitChange<0?'down':'up'],['应用使用次数',Number(remote.value.usage.appUseCount||0).toLocaleString('zh-CN'),Math.abs(remote.value.usage.useChange||0),remote.value.usage.useChange<0?'down':'up'],['收藏应用数',Number(remote.value.usage.favoriteAppCount||0).toLocaleString('zh-CN'),Math.abs(remote.value.usage.favoriteChange||0),remote.value.usage.favoriteChange<0?'down':'up'],['数据更新时间',remote.value.lastUpdatedAt?.replace('T',' ').slice(5,16)||'—','0','up']]:fallbackUsage);
</script>

<template>
  <div class="workbench-page" data-visual-baseline="ui-update-0831-workbench"><p class="sr-only" aria-live="polite">{{ searchState==='loading'?'正在从飞书检索应用':searchState==='error'?'飞书检索失败，保留当前结果':controller.announcement }}</p>
    <section class="hero-panel" aria-labelledby="greeting-title">
      <img class="hero-avatar" src="/assets/user-avatar.png" width="78" height="78" :alt="`${remote?.profile.displayName||'当前用户'}头像`" />
      <div class="greeting">
        <h1 id="greeting-title">{{ remote?.greeting.text||'上午好，张三丰' }}</h1>
        <p>{{ remote?.hero.subtitle||'欢迎来到数智产品展厅平台，探索更卓越的应用，助力业务高效运营！' }}</p>
        <small v-if="remote">数据截至：{{ remote.dataAsOf?.replace('T',' ').slice(0,16)||'—' }}　　最后更新：{{ remote.lastUpdatedAt?.replace('T',' ').slice(0,16)||'—' }}</small>
        <small v-else>数据截至：2025-05-08　　最后更新：10:18</small>
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
          <p v-if="searchState==='loading'" class="hot-empty" role="status">正在检索应用…</p>
          <p v-else-if="!filteredHotApps.length" class="hot-empty" role="status">暂无符合条件的热门应用</p>
        </div>
      </section>

      <section class="panel course-panel" aria-labelledby="course-title">
        <header><h2 id="course-title">培训课堂</h2><a href="/training">查看更多　›</a></header>
        <ul>
          <li v-for="([name, description, icon, action, route]) in courses" :key="name">
            <AppIcon :name="icon" :size="58" /><span><strong>{{ name }}</strong><small>{{ description }}</small></span><a :href="route">{{ action }}</a>
          </li>
        </ul>
      </section>

      <section class="panel notice-panel" aria-labelledby="notice-title">
        <header><h2 id="notice-title">公告通知</h2><a href="/announcements">查看更多　›</a></header>
        <ul>
          <li v-for="([type, title, time, tone, route]) in notices" :key="title">
            <a :href="route">
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
.workbench-page{min-height:100%;overflow:visible;padding:14px 20px 19px;color:#18304f}.panel{background:#fff;border:1px solid #dce5ef;border-radius:6px;box-shadow:0 1px 4px rgb(24 61 102 / 4%)}
.hero-panel{height:139px;position:relative;display:flex;align-items:center;overflow:hidden;border:1px solid #d7e2ed;border-radius:6px;background:linear-gradient(90deg,#fff 0,#f8fbff 48%,#edf6ff 100%)}.hero-ocean{position:absolute;z-index:0;right:0;top:0;width:827px;height:136px;object-fit:none}.hero-avatar{position:relative;z-index:1;width:68px;height:68px;margin-left:27px;border-radius:50%}.greeting{position:relative;z-index:1;margin-left:29px;align-self:stretch;padding-top:20px}.greeting h1{margin:0 0 8px;color:#142b4c;font-size:27px;font-weight:600}.greeting p{margin:0;color:#39516f;font-size:13px;line-height:22px}.greeting small{position:absolute;left:-95px;bottom:15px;width:330px;color:#6e8197;font-size:11px}
.overview-panel{height:155px;margin-top:11px;padding:10px 14px}.panel h2{margin:0;color:#0060a6;font-size:17px}.overview-list{display:grid;grid-template-columns:repeat(6,1fr);gap:20px;margin-top:5px}.overview-item{height:107px;display:flex;align-items:center;justify-content:center;gap:22px;border:1px solid #e1e8f0;border-radius:7px}.overview-item img{width:68px;height:68px}.overview-item span{display:grid;gap:7px}.overview-item small{color:#243754;font-size:13px}.overview-item strong{color:#13284a;font-size:26px;font-weight:600}
.dashboard-grid{display:grid;grid-template-columns:.94fr 1.06fr;grid-template-areas:'hot course' 'notice usage';gap:9px;margin-top:9px}.hot-panel{grid-area:hot;height:307px}.course-panel{grid-area:course;height:307px}.notice-panel{grid-area:notice;height:206px}.usage-panel{grid-area:usage;height:206px}.panel>header{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}.panel>header a{color:#0060a6;font-size:11px}
.hot-list{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:1px 16px 14px}.hot-card{height:247px;position:relative;padding:15px 9px 12px;border:1px solid #dfe7f0;border-radius:7px;text-align:center}.hot-card img{margin:0 auto 7px}.hot-card h3{height:20px;margin:0;color:#1d3150;font-size:13px}.hot-card mark{display:inline-block;padding:2px 10px;color:#0060a6;background:#eaf3ff;border-radius:9px;font-size:10px}.hot-card p{height:51px;margin:9px 0 4px;color:#687a90;font-size:10px;line-height:17px;text-align:left}.hot-card small{display:block;color:#596c84;font-size:10px;text-align:left}.hot-card>a{position:absolute;left:9px;right:9px;bottom:11px;height:26px;display:grid;place-items:center;color:#0060a6;border:1px solid #75adf8;border-radius:3px;font-size:11px}
.course-panel ul{list-style:none;margin:0;padding:0 20px}.course-panel li{height:82px;display:flex;align-items:center;gap:15px;border-bottom:1px solid #e4eaf1}.course-panel li:last-child{border-bottom:0}.course-panel li img{width:58px;height:60px}.course-panel li span{min-width:0;display:grid;gap:8px;flex:1}.course-panel li strong{color:#243752;font-size:13px}.course-panel li small{color:#65788e;font-size:11px}.course-panel li>a{color:#0060a6;font-size:12px}
.notice-panel ul{list-style:none;margin:0;padding:2px 17px}.notice-panel li a{height:35px;display:grid;grid-template-columns:85px minmax(0,1fr) 82px;align-items:center;border-bottom:1px solid #e7edf3;color:#314761;font-size:11px}.notice-panel mark{justify-self:start;padding:3px 8px;border-radius:3px;font-size:10px}.notice-panel mark.blue{color:#0060a6;background:#e7f2ff}.notice-panel mark.green{color:#10904a;background:#e7f8ee}.notice-panel mark.red{color:#ee3030;background:#ffe9e9}.notice-panel li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.notice-panel time{color:#5f728a;text-align:right}
.usage-list{height:153px;display:grid;grid-template-columns:repeat(3,1fr);align-items:center}.usage-list article{height:97px;display:flex;align-items:center;justify-content:center;gap:17px;border-right:1px solid #e1e8ef}.usage-list article:last-child{border-right:0}.usage-list img{width:58px;height:58px}.usage-list span{display:grid;gap:5px}.usage-list small{color:#354a65;font-size:12px}.usage-list strong{color:#122949;font-size:25px;font-weight:500}.usage-list strong b{font-size:12px;font-weight:400}.usage-list em{color:#718299;font-size:11px;font-style:normal}.usage-list i{color:#10a950;font-size:15px;font-style:normal}
@media(max-width:1420px){.overview-list{gap:8px}.overview-item{gap:8px}.dashboard-grid{grid-template-columns:1fr;grid-template-areas:'hot' 'course' 'notice' 'usage'}.hot-panel,.course-panel,.notice-panel,.usage-panel{height:auto}.workbench-page{overflow:auto}.hero-ocean{opacity:.58}}
@media(max-width:760px){.workbench-page{padding:10px}.hero-avatar{margin-left:15px}.greeting{margin-left:14px}.greeting h1{font-size:21px}.greeting p{max-width:300px}.overview-panel{height:auto}.overview-list{grid-template-columns:repeat(2,1fr)}.hot-list{grid-template-columns:repeat(2,1fr)}.usage-list{grid-template-columns:1fr;height:auto}.usage-list article{border-right:0;border-bottom:1px solid #e1e8ef}.notice-panel li a{grid-template-columns:75px minmax(0,1fr)}.notice-panel time{display:none}}
.hot-empty{grid-column:1/-1;min-height:200px;display:grid;place-items:center;color:#60718a}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* 2026 unified exhibition style: restrained navy, white surfaces and
   information-led cards matching the approved workbench reference. */
.workbench-page{padding:18px;color:#152e4e;background:#f5f7fa}.panel{border-color:#d7e0e9;border-radius:8px;box-shadow:0 1px 2px rgb(16 45 78 / 3%)}
.hero-panel{height:158px;border-color:#d7e0e9;border-radius:8px;background:#fff}.hero-ocean{display:none}.hero-avatar{width:78px;height:78px;margin-left:28px;filter:grayscale(1);opacity:.72}.greeting{margin-left:36px;padding-top:27px}.greeting h1{margin-bottom:9px;color:#102b4d;font-size:27px;font-weight:700}.greeting p{color:#3d536e;font-size:13px}.greeting small{position:static;display:block;width:auto;margin-top:18px;color:#708198;font-size:11px}
.overview-panel{height:144px;margin-top:12px;padding:16px 18px}.panel h2{color:#102c4d;font-size:17px}.overview-list{grid-template-columns:repeat(6,1fr);gap:0;margin-top:12px}.overview-item{height:79px;gap:0;border:0;border-right:1px solid #dfe5ec;border-radius:0}.overview-item:last-child{border-right:0}.overview-item img{display:none}.overview-item span{justify-items:center;gap:8px}.overview-item small{color:#243a57;font-size:13px}.overview-item strong{color:#102a4c;font-size:25px;font-weight:600}
.dashboard-grid{grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.hot-panel,.course-panel{height:322px}.notice-panel,.usage-panel{height:190px}.panel>header{height:48px;padding:0 18px}.panel>header a{color:#0060a6;font-weight:600}
.hot-list{gap:14px;padding:2px 18px 16px}.hot-card{height:254px;padding:18px 14px 14px;border-color:#dce4ed;border-radius:7px;text-align:left}.hot-card img{display:none}.hot-card h3{height:25px;color:#122e50;font-size:14px}.hot-card mark{padding:3px 9px;color:#0060a6;background:#edf3f8}.hot-card p{height:64px;margin-top:12px;color:#607289;font-size:10px;line-height:19px}.hot-card small{color:#526880}.hot-card>a{left:14px;right:14px;bottom:14px;height:30px;color:#0060a6;border-color:#8eaac5;background:#fff;font-weight:600}
.course-panel ul{padding:0 22px}.course-panel li{height:88px;gap:16px;border-color:#e0e6ed}.course-panel li img{display:none}.course-panel li::before{content:'▤';width:34px;height:34px;display:grid;place-items:center;flex:0 0 auto;color:#173f68;border:1px solid #ccd7e2;border-radius:5px;font-size:17px}.course-panel li strong{color:#122e50}.course-panel li>a{color:#0060a6;font-weight:600}
.notice-panel ul{padding:0 18px}.notice-panel li a{height:35px;grid-template-columns:104px minmax(0,1fr) 104px;column-gap:10px;border-color:#e2e7ed}.notice-panel mark{min-width:90px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;color:#0060a6!important;background:#edf3f8!important;line-height:1.2;white-space:nowrap}.notice-panel li span,.notice-panel time{min-width:0;white-space:nowrap}.usage-list{height:138px}.usage-list article{height:84px;border-color:#dfe5ec}.usage-list img{display:none}.usage-list span{justify-items:center}.usage-list strong{color:#102b4d}.usage-list em{color:#6d7f94}
@media(max-width:1420px){.dashboard-grid{grid-template-columns:1fr;grid-template-areas:'hot' 'course' 'notice' 'usage'}.hot-panel,.course-panel,.notice-panel,.usage-panel{height:auto}}
@media(max-width:1000px){.hot-list{grid-template-columns:repeat(2,minmax(0,1fr))}.hot-card p{height:auto;min-height:64px}}
@media(max-width:760px){.workbench-page{padding:10px}.hero-panel{height:auto;min-height:150px}.hero-avatar{width:60px;height:60px}.greeting{padding:20px 14px 20px 0}.greeting small{margin-top:10px}.overview-list{grid-template-columns:repeat(2,1fr)}.overview-item{border-bottom:1px solid #dfe5ec}.hot-list{grid-template-columns:repeat(2,1fr)}.notice-panel li a{grid-template-columns:104px minmax(0,1fr)}}
.hero-avatar{filter:none;opacity:1}
.panel h2{font-size:20px;line-height:1.4}
.panel>header{height:54px}
.panel>header a{min-height:34px;display:inline-flex;align-items:center;padding:0 8px;font-size:14px;line-height:1.4;white-space:nowrap}
.overview-item small{font-size:14px;line-height:1.45}
.overview-item strong{font-size:27px;line-height:1.15}
.hot-panel,.course-panel{height:340px}
.notice-panel,.usage-panel{height:224px}
.hot-card{height:270px}
.hot-card h3{height:auto;min-height:44px;margin-bottom:5px;font-size:16px;line-height:1.45}
.hot-card mark{padding:4px 9px;font-size:13px;line-height:1.35}
.hot-card p{height:auto;min-height:68px;margin:12px 0 8px;font-size:14px;line-height:1.6}
.hot-card small{font-size:13px;line-height:1.5}
.hot-card>a{height:34px;font-size:13px}
.course-panel li{height:94px}
.course-panel li span{gap:6px}
.course-panel li strong{font-size:15px;line-height:1.45}
.course-panel li small,.course-panel li>a{font-size:13px;line-height:1.5}
.course-panel li>a{white-space:nowrap}
.notice-panel li a{height:42px;grid-template-columns:112px minmax(0,1fr) 104px;column-gap:12px;font-size:14px;line-height:1.45}
.notice-panel mark{min-width:96px;padding:4px 9px;font-size:13px;line-height:1.35}
.notice-panel time{font-size:13px}
.usage-list{height:164px}
.usage-list article{height:104px}
.usage-list small{font-size:14px}
.usage-list strong{font-size:28px}
.usage-list strong b{font-size:14px}
.usage-list em{font-size:13px;line-height:1.45}
@media(max-width:1420px){.hot-panel,.course-panel,.notice-panel,.usage-panel{height:auto}}
</style>
