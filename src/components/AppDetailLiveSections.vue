<script setup>
import { computed, ref } from 'vue';
import { startFeishuLogin, startSameOriginDownload } from '../integration/secure-download.js';
import { buildApplicationWriteInput, launchApplication, resolveDownloadFileId, resolveLiveApplicationId } from '../integration/application-actions.js';
import { normalizeAttachmentPresentation } from '../integration/attachment-presentation.js';

const props=defineProps({
  integrationData:{type:Object,default:null}, integrationState:{type:String,default:'loading'}, operationExecutor:{type:Function,default:null},
  actionExecutor:{type:Function,default:null}, writesEnabled:{type:Boolean,default:false}
});
const announcement=ref('');
const commentDraft=ref('');
const favoriteRecord=ref(null);
const appId=computed(()=>resolveLiveApplicationId(props.integrationData));
const comments=computed(()=>props.integrationData?.['APP-007']?.items||[]);
const materials=computed(()=>props.integrationData?.['MAT-002']?.items||[]);
const attachments=computed(()=>(props.integrationData?.['APP-003']?.attachments||[]).map((file,index)=>({
  ...normalizeAttachmentPresentation(file,index),
  attachmentId:String(file.attachmentId||file.fileId||file.id||'')
})));
const materialFacets=computed(()=>props.integrationData?.['MAT-001']);
const categoryLabel=material=>material.materialType||materialFacets.value?.materialTypes?.find(item=>item.value===material.materialType)?.label||'—';
function optionalNumber(value){const number=Number(value);return value!==null&&value!==undefined&&Number.isFinite(number)&&number>=0?number:null;}
const sizeLabel=value=>{const bytes=optionalNumber(value);return bytes===null?'—':`${(bytes/1024/1024).toFixed(2)} MB`;};
const countLabel=value=>{const count=optionalNumber(value);return count===null?'—':count.toLocaleString('zh-CN');};
async function download(material){
  if(!props.operationExecutor){announcement.value='飞书素材下载接口暂不可用';return;}
  announcement.value=`正在准备下载 ${material.name}`;
  try{
    const fileId=resolveDownloadFileId(material);
    if(!fileId){announcement.value=`${material.name} 暂无可下载文件`;return;}
    const response=await props.operationExecutor('MAT-003',{materialId:material.materialId,fileId,purpose:'USER_DOWNLOAD',sourcePage:window.location.pathname,clientOccurredAt:props.integrationData?.['APP-003']?.updatedAt||new Date().toISOString()});
    startSameOriginDownload(response.data.accessUrl,material.primaryFile?.fileName||material.name);
  }catch(error){
    if(error?.status===401){startFeishuLogin();return;}
    announcement.value=`${material.name} 下载失败，请稍后重试`;
  }
}
async function downloadAttachment(file){
  if(!props.operationExecutor){announcement.value='飞书附件下载接口暂不可用';return;}
  announcement.value=`正在准备下载 ${file.name}`;
  try{
    const response=await props.operationExecutor('COM-008',{fileId:file.attachmentId||file.key,mode:'DOWNLOAD',disposition:'ATTACHMENT',fileNameOverride:file.name});
    startSameOriginDownload(response.data.url,file.name);
  }catch(error){announcement.value=`${file.name} 下载失败，请稍后重试`;}
}
async function executeBusinessWrite(operationId,input){
  if(!props.writesEnabled||!props.actionExecutor){announcement.value='正式写入通道未启用';return null;}
  announcement.value='正在提交';
  try{
    const response=await props.actionExecutor(operationId,input,{confirmed:true});
    announcement.value=`提交成功，版本 ${response.data.version}`;
    if(operationId==='APP-008')commentDraft.value='';
    return response;
  }catch(error){announcement.value=`${operationId} 联调失败：${error.message||'未知错误'}`;return null;}
}
const requestUse=()=>executeBusinessWrite('APP-005',buildApplicationWriteInput('APP-005',appId.value,{reason:'页面申请使用'}));
const requestReuse=()=>executeBusinessWrite('APP-006',buildApplicationWriteInput('APP-006',appId.value,{reason:'页面申请复用'}));
const submitComment=()=>executeBusinessWrite('APP-008',buildApplicationWriteInput('APP-008',appId.value,{comment:commentDraft.value}));
async function toggleFavorite(){
  if(!favoriteRecord.value){
    const input=buildApplicationWriteInput('FAV-003',appId.value);
    const response=await executeBusinessWrite('FAV-003',input);
    if(response)favoriteRecord.value={businessKey:input.businessKey,version:response.data.version};
    return;
  }
  const input={businessKey:favoriteRecord.value.businessKey,idempotencyKey:`IDEM_APP_UNFAVORITE_${window.crypto.randomUUID()}`,ifMatch:favoriteRecord.value.version,fields:{}};
  const response=await executeBusinessWrite('FAV-004',input);
  if(response)favoriteRecord.value=null;
}
async function launch(){
  if(!appId.value){announcement.value='真实应用标识尚未载入';return;}
  try{const result=await launchApplication(props.operationExecutor,appId.value);announcement.value=result.message;}
  catch(error){if(error?.status===401){startFeishuLogin();return;}announcement.value=error.message||'应用启动失败';}
}
</script>

<template>
  <div class="live-detail-sections detail-panel--full" data-live-app-detail-sections>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <section class="live-panel" aria-labelledby="live-material-title">
      <header><h2 id="live-material-title">关联素材</h2><small>飞书多维表格实时数据</small></header>
      <div v-if="materials.length" class="material-grid">
        <article v-for="material in materials" :key="material.materialId">
          <mark>{{ categoryLabel(material) }}</mark><h3>{{ material.name||'—' }}</h3><p>{{ material.summary||material.descriptionHtml||'—' }}</p>
          <footer><span>{{ sizeLabel(material.primaryFile?.sizeBytes) }}　下载 {{ countLabel(material.downloadCount) }}<template v-if="optionalNumber(material.downloadCount)!==null"> 次</template></span><button type="button" @click="download(material)">下载</button></footer>
        </article>
      </div>
      <p v-else class="empty-copy">暂无关联素材</p>
      <ul v-if="attachments.length" class="attachment-list" aria-label="飞书附件">
        <li v-for="file in attachments" :key="file.key"><span><strong>{{ file.name }}</strong><small>{{ file.type }}<template v-if="file.uploadedAt"> · {{ file.uploadedAt }}</template></small></span><small>{{ sizeLabel(file.sizeBytes) }}</small><button v-if="file.downloadable" type="button" @click="downloadAttachment(file)">下载附件</button><small v-else>暂无下载权限</small></li>
      </ul>
    </section>
    <section id="live-app-actions" class="live-panel live-comment-panel" aria-labelledby="live-comments-title">
      <header><h2 id="live-comments-title">应用评论</h2><small>{{ comments.length }} 条真实评论</small></header>
      <div class="detail-comment">
        <ul v-if="comments.length" class="comment-list">
          <li v-for="comment in comments" :key="comment.commentId"><strong data-person-name>{{ comment.user.displayName||'—' }}</strong><span v-if="comment.rating">{{ comment.rating }} / 5</span><p>{{ comment.content }}</p><small>{{ comment.createdAt||'—' }}</small></li>
        </ul>
        <p v-else class="empty-copy">暂无已发布评论</p>
        <button v-if="integrationState==='normal' && appId" type="button" class="secure-launch" @click="launch">权限校验后使用</button>
        <form v-if="writesEnabled" class="business-write-form" aria-label="应用操作" @submit.prevent="submitComment">
          <strong>应用操作</strong>
          <div><button type="button" :disabled="!appId" @click="requestUse">申请使用</button><button type="button" :disabled="!appId" @click="requestReuse">申请复用</button><button type="button" :disabled="!appId" :aria-pressed="Boolean(favoriteRecord)" @click="toggleFavorite">{{ favoriteRecord?'取消收藏':'收藏' }}</button></div>
          <label>评论<input v-model="commentDraft" required maxlength="200" placeholder="请输入评论内容" /></label>
          <button type="submit" :disabled="!commentDraft.trim()">提交评论</button>
        </form>
      </div>
    </section>
  </div>
</template>

<style scoped>
.live-detail-sections{grid-column:1/-1;display:grid;grid-template-columns:1.2fr .8fr;gap:12px;min-width:0;margin:0;color:#17385f}.live-panel{min-width:0;padding:18px;background:#fff;border:1px solid #dce5ef;border-radius:7px}.live-panel>header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px}.live-panel h2{margin:0;font-size:15px}.live-panel header small{color:#70839d;font-size:10px}.live-comment-panel .detail-comment{position:static;display:block;min-width:0;margin:0;padding:0;border:0;box-shadow:none}.material-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0}.material-grid article{min-width:0;padding:13px;border:1px solid #e0e7ef;border-radius:6px}.material-grid mark{padding:3px 8px;color:#1461a9;background:#eaf3fb;border-radius:9px;font-size:9px}.material-grid h3{margin:10px 0 6px;font-size:12px}.material-grid p{min-height:34px;margin:0;color:#647892;font-size:10px;line-height:1.7}.material-grid footer{display:flex;align-items:center;justify-content:space-between;margin-top:10px;color:#71849d;font-size:9px}.material-grid button{padding:0;border:0;color:#075fc0;background:transparent}.comment-list{list-style:none;margin:0;padding:0}.comment-list li{padding:10px 0;border-bottom:1px solid #e5ebf1}.comment-list li:last-child{border-bottom:0}.comment-list strong{font-size:11px}.comment-list span{float:right;color:#0d68c7;font-size:10px}.comment-list p{margin:6px 0;color:#435b78;font-size:10px;line-height:1.6}.comment-list small,.empty-copy{color:#71849d;font-size:9px}.empty-copy{min-height:80px;display:grid;place-items:center}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}button:focus-visible{outline:3px solid #1b77d2;outline-offset:2px}@media(max-width:900px){.live-detail-sections{grid-template-columns:minmax(0,1fr)}.live-panel>header{flex-wrap:wrap}.material-grid{grid-template-columns:minmax(0,1fr)}}
.attachment-list{list-style:none;margin:12px 0 0;padding:0;border-top:1px solid #e5ebf1}.attachment-list li{display:grid;grid-template-columns:minmax(0,1fr) 90px 90px;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid #e5ebf1;font-size:10px}.attachment-list li>span{display:grid;min-width:0;gap:2px}.attachment-list strong,.attachment-list small{overflow-wrap:anywhere}.attachment-list small{color:#5b6e82}.attachment-list button{min-height:34px;padding:0 8px;border:1px solid #7891a8;border-radius:5px;color:#075fc0;background:#fff;font-size:10px}@media(max-width:480px){.attachment-list li{grid-template-columns:minmax(0,1fr) auto}.attachment-list li>span{grid-column:1/-1}}
.business-write-form{display:grid;min-width:0;gap:9px;margin-top:14px;padding-top:12px;border-top:1px solid #e5ebf1}.business-write-form>div{display:flex;flex-wrap:wrap;gap:8px}.business-write-form label{display:grid;min-width:0;gap:5px;font-size:10px}.business-write-form input{width:100%;height:34px;padding:0 10px;border:1px solid #cfdbea;border-radius:4px}.business-write-form button{min-height:32px;padding:0 10px;border:1px solid #0b67c8;border-radius:4px;color:#0b5bac;background:#fff}.business-write-form>button{color:#fff;background:#0b67c8}.business-write-form button:disabled{opacity:.5}@media(max-width:480px){.business-write-form>div{display:grid;grid-template-columns:minmax(0,1fr)}.business-write-form>div button{width:100%;min-width:0!important}}
</style>
