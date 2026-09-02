<script setup>
import { computed, nextTick, ref } from 'vue';
import { FAVORITE_FIXTURES, createFavoritesController } from '../state/content-controllers.js';
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
function submit(){controller.setFilter('query',queryDraft.value);}
function clearFilters(){queryDraft.value='';controller.resetFilters();}
const resultTitleRef=ref(null);
async function cancelFavorite(card){if(liveMode.value){controller.announcement='真实收藏取消写操作尚未开放';return;}const rows=[...controller.pagedResults];const index=rows.findIndex(item=>item.id===card.id);const fallback=rows[index+1]?.id||rows[index-1]?.id;controller.cancel(card.id);await nextTick();restoreFavoriteFocus(fallback);}
function restoreFavoriteFocus(id){const target=id&&document.querySelector(`[data-favorite-id="${id}"] .cancel-favorite`);(target||document.querySelector('.favorite-grid .cancel-favorite')||resultTitleRef.value)?.focus();}
function resetData(){queryDraft.value='';controller.resetData();}
function changePage(value){const pages=Math.max(1,Math.ceil(filteredCards.value.length/controller.pageSize));controller.page=Math.min(pages,Math.max(1,Number(value)||1));}
function changePageSize(value){controller.pageSize=[10,20,50].includes(Number(value))?Number(value):10;controller.page=1;}
async function launch(card){
  if(!props.operationExecutor||!remoteMode.value){controller.announcement=`${card.name}：当前为本地展示`;return;}
  try{
    const response=await props.operationExecutor('APP-004',{appId:card.appId||card.id,launchMode:'NEW_TAB',sourcePage:'/favorites',requestedAt:new Date().toISOString()});
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
      <article v-for="card in pagedCards" :key="card.id" :data-favorite-id="card.id"><header><AppIcon :name="card.image" :size="48" /><div><h2>{{ card.name }}</h2><mark>{{ card.type }}</mark><mark>{{ card.domain }}</mark></div><AppIcon class="heart" name="favorite-heart" :size="18" label="已收藏" /></header><p>{{ card.description }}</p><dl><div><dt>使用量</dt><dd>{{ card.usage }}</dd></div><div><dt>收藏</dt><dd>{{ card.favorites }}</dd></div><div><dt>所属部门</dt><dd>{{ card.domain||'—' }}</dd></div><div><dt>负责人</dt><dd>{{ card.owner||'—' }}</dd></div><div><dt>开发部门/单位</dt><dd>{{ card.developerDepartment||'—' }}</dd></div><div><dt>开发者</dt><dd>{{ card.developer||'—' }}</dd></div></dl><footer><button type="button" @click="launch(card)">立即使用</button><a :href="card.route" :data-session-focus="`favorite-detail-${card.id}`">查看详情</a><button class="cancel-favorite" type="button" :disabled="liveMode" :title="liveMode?'真实收藏取消写操作尚未开放':''" @click="cancelFavorite(card)">取消收藏</button></footer></article>
    </section>
    <p v-if="!filteredCards.length" class="favorite-empty" role="status">暂无符合条件的收藏应用</p><PaginationControl class="favorite-pagination" :total="filteredCards.length" :page="controller.page" :page-size="controller.pageSize" label="收藏分页" @update:page="changePage" @update:page-size="changePageSize" />
  </div>
</template>

<style scoped>
.favorites-page{min-height:calc(100vh - 79px);padding:16px 24px 21px;color:#10284a}.favorite-hero{height:105px;position:relative;display:flex;align-items:center;gap:21px;overflow:hidden;padding:0 24px;background:#fff;border:1px solid #d8e2ec;border-radius:5px}.title-icon{z-index:1}.favorite-hero div{z-index:1}.favorite-hero h1{margin:0 0 8px;font-size:24px}.favorite-hero p{font-size:12px}.favorite-hero .ocean{position:absolute;right:0;top:0;width:810px;height:104px;object-fit:cover}.favorite-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:10px}.favorite-stats article{height:139px;display:flex;align-items:center;gap:24px;padding:20px;background:#fff;border:1px solid #d8e2ec;border-radius:5px}.favorite-stats img{width:67px;height:67px}.favorite-stats div{display:grid;gap:6px}.favorite-stats strong{font-size:12px}.favorite-stats b{font-size:26px}.favorite-stats small{font-size:11px}.favorite-stats em{color:#0b984a;font-style:normal}.favorite-filters{height:55px;display:flex;align-items:center;gap:25px;padding:0 15px;margin:10px 0;background:#fff;border:1px solid #d8e2ec;border-radius:5px;font-size:11px}.favorite-filters label{display:flex;align-items:center;gap:11px;white-space:nowrap}.favorite-filters input,.favorite-filters select{height:35px;padding:0 12px;border:1px solid #d3deea;border-radius:4px;background:#fff}.favorite-filters input{width:202px}.favorite-filters select{width:180px}.favorite-filters button{height:34px;border:1px solid #d3deea;background:#fff;border-radius:4px}.favorite-filters button:last-child{margin-left:auto;border:0;color:#0870ed}.favorite-grid{display:grid;grid-template-columns:repeat(4,1fr);background:#fafcff;border:1px solid #d8e2ec;border-radius:5px;overflow:hidden}.favorite-grid>article{height:211px;padding:10px 12px 8px;border-right:1px solid #dfe7ef;border-bottom:1px solid #dfe7ef}.favorite-grid article:nth-child(4n){border-right:0}.favorite-grid article:nth-child(n+5){border-bottom:0}.favorite-grid header{display:flex;gap:12px}.favorite-grid header>img:first-child{width:48px;height:48px}.favorite-grid header div{min-width:0;flex:1}.favorite-grid h2{margin:1px 0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.favorite-grid mark{margin-right:6px;padding:2px 6px;color:#0870e9;background:#e8f2ff;border-radius:3px;font-size:9px}.favorite-grid .heart{width:18px;height:18px}.favorite-grid>article>p{height:33px;margin:8px 0;color:#536a84;font-size:10px;line-height:16px}.favorite-grid dl{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 10px;margin:0}.favorite-grid dl div{display:flex;gap:7px;min-width:0;font-size:9px}.favorite-grid dt{color:#405875}.favorite-grid dd{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.favorite-grid footer{display:flex;justify-content:space-between;margin-top:9px}.favorite-grid footer a,.favorite-grid footer button{padding:0;border:0;color:#0870e9;background:transparent;font-size:10px}.favorite-pagination{height:70px;display:flex;align-items:center;gap:19px;padding:0 16px;background:#fff;border:1px solid #d8e2ec;border-top:0}.favorite-pagination>span{margin-right:auto;font-size:11px}.favorite-pagination select,.favorite-pagination input{height:34px;border:1px solid #d3deea;background:#fff}.favorite-pagination nav{display:flex;gap:7px}.favorite-pagination button{width:31px;height:31px;border:1px solid #d3deea;background:#fff;border-radius:4px}.favorite-pagination button[aria-current=page]{color:#fff;background:#0868dd}.favorite-pagination input{width:40px;text-align:center}button:focus-visible,a:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:1200px){.favorite-grid{grid-template-columns:repeat(2,1fr)}.favorite-grid>article{border-bottom:1px solid #dfe7ef}.favorite-filters{height:auto;flex-wrap:wrap;padding-block:10px}}@media(max-width:760px){.favorites-page{padding:12px}.favorite-stats,.favorite-grid{grid-template-columns:1fr}.favorite-hero .ocean{opacity:.45}.favorite-pagination{overflow-x:auto}}
@media(min-width:761px){.favorites-page{padding-top:33px}}
.favorite-pagination nav button:first-child,.favorite-pagination nav button:last-child{width:auto;padding:0 10px;white-space:nowrap}
.favorite-empty{margin:0;padding:50px;text-align:center;background:#fff;color:#60718a}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.favorite-grid h2{font-size:16px}.favorite-grid>article>p{font-size:11px}.favorite-grid dl div{font-size:10px}.favorite-grid footer a,.favorite-grid footer button{font-size:11px}
</style>
