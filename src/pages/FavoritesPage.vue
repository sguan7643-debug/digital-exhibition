<script setup>
import { computed, nextTick, ref } from 'vue';
import { FAVORITE_FIXTURES, createFavoritesController } from '../state/content-controllers.js';
import { APP_FIXTURES } from '../fixtures/mock-data.js';
import { routeSession } from '../state/session-store.js';
import PaginationControl from '../components/PaginationControl.vue';
import { mapRemoteApp } from '../integration/app-read-model.js';
const props=defineProps({integrationData:{type:Object,default:null},integrationState:{type:String,default:'mock'},operationExecutor:{type:Function,default:null}});
const REFERENCE_SHA256 = '9B259ED9F99029ECB68A1F2FB3EB8E745FF23692BC53CFFBD5D6A46008CEAE1A';
const remoteStats=computed(()=>props.integrationData?.['FAV-001']);
const remoteCards=computed(()=>props.integrationData?.['FAV-002']?.items?.map(item=>{
  const app=mapRemoteApp(item.resource);
  return {...app,id:item.favoriteId,appId:item.resourceId,type:app.category,tag:app.tag,favoritedAt:item.favoritedAt};
})||null);
const remoteMode=computed(()=>Array.isArray(remoteCards.value));
const liveMode=computed(()=>props.integrationState!=='mock');
const stats = computed(()=>[['收藏总数',remoteStats.value?.totalCount??'28','5','/assets/favorite-stat-total.png'],['本周新增',remoteStats.value?.weekAddedCount??'6','2','/assets/favorite-stat-new.png'],['最近使用',remoteStats.value?.recentUsedCount??'8','','/assets/favorite-stat-recent.png']]);
const controller=routeSession.controller('favorites',()=>createFavoritesController(FAVORITE_FIXTURES,routeSession));
const queryDraft=computed({get:()=>controller.queryDraft,set:value=>{controller.queryDraft=value;}});
const filteredCards=computed(()=>{
  if(!remoteMode.value)return controller.results;
  const query=String(controller.filters.query||'').trim().toLocaleLowerCase('zh-CN');
  return remoteCards.value.filter(item=>(!query||`${item.name} ${item.description}`.toLocaleLowerCase('zh-CN').includes(query))&&(!controller.filters.type||item.type===controller.filters.type)&&(!controller.filters.domain||item.domain===controller.filters.domain)&&(!controller.filters.tag||item.tag===controller.filters.tag));
});
const pagedCards=computed(()=>{const start=(controller.page-1)*controller.pageSize;return filteredCards.value.slice(start,start+controller.pageSize);});
const types=computed(()=>[...new Set((remoteCards.value||FAVORITE_FIXTURES).map(item=>item.type).filter(Boolean))]);
const domains=computed(()=>[...new Set((remoteCards.value||FAVORITE_FIXTURES).map(item=>item.domain).filter(Boolean))]);
const departmentByRoute=new Map(APP_FIXTURES.map((app) => [app.route, app.department]));
function submit(){controller.setFilter('query',queryDraft.value);}
function clearFilters(){queryDraft.value='';controller.resetFilters();}
const resultTitleRef=ref(null);
async function cancelFavorite(card){if(liveMode.value){controller.announcement='真实收藏取消写操作尚未开放';return;}const rows=[...controller.pagedResults];const index=rows.findIndex(item=>item.id===card.id);const fallback=rows[index+1]?.id||rows[index-1]?.id;controller.cancel(card.id);await nextTick();restoreFavoriteFocus(fallback);}
function restoreFavoriteFocus(id){const target=id&&document.querySelector(`[data-favorite-id="${id}"] .cancel-favorite`);(target||document.querySelector('.favorite-grid .cancel-favorite')||resultTitleRef.value)?.focus();}
function resetData(){queryDraft.value='';controller.resetData();}
function changePage(value){const pages=Math.max(1,Math.ceil(filteredCards.value.length/controller.pageSize));controller.setPage(Math.min(pages,Math.max(1,Number(value)||1)));}
function changePageSize(value){controller.setPageSize([10,20,50].includes(Number(value))?Number(value):10);}
async function launch(card){
  if(!props.operationExecutor||!remoteMode.value){controller.announcement=`${card.name}：当前为本地展示`;return;}
  try{
    const response=await props.operationExecutor('APP-004',{appId:card.appId||card.id,launchMode:'NEW_TAB',sourcePage:'/favorites',requestedAt:'2026-09-03T00:00:00.000Z'});
    if(response.data.allowed&&response.data.launchUrl)window.open(response.data.launchUrl,'_blank','noopener,noreferrer');
    else controller.announcement=response.data.reasonMessage||'当前应用不可启动';
  }catch(error){controller.announcement=error.status===401?'请先登录飞书':error.message||'应用启动失败';}
}
</script>

<template>
  <div class="favorites-page" :data-reference-sha="REFERENCE_SHA256"><p class="sr-only" aria-live="polite">{{ controller.announcement }}</p>
    <section class="favorite-hero"><AppIcon class="title-icon" name="favorite-title" :size="59" /><div><h1>我的收藏</h1><p>集中管理您收藏的应用，快速访问常用业务应用</p></div><img class="ocean" src="/assets/favorite-hero.png" width="810" height="104" alt="海上钻井平台与船舶插图" /></section>
    <section class="favorite-stats" aria-label="收藏数据概览"><article v-for="([label,total,increase,icon]) in stats" :key="label"><AppIcon :name="icon" :size="67" /><div><strong>{{ label }}</strong><b>{{ remoteMode?total:(label==='收藏总数'?controller.activeCount:total) }}</b><small v-if="remoteMode">来自飞书当前用户收藏</small><small v-else-if="increase">较上周　<em>↑ {{ increase }}</em></small><small v-else>近7天使用的收藏应用</small></div></article></section>
    <form class="favorite-filters" aria-label="收藏筛选" @submit.prevent="submit" @reset.prevent="clearFilters"><label>应用名称关键词 <input v-model="queryDraft" type="search" placeholder="请输入应用名称" /></label><label>应用类型 <select :value="controller.filters.type" @change="controller.setFilter('type',$event.target.value)"><option value="">全部类型</option><option v-for="value in types" :key="value">{{ value }}</option></select></label><label>主题域 <select :value="controller.filters.domain" @change="controller.setFilter('domain',$event.target.value)"><option value="">全部主题域</option><option v-for="value in domains" :key="value">{{ value }}</option></select></label><label>标签 <select :value="controller.filters.tag" @change="controller.setFilter('tag',$event.target.value)"><option value="">全部标签</option><option v-for="value in domains" :key="value">{{ value }}</option></select></label><button type="button" @click="resetData">重置</button><button type="reset">清空筛选</button></form>
    <h2 ref="resultTitleRef" class="sr-only" tabindex="-1" data-state-result-heading>收藏应用列表，共 {{ controller.activeCount }} 个</h2><section class="favorite-grid" aria-label="收藏应用列表">
      <article v-for="card in pagedCards" :key="card.id" :data-favorite-id="card.id"><header><AppIcon :name="card.image" :size="48" /><div class="favorite-title-row"><h2>{{ card.name }}</h2><mark>{{ card.type }}</mark><mark>{{ card.domain }}</mark></div><AppIcon class="heart" name="favorite-heart" :size="18" label="已收藏" /></header><p>{{ card.description }}</p><dl><div><dt>使用量</dt><dd>{{ card.usage }}</dd></div><div><dt>收藏</dt><dd>{{ card.favorites }}</dd></div><div><dt>负责部门</dt><dd>{{ card.department||departmentByRoute.get(card.route)||card.domain||'—' }}</dd></div><div><dt>负责人</dt><dd>{{ card.owner||'—' }}</dd></div><div><dt>开发部门/单位</dt><dd>{{ card.developerDepartment||'—' }}</dd></div><div><dt>开发者</dt><dd>{{ card.developer||'—' }}</dd></div></dl><footer><button type="button" @click="launch(card)">立即使用</button><a class="detail-action" :href="card.route" :data-session-focus="`favorite-detail-${card.id}`">查看详情</a><button class="cancel-favorite" type="button" :disabled="liveMode" :title="liveMode?'真实收藏取消写操作尚未开放':''" @click="cancelFavorite(card)">取消收藏</button></footer></article>
    </section>
    <p v-if="!filteredCards.length" class="favorite-empty" role="status">暂无符合条件的收藏应用</p><PaginationControl class="favorite-pagination" :total="filteredCards.length" :page="controller.page" :page-size="controller.pageSize" label="收藏分页" @update:page="changePage" @update:page-size="changePageSize" />
  </div>
</template>

<style scoped>
.favorites-page {
  min-height: calc(100vh - 63px);
  overflow: visible;
  padding: 16px 18px 22px;
  color: #183150;
}
.favorites-page > header {
  min-height: 66px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.favorites-page h1 {
  margin: 0;
  color: #172843;
  line-height: 1.4;
}
.favorites-page > header p {
  margin: 2px 0 0;
  color: #60718a;
  font-size: var(--xlt-font-meta);
}
.favorite-filters {
  display: grid;
  grid-template-columns:
    minmax(270px, 1.35fr) repeat(3, minmax(180px, 1fr))
    auto auto;
  align-items: center;
  gap: 12px;
  margin: 2px 0 18px;
}
.favorite-filters label {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #172843;
  font-size: var(--xlt-font-meta);
  font-weight: 600;
  white-space: nowrap;
}
.favorite-filters input,
.favorite-filters select {
  width: 100%;
  height: 38px;
  min-width: 0;
  flex: 1;
  padding: 0 12px;
  color: #526980;
  border: 1px solid #d5e0ea;
  border-radius: 5px;
  background: #fff;
}
.favorite-filters input::placeholder {
  color: #9caaba;
  font-weight: 400;
}
.favorite-filters button {
  min-width: 66px;
  height: 38px;
  padding: 0 15px;
  color: #0060a6;
  background: #fff;
  border: 1px solid #9fb5cb;
  border-radius: 5px;
}
.favorite-filters button[type="submit"] {
  color: #fff;
  background: #0060a6;
  border-color: #0060a6;
}
.favorite-tools {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.favorite-tools strong {
  font-size: var(--xlt-font-body);
}
.favorite-tools > button {
  min-height: 32px;
  padding: 0 8px;
  color: #0060a6;
  background: transparent;
  border: 0;
}
.favorite-tools select {
  width: 154px;
  height: 36px;
  margin-left: auto;
  padding: 0 11px;
  color: #394e68;
  background: #fff;
  border: 1px solid #d5e0ea;
  border-radius: 5px;
}
.favorite-tools button[aria-pressed="true"] {
  color: #fff;
  background: #0060a6;
  border-radius: 4px;
}
.favorite-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 18px;
}
.favorite-grid > article {
  min-width: 0;
  min-height: 314px;
  display: flex;
  flex-direction: column;
  padding: 17px 18px 13px;
  background: #fff;
  border: 1px solid #dce5ef;
  border-radius: 7px;
  box-shadow: 0 2px 7px rgba(25, 58, 92, 0.04);
}
.favorite-grid header {
  min-width: 0;
  display: flex;
  gap: 14px;
}
.favorite-card-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  flex: 0 0 48px;
  color: #173b63;
  background: #f8fafc;
  border: 1px solid #dce5ed;
  border-radius: 7px;
}
.favorite-grid header > div {
  min-width: 0;
  flex: 1;
}
.favorite-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.favorite-title-row h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #192840;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.favorite-grid mark {
  flex: 0 0 auto;
  padding: 3px 6px;
  color: #0060a6;
  background: #e9f3ff;
  border-radius: 3px;
}
.favorite-type-tag {
  color: #23835d !important;
  background: #e8f7f0 !important;
}
.favorite-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
}
.favorite-grid .heart {
  color: #b79031;
  font-size: 15px;
}
.favorite-grid > article > p {
  min-height: 46px;
  margin: 12px 0 10px;
  color: #53687f;
  line-height: 1.65;
}
.favorite-grid dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin: 0;
}
.favorite-grid dl div {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
}
.favorite-grid dl .fact-wide {
  grid-column: 1 / -1;
}
.favorite-grid dt {
  flex: 0 0 auto;
  color: #62758a;
}
.favorite-grid dt::before {
  content: "·";
  margin-right: 5px;
  color: #0060a6;
  font-weight: 800;
}
.favorite-grid dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #1c3150;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.favorite-grid footer {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
  margin-top: auto;
  padding-top: 13px;
}
.favorite-grid footer a,
.favorite-grid footer button {
  min-width: 0;
  min-height: 34px;
  display: grid;
  place-items: center;
  padding: 6px 5px;
  color: #fff;
  background: #0060a6;
  border: 1px solid #0060a6;
  border-radius: 4px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  font-weight: 400;
}
.favorite-grid footer .detail-action,
.favorite-grid footer .detail-action:visited {
  color: #fff;
  background: #0060a6;
  border-color: #0060a6;
}
.favorite-grid footer .cancel-favorite {
  color: #26405f;
  background: #fff;
  border-color: #9fb4c9;
}
.favorite-grid footer .access-action:disabled {
  color: #8996a6 !important;
  background: #e8edf2 !important;
  border-color: #d9e0e7 !important;
  cursor: not-allowed;
}
.favorite-grid.list-view {
  grid-template-columns: 1fr;
}
.favorite-grid.list-view > article {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(260px, 1.2fr) minmax(220px, 1fr) minmax(330px, 1.4fr);
  align-items: center;
  gap: 18px;
}
.favorite-grid.list-view > article > p {
  min-height: 0;
  margin: 0;
}
.favorite-grid.list-view footer {
  padding-top: 0;
}
.favorite-empty {
  min-height: 360px;
  display: grid;
  place-content: center;
  justify-items: center;
  text-align: center;
  background: #fff;
  border: 1px solid #dce5ef;
  border-radius: 7px;
}
.favorite-empty h2 {
  margin: 0;
  font-size: var(--xlt-font-section);
}
.favorite-empty p {
  color: #60718a;
}
.favorite-empty button {
  height: 36px;
  padding: 0 18px;
  color: #0060a6;
  background: #fff;
  border: 1px solid #0060a6;
  border-radius: 4px;
}
.favorite-pagination {
  min-height: 58px;
  margin-top: 12px;
  padding: 8px;
  background: #fff;
  border: 1px solid #dce5ef;
  border-radius: 7px;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid #ff9f1a;
  outline-offset: 2px;
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
@media (max-width: 1360px) and (min-width: 761px) {
  .favorite-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .favorite-grid:not(.list-view) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .favorite-grid.list-view > article {
    grid-template-columns: 1fr;
  }
  .favorite-grid.list-view > article > p {
    margin: 8px 0;
  }
  .favorite-grid.list-view footer {
    padding-top: 8px;
  }
}
@media (max-width: 1000px) {
  .favorite-grid footer {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .favorites-page {
    padding: 12px;
  }
  .favorites-page > header {
    min-height: 72px;
  }
  .favorite-filters,
  .favorite-grid,
  .favorite-grid.list-view,
  .favorite-grid.list-view > article {
    grid-template-columns: 1fr;
  }
  .favorite-tools {
    flex-wrap: wrap;
  }
  .favorite-tools select {
    width: 100%;
    margin-left: 0;
  }
  .favorite-grid footer {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.favorite-grid :is(mark, p, dt, dd) {
  font-weight: 400;
}
</style>
