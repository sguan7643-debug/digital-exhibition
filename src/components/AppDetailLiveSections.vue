<script setup>
import { computed, ref } from 'vue';
import { startFeishuLogin, startSameOriginDownload } from '../integration/secure-download.js';
import { buildApplicationWriteInput, launchApplication, resolveDownloadFileId, resolveLiveApplicationId } from '../integration/application-actions.js';

const props=defineProps({
  integrationData:{type:Object,default:null}, integrationState:{type:String,default:'loading'}, operationExecutor:{type:Function,default:null},
  actionExecutor:{type:Function,default:null}, testWritesEnabled:{type:Boolean,default:false}
});
const announcement=ref('');
const testComment=ref('');
const favoriteRecord=ref(null);
const appId=computed(()=>resolveLiveApplicationId(props.integrationData));
const comments=computed(()=>props.integrationData?.['APP-007']?.items||[]);
const materials=computed(()=>props.integrationData?.['MAT-002']?.items||[]);
const attachments=computed(()=>props.integrationData?.['APP-003']?.attachments||[]);
const materialFacets=computed(()=>props.integrationData?.['MAT-001']);
const categoryLabel=material=>material.materialType||materialFacets.value?.materialTypes?.find(item=>item.value===material.materialType)?.label||'素材';
const sizeLabel=material=>material.primaryFile?.sizeBytes?`${(material.primaryFile.sizeBytes/1024/1024).toFixed(2)} MB`:'—';
async function download(material){
  if(!props.operationExecutor){announcement.value='飞书素材下载接口暂不可用';return;}
  announcement.value=`正在准备下载 ${material.name}`;
  try{
    const fileId=resolveDownloadFileId(material);
    if(!fileId){announcement.value=`${material.name} 暂无可下载文件`;return;}
    const response=await props.operationExecutor('MAT-003',{materialId:material.materialId,fileId,purpose:'USER_DOWNLOAD',sourcePage:window.location.pathname,clientOccurredAt:props.integrationData?.['APP-003']?.updatedAt||new Date().toISOString()});
    startSameOriginDownload(response.data.accessUrl,file.name);
  }catch(error){
    if(error?.status===401){startFeishuLogin();return;}
    announcement.value=`${material.name} 下载失败，请稍后重试`;
  }
}
async function downloadAttachment(file){
  if(!props.operationExecutor){announcement.value='飞书附件下载接口暂不可用';return;}
  announcement.value=`正在准备下载 ${file.name}`;
  try{
    const response=await props.operationExecutor('COM-008',{fileId:file.attachmentId,mode:'DOWNLOAD',disposition:'ATTACHMENT',fileNameOverride:file.name});
    startSameOriginDownload(response.data.url,file.name);
  }catch(error){announcement.value=`${file.name} 下载失败，请稍后重试`;}
}
async function executeTestWrite(operationId,input){
  if(!props.testWritesEnabled||!props.actionExecutor){announcement.value='测试写入通道未启用';return null;}
  announcement.value=`${operationId} 正在写入隔离测试记录`;
  try{
    const response=await props.actionExecutor(operationId,input,{confirmed:true});
    announcement.value=`${operationId} 已写入 TEST_ 记录，版本 ${response.data.version}`;
    if(operationId==='APP-008')testComment.value='';
    return response;
  }catch(error){announcement.value=`${operationId} 联调失败：${error.message||'未知错误'}`;return null;}
}
const requestUse=()=>executeTestWrite('APP-005',buildApplicationWriteInput('APP-005',appId.value,{reason:'TEST_页面申请使用'}));
const requestReuse=()=>executeTestWrite('APP-006',buildApplicationWriteInput('APP-006',appId.value,{reason:'TEST_页面申请复用'}));
const submitTestComment=()=>executeTestWrite('APP-008',buildApplicationWriteInput('APP-008',appId.value,{comment:testComment.value}));
async function toggleFavorite(){
  if(!favoriteRecord.value){
    const input=buildApplicationWriteInput('FAV-003',appId.value);
    const response=await executeTestWrite('FAV-003',input);
    if(response)favoriteRecord.value={businessKey:input.businessKey,version:response.data.version};
    return;
  }
  const input={businessKey:favoriteRecord.value.businessKey,idempotencyKey:`TEST_IDEM_APP_UNFAVORITE_${window.crypto.randomUUID()}`,ifMatch:favoriteRecord.value.version,fields:{}};
  const response=await executeTestWrite('FAV-004',input);
  if(response)favoriteRecord.value=null;
}
async function launch(){
  if(!appId.value){announcement.value='真实应用标识尚未载入';return;}
  try{const result=await launchApplication(props.operationExecutor,appId.value);announcement.value=result.message;}
  catch(error){if(error?.status===401){startFeishuLogin();return;}announcement.value=error.message||'应用启动失败';}
}
</script>

<template>
  <div class="live-detail-sections" data-live-app-detail-sections>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <section class="live-panel" aria-labelledby="live-material-title">
      <header><h2 id="live-material-title">关联素材</h2><small>飞书多维表格实时数据</small></header>
      <div v-if="materials.length" class="material-grid">
        <article v-for="material in materials" :key="material.materialId">
          <mark>{{ categoryLabel(material) }}</mark><h3>{{ material.name }}</h3><p>{{ material.summary||material.descriptionHtml||'暂无素材说明' }}</p>
          <footer><span>{{ sizeLabel(material) }}　下载 {{ material.downloadCount||0 }} 次</span><button type="button" @click="download(material)">下载</button></footer>
        </article>
      </div>
      <p v-else class="empty-copy">暂无关联素材</p>
      <ul v-if="attachments.length" class="attachment-list" aria-label="飞书附件">
        <li v-for="file in attachments" :key="file.attachmentId"><span>{{ file.name }}</span><small>{{ file.sizeBytes?`${(file.sizeBytes/1024/1024).toFixed(2)} MB`:'—' }}</small><button type="button" @click="downloadAttachment(file)">下载附件</button></li>
      </ul>
    </section>
    <section class="live-panel" aria-labelledby="live-comments-title">
      <header><h2 id="live-comments-title">应用评论</h2><small>{{ comments.length }} 条真实评论</small></header>
      <ul v-if="comments.length" class="comment-list">
        <li v-for="comment in comments" :key="comment.commentId"><strong>{{ comment.user.displayName||'匿名用户' }}</strong><span v-if="comment.rating">{{ comment.rating }} / 5</span><p>{{ comment.content }}</p><small>{{ comment.createdAt||'—' }}</small></li>
      </ul>
      <p v-else class="empty-copy">暂无已发布评论</p>
      <button v-if="integrationState==='normal' && appId" type="button" class="secure-launch" @click="launch">权限校验后使用</button>
      <form v-if="testWritesEnabled" class="test-write-form" aria-label="应用写接口联调" @submit.prevent="submitTestComment">
        <strong>TEST_ 安全联调</strong>
        <div><button type="button" :disabled="!appId" @click="requestUse">测试申请使用</button><button type="button" :disabled="!appId" @click="requestReuse">测试申请复用</button><button type="button" :disabled="!appId" :aria-pressed="Boolean(favoriteRecord)" @click="toggleFavorite">{{ favoriteRecord?'取消测试收藏':'测试收藏' }}</button></div>
        <label>测试评论<input v-model="testComment" required maxlength="200" placeholder="仅写入 TEST_ 隔离记录" /></label>
        <button type="submit" :disabled="!testComment.trim()">提交测试评论</button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.live-detail-sections{display:grid;grid-template-columns:1.2fr .8fr;gap:12px;margin:12px 22px 24px;color:#17385f}.live-panel{padding:18px;background:#fff;border:1px solid #dce5ef;border-radius:7px}.live-panel>header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.live-panel h2{margin:0;font-size:15px}.live-panel header small{color:#70839d;font-size:10px}.material-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.material-grid article{padding:13px;border:1px solid #e0e7ef;border-radius:6px}.material-grid mark{padding:3px 8px;color:#1461a9;background:#eaf3fb;border-radius:9px;font-size:9px}.material-grid h3{margin:10px 0 6px;font-size:12px}.material-grid p{min-height:34px;margin:0;color:#647892;font-size:10px;line-height:1.7}.material-grid footer{display:flex;align-items:center;justify-content:space-between;margin-top:10px;color:#71849d;font-size:9px}.material-grid button{padding:0;border:0;color:#075fc0;background:transparent}.comment-list{list-style:none;margin:0;padding:0}.comment-list li{padding:10px 0;border-bottom:1px solid #e5ebf1}.comment-list li:last-child{border-bottom:0}.comment-list strong{font-size:11px}.comment-list span{float:right;color:#0d68c7;font-size:10px}.comment-list p{margin:6px 0;color:#435b78;font-size:10px;line-height:1.6}.comment-list small,.empty-copy{color:#71849d;font-size:9px}.empty-copy{min-height:80px;display:grid;place-items:center}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}button:focus-visible{outline:3px solid #1b77d2;outline-offset:2px}@media(max-width:900px){.live-detail-sections{grid-template-columns:1fr}.material-grid{grid-template-columns:1fr}}
.attachment-list{list-style:none;margin:12px 0 0;padding:0;border-top:1px solid #e5ebf1}.attachment-list li{display:grid;grid-template-columns:1fr 80px 70px;gap:8px;padding:9px 0;border-bottom:1px solid #e5ebf1;font-size:9px}.attachment-list small{color:#71849d}.attachment-list button{padding:0;border:0;color:#075fc0;background:transparent;font-size:9px}
.test-write-form{display:grid;gap:9px;margin-top:14px;padding-top:12px;border-top:1px solid #e5ebf1}.test-write-form>div{display:flex;gap:8px}.test-write-form label{display:grid;gap:5px;font-size:10px}.test-write-form input{height:34px;padding:0 10px;border:1px solid #cfdbea;border-radius:4px}.test-write-form button{min-height:32px;padding:0 10px;border:1px solid #0b67c8;border-radius:4px;color:#0b5bac;background:#fff}.test-write-form>button{color:#fff;background:#0b67c8}.test-write-form button:disabled{opacity:.5}
</style>
