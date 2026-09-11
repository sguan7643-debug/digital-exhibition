<script setup>
import { computed } from 'vue';
import { createProfileController } from '../state/workbench-profile-controllers.js';
const props=defineProps({integrationData:{type:Object,default:null},integrationState:{type:String,default:'mock'},operationExecutor:{type:Function,default:null}});
const profile=createProfileController();
const REFERENCE_SHA256 = 'F08DE51669B152D46224A0031945CFFF85969E40D7416D93849B6E1CDD35FA9A';
const mockStats=[['我的积分','2,850','积分','本月　+320','/assets/profile-stat-points.png'],['收藏应用','24','个','应用收藏','/assets/profile-stat-favorite.png'],['应用访问次数','128','次','本月访问','/assets/profile-stat-visits.png'],['应用使用次数','56','次','本月使用','/assets/profile-stat-use.png']];
const mockQuick=[['我的申请','查看我的申请记录及进度','/apps/onboarding/status'],['我的收藏','查看我收藏的应用与内容','/favorites'],['积分明细','查看积分获取与使用明细','/points/details'],['活动报名记录','查看我的活动报名记录','']];
const mockNotices=[['系统通知','【系统更新】数智产品展厅系统升级通知','05-08 09:32',''],['应用上新','【新应用上线】供应商风险预警应用已发布上线','05-07 16:18',''],['平台公告','平台将于5月10日22:00-23:00进行系统维护','05-05 17:42',''],['活动通知','【活动通知】数智课堂“采购谈判技巧”报名开启','05-05 11:05',''],['系统通知','【系统提醒】您有1条待办事项需要处理','05-04 14:21','']];
const mockTasks=[['采购合同执行分析看板V2.0版本发布申请','申请时间：2025-05-08 09:15','审核中',''],['供应商准入申请-能源发展股份有限公司','申请时间：2025-05-07 14:22','审核中',''],['采购需求申请-防爆电机设备采购','申请时间：2025-05-06 11:03','已通过',''],['平台使用权限申请-电子发票系统','申请时间：2025-05-05 09:48','已通过',''],['应用接入申请-库存周转分析报表','申请时间：2025-05-04 16:30','已驳回','']];
const remoteMode=computed(()=>props.integrationState!=='mock');
const summary=computed(()=>props.integrationData?.['WB-003']||null);
const pageState=computed(()=>{
  if(!remoteMode.value)return 'normal';
  if(props.integrationState==='loading')return 'loading';
  if(['authentication-required','permission-denied'].includes(props.integrationState))return 'permission-denied';
  if(['error','timeout','rate-limited','schema-drift','security-error'].includes(props.integrationState))return 'error';
  if(props.integrationState==='disabled')return 'disabled';
  return summary.value?.user?'normal':'empty';
});
const identity=computed(()=>remoteMode.value?summary.value?.user||null:{displayName:'张三丰',employeeNo:'',orgName:'物资采购中心',departmentName:'物资采购工程师',avatarUrl:'/assets/profile-avatar.png'});
const stats=computed(()=>{
  if(!remoteMode.value)return mockStats;
  const value=summary.value?.stats;if(!value)return [];
  return [['我的积分',String(value.pointBalance),'积分',`本月　${value.pointMonthIncrease>=0?'+':''}${value.pointMonthIncrease}`,'/assets/profile-stat-points.png'],['收藏应用',String(value.favoriteCount),'个','应用收藏','/assets/profile-stat-favorite.png'],['应用访问次数',String(value.appVisitCount),'次','累计访问','/assets/profile-stat-visits.png'],['应用使用次数',String(value.appUseCount),'次','累计使用','/assets/profile-stat-use.png']];
});
const quick=computed(()=>remoteMode.value?(summary.value?.quickEntries||[]).map(item=>[item.name,item.description,safeLocalPath(item.path),item.enabled]):mockQuick.map(item=>[...item,true]));
const notices=computed(()=>remoteMode.value?(summary.value?.recentMessages||[]).map(item=>[item.typeName,item.title,item.occurredAt,safeLocalPath(item.targetPath)]):mockNotices);
const tasks=computed(()=>{
  if(!remoteMode.value)return mockTasks;
  const items=props.integrationData?.['WB-004']?.items||summary.value?.todos||[];
  return items.map(item=>[item.title,`申请时间：${item.submittedAt||'—'}`,item.statusName||item.statusCode||'—',safeLocalPath(item.detailPath)]);
});
function safeLocalPath(path){
  if(!path||typeof window==='undefined')return '';
  try{const url=new URL(path,window.location.origin);return url.origin===window.location.origin&&url.pathname.startsWith('/')&&!url.pathname.startsWith('//')?`${url.pathname}${url.search}${url.hash}`:'';}catch{return '';}
}
function safeAvatarUrl(path){return safeLocalPath(path);}
const avatarStyle=computed(()=>safeAvatarUrl(identity.value?.avatarUrl)?{backgroundImage:`url("${safeAvatarUrl(identity.value.avatarUrl)}")`}:{});
</script>

<template>
  <div class="profile-page" :data-reference-sha="REFERENCE_SHA256" :data-state="pageState"><p class="sr-only" aria-live="polite">{{ profile.announcement }}</p><h1>个人中心</h1>
    <section v-if="pageState==='loading'" class="profile-state" role="status">正在加载个人中心数据…</section>
    <section v-else-if="pageState==='permission-denied'" class="profile-state" role="alert">需要完成飞书授权或获得个人中心读取权限。</section>
    <section v-else-if="pageState==='error'" class="profile-state" role="alert">个人中心数据暂不可用，请稍后重试。</section>
    <section v-else-if="pageState==='disabled'" class="profile-state" role="status">个人中心真实数据读取尚未启用。</section>
    <section v-else-if="pageState==='empty'" class="profile-state" role="status">当前身份暂无可展示的个人中心数据。</section>
    <template v-else>
    <div class="profile-top"><section class="identity"><span class="identity-avatar" :class="{'identity-placeholder':!safeAvatarUrl(identity.avatarUrl)}" :style="avatarStyle" role="img" :aria-label="safeAvatarUrl(identity.avatarUrl)?`${identity.displayName||'当前用户'}头像`:'默认用户头像'"></span><div><h2>{{ identity.displayName||'当前用户' }} <mark>已认证</mark></h2><p>工号：{{ identity.employeeNo||'—' }}</p><p>组织：{{ identity.orgName||identity.tenantName||'—' }}</p><p>部门：{{ identity.departmentName||'—' }}</p></div></section><section class="profile-stats" aria-label="个人数据概览"><article v-for="([label,total,unit,foot,icon]) in stats" :key="label"><strong>{{ label }}</strong><div><AppIcon :name="icon" :size="60" /><b>{{ total }} <small>{{ unit }}</small></b></div><span>{{ foot }}</span></article></section></div>
    <section class="quick-panel"><header><h2>快捷入口</h2><a href="/apps">更多服务　›</a></header><div><template v-for="(item,index) in quick" :key="`${item[0]}-${index}`"><a v-if="item[2]&&item[3]" :href="item[2]"><AppIcon :name="`profile-quick-${index%4+1}`" :size="65" /><span><strong>{{ item[0] }}</strong><small>{{ item[1] }}</small></span><b aria-hidden="true">›</b></a><button v-else type="button" :disabled="remoteMode" :title="remoteMode?'该入口未启用或目标地址不安全':''" @click="profile.explain(item[0])"><AppIcon :name="`profile-quick-${index%4+1}`" :size="65" /><span><strong>{{ item[0] }}</strong><small>{{ item[1] }}</small></span></button></template></div></section>
    <div class="profile-bottom"><section><header><h2>最近消息 / 公告</h2><a href="/messages">全部消息　›</a></header><ul><li v-for="(notice,index) in notices" :key="`${notice[1]}-${index}`"><mark>{{ notice[0] }}</mark><a v-if="notice[3]" :href="notice[3]">{{ notice[1] }}</a><button v-else type="button" :disabled="remoteMode" @click="profile.markRead(`profile-message-${String(index+1).padStart(3,'0')}`)">{{ notice[1] }}</button><time>{{ notice[2] }}</time></li></ul><footer><a href="/messages">查看更多　›</a></footer></section><section><header><h2>我的待办 / 申请进度</h2><a href="/profile">全部待办　›</a></header><ul class="tasks"><li v-for="(task,index) in tasks" :key="`${task[0]}-${index}`"><i aria-hidden="true"></i><span><a v-if="task[3]" :href="task[3]"><strong>{{ task[0] }}</strong></a><strong v-else>{{ task[0] }}</strong><small>{{ task[1] }}</small></span><mark :class="task[2]">{{ task[2] }}</mark></li></ul><footer><a href="/profile">查看更多　›</a></footer></section></div>
    </template>
    <footer class="copyright"><span>物资供应领域数智化转型平台　© 2025 版权所有</span><span>建议使用 1920*1080 及以上分辨率浏览</span></footer>
  </div>
</template>

<style scoped>
.profile-page{min-height:calc(100vh - 79px);overflow:visible;padding:25px 23px 0;color:#10284a}.profile-page>h1{height:55px;margin:0;font-size:25px}.profile-top{display:grid;grid-template-columns:1fr 1.24fr;gap:9px}.identity,.profile-stats,.quick-panel,.profile-bottom>section{background:#fff;border:1px solid #d9e2ec;border-radius:6px}.identity{height:228px;display:flex;align-items:center;gap:40px;padding:28px 40px}.identity>img{width:134px;height:134px;border-radius:50%}.identity h2{margin:0 0 16px;font-size:27px}.identity mark{margin-left:8px;padding:4px 10px;color:#0060a6;background:#e8f2ff;border-radius:3px;font-size:11px}.identity p{margin:9px 0;color:#314966;font-size:12px}.profile-stats{height:228px;display:grid;grid-template-columns:repeat(4,1fr);padding:13px}.profile-stats article{display:grid;align-content:space-between;padding:19px;border:1px solid #dfe7ef;border-radius:5px}.profile-stats article>strong{font-size:12px}.profile-stats article>div{display:flex;align-items:center;gap:11px}.profile-stats img{width:60px;height:60px}.profile-stats b{color:#174170;font-size:24px}.profile-stats b small{font-size:11px;font-weight:400}.profile-stats article>span{color:#617794;font-size:10px}.quick-panel{height:182px;margin-top:9px;padding:0 23px}.quick-panel>header,.profile-bottom section>header{height:54px;display:flex;align-items:center;justify-content:space-between}.quick-panel h2,.profile-bottom h2{margin:0;color:#0060a6;font-size:16px}.quick-panel header a,.profile-bottom header a,.profile-bottom footer a{color:#0060a6;font-size:10px}.quick-panel>div{display:grid;grid-template-columns:repeat(4,1fr);gap:31px}.quick-panel>div>a{height:103px;display:flex;align-items:center;gap:18px;padding:10px 17px;border:1px solid #dfe7ef;border-radius:5px}.quick-panel img{width:65px;height:65px}.quick-panel a span{display:grid;gap:10px;flex:1}.quick-panel a strong{font-size:13px}.quick-panel a small{color:#667b91;font-size:10px}.quick-panel a>b{color:#235f9f;font-weight:400}.profile-bottom{display:grid;grid-template-columns:1fr 1.15fr;gap:11px;margin-top:8px}.profile-bottom>section{height:401px;padding:0 23px}.profile-bottom ul{list-style:none;margin:0;padding:0}.profile-bottom li{height:53px;display:grid;grid-template-columns:84px minmax(0,1fr) 90px;align-items:center;border-bottom:1px solid #e0e7ef;font-size:11px}.profile-bottom li>mark{justify-self:start;padding:3px 8px;color:#0060a6;background:#e8f2ff;border-radius:3px;font-size:9px}.profile-bottom li>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.profile-bottom time{color:#5f7390;text-align:right}.profile-bottom footer{height:55px;display:grid;place-items:center}.tasks li{grid-template-columns:10px minmax(0,1fr) 54px;height:62px}.tasks li>i{width:5px;height:5px;background:#0060a6;border-radius:50%}.tasks li>span{display:grid;gap:6px}.tasks li strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tasks li small{color:#60758e}.tasks mark.已通过{color:#079049;background:#e6f7ed}.tasks mark.已驳回{color:#e33838;background:#ffeaea}.copyright{height:69px;display:flex;align-items:center;justify-content:center;gap:115px;color:#7890aa;font-size:10px}button:focus-visible,a:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:1200px){.profile-top,.profile-bottom{grid-template-columns:1fr}.profile-stats{grid-template-columns:repeat(2,1fr);height:auto}.quick-panel{height:auto;padding-bottom:20px}.quick-panel>div{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.profile-page{padding:12px}.identity{height:auto;padding:20px}.quick-panel>div,.profile-stats{grid-template-columns:1fr}.copyright{gap:20px;flex-wrap:wrap}}
.quick-panel>div>button{height:103px;display:flex;align-items:center;gap:18px;padding:10px 17px;border:1px solid #dfe7ef;border-radius:5px;background:#fff;text-align:left}.quick-panel button span{display:grid;gap:10px;flex:1}.quick-panel button strong{font-size:13px}.quick-panel button small{color:#667b91;font-size:10px}.profile-bottom li>button{overflow:hidden;padding:0;border:0;background:transparent;text-align:left;text-overflow:ellipsis;white-space:nowrap}.profile-bottom header>button,.profile-bottom footer>button{padding:0;color:#0060a6;background:transparent;border:0;font-size:10px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.profile-state{min-height:420px;display:grid;place-items:center;padding:30px;background:#fff;border:1px solid #d9e2ec;border-radius:6px;color:#617794}.profile-state[role=alert]{color:#8f2d24}.identity-avatar{width:134px;height:134px;flex:0 0 134px;border-radius:50%;background-position:center;background-size:cover;box-shadow:inset 0 0 0 1px #c4d1df}.identity-placeholder{background-image:linear-gradient(#e7edf4 55%,#cbd7e4 55%)!important}.profile-bottom li>a{overflow:hidden;color:#17385f;text-overflow:ellipsis;white-space:nowrap}
</style>
