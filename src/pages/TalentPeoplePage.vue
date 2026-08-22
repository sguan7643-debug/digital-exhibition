<script setup>
// Reference SHA-256: 3F38FEA2909904F070F5CFBF4FB110337856035CE5774519545689776FD4C558
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { PEOPLE_FIXTURES } from '../fixtures/mock-data.js';
import { createTalentController } from '../state/interaction-controllers.js';

const controller = createTalentController(PEOPLE_FIXTURES);
const queryDraft = ref('');
const dialogRef = ref(null);
const closeButtonRef = ref(null);
const resultTitleRef = ref(null);
let opener = null;
const filteredPeople = computed(() => controller.results);
const pagedPeople = computed(() => controller.pagedResults);
const selectedPerson = computed(() => controller.selected);
const departments = [...new Set(PEOPLE_FIXTURES.map(person => person.department))];
const domains = [...new Set(PEOPLE_FIXTURES.map(person => person.domain))];
const offices = [...new Set(PEOPLE_FIXTURES.map(person => person.office))];

function updateDrawerQuery(id) {
  const next = new URL(window.location.href);
  id ? next.searchParams.set('drawer', id) : next.searchParams.delete('drawer');
  window.history.replaceState({}, '', `${next.pathname}${next.search}`);
}
async function openDetail(person, event) {
  opener = event?.currentTarget || null;
  controller.open(person.id);
  updateDrawerQuery(person.id);
  await nextTick();
  closeButtonRef.value?.focus();
}
async function closeDetail() {
  controller.close();
  updateDrawerQuery('');
  await nextTick();
  if (opener?.isConnected) opener.focus(); else resultTitleRef.value?.focus();
}
function submitSearch() { controller.setFilter('query', queryDraft.value); }
function setFilter(key, value) { controller.setFilter(key, value); }
function resetFilters() { queryDraft.value = ''; controller.reset(); updateDrawerQuery(''); }
function syncDrawer() {
  const id = new URLSearchParams(window.location.search).get('drawer');
  if (id) controller.open(id); else controller.close();
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
onBeforeUnmount(() => window.removeEventListener('popstate', syncDrawer));
</script>
<template><article class="talent-people" aria-labelledby="talent-title" @keydown.esc="controller.drawerOpen && closeDetail()"><p class="sr-only" aria-live="polite">{{ controller.announcement }}</p><nav>人才管理　/　人才库</nav><div class="talent-body" :class="{ 'drawer-open': controller.drawerOpen }"><main :inert="controller.drawerOpen"><header><div><h1 id="talent-title">人才库</h1><p>查看和管理组织内的人才信息，支持人才检索、筛选和数据导出。</p></div><button type="button" disabled title="当前演示未开放新增人才">+ 新增人才</button></header><form @submit.prevent="submitSearch" @reset.prevent="resetFilters"><input v-model="queryDraft" placeholder="请输入员工姓名、工号或关键词"/><label>所属部门：<select :value="controller.filters.department" @change="setFilter('department',$event.target.value)"><option value="">全部</option><option v-for="value in departments" :key="value">{{ value }}</option></select></label><label>领域/专业：<select :value="controller.filters.domain" @change="setFilter('domain',$event.target.value)"><option value="">全部</option><option v-for="value in domains" :key="value">{{ value }}</option></select></label><label>责任科室：<select :value="controller.filters.office" @change="setFilter('office',$event.target.value)"><option value="">全部</option><option v-for="value in offices" :key="value">{{ value }}</option></select></label><label>本期是否在库：<select :value="controller.filters.inPool" @change="setFilter('inPool',$event.target.value)"><option value="">全部</option><option>是</option><option>否</option></select></label><button type="reset">重置</button><button type="button" disabled title="当前演示不生成导出文件">导出</button></form><section aria-labelledby="talent-result-title"><h2 id="talent-result-title" ref="resultTitleRef" class="sr-only" tabindex="-1">人才查询结果，共 {{ controller.results.length }} 条</h2><table><thead><tr><th>员工姓名</th><th>年龄</th><th>本期是否在库</th><th>人员类型</th><th>所属部门</th><th>领域/专业</th><th>责任科室</th><th>能力标签-新</th><th>培养方向</th><th>轮岗计划-开始时间</th><th>轮岗计划-结束时间</th><th>操作</th></tr></thead><tbody><tr v-for="person in pagedPeople" :key="person.id" tabindex="0" :aria-selected="controller.selectedId === person.id" @click="openDetail(person,$event)" @keydown.enter.prevent="openDetail(person,$event)"><td>{{ person.name }}</td><td>{{ person.age }}</td><td>{{ person.inPool }}</td><td>{{ person.type }}</td><td>{{ person.department }}</td><td>{{ person.domain }}</td><td>{{ person.office }}</td><td>{{ person.tags }}</td><td>{{ person.direction }}</td><td>{{ person.start }}</td><td>{{ person.end }}</td><td><button type="button" @click.stop="openDetail(person,$event)">查看详情</button></td></tr></tbody></table><p v-if="!controller.results.length" class="talent-empty" role="status">暂无符合条件的人才</p><footer>共 {{ controller.results.length }} 条 <nav aria-label="人才库分页"><button type="button" :disabled="controller.page===1" @click="controller.setPage(controller.page-1)">上一页</button><button v-for="page in controller.totalPages" :key="page" type="button" :aria-current="controller.page===page?'page':undefined" @click="controller.setPage(page)">{{ page }}</button><button type="button" :disabled="controller.page===controller.totalPages" @click="controller.setPage(controller.page+1)">下一页</button></nav></footer></section></main><aside v-if="selectedPerson" id="drawer" ref="dialogRef" role="dialog" aria-modal="true" aria-labelledby="talent-detail-title" @keydown="trapFocus"><header><h2 id="talent-detail-title">人才详情：{{ selectedPerson.name }}</h2><button ref="closeButtonRef" class="close-icon" type="button" aria-label="关闭人才详情" @click="closeDetail"><span class="sr-only">关闭</span></button></header><h3>基本信息</h3><dl><div><dt>员工姓名：</dt><dd>{{ selectedPerson.name }}</dd></div><div><dt>年龄：</dt><dd>{{ selectedPerson.age }}</dd></div><div><dt>本期是否在库：</dt><dd>{{ selectedPerson.inPool }}</dd></div><div><dt>人员类型：</dt><dd>{{ selectedPerson.type }}</dd></div><div><dt>所属部门：</dt><dd>{{ selectedPerson.department }}</dd></div><div><dt>领域/专业：</dt><dd>{{ selectedPerson.domain }}</dd></div><div><dt>责任科室：</dt><dd>{{ selectedPerson.office }}</dd></div><div><dt>能力标签-新：</dt><dd><mark v-for="tag in selectedPerson.tags.split(' ')" :key="tag">{{ tag }}</mark></dd></div><div><dt>培养方向：</dt><dd>{{ selectedPerson.direction }}</dd></div></dl><h3>轮岗计划</h3><p>{{ selectedPerson.start }}　至　{{ selectedPerson.end }}</p><h3>2026年培训计划</h3><p>AI前沿技术培训计划　<mark>已参与</mark></p><h3>参与非柔性项目情况</h3><p>海上平台智能监测项目<br/>数据中台建设项目<br/>参与项目数量：3</p><footer><button type="button" @click="closeDetail">关闭</button></footer></aside></div></article></template>
<style scoped>.talent-people{padding:12px 18px;color:#17304f}.talent-people>nav{height:18px;font-size:10px}.talent-body{display:grid;grid-template-columns:minmax(0,1fr);gap:15px;margin-top:10px}.talent-body.drawer-open{grid-template-columns:minmax(0,1fr) 275px}.talent-body>main{padding:16px 12px;background:#fff;border:1px solid #dce5ef;border-radius:4px}.talent-body main>header{height:66px;display:flex;justify-content:space-between}.talent-body h1{margin:0;font-size:23px;line-height:30px}.talent-body header p{margin:4px 0 0;color:#5f7189;font-size:10px}.talent-body main>header button{width:81px;height:30px;padding:0;color:#fff;background:#0870e8;border:0;border-radius:3px;font-size:10px}.talent-body main>header button:disabled{color:#8794a4;background:#e8ebef;cursor:not-allowed}.talent-body form{height:46px;display:grid;grid-template-columns:215px 128px 146px 132px 177px 60px 60px;align-items:start;justify-content:space-between;gap:8px;margin:12px 0 0}.talent-body form input,.talent-body form select,.talent-body form button{height:30px;min-width:0;padding:0 9px;border:1px solid #d8e2ec;border-radius:3px;background:#fff;color:#405675;font-size:9px}.talent-body form input::placeholder{color:#8597ae}.talent-body form label{min-width:0;display:flex;gap:4px;align-items:center;color:#334a68;font-size:8px;white-space:nowrap}.talent-body form select{flex:1;padding-inline:5px}.talent-body form button:last-child{color:#8794a4;background:#f2f4f6}.talent-body table{width:100%;table-layout:auto;border-collapse:collapse;font-size:10px}.talent-body th,.talent-body td{height:52px;padding:0 7px;border-bottom:1px solid #e1e8ef;text-align:left;white-space:nowrap}.talent-body th{height:46px;background:#f5f7fa}.talent-body tbody tr[aria-selected=true]{background:#eef5ff}.talent-body td button{color:#0870e8;background:transparent;border:0}.talent-body section>footer{height:52px;display:flex;align-items:center;justify-content:space-between;padding:8px 14px}.talent-body footer button{height:30px;border:1px solid #d8e2ec;background:#fff}.talent-body footer button[aria-current=page]{color:#fff;background:#0870e8}.talent-body>aside{padding:0 17px;background:#fff;border:1px solid #dce5ef;border-radius:4px}.talent-body>aside header{height:36px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e4eaf1}.talent-body>aside h2{font-size:15px}.talent-body>aside h3{font-size:11px}.talent-body>aside dl{font-size:9px}.talent-body>aside dl div{display:grid;grid-template-columns:95px 1fr;margin:10px 0}.talent-body>aside dd{margin:0}.talent-body>aside mark{margin-right:3px;color:#0870e8;background:#e9f3ff}.talent-body>aside p{font-size:9px;line-height:2}.talent-body>aside footer{position:sticky;bottom:0;padding:12px;text-align:right;background:#fff}.talent-body>aside footer button{padding:0 20px}.close-icon{width:24px;height:24px;position:relative;display:block;padding:0;background:transparent;border:0}.close-icon::before,.close-icon::after{content:'';position:absolute;left:11px;top:4px;width:1px;height:14px;background:#183150}.close-icon::before{transform:rotate(45deg)}.close-icon::after{transform:rotate(-45deg)}.talent-empty{padding:48px;text-align:center;color:#60718a}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,tr:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:1200px){.talent-body form{grid-template-columns:repeat(4,1fr);height:auto;gap:8px;margin-bottom:12px}.talent-body main>section{overflow:auto}.talent-body table{min-width:1080px}}@media(max-width:1000px){.talent-body,.talent-body.drawer-open{grid-template-columns:1fr}.talent-body form{grid-template-columns:1fr 1fr}.talent-body table{min-width:1200px}}
.talent-body table{font-size:8px}
</style>
