<script setup>
// Reference SHA-256: 1C66525AC285F0825E52CEB928093EB0CA7A412C4B526B51E181A5A16BC732C3
import { computed, watch } from 'vue';
import PaginationControl from '../components/PaginationControl.vue';
import { PROGRESS_DOCUMENT_COLUMNS, createTalentProgressController } from '../state/talent-progress-controller.js';
const props=defineProps({integrationData:{type:Object,default:null},integrationState:{type:String,default:'loading'}});
const controller=createTalentProgressController();
const remoteMode=computed(()=>true);
const remoteState=computed(()=>props.integrationState);
const mapRemoteProgress=item=>({id:item.progressId||item.id,name:item.projectName||'—',progress:item.status||'—',date:item.updatedAt||'—',scale:'—',score:'—',stage:item.phaseName||'—',milestone:item.updatedAt||'—',domain:'—',status:item.status||'—',documents:Object.fromEntries(PROGRESS_DOCUMENT_COLUMNS.map(label=>[label,'—']))});
const pageState=computed(()=>{if(['error','timeout','rate-limited','schema-drift','security-error'].includes(remoteState.value))return 'error';if(['authentication-required','permission-denied'].includes(remoteState.value))return 'permission-denied';if(remoteState.value==='disabled')return 'disabled';if(remoteState.value==='loading')return 'loading';return controller.fixtures.length?'normal':'empty';});
watch([()=>props.integrationData,()=>props.integrationState],()=>{controller.fixtures=Array.isArray(props.integrationData?.['TAL-003']?.items)?props.integrationData['TAL-003'].items.map(mapRemoteProgress):[];controller.page=1;},{immediate:true});
const options=key=>computed(()=>[...new Set(controller.fixtures.map(project=>project[key]).filter(Boolean))]);
const progressOptions=options('progress');const domainOptions=options('domain');const stageOptions=options('stage');const statusOptions=options('status');
</script>
<template>
  <article class="progress-page" aria-labelledby="progress-title">
    <p class="sr-only" aria-live="polite">{{ controller.announcement }}</p>
    <nav class="talent-local-nav" aria-label="人才管理页面">
      <span>人才管理</span><a href="/talent/people">人才库</a><a href="/talent/projects">人才项目管理</a><a href="/talent/progress" aria-current="page">项目进度管理</a>
    </nav>
    <section v-if="pageState==='loading'" class="progress-state" role="status">正在加载项目进度的受控只读数据…</section><section v-else-if="pageState==='permission-denied'" class="progress-state" role="alert">需要完成飞书授权或获得人才只读权限后才能查看数据。</section><section v-else-if="pageState==='error'" class="progress-state" role="alert">项目进度数据暂不可用，请稍后重试。</section><section v-else-if="pageState==='disabled'" class="progress-state" role="status">人才真实读取尚未启用；正式人才写入合同尚未提供。</section><section v-else-if="pageState==='empty'" class="progress-state" role="status">当前没有可展示的真实项目进度。</section><section v-else>
      <header><h1 id="progress-title">项目进度管理</h1><p>查看和管理您所负责的所有人才培养项目的进度情况。</p></header>
      <form @submit.prevent="controller.submit" @reset.prevent="controller.reset">
        <input :value="controller.draft.query" aria-label="项目关键词" placeholder="请输入项目名称或编号" @input="controller.draft.query=$event.target.value"/>
        <label>项目进度<select :value="controller.draft.progress" @change="controller.draft.progress=$event.target.value"><option value="">全部</option><option v-for="value in progressOptions" :key="value">{{ value }}</option></select></label>
        <label>业务领域<select :value="controller.draft.domain" @change="controller.draft.domain=$event.target.value"><option value="">全部</option><option v-for="value in domainOptions" :key="value">{{ value }}</option></select></label>
        <label>当前阶段<select :value="controller.draft.stage" @change="controller.draft.stage=$event.target.value"><option value="">全部</option><option v-for="value in stageOptions" :key="value">{{ value }}</option></select></label>
        <label>项目状态<select :value="controller.draft.status" @change="controller.draft.status=$event.target.value"><option value="">全部</option><option v-for="value in statusOptions" :key="value">{{ value }}</option></select></label>
        <button type="submit">查询</button><button type="reset">重置</button><button type="button" disabled title="飞书导出接口尚未开放">导出</button>
      </form>
      <div class="progress-table horizontal-scroll-region" tabindex="0" role="region" aria-label="项目进度管理列表，可左右滚动">
        <table>
          <caption class="sr-only">项目进度管理列表</caption>
          <thead><tr><th scope="col">项目编号</th><th scope="col">项目名称</th><th scope="col">项目进度(阶段)</th><th scope="col">预计/已完成日期</th><th scope="col">规模等级</th><th scope="col">智能运营部门评分</th><th scope="col">当前项目节点</th><th scope="col">里程碑日期</th><th v-for="label in PROGRESS_DOCUMENT_COLUMNS" :key="label" scope="col">{{ label }}</th><th scope="col">操作</th></tr></thead>
          <tbody><tr v-for="project in controller.pagedResults" :key="project.id"><td>{{ project.id }}</td><td>{{ project.name }}</td><td>{{ project.progress }}</td><td>{{ project.date }}</td><td>{{ project.scale }}</td><td>{{ project.score }}</td><td>{{ project.stage }}</td><td>{{ project.milestone }}</td><td v-for="label in PROGRESS_DOCUMENT_COLUMNS" :key="label"><button v-if="project.documents[label]===1" type="button" :disabled="remoteMode" :title="remoteMode?'正式人才写入合同尚未提供':''" :aria-label="`${project.name} ${label}`" @click="controller.explainDocument(project,label)">文档</button><span v-else>{{ project.documents[label] }}</span></td><td><button type="button" :disabled="remoteMode" :title="remoteMode?'正式人才写入合同尚未提供':''" :aria-label="`查看 ${project.name} 详情`" @click="controller.explainDetail(project)">查看详情</button></td></tr></tbody>
        </table>
      </div>
      <PaginationControl :total="controller.results.length" :page="controller.page" :page-size="controller.pageSize" label="项目进度分页" @update:page="controller.setPage" @update:page-size="controller.setPageSize" />
    </section>
  </article>
</template>
<style scoped>.progress-page{padding:12px 18px;color:#17304f}.progress-page>nav{font-size:10px}.progress-page>section{margin-top:12px;padding:20px;background:#fff;border:1px solid #f4faff;border-radius:6px}.progress-page h1{margin:0;font-size:24px}.progress-page header p{margin-top:6px;font-size:10px}.progress-page form{display:grid;grid-template-columns:1.4fr repeat(4,1fr) auto auto;gap:20px;margin:28px 0}.progress-page form input,.progress-page form select,.progress-page form button{height:35px;border:1px solid #f4faff}.progress-page form label{display:flex;align-items:center;gap:5px;font-size:9px}.progress-page form button:last-child{color:#8794a4;background:#f2f4f7}.progress-table{overflow:auto;border:1px solid #f4faff}.progress-page table{width:100%;min-width:1450px;border-collapse:collapse;font-size:8px}.progress-page th,.progress-page td{height:59px;padding:0 8px;border-bottom:1px solid #f4faff;text-align:center}.progress-page th{height:58px;background:#f5f7fa}.progress-page td:nth-child(2){text-align:left;font-size:10px}.progress-page td a{color:#0060a6}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}button:focus-visible,a:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}</style>
