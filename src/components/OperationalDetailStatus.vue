<script setup>
import { onMounted, ref } from 'vue';
const props=defineProps({operationExecutor:{type:Function,default:null}});
const archive=ref(null);
const exportTask=ref(null);
const status=ref('idle');
onMounted(async()=>{
  if(!props.operationExecutor)return;
  const query=new URLSearchParams(window.location.search);
  const archiveTaskId=query.get('archiveTaskId');
  const exportId=query.get('exportId');
  if(!archiveTaskId&&!exportId)return;
  status.value='loading';
  const requests=[];
  if(archiveTaskId)requests.push(props.operationExecutor('ARC-002',{archiveTaskId}).then(response=>{archive.value=response.data;}));
  if(exportId)requests.push(props.operationExecutor('COM-010',{exportId}).then(response=>{exportTask.value=response.data;}));
  const settled=await Promise.allSettled(requests);
  status.value=settled.some(item=>item.status==='rejected')?'partial':'normal';
});
</script>

<template>
  <section v-if="status!=='idle'" class="operation-status" aria-labelledby="operation-status-title"><h2 id="operation-status-title">任务执行详情</h2><p v-if="status==='loading'" role="status">正在读取任务详情…</p><p v-else-if="status==='partial'&&!archive&&!exportTask" role="alert">任务详情暂时无法读取</p><dl v-if="archive"><div><dt>归档任务</dt><dd>{{ archive.archiveTaskId }}</dd></div><div><dt>状态 / 阶段</dt><dd>{{ archive.status }} / {{ archive.stage }}</dd></div><div><dt>处理进度</dt><dd>{{ archive.archivedCount }} / {{ archive.sourceCount }}</dd></div><div><dt>失败数</dt><dd>{{ archive.failedCount }}</dd></div></dl><dl v-if="exportTask"><div><dt>导出任务</dt><dd>{{ exportTask.exportId }}</dd></div><div><dt>状态</dt><dd>{{ exportTask.status }}</dd></div><div><dt>进度</dt><dd>{{ exportTask.progress }}%</dd></div><div><dt>已处理</dt><dd>{{ exportTask.processedRows }} / {{ exportTask.totalRows }}</dd></div></dl></section>
</template>

<style scoped>
.operation-status{margin:12px 24px 24px;padding:18px;color:#17385f;background:#fff;border:1px solid #dce5ef;border-radius:7px}.operation-status h2{margin:0 0 14px;color:#0870e8;font-size:16px}.operation-status dl{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 10px}.operation-status dl:last-child{margin-bottom:0}.operation-status dl div{padding:12px;background:#f7f9fc;border-radius:4px}.operation-status dt{color:#71849d;font-size:9px}.operation-status dd{margin:7px 0 0;font-size:12px}@media(max-width:900px){.operation-status dl{grid-template-columns:1fr 1fr}}
</style>
