<script setup>
import { computed, ref } from 'vue';
import { MESSAGE_FIXTURES, createMessagesController } from '../state/content-controllers.js';
import { routeSession } from '../state/session-store.js';
import PaginationControl from '../components/PaginationControl.vue';
const REFERENCE_SHA256 = '8181F60BE17D8B4068A4B6432850FE5EB9489E954D379FD5B236A426F07B9F22';
const controller=routeSession.controller('messages',()=>createMessagesController(MESSAGE_FIXTURES));
const stats = computed(() => [
  ['全部消息', controller.totalCount, '18', '/assets/msg-stat-all.png'], ['未读消息', controller.unreadCount, '5', '/assets/msg-stat-unread.png'],
  ['已读消息', controller.readCount, '13', '/assets/msg-stat-read.png'], ['今日新增', controller.todayCount, '3', '/assets/msg-stat-new.png']
]);
const queryDraft=computed({get:()=>controller.queryDraft,set:value=>{controller.queryDraft=value;}});
const filteredMessages=computed(()=>controller.results);
const pagedMessages=computed(()=>controller.pagedResults);
const types=[...new Set(MESSAGE_FIXTURES.map(item=>item.type))];
function submit(){controller.setFilter('query',queryDraft.value);}
function refresh(){queryDraft.value='';controller.refresh();}
function actionFor(item){return controller.actionFor(item);}
function activateMessage(item){controller.activate(item);}
function moveTab(event,index){if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const tabs=['all','unread','read'];const next=(index+(event.key==='ArrowRight'?1:2))%3;controller.setStatus(tabs[next]);event.currentTarget.parentElement.children[next].focus();}
</script>

<template>
  <div class="messages-page" :data-reference-sha="REFERENCE_SHA256"><p class="sr-only" aria-live="polite">{{ controller.announcement }}</p>
    <header><h1>消息中心</h1><p>及时获取系统动态与业务通知，助力高效协同与决策</p></header>
    <section class="message-stats" aria-label="消息数据概览">
      <article v-for="([label,total,increase,icon]) in stats" :key="label"><AppIcon :name="icon" :size="61" /><div><strong>{{ label }}</strong><b>{{ total }}</b><small>较昨日　<em>↑ {{ increase }}</em></small></div></article>
    </section>
    <form class="message-filters" aria-label="消息筛选" @submit.prevent="submit">
      <label>消息类型：<select :value="controller.filters.type" @change="controller.setFilter('type',$event.target.value)"><option value="">全部类型</option><option v-for="type in types" :key="type">{{ type }}</option></select></label><label>时间范围：<select disabled title="固定演示数据为近30天"><option>近30天</option></select></label>
      <label class="keyword">关键词搜索：<input v-model="queryDraft" type="search" placeholder="请输入消息标题或内容关键词" /></label><button type="submit">查询</button><button type="button" @click="controller.markAllRead">全部标为已读</button>
    </form>
    <section class="message-panel">
      <div class="message-tabs"><nav role="tablist" aria-label="消息状态"><button v-for="(tab,index) in [['all','全部'],['unread','未读'],['read','已读']]" :key="tab[0]" type="button" role="tab" :aria-selected="controller.filters.status===tab[0]" @click="controller.setStatus(tab[0])" @keydown="moveTab($event,index)">{{ tab[1] }}</button></nav><button type="button" @click="refresh">刷新</button><button type="button" @click="controller.toggleSort">{{ controller.sort==='newest'?'最新优先':'最早优先' }}</button></div>
      <ul>
        <li v-for="(item,index) in pagedMessages" :key="item.id">
          <AppIcon :name="`msg-row-${index%6+1}`" :size="42" /><small>{{ item.type }}</small><i v-if="!item.read" aria-label="未读"></i>
          <div><strong>{{ item.title }}</strong><p>{{ item.copy }}</p></div><time :datetime="`2025-${item.time.replace(' ','T')}`">{{ item.time }}</time><em>{{ item.read?'已读':'未读' }}</em><a v-if="actionFor(item).kind==='route'" :id="`message-${item.id}`" :data-session-focus="`message-${item.id}`" :href="actionFor(item).route" @click="controller.markRead(item.id)">{{ item.action }}　›</a><button v-else :id="`message-${item.id}`" type="button" @click="activateMessage(item)">{{ item.action }}　›</button>
        </li>
      </ul>
      <p v-if="!filteredMessages.length" class="message-empty" role="status">暂无符合条件的消息</p><PaginationControl :total="filteredMessages.length" :page="controller.page" :page-size="controller.pageSize" label="消息分页" @update:page="controller.setPage" @update:page-size="controller.setPageSize" />
    </section>
  </div>
</template>

<style scoped>
.messages-page{min-height:calc(100vh - 79px);padding:27px 27px 21px 40px;color:#10284b}.messages-page>header{height:73px;padding:0 12px}.messages-page h1{margin:0 0 6px;font-size:25px}.messages-page header p{color:#435b78;font-size:13px}.message-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.message-stats article{height:121px;display:flex;align-items:center;gap:28px;padding:15px 29px;background:#fff;border:1px solid #d9e2ec;border-radius:5px}.message-stats img{width:61px;height:61px}.message-stats div{display:grid;gap:4px}.message-stats strong{font-size:12px}.message-stats b{font-size:27px}.message-stats small{font-size:11px}.message-stats em{color:#079145;font-style:normal}.message-filters{height:72px;display:flex;align-items:center;gap:34px;padding:0 20px;margin:14px 0;background:#fff;border:1px solid #d9e2ec;border-radius:5px;font-size:12px}.message-filters label{display:flex;align-items:center;gap:12px;white-space:nowrap}.message-filters select,.message-filters input,.message-tabs select{height:38px;border:1px solid #d2deea;border-radius:4px;background:#fff;padding:0 13px;color:#304865}.message-filters select{width:184px}.message-filters .keyword{flex:1}.message-filters input{width:100%}.message-filters button{height:40px;padding:0 27px;border:0;border-radius:4px;color:#fff;background:#075fd0}.message-panel{background:#fff;border:1px solid #d9e2ec;border-radius:5px}.message-tabs{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid #dde6ef}.message-tabs nav{display:flex;gap:41px;height:100%}.message-tabs button{height:100%;border:0;background:#fff;color:#173052}.message-tabs button[aria-current=page]{color:#0769e9;border-bottom:3px solid #0b70ed}.message-tabs label{font-size:11px}.message-tabs select{height:34px}.message-panel ul{list-style:none;margin:0;padding:0 18px}.message-panel li{min-height:68px;display:grid;grid-template-columns:43px 95px 9px minmax(280px,1fr) 118px 52px 109px;align-items:center;gap:10px;border-bottom:1px solid #e0e7ef}.message-panel li>img{width:42px;height:42px}.message-panel li>small{font-size:11px}.message-panel li>i{width:7px;height:7px;background:#0871eb;border-radius:50%}.message-panel li div{min-width:0}.message-panel li strong,.message-panel li p{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.message-panel li strong{font-size:12px}.message-panel li p{margin-top:6px;color:#536983;font-size:10px}.message-panel time,.message-panel li>em{color:#465f7c;font-size:11px;font-style:normal}.message-panel li>a{color:#0769e6;font-size:11px;text-align:right}.message-panel footer{height:70px;display:flex;align-items:center;gap:20px;padding:0 20px;font-size:11px}.message-panel footer>span{margin-right:auto}.message-panel footer select{height:35px;border:1px solid #d3dfeb}.message-panel footer nav{display:flex;align-items:center;gap:7px}.message-panel footer button{min-width:31px;height:31px;border:1px solid #d4deea;background:#fff;border-radius:4px}.message-panel footer button[aria-current=page]{color:#fff;background:#0768dc}.message-panel footer input{width:42px;height:31px;border:1px solid #d3deea;text-align:center}button:focus-visible,a:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:1100px){.message-stats{grid-template-columns:repeat(2,1fr)}.message-filters{height:auto;flex-wrap:wrap;padding-block:12px}.message-panel{overflow-x:auto}.message-panel ul,.message-tabs,.message-panel footer{min-width:1040px}}@media(max-width:760px){.messages-page{padding:12px}.message-stats{grid-template-columns:1fr}.message-panel li{grid-template-columns:43px 90px minmax(280px,1fr)}}
.message-tabs button[aria-selected=true]{color:#0769e9;border-bottom:3px solid #0b70ed}.message-panel li>button{color:#0769e6;background:transparent;border:0;font-size:11px;text-align:right}.message-empty{padding:60px;text-align:center;color:#60718a}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
</style>
