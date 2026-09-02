<script setup>
import { computed, ref } from 'vue';
import { startFeishuLogin, startSameOriginDownload } from '../integration/secure-download.js';

const props=defineProps({
  attachments:{type:Array,default:()=>[]}, fallback:{type:Array,default:()=>[]},
  integrationState:{type:String,default:'mock'}, operationExecutor:{type:Function,default:null}, caption:{type:String,default:'附件资料'}
});
const announcement=ref('');
const rows=computed(()=>props.attachments.length?props.attachments:props.fallback.map((item,index)=>({
  attachmentId:'',name:item.name||item[0]||String(item),sizeBytes:item.sizeBytes||0,uploadedAt:item.uploadedAt||'',uploadedBy:item.uploadedBy||'',fallbackSize:item.size||item[1]||'' ,index
})));
const sizeLabel=file=>file.sizeBytes?`${(file.sizeBytes/1024/1024).toFixed(2)} MB`:file.fallbackSize||'—';
async function download(file){
  if(!file.attachmentId||!props.operationExecutor||props.integrationState==='mock'){announcement.value=`${file.name}：当前仅有展示信息，暂无真实附件`;return;}
  announcement.value=`${file.name}：正在准备下载`;
  try{
    const response=await props.operationExecutor('COM-008',{fileId:file.attachmentId,mode:'DOWNLOAD',disposition:'ATTACHMENT',fileNameOverride:file.name});
    startSameOriginDownload(response.data.url,file.name);
  }catch(error){
    if(error?.status===401){startFeishuLogin();return;}
    announcement.value=`${file.name}：下载失败，请稍后重试`;
  }
}
</script>

<template>
  <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  <table class="file-list"><caption class="sr-only">{{ caption }}</caption><thead><tr><th>文件名称</th><th>文件大小</th><th>上传时间</th><th>上传人</th><th>操作</th></tr></thead><tbody><tr v-for="file in rows" :key="file.attachmentId||file.name"><td>{{ file.name }}</td><td>{{ sizeLabel(file) }}</td><td>{{ file.uploadedAt||'—' }}</td><td>{{ file.uploadedBy||'—' }}</td><td><button class="text-action" type="button" @click="download(file)">下载</button></td></tr></tbody></table>
</template>

<style scoped>
.file-list{width:100%;border-collapse:collapse;color:#17385f;font-size:10px}.file-list th,.file-list td{height:28px;padding:4px 10px;border-bottom:1px solid #e3e9f0;text-align:left}.file-list th{background:#f5f7fa}.text-action{padding:0;border:0;color:#075fc0;background:transparent}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}button:focus-visible{outline:3px solid #1b77d2;outline-offset:2px}
</style>
