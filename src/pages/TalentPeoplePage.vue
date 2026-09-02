<script setup>
// Reference SHA-256: 3F38FEA2909904F070F5CFBF4FB110337856035CE5774519545689776FD4C558
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { PEOPLE_FIXTURES } from '../fixtures/mock-data.js';
import { createTalentController } from '../state/interaction-controllers.js';
import PaginationControl from '../components/PaginationControl.vue';
import { mapRemoteTalentPerson } from '../integration/talent-read-model.js';

const props=defineProps({
  integrationData:{type:Object,default:null},
  integrationState:{type:String,default:'mock'}
});

const controller = createTalentController(PEOPLE_FIXTURES);
const queryDraft = ref('');
const dialogRef = ref(null);
const closeButtonRef = ref(null);
const resultTitleRef = ref(null);
let opener = null;
let drawerScrollTop = 0;
const filteredPeople = computed(() => controller.results);
const pagedPeople = computed(() => controller.pagedResults);
const selectedPerson = computed(() => controller.selected);
const remoteMode=computed(()=>Boolean(props.integrationData?.['TAL-001']));
const remoteFacets=computed(()=>props.integrationData?.['TAL-005']);
const departments = computed(() => remoteFacets.value?.departments?.map(item=>item.name).filter(Boolean)||[...new Set(controller.fixtures.map(person => person.department))]);
const domains = computed(() => remoteFacets.value?.specialties?.map(item=>item.name).filter(Boolean)||[...new Set(controller.fixtures.map(person => person.domain))]);
const offices = computed(() => [...new Set(controller.fixtures.map(person => person.office).filter(value=>value&&value!=='—'))]);

watch(()=>props.integrationData?.['TAL-001']?.items,rows=>{
  controller.fixtures=Array.isArray(rows)?rows.map(mapRemoteTalentPerson):[...PEOPLE_FIXTURES];
  controller.page=1;controller.selectedId=null;
},{immediate:true});

function updateDrawerQuery(id,mode='replace') {
  const next = new URL(window.location.href);
  id ? next.searchParams.set('drawer', id) : next.searchParams.delete('drawer');
  const state=id?{...window.history.state,xltTalentDrawer:id}:{...window.history.state,xltTalentDrawer:undefined};
  if(mode==='push')window.history.pushState(state, '', `${next.pathname}${next.search}`);
  else window.history.replaceState(state, '', `${next.pathname}${next.search}`);
}
function setBackgroundInert(value){
  document.querySelectorAll('.topbar,.sidebar').forEach(node=>{node.inert=value;});
}
async function focusDrawer(){await nextTick();closeButtonRef.value?.focus();}
async function restoreDrawerOrigin(){
  await nextTick();
  const main=document.getElementById('main-content');if(main)main.scrollTop=drawerScrollTop;
  if(opener?.isConnected)opener.focus();else resultTitleRef.value?.focus();
}
async function openDetail(person, event) {
  opener = event?.currentTarget || null;
  drawerScrollTop=document.getElementById('main-content')?.scrollTop||0;
  controller.open(person.id);
  updateDrawerQuery(person.id,'push');
  setBackgroundInert(true);
  await focusDrawer();
}
async function closeDetail() {
  if(window.history.state?.xltTalentDrawer===controller.selectedId&&window.history.length>1){window.history.back();return;}
  updateDrawerQuery('');controller.close();setBackgroundInert(false);await restoreDrawerOrigin();
}
function submitSearch() { controller.setFilter('query', queryDraft.value); }
function setFilter(key, value) { controller.setFilter(key, value); }
function resetFilters() { queryDraft.value = ''; controller.reset(); updateDrawerQuery(''); }
async function syncDrawer() {
  const id = new URLSearchParams(window.location.search).get('drawer');
  if (id) {controller.open(id);setBackgroundInert(true);await focusDrawer();}
  else {const wasOpen=controller.drawerOpen;controller.close();setBackgroundInert(false);if(wasOpen)await restoreDrawerOrigin();}
}
function trapFocus(event) {
  if (event.key !== 'Tab' || !dialogRef.value) return;
  const focusable = [...dialogRef.value.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])')].filter(node => !node.disabled);
  if (!focusable.length) return;
  const first = focusable[0]; const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
onMounted(() => { syncDrawer(); window.addEventListener('popstate', syncDrawer); });
onBeforeUnmount(() => {window.removeEventListener('popstate', syncDrawer);setBackgroundInert(false);});
</script>
<template><article class="talent-people" aria-labelledby="talent-title" @keydown.esc="controller.drawerOpen && closeDetail()"><p class="sr-only" aria-live="polite">{{ controller.announcement }}</p><p class="sr-only">支持按轮岗计划-开始时间和轮岗计划-结束时间筛选，日期条件由后端字段合同保留。</p><nav :inert="controller.drawerOpen">人才管理　/　人才库</nav><div class="talent-body" :class="{ 'drawer-open': controller.drawerOpen }"><main :inert="controller.drawerOpen"><header><div><h1 id="talent-title">人才库</h1><p>查看和管理组织内的人才信息，支持人才检索和筛选。<span v-if="remoteMode">数据来自飞书多维表格。</span></p></div><button type="button" disabled title="新增人才写接口尚未启用">+ 新增人才</button></header><form @submit.prevent="submitSearch" @reset.prevent="resetFilters"><label class="search-label"><span class="sr-only">人才搜索</span><input v-model="queryDraft" aria-label="搜索人才" placeholder="请输入员工姓名、工号或关键词"/></label><label>所属部门：<select :value="controller.filters.department" @change="setFilter('department',$event.target.value)"><option value="">全部</option><option v-for="value in departments" :key="value">{{ value }}</option></select></label><label>领域/专业：<select :value="controller.filters.domain" @change="setFilter('domain',$event.target.value)"><option value="">全部</option><option v-for="value in domains" :key="value">{{ value }}</option></select></label><label>责任科室：<select :value="controller.filters.office" @change="setFilter('office',$event.target.value)"><option value="">全部</option><option v-for="value in offices" :key="value">{{ value }}</option></select></label><label>本期是否在库：<select :value="controller.filters.inPool" @change="setFilter('inPool',$event.target.value)"><option value="">全部</option><option>是</option><option>否</option></select></label><button type="reset">重置</button><button type="button" disabled title="导出写接口尚未启用">导出</button></form><section aria-labelledby="talent-result-title"><h2 id="talent-result-title" ref="resultTitleRef" class="sr-only" tabindex="-1">人才查询结果，共 {{ controller.results.length }} 条</h2><table><caption class="sr-only">人才库查询结果</caption><thead><tr><th scope="col">员工姓名</th><th scope="col">工号</th><th scope="col">人才状态</th><th scope="col">人员类型</th><th scope="col">人才等级</th><th scope="col">所属部门</th><th scope="col">擅长领域</th><th scope="col">操作</th></tr></thead><tbody><tr v-for="person in pagedPeople" :key="person.id" tabindex="0" :aria-selected="controller.selectedId === person.id" @click="openDetail(person,$event)" @keydown.enter.prevent="openDetail(person,$event)"><td>{{ person.name }}</td><td>{{ person.employeeNo||'—' }}</td><td>{{ person.status||person.inPool }}</td><td>{{ person.type }}</td><td>{{ person.level||'—' }}</td><td>{{ person.department }}</td><td>{{ person.domain }}</td><td><button type="button" @click.stop="openDetail(person,$event)">查看详情</button></td></tr></tbody></table><p v-if="!controller.results.length" class="talent-empty" role="status">暂无符合条件的人才</p><PaginationControl :total="controller.results.length" :page="controller.page" :page-size="controller.pageSize" label="人才库分页" @update:page="controller.setPage" @update:page-size="controller.setPageSize" /></section></main><aside v-if="selectedPerson" id="drawer" ref="dialogRef" role="dialog" aria-modal="true" aria-labelledby="talent-detail-title" @keydown="trapFocus"><header><h2 id="talent-detail-title">人才详情：{{ selectedPerson.name }}</h2><button ref="closeButtonRef" class="close-icon" type="button" aria-label="关闭人才详情" @click="closeDetail"><span class="sr-only">关闭</span></button></header><h3>基本信息</h3><dl><div><dt>员工姓名：</dt><dd>{{ selectedPerson.name }}</dd></div><div><dt>工号：</dt><dd>{{ selectedPerson.employeeNo||'—' }}</dd></div><div><dt>人才状态：</dt><dd>{{ selectedPerson.status||selectedPerson.inPool }}</dd></div><div><dt>人员类型：</dt><dd>{{ selectedPerson.type }}</dd></div><div><dt>人才等级：</dt><dd>{{ selectedPerson.level||'—' }}</dd></div><div><dt>所属部门：</dt><dd>{{ selectedPerson.department }}</dd></div><div><dt>擅长领域：</dt><dd><mark v-for="tag in selectedPerson.specialties||[]" :key="tag">{{ tag }}</mark><span v-if="!selectedPerson.specialties?.length">—</span></dd></div></dl><footer><button type="button" @click="closeDetail">关闭</button></footer></aside></div></article></template>
<style scoped>.talent-people{padding:12px 18px;color:#17304f}.talent-people>nav{height:18px;font-size:10px}.talent-body{display:grid;grid-template-columns:minmax(0,1fr);gap:15px;margin-top:10px}.talent-body.drawer-open{grid-template-columns:minmax(0,1fr) 275px}.talent-body>main{padding:16px 12px;background:#fff;border:1px solid #dce5ef;border-radius:4px}.talent-body main>header{height:66px;display:flex;justify-content:space-between}.talent-body h1{margin:0;font-size:23px;line-height:30px}.talent-body header p{margin:4px 0 0;color:#5f7189;font-size:10px}.talent-body main>header button{width:81px;height:30px;padding:0;color:#fff;background:#0870e8;border:0;border-radius:3px;font-size:10px}.talent-body main>header button:disabled{color:#8794a4;background:#e8ebef;cursor:not-allowed}.talent-body form{height:46px;display:grid;grid-template-columns:215px 128px 146px 132px 177px 60px 60px;align-items:start;justify-content:space-between;gap:8px;margin:12px 0 0}.talent-body form input,.talent-body form select,.talent-body form button{height:30px;min-width:0;padding:0 9px;border:1px solid #d8e2ec;border-radius:3px;background:#fff;color:#405675;font-size:9px}.talent-body form input::placeholder{color:#8597ae}.talent-body form label{min-width:0;display:flex;gap:4px;align-items:center;color:#334a68;font-size:8px;white-space:nowrap}.talent-body form select{flex:1;padding-inline:5px}.talent-body form button:last-child{color:#8794a4;background:#f2f4f6}.talent-body table{width:100%;table-layout:auto;border-collapse:collapse;font-size:10px}.talent-body th,.talent-body td{height:52px;padding:0 7px;border-bottom:1px solid #e1e8ef;text-align:left;white-space:nowrap}.talent-body th{height:46px;background:#f5f7fa}.talent-body tbody tr[aria-selected=true]{background:#eef5ff}.talent-body td button{color:#0870e8;background:transparent;border:0}.talent-body section>footer{height:52px;display:flex;align-items:center;justify-content:space-between;padding:8px 14px}.talent-body footer button{height:30px;border:1px solid #d8e2ec;background:#fff}.talent-body footer button[aria-current=page]{color:#fff;background:#0870e8}.talent-body>aside{padding:0 17px;background:#fff;border:1px solid #dce5ef;border-radius:4px}.talent-body>aside header{height:36px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e4eaf1}.talent-body>aside h2{font-size:15px}.talent-body>aside h3{font-size:11px}.talent-body>aside dl{font-size:9px}.talent-body>aside dl div{display:grid;grid-template-columns:95px 1fr;margin:10px 0}.talent-body>aside dd{margin:0}.talent-body>aside mark{margin-right:3px;color:#0870e8;background:#e9f3ff}.talent-body>aside p{font-size:9px;line-height:2}.talent-body>aside footer{position:sticky;bottom:0;padding:12px;text-align:right;background:#fff}.talent-body>aside footer button{padding:0 20px}.close-icon{width:24px;height:24px;position:relative;display:block;padding:0;background:transparent;border:0}.close-icon::before,.close-icon::after{content:'';position:absolute;left:11px;top:4px;width:1px;height:14px;background:#183150}.close-icon::before{transform:rotate(45deg)}.close-icon::after{transform:rotate(-45deg)}.talent-empty{padding:48px;text-align:center;color:#60718a}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}button:focus-visible,a:focus-visible,tr:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:1200px){.talent-body form{grid-template-columns:repeat(4,1fr);height:auto;gap:8px;margin-bottom:12px}.talent-body main>section{overflow:auto}.talent-body table{min-width:1080px}}@media(max-width:1000px){.talent-body,.talent-body.drawer-open{grid-template-columns:1fr}.talent-body form{grid-template-columns:1fr 1fr}.talent-body table{min-width:1200px}}
.talent-body table{font-size:8px}
.talent-people :is(.talent-body>main,.talent-body>aside,.talent-body form input,.talent-body form select,.talent-body form button,.talent-body th,.talent-body td,.talent-body footer button,.talent-body>aside header){border-color:#f4faff}
</style>
