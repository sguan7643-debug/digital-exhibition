<script setup>
import { computed, onBeforeUnmount, onMounted, reactive } from 'vue';
import PaginationControl from '../components/PaginationControl.vue';
import TypeLineIcon from '../components/TypeLineIcon.vue';
import { routeSession } from '../state/session-store.js';
import { categoryIconName, matchesMaterialCategory, normalizeMaterialCategory } from '../state/interaction-controllers.js';

const props = defineProps({
  integrationData: { type: Object, default: null },
  integrationState: { type: String, default: 'mock' },
});
const MATERIAL_TYPES = ['指标','数据集','可视化组件','模板','报表','脚本','流程','文档','API','AI','海能work应用','EAD','其他'];
const MATERIAL_FILTERS = ['可视化','报表','RPA','数据集','指标','AI','海能work应用','EAD','其他工具'];
const MATERIAL_DOMAINS = ['生产运营','经营管理','设备管理','安全环保','物资供应链','财务管理'];
const seeds = [
  ['产量趋势分析指标','指标','生产运营','用于按年份统计油日产量与月度产量趋势的指标定义','李明','2026-08-31',1265,256],
  ['采购订单明细数据集','数据集','物资供应链','包含采购订单、到货、验收与结算环节的标准明细数据','王芳','2026-08-30',982,194],
  ['钻井日报模板','模板','生产运营','标准化钻井日报模板，支持班组快速填报与复用','张伟','2026-08-29',755,132],
  ['设备台账报表','报表','设备管理','汇总设备状态、维护记录与责任单位的台账报表','刘洋','2026-08-28',1024,210],
  ['自动对账脚本','脚本','财务管理','按规则匹配银行流水与账务凭证，输出差异清单','陈晨','2026-08-27',697,98],
  ['供应商评价指标体系','指标','物资供应链','覆盖质量、交付、价格与服务维度的评价指标集合','赵敏','2026-08-26',532,86],
  ['库存预警可视化组件','可视化组件','物资供应链','展示安全库存、呆滞库存和补货建议的状态组件','孙强','2026-08-25',421,72],
  ['安全检查流程','流程','安全环保','规范隐患登记、整改、复核与闭环管理的流程文件','周强','2026-08-24',389,65],
  ['油气田基础数据API','API','生产运营','提供井、区块和产量等基础数据的受控查询接口','吴迪','2026-08-23',312,54],
  ['Excel批量处理模板','模板','经营管理','用于日常数据去重、字段校验与汇总的批量处理模板','张三丰','2026-08-22',286,49],
  ['通用数据清洗规则库','数据集','经营管理','沉淀缺失值、重复值与格式一致性校验规则','李明','2026-08-21',271,46],
  ['文档格式转换组件','可视化组件','经营管理','支持常用办公文档格式转换、预览与归档','王芳','2026-08-20',249,41]
];
const creators=['李明','王芳','张伟','刘洋','陈晨','赵敏','孙强','周强','吴迪','张三丰','杨帆','马宁'];
const usageLabels=['标准模板','质量校验规则','分析口径','共享清单','操作指引','数据字典'];
const generated = Array.from({ length: 116 }, (_, index) => {
  const type = MATERIAL_TYPES[index % MATERIAL_TYPES.length];
  const domain = MATERIAL_DOMAINS[index % MATERIAL_DOMAINS.length];
  const label=usageLabels[index%usageLabels.length];
  const batch=Math.floor(index/MATERIAL_TYPES.length)+1;
  return [`${domain}${type}${label}${batch>1?`（${batch}）`:''}`,type,domain,`面向${domain}场景的${type}${label}，包含适用范围、字段口径和更新说明`,creators[index%creators.length],`2026-${String(8-(index%3)).padStart(2,'0')}-${String(28-(index%20)).padStart(2,'0')}`,280+index*11,32+index*3];
});
const materials = Object.freeze([...seeds,...generated].map(([name,type,domain,description,creator,updatedAt,downloads,favorites],index) => Object.freeze({
  id:`material-${String(index+1).padStart(3,'0')}`, name,type,domain,description,creator,updatedAt,downloads,favorites
})));

const controller = routeSession.controller('materials', () => reactive({
  queryDraft:'', filters:{ query:'', type:'', domain:'' }, sort:'default', view:'grid', page:1, pageSize:12, announcement:'', favoriteIds:[]
}));
const remoteMode = computed(() => props.integrationState !== 'mock');
const remoteState = computed(() => props.integrationState);
const remoteFacets = computed(() => props.integrationData?.['MAT-001'] || {});
const remoteMaterials = computed(() => {
  const facets = remoteFacets.value;
  if (remoteState.value === 'error' || remoteState.value === 'authentication-required' || remoteState.value === 'empty') return [];
  const typeRows = Array.isArray(facets.materialTypes) ? facets.materialTypes : [];
  const categoryRows = Array.isArray(facets.categories) ? facets.categories : [];
  return typeRows.map((item, index) => {
    const category = categoryRows[index] || {};
    const name = String(item.name || item.label || item.code || category.categoryName || category.categoryCode || '素材分类');
    const domain = String(category.categoryName || category.categoryCode || item.domainName || '权威素材');
    const count = Number(item.count || category.count || 0);
    return Object.freeze({
      id: `remote-material-${String(item.code || category.categoryCode || index + 1)}`,
      name,
      type: name,
      domain,
      description: `${name} 来自 MAT-001 权威素材分类与类型投影，当前共有 ${count} 条可见记录`,
      creator: '飞书多维表格',
      updatedAt: '实时同步',
      downloads: count,
      favorites: 0
    });
  });
});
const displayedMaterials = computed(() => remoteMode.value ? remoteMaterials.value : materials);
const types = computed(() => remoteMode.value
  ? [...new Set(displayedMaterials.value.map(item => item.type).filter(Boolean))]
  : MATERIAL_FILTERS);
const domains = computed(() => remoteMode.value
  ? [...new Set(displayedMaterials.value.map(item => item.domain).filter(Boolean))]
  : MATERIAL_DOMAINS);
const filteredMaterials = computed(() => {
  const query = controller.filters.query.trim().toLocaleLowerCase('zh-CN');
  const rows = displayedMaterials.value.filter(item =>
    matchesMaterialCategory(item, controller.filters.type) &&
    (!controller.filters.domain || item.domain === controller.filters.domain) &&
    (!query || `${item.name} ${item.description} ${item.creator}`.toLocaleLowerCase('zh-CN').includes(query))
  );
  if (controller.sort === 'downloads-desc') return [...rows].sort((a,b) => b.downloads-a.downloads);
  if (controller.sort === 'favorites-desc') return [...rows].sort((a,b) => b.favorites-a.favorites);
  if (controller.sort === 'updated-desc') return [...rows].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  return rows;
});
const pagedMaterials = computed(() => {
  const start = (controller.page-1)*controller.pageSize;
  return filteredMaterials.value.slice(start,start+controller.pageSize);
});
function setFilter(key,value){controller.filters[key]=value;controller.page=1;controller.announcement=`筛选完成，共 ${filteredMaterials.value.length} 个素材`;}
function submitSearch(){setFilter('query',controller.queryDraft);}
function resetFilters(){controller.queryDraft='';Object.assign(controller.filters,{query:'',type:'',domain:''});controller.sort='default';controller.page=1;window.history.replaceState({...window.history.state},'',window.location.pathname);window.dispatchEvent(new PopStateEvent('popstate'));controller.announcement='已重置素材筛选';}
function setSort(value){controller.sort=value;controller.page=1;controller.announcement='素材排序已更新';}
function setView(value){controller.view=value;controller.announcement=`已切换为${value==='list'?'列表':'卡片'}视图`;}
function setPage(value){const total=Math.max(1,Math.ceil(filteredMaterials.value.length/controller.pageSize));controller.page=Math.min(total,Math.max(1,Number(value)||1));}
function setPageSize(value){controller.pageSize=[12,24,48].includes(Number(value))?Number(value):12;controller.page=1;}
function download(item){controller.announcement=`${item.name}：本地演示不提供真实文件下载`;}
function toggleFavorite(item){const index=controller.favoriteIds.indexOf(item.id);index>=0?controller.favoriteIds.splice(index,1):controller.favoriteIds.push(item.id);controller.announcement=index>=0?'已取消收藏':'已收藏素材';}
function syncUrl(){const query=new URLSearchParams(window.location.search);controller.queryDraft=query.get('query')||'';controller.filters.query=controller.queryDraft;controller.filters.domain=query.get('domain')||'';setFilter('type',normalizeMaterialCategory(query.get('type')||''));}
function receiveFilter(event){setFilter(event.detail.key,event.detail.value);}
onMounted(()=>{syncUrl();window.addEventListener('xlt:materials-filter',receiveFilter);window.addEventListener('popstate',syncUrl);});
onBeforeUnmount(()=>{window.removeEventListener('xlt:materials-filter',receiveFilter);window.removeEventListener('popstate',syncUrl);});
</script>

<template>
  <article class="materials-page" aria-labelledby="materials-title">
    <p class="sr-only" aria-live="polite">{{ controller.announcement }}</p>
    <header class="materials-header"><div><h1 id="materials-title">素材中心</h1><p>汇聚指标、数据集、组件与文档等数字化素材，支持统一检索和复用</p></div><button type="button" disabled title="当前本地演示未开放上传">素材上传与管理</button></header>
    <form class="materials-filter" aria-label="素材筛选" @submit.prevent="submitSearch" @reset.prevent="resetFilters">
      <label><span>素材名称或关键词</span><input v-model="controller.queryDraft" type="search" placeholder="请输入素材名称或关键词" /></label>
      <label><span>素材类型</span><select :value="controller.filters.type" @change="setFilter('type',$event.target.value)"><option value="">请选择素材类型</option><option v-for="type in types" :key="type">{{ type }}</option></select></label>
      <label><span>所属业务域</span><select :value="controller.filters.domain" @change="setFilter('domain',$event.target.value)"><option value="">请选择业务域</option><option v-for="domain in domains" :key="domain">{{ domain }}</option></select></label>
      <button type="reset">重置</button><button type="submit">查询</button>
    </form>
    <div class="materials-tools"><strong>全部素材 <b>{{ filteredMaterials.length }}</b> 个</strong><select :value="controller.sort" aria-label="素材排序" @change="setSort($event.target.value)"><option value="default">综合排序</option><option value="updated-desc">最近更新</option><option value="downloads-desc">下载量从高到低</option><option value="favorites-desc">收藏量从高到低</option></select><button type="button" aria-label="卡片视图" :aria-pressed="controller.view==='grid'" @click="setView('grid')">卡片</button><button type="button" aria-label="列表视图" :aria-pressed="controller.view==='list'" @click="setView('list')">列表</button></div>
    <section v-if="filteredMaterials.length" class="materials-grid" :class="{'list-view':controller.view==='list'}" aria-label="素材列表">
      <article v-for="item in pagedMaterials" :key="item.id">
        <header><span class="material-icon"><TypeLineIcon :name="categoryIconName(item.type)" :size="27" /></span><div><div class="material-title-row"><h2>{{ item.name }}</h2><mark>{{ item.type }}</mark><mark>{{ item.domain }}</mark></div><p>{{ item.description }}</p></div></header>
        <dl><div><dt>创建人</dt><dd>{{ item.creator }}</dd></div><div><dt>所属业务域</dt><dd>{{ item.domain }}</dd></div><div><dt>更新时间</dt><dd>{{ item.updatedAt }}</dd></div></dl>
        <footer><span>下载量　<b>{{ item.downloads.toLocaleString('zh-CN') }}</b></span><span>收藏　<b>{{ item.favorites.toLocaleString('zh-CN') }}</b></span><button type="button" @click="download(item)">下载</button><button type="button" :aria-pressed="controller.favoriteIds.includes(item.id)" :aria-label="`${controller.favoriteIds.includes(item.id)?'取消收藏':'收藏'}：${item.name}`" @click="toggleFavorite(item)">{{ controller.favoriteIds.includes(item.id)?'已收藏':'☆' }}</button></footer>
      </article>
    </section>
    <section v-else class="materials-empty" role="status"><h2>{{ remoteState === 'error' || remoteState === 'authentication-required' ? '素材中心加载失败' : '暂无符合条件的素材' }}</h2><p>{{ remoteMode ? '当前未获得 MAT-001 权威素材记录，不回退本地演示数据。' : '请调整素材类型、业务域或关键词后重试。' }}</p><button type="button" @click="resetFilters">清空筛选</button></section>
    <PaginationControl class="materials-pagination" :total="filteredMaterials.length" :page="controller.page" :page-size="controller.pageSize" :page-sizes="[12,24,48]" label="素材中心分页" @update:page="setPage" @update:page-size="setPageSize" />
  </article>
</template>

<style scoped>
.materials-page{min-height:100%;overflow:visible;padding:18px 20px 24px;color:#243b59}.materials-header{min-height:76px;display:flex;align-items:flex-start;justify-content:space-between}.materials-header h1{margin:0;color:#112b4c;font-size:26px;line-height:1.35}.materials-header p{margin:4px 0 0;color:#687b91;font-size:14px;line-height:1.65}.materials-header button{height:40px;padding:0 18px;color:#8491a0;background:#e8edf2;border:1px solid #e1e7ed;border-radius:4px;font-size:14px}.materials-filter{display:grid;grid-template-columns:minmax(280px,1.2fr) minmax(230px,1fr) minmax(230px,1fr) 72px 72px;gap:14px;align-items:center;margin:8px 0 15px}.materials-filter label{min-height:42px;display:flex;align-items:center;gap:10px;min-width:0;color:#203a5a;font-size:14px;font-weight:600;line-height:1.5;white-space:nowrap}.materials-filter input,.materials-filter select{height:42px;min-width:0;flex:1;padding:0 12px;color:#536b85;background:#fff;border:1px solid #cfdae6;border-radius:4px;font-size:14px;font-weight:400}.materials-filter button{height:42px;border:1px solid #0060a6;border-radius:4px;font-size:14px;font-weight:600}.materials-filter button[type=reset]{color:#0060a6;background:#fff}.materials-filter button[type=submit]{color:#fff;background:#0060a6}.materials-tools{min-height:42px;display:flex;align-items:center;gap:10px}.materials-tools strong{font-size:14px;line-height:1.5}.materials-tools strong b{color:#0060a6}.materials-tools select{width:150px;height:38px;margin-left:auto;padding:0 10px;color:#425974;background:#fff;border:1px solid #d2dde8;border-radius:4px;font-size:14px}.materials-tools button{height:36px;padding:0 12px;color:#49617d;background:#fff;border:1px solid #d5dfe9;border-radius:4px;font-size:14px}.materials-tools button[aria-pressed=true]{color:#fff;background:#0060a6;border-color:#0060a6}.materials-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 16px}.materials-grid>article{min-height:156px;padding:14px 15px 10px;background:#fff;border:1px solid #d7e1eb;border-radius:7px;box-shadow:0 1px 2px rgba(25,53,84,.04)}.materials-grid article>header{display:flex;gap:14px}.material-icon{width:48px;height:48px;display:grid;place-items:center;flex:0 0 48px;color:#173b63;background:#f8fafc;border:1px solid #dce5ed;border-radius:7px}.materials-grid header>div{min-width:0;flex:1}.material-title-row{display:flex;align-items:center;gap:7px;min-width:0}.materials-grid h2{min-width:0;margin:0;color:#142e50;font-size:17px;line-height:1.45;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.materials-grid mark{flex:0 0 auto;padding:3px 6px;color:#2b6a81;background:#eaf5f6;border-radius:3px;font-size:12px;line-height:1.4}.materials-grid header p{margin:8px 0 0;color:#5b7189;font-size:14px;line-height:1.65}.materials-grid dl{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;margin:13px 0 0}.materials-grid dl div{display:flex;min-width:0;gap:8px;font-size:13px;line-height:1.55}.materials-grid dl div:last-child{grid-column:1/-1}.materials-grid dt{color:#6a7c90}.materials-grid dd{margin:0;color:#263f5e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.materials-grid footer{display:flex;align-items:center;gap:17px;margin-top:12px;padding-top:10px;border-top:1px solid #edf1f5;color:#5c7189;font-size:13px;line-height:1.5}.materials-grid footer button{height:34px;padding:0 14px;color:#0060a6;background:#fff;border:1px solid #78aef4;border-radius:4px;font-size:13px}.materials-grid footer button:first-of-type{margin-left:auto}.materials-grid footer button:last-child{min-width:34px;padding:0 8px}.materials-grid footer button[aria-pressed=true]{color:#fff;background:#0060a6;border-color:#0060a6}.materials-grid.list-view{grid-template-columns:1fr}.materials-grid.list-view>article{min-height:0;display:grid;grid-template-columns:minmax(360px,1.4fr) minmax(360px,1fr) auto;gap:22px;align-items:center}.materials-grid.list-view dl{margin:0}.materials-grid.list-view footer{margin:0;padding:0;border:0}.materials-empty{min-height:360px;display:grid;place-content:center;text-align:center;background:#fff;border:1px solid #d7e1eb;border-radius:7px}.materials-empty h2{font-size:18px;line-height:1.45}.materials-empty p{color:#687b91;font-size:14px;line-height:1.65}.materials-empty button{justify-self:center;height:40px;padding:0 18px;color:#0060a6;background:#fff;border:1px solid #0060a6;border-radius:4px;font-size:14px}.materials-pagination{margin-top:6px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:1180px){.materials-filter{grid-template-columns:repeat(2,minmax(0,1fr))}.materials-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.materials-grid.list-view>article{grid-template-columns:1fr}}@media(max-width:760px){.materials-page{padding:12px}.materials-filter,.materials-grid{grid-template-columns:1fr}.materials-grid.list-view>article{display:block}.materials-header{gap:10px}}
.materials-grid>article{min-height:270px;display:flex;flex-direction:column;padding:16px 16px 12px}.materials-grid header p{min-height:46px;margin-top:8px;line-height:1.65}.materials-grid h2{font-weight:600}.materials-grid footer{margin-top:auto;padding-top:12px}.materials-grid.list-view>article{min-height:0;display:grid}@media(max-width:1360px) and (min-width:761px){.materials-filter,.materials-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:1360px) and (min-width:761px){.materials-filter label:nth-of-type(1){grid-column:1;grid-row:1}.materials-filter label:nth-of-type(2){grid-column:2;grid-row:1}.materials-filter label:nth-of-type(3){grid-column:1/-1;grid-row:2}.materials-filter button[type=reset]{grid-column:1;grid-row:3}.materials-filter button[type=submit]{grid-column:2;grid-row:3}}
</style>
