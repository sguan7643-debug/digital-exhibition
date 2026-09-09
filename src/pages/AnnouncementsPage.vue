
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ANNOUNCEMENT_FIXTURES, createAnnouncementController } from '../state/announcement-controllers.js';
import { routeSession } from '../state/session-store.js';
import PaginationControl from '../components/PaginationControl.vue';
import { mapRemoteAnnouncement } from '../integration/announcement-read-model.js';

const REFERENCE_SHA256 = '58A43229752CC4A5210A2846B88DB267A622543AA8F7F034CDA42BC2041F4F8C';
const props=defineProps({
  state:{type:String,default:'normal'},
  integrationData:{type:Object,default:null},
  integrationState:{type:String,default:'mock'}
});
const emit=defineEmits(['restore']);
const controller=routeSession.controller('announcements',()=>createAnnouncementController(ANNOUNCEMENT_FIXTURES));
const localState=ref(props.state);
const state=computed(()=>localState.value);
const startDateInput=ref(null);
const pagedAnnouncements=computed(()=>localState.value==='empty'?[]:controller.pagedResults);
const contentVisible=computed(()=>['normal','empty','disabled'].includes(localState.value));
const controlsDisabled=computed(()=>localState.value==='disabled');
const remoteFacets=computed(()=>props.integrationData?.['ANN-001']);
const remoteMode=computed(()=>Boolean(props.integrationData?.['ANN-002']));
const readStateAvailable=computed(()=>remoteFacets.value?.readStateAvailable!==false);
const readActionsDisabled=computed(()=>controlsDisabled.value||!readStateAvailable.value);
const typeOptions=computed(()=>remoteFacets.value?.categories?.map(item=>item.name).filter(Boolean)||['平台公告','应用上线','活动通知','系统通知']);
const statusOptions=computed(()=>remoteFacets.value?.statuses?.map(item=>item.name).filter(Boolean)||[]);
const totalCount=computed(()=>remoteFacets.value?.total??controller.fixtures.length);
const weekNew=computed(()=>remoteFacets.value?.weekNew??9);
let loadingTimer;

function finishLoading(){window.clearTimeout(loadingTimer);loadingTimer=window.setTimeout(()=>emit('restore'),800);}
function syncState(value){window.clearTimeout(loadingTimer);localState.value=value;if(value==='loading')finishLoading();}
function beginRetry(){localState.value='loading';controller.announcement='正在重新加载公告';finishLoading();}
function applyAnnouncementFilters(){if(!controller.applyFilters())nextTick(()=>startDateInput.value?.focus());}
function updateFilter(key,event){controller.setFilter(key,event.target.value);}
function markAllRead(){controller.markAllRead();}
function rememberDetail(item,event){if(controlsDisabled.value){event.preventDefault();return;}controller.markRead(item.id);window.history.replaceState({...window.history.state,xltRestoreFocus:`announcement-${item.id}`},'',window.location.href);}
function resetEmpty(){controller.resetData();emit('restore');}

watch(()=>props.integrationData?.['ANN-002']?.items,rows=>{
  if(Array.isArray(rows))controller.replaceFixtures(rows.map(mapRemoteAnnouncement),{statusMode:'publication'});
},{immediate:true});

onMounted(()=>{const id=window.history.state?.xltRestoreFocus;if(id)nextTick(()=>document.getElementById(id)?.focus());});
watch(()=>props.state,syncState);
onBeforeUnmount(()=>window.clearTimeout(loadingTimer));
</script>

<template>
  <div class="announcements-page" :data-reference-sha="REFERENCE_SHA256" :data-state="state" :aria-busy="state === 'loading'">
    <p class="sr-only" aria-live="polite">{{ controller.announcement }}</p>
    <template v-if="contentVisible">
      <header><div><h1>公告通知</h1><p>统一查看平台公告、应用上线通知与活动通知，及时获取公共信息</p></div><a class="publish-notice" href="/operations/announcements/notice-001/edit">发布公告</a></header>
      <section class="notice-stats" aria-label="公告数据概览"><article><AppIcon name="notice-stat-unread" :size="67" /><div><strong>{{ remoteMode?'公告总数':'未读公告' }}</strong><b>{{ remoteMode?totalCount:controller.unreadCount }}</b><small>{{ remoteMode?'来自飞书公告表':'较昨日　↓ 5' }}</small></div></article><article><AppIcon name="notice-stat-new" :size="67" /><div><strong>本周新增</strong><b>{{ weekNew }}</b><small>{{ remoteMode?'按发布时间统计':'较上周　↑ 3' }}</small></div></article></section>
      <form class="notice-filters" aria-label="公告筛选" @submit.prevent="applyAnnouncementFilters">
        <label>公告类型：<select :value="controller.draft.type" :disabled="controlsDisabled" @change="updateFilter('type',$event)"><option value="">全部类型</option><option v-for="type in typeOptions" :key="type">{{ type }}</option></select></label>
        <label>发布时间：<span class="date-range"><input ref="startDateInput" type="date" aria-label="开始日期" :aria-invalid="Boolean(controller.validationError)" aria-describedby="notice-date-error" :value="controller.draft.startDate" :disabled="controlsDisabled" @input="controller.setDraft('startDate',$event.target.value)" /><b>~</b><input type="date" aria-label="结束日期" :aria-invalid="Boolean(controller.validationError)" aria-describedby="notice-date-error" :value="controller.draft.endDate" :disabled="controlsDisabled" @input="controller.setDraft('endDate',$event.target.value)" /></span><small id="notice-date-error" class="filter-error" role="alert">{{ controller.validationError }}</small></label>
        <label>{{ remoteMode?'发布状态：':'是否已读：' }}<select :value="controller.draft.status" :disabled="controlsDisabled" @change="updateFilter('status',$event)"><option value="all">全部状态</option><template v-if="remoteMode"><option v-for="status in statusOptions" :key="status">{{ status }}</option></template><template v-else><option value="unread">未读</option><option value="read">已读</option></template></select></label>
        <button type="submit" :disabled="controlsDisabled">筛选</button><button type="button" :disabled="readActionsDisabled" :title="readStateAvailable?'':'飞书公告表未提供用户已读状态'" @click="markAllRead">全部标为已读</button>
      </form>
      <section class="notice-table">
        <div v-if="state === 'empty' || !pagedAnnouncements.length" class="notice-empty"><h2>暂无符合条件的公告</h2><p>请调整筛选条件后重试。</p><button type="button" @click="resetEmpty">清除筛选并恢复</button></div>
        <template v-else><table><caption class="sr-only">公告通知列表</caption><thead><tr><th scope="col">公告内容</th><th scope="col">发布时间</th><th scope="col">状态</th><th scope="col">操作</th></tr></thead><tbody><tr v-for="item in pagedAnnouncements" :key="item.id"><td><i :class="item.tone" aria-hidden="true"></i><mark :class="item.tone">{{ item.type }}</mark><div><strong>{{ item.title }}</strong><p>{{ item.copy }}</p></div></td><td><time :datetime="item.date&&item.time?`${item.date}T${item.time.slice(6)}`:undefined">{{ item.time||'—' }}</time></td><td><span v-if="item.read===null">{{ item.status||'状态未提供' }}</span><span v-else :class="{unread:!item.read}">{{ item.read?'已读':'未读' }}</span></td><td><a v-if="item.hasDetail" :id="`announcement-${item.id}`" href="/announcements/notice-001" :aria-disabled="controlsDisabled" @click="rememberDetail(item,$event)">查看详情　›</a><button v-else :id="`announcement-${item.id}`" type="button" :disabled="controlsDisabled" @click="controller.explain(item)">查看详情　›</button></td></tr></tbody></table>
        <PaginationControl :total="controller.results.length" :page="controller.page" :page-size="controller.pageSize" :disabled="controlsDisabled" label="公告分页" @update:page="controller.setPage" @update:page-size="controller.setPageSize" /></template>
      </section>
    </template>
    <section v-else-if="state === 'loading'" class="notice-state" aria-live="polite"><h1>正在加载公告</h1><p>请稍候。</p></section>
    <section v-else-if="state === 'error'" class="notice-state" role="alert"><h1>公告加载失败</h1><p>演示数据暂时不可用。</p><button type="button" @click="beginRetry">重试</button></section>
    <section v-else-if="state === 'permission-denied'" class="notice-state" role="alert"><h1>访问受限</h1><p>当前角色无权查看此内容。</p><a href="/workbench">返回工作台</a></section>
  </div>
</template>

<style scoped>
.announcements-page {
  min-height: calc(100vh - 79px);
  padding: 27px 26px 15px;
  color: #10284a;
}
.announcements-page > header {
  min-height: 83px;
  height: auto;
  padding-bottom: 18px;
}
.announcements-page h1 {
  margin: 0 0 7px;
  font-size: 25px;
}
.announcements-page header p {
  font-size: 13px;
}
.notice-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 17px;
}
.notice-stats article {
  height: 125px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  background: #fff;
  border: 1px solid #d9e3ed;
  border-radius: 5px;
}
.notice-stats img {
  width: 67px;
  height: 67px;
}
.notice-stats div {
  display: grid;
  gap: 5px;
}
.notice-stats strong {
  font-size: 12px;
}
.notice-stats b {
  font-size: 27px;
}
.notice-stats small {
  font-size: 11px;
}
.notice-stats em {
  color: #079347;
  font-style: normal;
}
.notice-stats em.down {
  color: #e22;
}
.notice-filters {
  min-height: 75px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 24px;
  margin: 13px 0;
  background: #fff;
  border: 1px solid #d9e3ed;
  border-radius: 5px;
  font-size: 12px;
}
.notice-filters label {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}
.notice-filters select,
.notice-filters input {
  height: 38px;
  border: 1px solid #d1ddea;
  border-radius: 4px;
  background: #fff;
  padding: 0 12px;
}
.notice-filters select {
  width: 150px;
}
.date-range {
  display: flex;
  align-items: center;
  width: 272px;
  height: 38px;
  border: 1px solid #d1ddea;
  border-radius: 4px;
}
.date-range input {
  width: 120px;
  border: 0;
}
.date-range b {
  font-weight: 400;
}
.filter-error {
  position: absolute;
  left: 68px;
  top: 41px;
  color: #c62828;
}
.notice-filters button {
  height: 39px;
  padding: 0 18px;
  border: 0;
  color: #fff;
  background: #0060a6;
  border-radius: 4px;
  white-space: nowrap;
}
.notice-filters button:disabled {
  color: #8996a6;
  background: #e7ebf0;
}
.notice-table {
  background: #fff;
  border: 1px solid #d9e3ed;
  border-radius: 5px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  height: 52px;
  color: #28405f;
  font-size: 14px;
  text-align: left;
}
th:first-child {
  padding-left: 24px;
}
th:nth-child(2) {
  width: 170px;
}
th:nth-child(3) {
  width: 110px;
}
th:nth-child(4) {
  width: 135px;
}
td {
  height: 74px;
  border-top: 1px solid #e1e8ef;
  font-size: 14px;
}
td:first-child {
  display: grid;
  grid-template-columns: 12px 92px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  padding: 10px 24px;
}
td i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
td i.red {
  background: #e43c3c;
}
td i.green {
  background: #07944a;
}
td i.orange {
  background: #ff6d00;
}
td i.purple {
  background: #7333dd;
}
td i.blue {
  background: #0060a6;
}
td mark {
  justify-self: start;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
}
td mark.red {
  color: #e23a3a;
  background: #ffeaea;
}
td mark.green {
  color: #0a9149;
  background: #e6f8ee;
}
td mark.orange {
  color: #f16400;
  background: #fff0e5;
}
td mark.purple {
  color: #6d2ee0;
  background: #f0e9ff;
}
td mark.blue {
  color: #0060a6;
  background: #e7f2ff;
}
td strong {
  display: block;
  font-size: 14px;
  line-height: 1.45;
}
td p {
  margin: 4px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #526985;
  font-size: 13px;
  line-height: 1.55;
}
td time {
  color: #34506f;
}
td > span {
  color: #5f7086;
}
td > span.unread {
  color: #0060a6;
}
td > span.unread::before {
  content: "";
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 7px;
  background: #0060a6;
  border-radius: 50%;
}
td a,
td button {
  color: #0060a6;
  background: none;
  border: 0;
  font: inherit;
}
.notice-table footer {
  min-height: 66px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 19px;
  font-size: 13px;
}
.notice-table footer > span {
  margin-right: auto;
}
.notice-table footer select,
.notice-table footer input {
  height: 34px;
  border: 1px solid #d3dfea;
  background: #fff;
}
.notice-table footer nav {
  display: flex;
  gap: 7px;
}
.notice-table footer button {
  width: 31px;
  height: 31px;
  border: 1px solid #d3dfea;
  background: #fff;
  border-radius: 4px;
}
.notice-table footer button[aria-current="page"] {
  color: #fff;
  background: #0060a6;
}
.notice-table footer input {
  width: 40px;
  text-align: center;
}
.notice-empty,
.notice-state {
  min-height: 300px;
  display: grid;
  place-content: center;
  justify-items: center;
  text-align: center;
}
.notice-empty h2,
.notice-state h1 {
  margin: 0 0 8px;
  font-size: 20px;
}
.notice-empty p,
.notice-state p {
  color: #66798f;
}
.notice-empty button,
.notice-state button,
.notice-state a {
  min-height: 38px;
  padding: 0 18px;
  display: inline-grid;
  place-items: center;
  color: #fff;
  background: #0060a6;
  border: 0;
  border-radius: 4px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid #ff9f1a;
  outline-offset: 2px;
}
@media (max-width: 1360px) {
  .notice-filters {
    height: auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding-block: 12px;
  }
  .notice-filters label {
    min-width: 0;
  }
  .notice-filters select,
  .notice-filters .date-range {
    width: auto;
    flex: 1;
    min-width: 0;
  }
  .notice-filters .date-range input {
    min-width: 0;
  }
}
@media (max-width: 1100px) {
  .notice-table {
    overflow-x: auto;
  }
  .notice-table table,
  .notice-table footer {
    min-width: 1050px;
  }
}
@media (max-width: 760px) {
  .announcements-page {
    padding: 12px;
  }
  .notice-stats {
    grid-template-columns: 1fr;
  }
}
.announcements-page {
  padding: 47px 26px 15px 39px;
}
.announcements-page > header {
  min-height: 78px;
  height: auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 18px;
}
.announcements-page > header > div {
  min-width: 0;
}
.announcements-page > header p {
  margin: 0;
  line-height: 1.65;
}
.publish-notice {
  min-width: 104px;
  height: 38px;
  display: grid;
  place-items: center;
  padding: 0 18px;
  color: #fff;
  background: #0060a6;
  border: 1px solid #0060a6;
  border-radius: 4px;
  font-size: 13px;
}
.publish-notice:hover {
  background: #052e5b;
}
</style>
