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
<template><article class="talent-people" aria-labelledby="talent-title" @keydown.esc="controller.drawerOpen && closeDetail()"><p class="sr-only" aria-live="polite">{{ controller.announcement }}</p><p class="sr-only">支持按轮岗计划-开始时间和轮岗计划-结束时间筛选，日期条件由后端字段合同保留。</p><nav :inert="controller.drawerOpen">人才管理　/　人才库</nav><div class="talent-body" :class="{ 'drawer-open': controller.drawerOpen }"><main :inert="controller.drawerOpen"><header><div><h1 id="talent-title">人才库</h1><p>查看和管理组织内的人才信息，支持人才检索和筛选。<span v-if="remoteMode">数据来自飞书多维表格。</span></p></div><button type="button" disabled title="新增人才写接口尚未启用">+ 新增人才</button></header><form @submit.prevent="submitSearch" @reset.prevent="resetFilters"><label class="search-label"><span class="sr-only">人才搜索</span><input v-model="queryDraft" aria-label="搜索人才" placeholder="请输入员工姓名、工号或关键词"/></label><label>所属部门：<select :value="controller.filters.department" @change="setFilter('department',$event.target.value)"><option value="">全部</option><option v-for="value in departments" :key="value">{{ value }}</option></select></label><label>领域/专业：<select :value="controller.filters.domain" @change="setFilter('domain',$event.target.value)"><option value="">全部</option><option v-for="value in domains" :key="value">{{ value }}</option></select></label><label>责任科室：<select :value="controller.filters.office" @change="setFilter('office',$event.target.value)"><option value="">全部</option><option v-for="value in offices" :key="value">{{ value }}</option></select></label><label>本期是否在库：<select :value="controller.filters.inPool" @change="setFilter('inPool',$event.target.value)"><option value="">全部</option><option>是</option><option>否</option></select></label><button type="reset">重置</button><button type="button" disabled title="导出写接口尚未启用">导出</button></form><section aria-labelledby="talent-result-title"><h2 id="talent-result-title" ref="resultTitleRef" class="sr-only" tabindex="-1">人才查询结果，共 {{ controller.results.length }} 条</h2><div class="talent-table-scroll horizontal-scroll-region" tabindex="0" role="region" aria-label="人才库查询结果，可左右滚动"><table><caption class="sr-only">人才库查询结果</caption><thead><tr><th scope="col">员工姓名</th><th scope="col">年龄</th><th scope="col">本期是否在库</th><th scope="col">人员类型</th><th scope="col">所属部门</th><th scope="col">领域/专业</th><th scope="col">责任科室</th><th scope="col">能力标签-新</th><th scope="col">培养方向</th><th scope="col">轮岗计划-开始时间</th><th scope="col">轮岗计划-结束时间</th><th scope="col">操作</th></tr></thead><tbody><tr v-for="person in pagedPeople" :key="person.id" tabindex="0" :aria-selected="controller.selectedId === person.id" @click="openDetail(person,$event)" @keydown.enter.prevent="openDetail(person,$event)"><td>{{ person.name }}</td><td>{{ person.age }}</td><td><span class="pool-status" :class="person.inPool==='是'?'is-active':'is-inactive'">{{ person.inPool }}</span></td><td>{{ person.type }}</td><td>{{ person.department }}</td><td>{{ person.domain }}</td><td>{{ person.office }}</td><td><span class="talent-tags">{{ person.tags }}</span></td><td>{{ person.direction }}</td><td>{{ person.start }}</td><td>{{ person.end }}</td><td><button type="button" @click.stop="openDetail(person,$event)">查看详情</button></td></tr></tbody></table></div><p v-if="!controller.results.length" class="talent-empty" role="status">暂无符合条件的人才</p><PaginationControl :total="controller.results.length" :page="controller.page" :page-size="controller.pageSize" label="人才库分页" @update:page="controller.setPage" @update:page-size="controller.setPageSize" /></section></main><aside v-if="selectedPerson" id="drawer" ref="dialogRef" role="dialog" aria-modal="true" aria-labelledby="talent-detail-title" @keydown="trapFocus"><header><h2 id="talent-detail-title">人才详情：{{ selectedPerson.name }}</h2><button ref="closeButtonRef" class="close-icon" type="button" aria-label="关闭人才详情" @click="closeDetail"><span class="sr-only">关闭</span></button></header><h3>基本信息</h3><dl><div><dt>员工姓名：</dt><dd>{{ selectedPerson.name }}</dd></div><div><dt>工号：</dt><dd>{{ selectedPerson.employeeNo||'—' }}</dd></div><div><dt>人才状态：</dt><dd>{{ selectedPerson.status||selectedPerson.inPool }}</dd></div><div><dt>人员类型：</dt><dd>{{ selectedPerson.type }}</dd></div><div><dt>人才等级：</dt><dd>{{ selectedPerson.level||'—' }}</dd></div><div><dt>所属部门：</dt><dd>{{ selectedPerson.department }}</dd></div><div><dt>擅长领域：</dt><dd><mark v-for="tag in selectedPerson.specialties||[]" :key="tag">{{ tag }}</mark><span v-if="!selectedPerson.specialties?.length">—</span></dd></div></dl><footer><button type="button" @click="closeDetail">关闭</button></footer></aside></div></article></template>

<style scoped>
.talent-people {
  padding: 14px 18px;
  color: #17304f;
}
.talent-people > nav {
  min-height: 32px;
  font-size: 12px;
}
.talent-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 15px;
  margin-top: 12px;
}
.talent-body.drawer-open {
  grid-template-columns: minmax(0, 1fr) clamp(520px, 38vw, 680px);
}
.talent-body > main {
  padding: 18px;
  background: #fff;
  border: 1px solid #dce5ef;
  border-radius: 6px;
}
.talent-body main > header {
  min-height: 68px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.talent-body h1 {
  margin: 0;
  font-size: 25px;
  line-height: 32px;
}
.talent-body header p {
  margin: 5px 0 0;
  color: #5f7189;
  font-size: 13px;
}
.talent-body main > header button {
  min-width: 104px;
  height: 36px;
  padding: 0 16px;
  color: #fff;
  background: #0060a6;
  border: 0;
  border-radius: 4px;
  font-size: 13px;
}
.talent-body > main > .talent-filter {
  min-height: 70px;
  display: grid;
  grid-template-columns: minmax(260px, 1.5fr) repeat(4, minmax(160px, 1fr)) 80px 80px 80px;
  align-items: center;
  gap: 14px;
  margin: 14px 0;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #dce5ef;
  border-radius: 6px;
}
.talent-filter input,
.talent-filter select,
.talent-filter button {
  height: 42px;
  min-width: 0;
  padding: 0 9px;
  border: 1px solid #d8e2ec;
  border-radius: 4px;
  background: #fff;
  color: #405675;
  font-size: 14px;
}
.talent-filter label {
  min-width: 0;
  display: flex;
  gap: 5px;
  align-items: center;
  color: #334a68;
  font-size: 14px;
  line-height: 1.5;
  white-space: nowrap;
}
.talent-filter select {
  flex: 1;
  padding-inline: 5px;
}
.talent-filter button:last-child {
  color: #8794a4;
  background: #f2f4f6;
}
.talent-filter .search-submit {
  color: #fff;
  background: #0060a6;
  border-color: #0060a6;
  font-weight: 600;
}
.talent-table-scroll {
  overflow: auto;
}
.talent-body table {
  width: 100%;
  min-width: 1180px;
  border-collapse: collapse;
  font-size: 12px;
}
.talent-body th,
.talent-body td {
  height: 54px;
  padding: 0 9px;
  border-bottom: 1px solid #e1e8ef;
  text-align: left;
  white-space: nowrap;
}
.talent-body th {
  height: 46px;
  background: #f5f7fa;
  font-size: 12px;
}
.talent-body tbody tr[aria-selected="true"] {
  background: #eef5ff;
}
.talent-body td button {
  color: #0060a6;
  background: transparent;
  border: 0;
  font-size: 12px;
}
.talent-body main section > footer {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 4px;
}
.talent-body main section > footer button {
  height: 32px;
  border: 1px solid #d8e2ec;
  background: #fff;
}
.talent-body > aside {
  max-height: none;
  overflow: visible;
  padding: 0 18px;
  background: #fff;
  border: 1px solid #dce5ef;
  border-radius: 6px;
}
.talent-body > aside > header {
  min-height: 52px;
  position: static;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e4eaf1;
}
.talent-body > aside h2 {
  margin: 0;
  font-size: 20px;
}
.talent-body > aside h3 {
  margin: 18px 0 8px;
  font-size: 14px;
}
.talent-body > aside dl {
  font-size: 12px;
}
.talent-body > aside dl div {
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: 8px;
  margin: 12px 0;
}
.talent-body > aside dd {
  margin: 0;
}
.talent-body > aside mark {
  margin-right: 4px;
  padding: 2px 5px;
  color: #0060a6;
  background: #edf5f8;
}
.talent-body > aside > p {
  font-size: 12px;
  line-height: 1.9;
}
.talent-body > aside > footer {
  position: static;
  padding: 14px 0;
  text-align: right;
  background: #fff;
}
.talent-body > aside > footer button {
  height: 34px;
  padding: 0 22px;
}
.talent-create-form {
  display: grid !important;
  height: auto !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 16px 18px !important;
  margin: 0 !important;
  padding: 18px 0 20px;
}
.talent-create-form > p {
  grid-column: 1/-1;
  margin: 0 0 2px;
  color: #60758d;
  font-size: 14px;
  line-height: 1.7;
}
.talent-create-form label {
  min-width: 0;
  display: grid !important;
  align-content: start;
  gap: 6px !important;
  color: #314b68 !important;
  font-size: 14px !important;
  white-space: normal !important;
}
.talent-create-form label span {
  font-weight: 600;
}
.talent-create-form label b {
  margin-left: 3px;
  color: #c62828;
}
.talent-create-form :is(input, select) {
  width: 100%;
  height: 42px !important;
  padding: 0 10px !important;
  border: 1px solid #cad8e5 !important;
  border-radius: 4px;
  background: #fff;
  font-size: 14px !important;
}
.talent-create-form [aria-invalid="true"] {
  border-color: #c62828 !important;
  box-shadow: 0 0 0 2px rgba(198, 40, 40, 0.08);
}
.talent-create-form small {
  color: #c62828;
  font-size: 11px;
}
.talent-create-form footer {
  grid-column: 1/-1;
  position: static;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 0 0;
  background: #fff;
}
.talent-create-form footer button {
  height: 42px;
  padding: 0 22px;
  color: #0060a6;
  background: #fff;
  border: 1px solid #9bb3cb;
  border-radius: 4px;
  font-size: 14px;
}
.talent-create-form footer button[type="submit"] {
  color: #fff;
  background: #0060a6;
  border-color: #0060a6;
}
.talent-detail-content {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 18px 0 6px;
}
.talent-detail-content > section {
  min-width: 0;
  padding: 17px 18px;
  background: #f8fafc;
  border: 1px solid #dce5ef;
  border-radius: 6px;
}
.talent-detail-content .talent-detail-basic,
.talent-detail-content .talent-detail-projects {
  grid-column: 1 / -1;
}
.talent-detail-content h3 {
  margin: 0 0 13px;
  font-size: 16px;
  line-height: 1.45;
}
.talent-detail-content dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 22px;
  margin: 0;
  font-size: 14px;
}
.talent-detail-content dl div {
  min-height: 42px;
  grid-template-columns: 108px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin: 0;
  border-bottom: 1px solid #e3e9ef;
}
.talent-detail-content dt {
  color: #60748d;
}
.talent-detail-content dd,
.talent-detail-content p {
  color: #203b5c;
  font-size: 14px;
  line-height: 1.75;
}
.talent-detail-content p {
  margin: 0;
}
.talent-body > aside h2 {
  font-size: 22px !important;
  line-height: 1.4;
}
.talent-detail-content h3 {
  font-size: 17px !important;
  line-height: 1.5;
}
.talent-detail-content dl {
  font-size: 15px !important;
}
.talent-detail-content :is(dt, dd, p) {
  font-size: 15px !important;
  line-height: 1.7;
}
.talent-detail-content mark {
  font-size: 14px !important;
  line-height: 1.5;
}
.talent-detail-content dl div {
  min-height: 48px;
}
.talent-create-form > p,
.talent-create-form label,
.talent-create-form :is(input, select, button) {
  font-size: 15px !important;
  line-height: 1.55;
}
.talent-body > aside > footer button {
  min-width: 96px;
  height: 40px;
  color: #fff;
  background: #0060a6;
  border: 1px solid #0060a6;
  border-radius: 4px;
  font-size: 14px;
}
.close-icon {
  width: 28px;
  height: 28px;
  position: relative;
  display: block;
  padding: 0;
  background: transparent;
  border: 0;
}
.close-icon::before,
.close-icon::after {
  content: "";
  position: absolute;
  left: 13px;
  top: 5px;
  width: 1px;
  height: 17px;
  background: #183150;
}
.close-icon::before {
  transform: rotate(45deg);
}
.close-icon::after {
  transform: rotate(-45deg);
}
.talent-empty {
  padding: 48px;
  text-align: center;
  color: #60718a;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
button:focus-visible,
a:focus-visible,
tr:focus-visible {
  outline: 3px solid #ff9f1a;
  outline-offset: 2px;
}
@media (max-width: 1600px) {
  .talent-body > main > .talent-filter {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .talent-filter .search-label {
    grid-column: span 2;
  }
  .talent-body table {
    min-width: 1180px;
  }
}
@media (max-width: 1400px) {
  .talent-detail-content {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 1180px) {
  .talent-body,
  .talent-body.drawer-open {
    grid-template-columns: 1fr;
  }
  .talent-body > aside {
    max-height: none;
  }
  .talent-body > main > .talent-filter {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 640px) {
  .talent-body > main > .talent-filter,
  .talent-create-form {
    grid-template-columns: 1fr !important;
  }
  .talent-create-form > p,
  .talent-create-form footer {
    grid-column: 1;
  }
  .talent-body main > header {
    align-items: flex-start;
  }
  .talent-body main > header button {
    min-width: 96px;
  }
  .talent-detail-content,
  .talent-detail-content dl {
    grid-template-columns: 1fr;
  }
}
.talent-people
  :is(
    .talent-body > main,
    .talent-body > aside,
    .talent-body form input,
    .talent-body form select,
    .talent-body form button,
    .talent-body th,
    .talent-body td,
    .talent-body footer button,
    .talent-body > aside header
  ) {
  border-color: #f4faff;
}
</style>
