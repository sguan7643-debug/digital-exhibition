<script setup>
import { computed, ref } from 'vue';

const props=defineProps({
  integrationData:{type:Object,default:null}, integrationState:{type:String,default:'mock'}, operationExecutor:{type:Function,default:null}
});
const announcement=ref('');
const comments=computed(()=>props.integrationData?.['APP-007']?.items||[]);
const materials=computed(()=>props.integrationData?.['MAT-002']?.items||[]);
const materialFacets=computed(()=>props.integrationData?.['MAT-001']);
const categoryLabel=material=>material.materialType||materialFacets.value?.materialTypes?.find(item=>item.value===material.materialType)?.label||'素材';
const sizeLabel=material=>material.primaryFile?.sizeBytes?`${(material.primaryFile.sizeBytes/1024/1024).toFixed(2)} MB`:'—';
async function download(material){
  if(!props.operationExecutor||props.integrationState==='mock'){announcement.value='当前素材只有展示数据，无法下载';return;}
  announcement.value=`正在准备下载 ${material.name}`;
  try{
    const response=await props.operationExecutor('MAT-003',{materialId:material.materialId,fileId:material.materialId,purpose:'USER_DOWNLOAD',sourcePage:window.location.pathname,clientOccurredAt:new Date().toISOString()});
    window.location.assign(response.data.accessUrl);
  }catch(error){
    if(error?.status===401){window.location.assign(`/api/v1/auth/feishu/start?returnTo=${encodeURIComponent(window.location.pathname)}`);return;}
    announcement.value=`${material.name} 下载失败，请稍后重试`;
  }
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
    </section>
    <section class="live-panel" aria-labelledby="live-comments-title">
      <header><h2 id="live-comments-title">应用评论</h2><small>{{ comments.length }} 条真实评论</small></header>
      <ul v-if="comments.length" class="comment-list">
        <li v-for="comment in comments" :key="comment.commentId"><strong>{{ comment.user.displayName||'匿名用户' }}</strong><span v-if="comment.rating">{{ comment.rating }} / 5</span><p>{{ comment.content }}</p><small>{{ comment.createdAt||'—' }}</small></li>
      </ul>
      <p v-else class="empty-copy">暂无已发布评论</p>
    </section>
  </div>
</template>

<style scoped>
.live-detail-sections{display:grid;grid-template-columns:1.2fr .8fr;gap:12px;margin:12px 22px 24px;color:#17385f}.live-panel{padding:18px;background:#fff;border:1px solid #dce5ef;border-radius:7px}.live-panel>header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.live-panel h2{margin:0;font-size:15px}.live-panel header small{color:#70839d;font-size:10px}.material-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.material-grid article{padding:13px;border:1px solid #e0e7ef;border-radius:6px}.material-grid mark{padding:3px 8px;color:#1461a9;background:#eaf3fb;border-radius:9px;font-size:9px}.material-grid h3{margin:10px 0 6px;font-size:12px}.material-grid p{min-height:34px;margin:0;color:#647892;font-size:10px;line-height:1.7}.material-grid footer{display:flex;align-items:center;justify-content:space-between;margin-top:10px;color:#71849d;font-size:9px}.material-grid button{padding:0;border:0;color:#075fc0;background:transparent}.comment-list{list-style:none;margin:0;padding:0}.comment-list li{padding:10px 0;border-bottom:1px solid #e5ebf1}.comment-list li:last-child{border-bottom:0}.comment-list strong{font-size:11px}.comment-list span{float:right;color:#0d68c7;font-size:10px}.comment-list p{margin:6px 0;color:#435b78;font-size:10px;line-height:1.6}.comment-list small,.empty-copy{color:#71849d;font-size:9px}.empty-copy{min-height:80px;display:grid;place-items:center}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}button:focus-visible{outline:3px solid #1b77d2;outline-offset:2px}@media(max-width:900px){.live-detail-sections{grid-template-columns:1fr}.material-grid{grid-template-columns:1fr}}
</style>
