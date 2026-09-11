<script setup>
import { computed, ref } from 'vue';
import { MESSAGE_FIXTURES, createMessagesController } from '../state/content-controllers.js';
import { routeSession } from '../state/session-store.js';
import PaginationControl from '../components/PaginationControl.vue';
const props=defineProps({integrationData:{type:Object,default:null},integrationState:{type:String,default:'mock'}});
const REFERENCE_SHA256 = '8181F60BE17D8B4068A4B6432850FE5EB9489E954D379FD5B236A426F07B9F22';
const controller=routeSession.controller('messages',()=>createMessagesController(MESSAGE_FIXTURES));
const remoteStats=computed(()=>props.integrationData?.['MSG-001']);
const remoteRows=computed(()=>props.integrationData?.['MSG-002']?.items?.map(item=>({
  id:item.messageId,type:item.typeName||item.typeCode,title:item.title,copy:item.summary,
  time:item.occurredAt?.replace('T',' ').slice(5,16)||'',read:item.isRead,today:item.isToday,
  action:item.actionLabel||'查看',route:item.targetPath||''
}))||[]);
const remoteMode=computed(()=>props.integrationState!=='mock');
const remoteState=computed(()=>props.integrationState);
const liveMode=computed(()=>props.integrationState!=='mock');
const pageState=computed(()=>{
  if(!remoteMode.value)return 'normal';
  if(remoteState.value==='error')return 'error';
  if(remoteState.value==='authentication-required'||remoteState.value==='permission-denied')return 'permission-denied';
  if(remoteState.value==='empty')return 'empty';
  if(remoteState.value==='loading')return 'loading';
  return remoteRows.value.length?'normal':'empty';
});
const stats = computed(() => {
  const value=remoteStats.value;
  return [
    ['全部消息', remoteMode.value ? Number(value?.totalCount??0) : controller.totalCount, '', '/assets/msg-stat-all.png'], ['未读消息', remoteMode.value ? Number(value?.unreadCount??0) : controller.unreadCount, '', '/assets/msg-stat-unread.png'],
    ['已读消息', remoteMode.value ? Number(value?.readCount??0) : controller.readCount, '', '/assets/msg-stat-read.png'], ['今日新增', remoteMode.value ? Number(value?.todayCount??0) : controller.todayCount, '', '/assets/msg-stat-new.png']
  ];
});
const queryDraft=computed({get:()=>controller.queryDraft,set:value=>{controller.queryDraft=value;}});
const filteredMessages=computed(()=>{
  if(!remoteMode.value)return controller.results;
  const query=String(controller.filters.query||'').trim().toLocaleLowerCase('zh-CN');
  const rows=remoteRows.value.filter(item=>(!controller.filters.type||item.type===controller.filters.type)&&(controller.filters.status==='all'||(controller.filters.status==='read')===item.read)&&(!query||`${item.title} ${item.copy}`.toLocaleLowerCase('zh-CN').includes(query)));
  return controller.sort==='newest'?rows:[...rows].reverse();
});
const pagedMessages=computed(()=>{const start=(controller.page-1)*controller.pageSize;return filteredMessages.value.slice(start,start+controller.pageSize);});
const types=computed(()=>[...new Set((remoteMode.value ? remoteRows.value : MESSAGE_FIXTURES).map(item=>item.type).filter(Boolean))]);
function submit(){controller.setFilter('query',queryDraft.value);}
function refresh(){queryDraft.value='';if(remoteMode.value){controller.setFilter('query','');controller.announcement='已清空本地筛选；真实消息保持飞书返回结果';}else controller.refresh();}
function actionFor(item){return remoteMode.value&&item.route?{kind:'route',route:item.route}:controller.actionFor(item);}
function activateMessage(item){if(remoteMode.value){controller.announcement='该真实消息没有可用的安全目标路径';return;}controller.activate(item);}
function openMessage(item){if(!remoteMode.value)controller.markRead(item.id);}
function changePage(value){const pages=Math.max(1,Math.ceil(filteredMessages.value.length/controller.pageSize));controller.setPage(Math.min(pages,Math.max(1,Number(value)||1)));}
function changePageSize(value){controller.setPageSize([10,20,50].includes(Number(value))?Number(value):10);}
function moveTab(event,index){if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const tabs=['all','unread','read'];const next=(index+(event.key==='ArrowRight'?1:2))%3;controller.setStatus(tabs[next]);event.currentTarget.parentElement.children[next].focus();}
</script>

<template>
  <div class="messages-page" :data-reference-sha="REFERENCE_SHA256" :data-state="pageState"><p class="sr-only" aria-live="polite">{{ controller.announcement }}</p>
    <header><h1>消息中心</h1><p>及时获取系统动态与业务通知，助力高效协同与决策</p></header>
    <section class="message-stats" aria-label="消息数据概览">
      <article v-for="([label,total,increase,icon]) in stats" :key="label"><AppIcon :name="icon" :size="61" /><div><strong>{{ label }}</strong><b>{{ total }}</b><small v-if="remoteMode">来自飞书当前用户消息</small><small v-else>较昨日　<em>↑ {{ increase }}</em></small></div></article>
    </section>
    <form class="message-filters" aria-label="消息筛选" @submit.prevent="submit">
      <label>消息类型：<select :value="controller.filters.type" @change="controller.setFilter('type',$event.target.value)"><option value="">全部类型</option><option v-for="type in types" :key="type">{{ type }}</option></select></label><label>时间范围：<select disabled title="当前页面加载近100条消息"><option>当前结果</option></select></label>
      <label class="keyword">关键词搜索：<input v-model="queryDraft" type="search" placeholder="请输入消息标题或内容关键词" /></label><button type="submit">查询</button><button type="button" :disabled="liveMode" :title="liveMode?'真实消息写操作尚未开放，不能伪造已读状态':''" @click="controller.markAllRead">全部标为已读</button>
    </form>
    <section class="message-panel">
      <div class="message-tabs"><nav role="tablist" aria-label="消息状态"><button v-for="(tab,index) in [['all','全部'],['unread','未读'],['read','已读']]" :key="tab[0]" type="button" role="tab" :aria-selected="controller.filters.status===tab[0]" @click="controller.setStatus(tab[0])" @keydown="moveTab($event,index)">{{ tab[1] }}</button></nav><button type="button" @click="refresh">刷新</button><button type="button" @click="controller.toggleSort">{{ controller.sort==='newest'?'最新优先':'最早优先' }}</button></div>
      <p v-if="pageState==='loading'" class="message-state-surface" role="status">正在加载当前用户消息…</p>
      <p v-else-if="pageState==='permission-denied'" class="message-state-surface" role="alert">需要完成飞书登录后才能查看当前用户消息。请完成授权后刷新页面。</p>
      <p v-else-if="pageState==='error'" class="message-state-surface" role="alert">消息服务暂不可用。请检查网络或登录状态后刷新页面。</p>
      <p v-else-if="pageState==='empty'" class="message-state-surface" role="status">当前没有可展示的真实消息。可调整筛选条件或稍后刷新页面。</p>
      <ul v-else>
        <li v-for="(item,index) in pagedMessages" :key="item.id">
          <AppIcon :name="`msg-row-${index%6+1}`" :size="42" /><small class="message-type">{{ item.type }}</small><i :class="{ placeholder: item.read }" :aria-hidden="item.read ? 'true' : undefined" :aria-label="item.read ? undefined : '未读'"></i>
          <div><strong>{{ item.title }}</strong><p>{{ item.copy }}</p></div><time :datetime="`2025-${item.time.replace(' ','T')}`">{{ item.time }}</time><em class="message-state" :class="{ unread: !item.read }">{{ item.read?'已读':'未读' }}</em><a v-if="actionFor(item).kind==='route'" :id="`message-${item.id}`" :data-session-focus="`message-${item.id}`" :href="actionFor(item).route" @click="openMessage(item)">{{ item.action }}　›</a><button v-else :id="`message-${item.id}`" type="button" @click="activateMessage(item)">{{ item.action }}　›</button>
        </li>
      </ul>
      <p v-if="pageState==='normal'&&!filteredMessages.length" class="message-empty" role="status">暂无符合条件的消息</p><PaginationControl v-if="pageState==='normal'" :total="filteredMessages.length" :page="controller.page" :page-size="controller.pageSize" label="消息分页" @update:page="changePage" @update:page-size="changePageSize" />
    </section>
  </div>
</template>

<style scoped>
.messages-page{height:auto;min-height:calc(100vh - 79px);overflow:visible;padding:27px 27px 21px 40px;color:#10284b}.messages-page>header{height:73px;padding:0 12px}.messages-page h1{margin:0 0 6px;font-size:25px}.messages-page header p{color:#435b78;font-size:13px}.message-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.message-stats article{height:121px;display:flex;align-items:center;gap:28px;padding:15px 29px;background:#fff;border:1px solid #d9e2ec;border-radius:5px}.message-stats img{width:61px;height:61px}.message-stats div{display:grid;gap:4px}.message-stats strong{font-size:12px}.message-stats b{font-size:27px}.message-stats small{font-size:11px}.message-stats em{color:#079145;font-style:normal}.message-filters{height:72px;display:flex;align-items:center;gap:34px;padding:0 20px;margin:14px 0;background:#fff;border:1px solid #d9e2ec;border-radius:5px;font-size:12px}.message-filters label{display:flex;align-items:center;gap:12px;white-space:nowrap}.message-filters select,.message-filters input,.message-tabs select{height:38px;border:1px solid #d2deea;border-radius:4px;background:#fff;padding:0 13px;color:#304865}.message-filters select{width:184px}.message-filters .keyword{flex:1}.message-filters input{width:100%}.message-filters button{height:40px;padding:0 27px;border:0;border-radius:4px;color:#fff;background:#0060a6}.message-panel{background:#fff;border:1px solid #d9e2ec;border-radius:5px}.message-tabs{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid #dde6ef}.message-tabs nav{display:flex;gap:41px;height:100%}.message-tabs button{height:100%;border:0;background:#fff;color:#173052}.message-tabs button[aria-current=page]{color:#0060a6;border-bottom:3px solid #0060a6}.message-tabs label{font-size:11px}.message-tabs select{height:34px}.message-panel ul{list-style:none;margin:0;padding:0 18px}.message-panel li{min-height:78px;display:grid;grid-template-columns:44px 116px 10px minmax(320px,1fr) 128px 72px 150px;align-items:center;gap:12px;border-bottom:1px solid #e0e7ef}.message-panel li>img{width:42px;height:42px}.message-panel li>.message-type{min-width:96px;max-width:100%;display:inline-flex;align-items:center;justify-content:center;justify-self:start;box-sizing:border-box;padding:4px 8px;color:#2d627d;background:#edf5f8;border-radius:3px;line-height:1.3;white-space:nowrap}.message-panel li>i{width:7px;height:7px;background:#0060a6;border-radius:50%}.message-panel li>i.placeholder{visibility:hidden}.message-panel li div{min-width:0}.message-panel li strong,.message-panel li p{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.message-panel li strong{font-size:12px}.message-panel li p{margin-top:6px;color:#536983;font-size:10px}.message-panel time{color:#465f7c;font-size:11px;white-space:nowrap}.message-panel li>.message-state{min-width:58px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;padding:4px 8px;color:#607087;background:#f1f4f7;border-radius:3px;font-style:normal;line-height:1.3;white-space:nowrap}.message-panel li>.message-state.unread{color:#0060a6;background:#eaf2f9}.message-panel li>a{color:#0060a6;font-size:11px;text-align:right}.message-panel footer{height:70px;display:flex;align-items:center;gap:20px;padding:0 20px;font-size:11px}.message-panel footer>span{margin-right:auto}.message-panel footer select{height:35px;border:1px solid #d3dfeb}.message-panel footer nav{display:flex;align-items:center;gap:7px}.message-panel footer button{min-width:31px;height:31px;border:1px solid #d4deea;background:#fff;border-radius:4px}.message-panel footer button[aria-current=page]{color:#fff;background:#0060a6}.message-panel footer input{width:42px;height:31px;border:1px solid #d3deea;text-align:center}button:focus-visible,a:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:1100px){.message-stats{grid-template-columns:repeat(2,1fr)}.message-filters{height:auto;flex-wrap:wrap;padding-block:12px}.message-panel{overflow-x:auto}.message-panel ul,.message-tabs,.message-panel footer{min-width:1100px}}@media(max-width:760px){.messages-page{padding:12px}.message-stats{grid-template-columns:1fr}.message-panel li{grid-template-columns:44px 116px 10px minmax(320px,1fr) 128px 72px 150px}}
.message-tabs button[aria-selected=true]{color:#0060a6;border-bottom:3px solid #0060a6}.message-panel li>button{color:#0060a6;background:transparent;border:0;font-size:11px;text-align:right}.message-panel li>a,.message-panel li>button{justify-self:end;white-space:nowrap}.message-empty,.message-state-surface{padding:60px;text-align:center;color:#60718a}.message-state-surface[role=alert]{color:#8f2d24}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:1100px){
  .message-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .message-filters label{display:grid;grid-template-columns:auto minmax(0,1fr)}
  .message-filters select{width:100%}
  .message-filters .keyword{grid-column:1/-1}
  .message-filters button{width:100%}
  .message-panel{overflow:visible}
  .message-panel ul,.message-tabs,.message-panel footer{min-width:0}
  .message-panel li{min-height:98px;grid-template-columns:42px 108px 8px minmax(0,1fr) auto;grid-template-areas:"icon type dot content action" "icon state . content time";gap:7px 10px;padding:10px 0}
  .message-panel li>img{grid-area:icon}
  .message-panel li>.message-type{grid-area:type;min-width:0}
  .message-panel li>i{grid-area:dot}
  .message-panel li>div{grid-area:content}
  .message-panel li>time{grid-area:time;align-self:end}
  .message-panel li>.message-state{grid-area:state;min-width:0}
  .message-panel li>:is(a,button){grid-area:action;align-self:start}
  .message-panel li strong,.message-panel li p{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}
  .message-panel li strong{-webkit-line-clamp:1}
  .message-panel li p{-webkit-line-clamp:2}
  .message-panel footer{height:auto;min-height:70px;flex-wrap:wrap;padding-block:12px}
}
</style>
