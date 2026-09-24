<script setup>
// Reference SHA-256: 5F2DC6F56EF909A2EBADED1184353856CB105F2BA33B5BEFD7B8AF00AA342E11
import { computed } from 'vue';

const props=defineProps({integrationData:{type:Object,default:null},integrationState:{type:String,default:'loading'}});
const periods=[['day','日'],['week','周'],['month','月'],['quarter','季度']];
const iconNames=['usage-visits.png','overview-ead.png','points-month.png','overview-rpa.png','points-use.png'];
const remoteState=computed(()=>props.integrationState);
const remoteDashboard=computed(()=>props.integrationData?.['OPS-001']??null);
const remoteDefinitions=computed(()=>Array.isArray(props.integrationData?.['OPS-003']?.items)?props.integrationData['OPS-003'].items:[]);
const pageState=computed(()=>{
  if(remoteState.value==='error'||remoteState.value==='timeout'||remoteState.value==='rate-limited'||remoteState.value==='schema-drift'||remoteState.value==='security-error')return 'error';
  if(remoteState.value==='authentication-required'||remoteState.value==='permission-denied')return 'permission-denied';
  if(remoteState.value==='empty')return 'empty';
  if(remoteState.value==='loading')return 'loading';
  return remoteDashboard.value?'normal':'empty';
});
const dashboard=computed(()=>remoteDashboard.value||{});
const stats=computed(()=>(Array.isArray(dashboard.value.metrics)?dashboard.value.metrics:[]).map(metric=>({label:metric.label||metric.code||'未命名指标',value:Number(metric.value??0).toLocaleString('zh-CN'),change:`${Number(metric.changeRate??0).toFixed(1)}%`,direction:metric.direction||'FLAT'})));
const trend=computed(()=>(Array.isArray(dashboard.value.visitTrend)?dashboard.value.visitTrend.map(item=>Number(item.visitCount??0)):[]));
const usageTrend=computed(()=>(Array.isArray(dashboard.value.appUsageTrend)?dashboard.value.appUsageTrend.map(item=>Number(item.usageCount??0)):[]));
const rankingApps=computed(()=>(Array.isArray(dashboard.value.topApps)?dashboard.value.topApps.map((item,index)=>({name:item.appName||item.appId||'未命名应用',usage:Number(item.usageCount??0),rank:Number(item.rank??index+1)})):[]));
const noticeRows=computed(()=>(Array.isArray(dashboard.value.announcements)?dashboard.value.announcements.map(item=>({title:item.title||'未命名公告',publisher:item.publisherOrgName||'—',date:String(item.publishAt||'').slice(0,10)||'—'})):[]));
const activity=computed(()=>dashboard.value.userActivity||{});
const distribution=computed(()=>(Array.isArray(dashboard.value.appTypeDistribution)?dashboard.value.appTypeDistribution:[]));
const range=computed(()=>({start:dashboard.value.period?.startDate||'',end:dashboard.value.period?.endDate||''}));
const rangeLabel=computed(()=>`${range.value.start||'—'} 至 ${range.value.end||'—'}`);
const totalVisits=computed(()=>stats.value[0]?.value??0);
const maxTrend=computed(()=>Math.max(1,...trend.value,...usageTrend.value));
const periodCode=computed(()=>String(dashboard.value.period?.period||'').toLowerCase());
</script>

<template>
  <article class="operations-page" aria-labelledby="ops-title" :data-state="pageState">
    <header>
      <h1 id="ops-title">运营看板</h1>
      <p>全面掌握数智展厅运营核心指标与运行状态，助力数据化运营与持续优化</p>
      <div class="period" role="group" aria-label="统计周期">
        <button v-for="item in periods" :key="item[0]" type="button" disabled :aria-pressed="periodCode===item[0]">{{ item[1] }}</button>
        <label>开始日期<input type="date" disabled :value="range.start" /></label><span aria-hidden="true">至</span><label>结束日期<input type="date" disabled :value="range.end" /></label>
        <button type="button" disabled title="飞书运营导出服务暂未开放">导出数据</button>
      </div>
    </header>
    <section v-if="pageState==='loading'" class="ops-state-surface" role="status">正在加载运营看板数据…</section>
    <section v-else-if="pageState==='permission-denied'" class="ops-state-surface" role="alert">需要完成飞书授权或获得运营看板权限后才能查看数据。</section>
    <section v-else-if="pageState==='error'" class="ops-state-surface" role="alert">运营数据服务暂不可用。请检查登录状态或稍后重试。</section>
    <section v-else-if="pageState==='empty'" class="ops-state-surface" role="status">当前统计区间没有可展示的真实运营数据。</section>
    <template v-else>
      <section class="ops-stats" aria-label="运营指标"><article v-for="(stat,index) in stats" :key="stat.label"><AppIcon :name="iconNames[index%iconNames.length]" :size="58"/><div><small>{{ stat.label }}</small><strong>{{ stat.value }}</strong><p>较上期 {{ stat.direction==='DOWN'?'↓':'↑' }} {{ stat.change }}</p></div></article></section>
      <section class="ops-grid">
        <article class="trend"><h2>访问趋势 <span>总访问量 {{ totalVisits }}</span></h2><div class="line" role="img" :aria-label="`访问趋势：${trend.join('、')}`"><i v-for="(value,index) in trend" :key="index" :style="{height:`${Math.max(18,Math.round(value/maxTrend*100))}%`}"><b>{{ value }}</b></i></div></article>
        <article class="ranking"><h2>热门应用 Top 10</h2><ol><li v-for="item in rankingApps" :key="`${item.rank}-${item.name}`"><b>{{ item.rank }}</b><span>{{ item.name }}</span><strong>{{ item.usage }}</strong></li></ol></article>
        <article class="ops-notices"><h2>公告列表 <a href="/operations/announcements">查看全部</a></h2><ul><li v-for="item in noticeRows" :key="`${item.date}-${item.title}`"><span>{{ item.title }}</span><b>{{ item.publisher }}</b><time>{{ item.date }}</time></li></ul></article>
        <article class="donut"><h2>用户活跃度</h2><div class="ring" role="img" :aria-label="`活跃用户占比 ${Number(activity.activeRate??0).toFixed(1)}%`">{{ Number(activity.activeRate??0).toFixed(1) }}%</div><dl><div><dt>活跃用户数</dt><dd>{{ activity.activeUserCount??0 }}</dd></div><div><dt>人均访问次数</dt><dd>{{ Number(activity.visitsPerUser??0).toFixed(2) }}</dd></div><div><dt>人均使用应用数</dt><dd>{{ Number(activity.appsPerUser??0).toFixed(2) }}</dd></div></dl></article>
        <article class="usage-chart"><h2>应用使用统计</h2><div class="line small" role="img" :aria-label="`应用使用统计：${usageTrend.join('、')}`"><i v-for="(value,index) in usageTrend" :key="index" :style="{height:`${Math.max(18,Math.round(value/maxTrend*100))}%`}"></i></div></article>
        <article class="distribution"><h2>应用类型分布</h2><div class="ring multi" role="img" :aria-label="`应用类型分布，共 ${distribution.reduce((total,item)=>total+Number(item.count??0),0)} 个应用`">{{ distribution.reduce((total,item)=>total+Number(item.count??0),0) }}</div><ul><li v-for="(item,index) in distribution" :key="item.typeCode||item.typeName"><i :style="{background:['#7755ee','#17bd97','#f28a16','#0060a6'][index%4]}"></i>{{ item.typeName }}<template v-if="item.count!=null"> {{ item.count }} ({{ Number(item.percentage??0).toFixed(1) }}%)</template></li></ul></article>
      </section>
      <footer>数据统计区间：{{ rangeLabel }}　　数据来源：{{ (dashboard.sourceNames||[]).join('、')||'飞书多维表格' }}<small>　已加载 {{ remoteDefinitions.length }} 项指标口径</small><button type="button" disabled title="飞书运营刷新任务暂未开放">刷新数据</button></footer>
    </template>
  </article>
</template>

<style scoped>
.operations-page{padding:18px 24px;color:#17304f}.operations-page h1{margin:0;font-size:26px}.operations-page>header p{color:#60758d;font-size:14px;line-height:1.6}.period{display:flex;gap:10px;align-items:center;margin-top:12px}.period button,.period input{height:40px;padding:0 13px;border:1px solid #d8e2ec;background:#fff;font-size:14px}.period label{display:flex;align-items:center;gap:7px;font-size:14px;white-space:nowrap}.period button[aria-pressed=true]{color:#fff;background:#0060a6}.period button:disabled,.operations-page footer button:disabled{cursor:not-allowed;opacity:.58}.period button:last-child{margin-left:auto}.ops-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:13px;margin:14px 0}.ops-stats article{height:112px;display:flex;align-items:center;gap:20px;padding:18px;background:#fff;border:1px solid #dce5ef;border-radius:6px}.ops-stats img{width:55px;height:55px;object-fit:contain}.ops-stats small,.ops-stats strong,.ops-stats p{display:block}.ops-stats small{font-size:13px}.ops-stats strong{font-size:24px}.ops-stats p{color:#13a45d;font-size:13px}.ops-grid{display:grid;grid-template-columns:1.1fr .9fr 1fr;gap:14px}.ops-grid>article{min-height:340px;padding:18px;background:#fff;border:1px solid #dce5ef;border-radius:6px;overflow:hidden}.ops-grid h2{margin:0;font-size:18px;line-height:1.45}.ops-grid h2 span,.ops-grid h2 a{float:right;font-size:13px;font-weight:400}.line{height:245px;display:flex;align-items:end;gap:clamp(8px,1.4vw,25px);padding:28px 22px 20px;border-bottom:1px solid #b9c7d6}.line i{min-width:10px;flex:1;position:relative;background:#0060a6}.line i b{position:absolute;top:-21px;font-size:12px}.ranking ol,.ops-notices ul,.distribution ul{list-style:none;margin:14px 0 0;padding:0}.ranking li{min-height:29px;display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:10px;font-size:14px;line-height:1.4}.ranking li>b{width:22px;height:22px;display:grid;place-items:center;background:#eef2f5}.ranking li:nth-child(-n+3)>b{color:#fff;background:#e43}.ranking li span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ranking li strong{font-size:14px}.ops-notices li{min-height:50px;display:grid;grid-template-columns:minmax(0,1fr) 110px 100px;align-items:center;gap:10px;border-bottom:1px solid #e4eaf0;font-size:13px}.ring{width:115px;height:115px;box-sizing:border-box;display:grid;place-items:center;margin:35px;border:24px solid #0060a6;border-right-color:#18bd96;border-radius:50%;font-size:18px}.donut{display:flex;flex-wrap:wrap}.donut h2{width:100%}.donut dl{padding-top:25px;font-size:13px}.donut dl div{display:flex;gap:30px;margin:15px}.small{height:220px}.distribution{display:grid;grid-template-columns:150px 1fr}.distribution h2{grid-column:1/-1}.multi{margin:25px 10px;border-color:#f56b7d #16b99b #0060a6 #f5aa18}.distribution li{min-height:26px;font-size:13px;line-height:1.45}.distribution li i{display:inline-block;width:8px;height:8px;margin-right:8px;border-radius:50%}.operations-page>footer{padding:18px 0;font-size:13px}.operations-page>footer button{float:right;border:0;background:transparent}.ops-state-surface{min-height:300px;display:grid;place-items:center;margin:14px 0;padding:28px;background:#fff;border:1px solid #dce5ef;border-radius:6px;color:#60758d;text-align:center}.ops-state-surface[role=alert]{color:#8f2d24}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}button:focus-visible,a:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:1350px){.ops-grid{grid-template-columns:1fr 1fr}.ops-grid>article{min-height:320px}}@media(max-width:1000px){.period{flex-wrap:wrap}.period button:last-child{margin-left:0}.ops-stats{grid-template-columns:repeat(2,1fr)}.ops-grid{grid-template-columns:1fr}}</style>
