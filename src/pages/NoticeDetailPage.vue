<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { createNoticeDetailController } from '../state/announcement-controllers.js';
import { resolvePage } from '../fixtures/pages.js';

// Reference SHA-256: A9827301EF6051E8B9B963B07F7073F6AB7AE4BFD21BAC97FDDA67A08FF3D78F
const props=defineProps({state:{type:String,default:'normal'},integrationData:{type:Object,default:null},integrationState:{type:String,default:'loading'},operationExecutor:{type:Function,default:null}});
const emit=defineEmits(['restore']);
const controller=createNoticeDetailController();
const localState=ref(props.state);
const detail=computed(()=>props.integrationData?.['ANN-003']||null);
const state=computed(()=>{
  if(props.integrationState==='loading')return 'loading';
  if(['authentication-required','permission-denied'].includes(props.integrationState))return 'permission-denied';
  if(['error','timeout','rate-limited','schema-drift','security-error'].includes(props.integrationState))return 'error';
  if(props.integrationState==='disabled')return 'disabled';
  if(props.integrationState==='empty')return 'empty';
  return detail.value?.announcementId?'normal':'empty';
});
const remoteContentVisible=computed(()=>state.value==='normal');
const controlsDisabled=computed(()=>state.value==='disabled');
const remoteAttachments=computed(()=>(detail.value?.attachments||[]).map((item,index)=>({id:item.fileId||item.attachmentId||`attachment-${index}`,fileId:item.fileId||item.attachmentId||'',name:item.fileName||item.name||`附件 ${index+1}`,size:item.sizeText||item.fileSizeText||item.size||''})));
const remoteRelations=computed(()=>{
  const rows=[...(detail.value?.relatedApps||[]),...(detail.value?.associatedActivities||[]),...(props.integrationData?.['ANN-005']?.items||[])];
  const seen=new Set();
  return rows.map((item,index)=>({id:String(item.relationId||item.appId||item.activityId||item.resourceId||item.id||`${item.typeCode||item.relationType||'relation'}-${index}`),name:item.name||item.title||item.appName||item.activityName||'关联资源',description:item.summary||item.description||item.typeName||item.relationType||'',route:safeApprovedRoute(item.detailPath||item.path||item.route||item.targetPath)})).filter(item=>!seen.has(item.id)&&seen.add(item.id));
});
let loadingTimer;

function finishLoading(){window.clearTimeout(loadingTimer);loadingTimer=window.setTimeout(()=>emit('restore'),800);}
function syncState(value){window.clearTimeout(loadingTimer);localState.value=value;if(value==='loading')finishLoading();}
function beginRetry(){localState.value='loading';controller.announcement='正在重新加载通知';finishLoading();}
function navigateWithinShell(route){window.history.pushState({xltFromPath:window.location.pathname},'',route);window.dispatchEvent(new PopStateEvent('popstate'));}
function goBack(){if(window.history.state?.xltFromPath==='/announcements'&&window.history.length>1)window.history.back();else navigateWithinShell('/announcements');}
function safeApprovedRoute(path){
  if(!path||typeof window==='undefined')return '';
  try{const url=new URL(path,window.location.origin);if(url.origin!==window.location.origin)return '';return resolvePage(url.href,'normal')?`${url.pathname}${url.search}${url.hash}`:'';}catch{return '';}
}
function sameOriginDownloadUrl(path){
  if(!path||typeof window==='undefined')return '';
  try{const url=new URL(path,window.location.origin);return url.origin===window.location.origin&&url.protocol===window.location.protocol?url.href:'';}catch{return '';}
}
async function downloadRemoteAttachment(file){
  if(!file.fileId||!props.operationExecutor){controller.announcement=`${file.name}：当前身份无可用下载授权`;return;}
  controller.announcement=`正在获取 ${file.name} 的下载授权`;
  try{
    const response=await props.operationExecutor('COM-008',{fileId:file.fileId,mode:'DOWNLOAD',disposition:'ATTACHMENT',fileNameOverride:file.name});
    const url=sameOriginDownloadUrl(response?.data?.url);
    if(!url)throw new Error('下载地址未通过同源校验');
    const anchor=document.createElement('a');anchor.href=url;anchor.download=response.data.fileName||file.name;anchor.rel='noopener';anchor.hidden=true;document.body.appendChild(anchor);anchor.click();anchor.remove();
    controller.announcement=`${file.name}：下载已开始`;
  }catch{controller.announcement=`${file.name}：下载暂不可用`;}
}

watch(()=>props.state,syncState);
onBeforeUnmount(()=>window.clearTimeout(loadingTimer));
</script>

<template>
  <article class="notice-page" :data-state="state" :aria-busy="state === 'loading'">
    <p class="sr-only" aria-live="polite">{{ controller.announcement }}</p>
    <template v-if="remoteContentVisible">
      <nav class="crumb" aria-label="面包屑"><a href="/workbench">首页</a><span>/</span><button type="button" @click="goBack">公告通知</button><span>/</span><b>公告详情</b></nav>
      <section class="notice-sheet remote-notice" aria-labelledby="notice-title">
        <header><mark>{{ detail.typeName||detail.typeCode||'公告' }}</mark><h1 id="notice-title">{{ detail.title }}</h1></header>
        <p v-if="detail.summary" class="notice-summary">{{ detail.summary }}</p>
        <dl class="notice-meta"><div><dt>公告类型：</dt><dd>{{ detail.typeName||detail.typeCode||'—' }}</dd></div><div><dt>发布时间：</dt><dd>{{ detail.publishAt||'—' }}</dd></div><div><dt>发布人：</dt><dd>{{ detail.publisherName||'—' }}</dd></div><div><dt>发布部门：</dt><dd>{{ detail.publisherOrgName||'—' }}</dd></div><div><dt>发布范围：</dt><dd>{{ detail.scopeType||'—' }}</dd></div><div><dt>阅读：</dt><dd>{{ detail.readCount }} / 浏览 {{ detail.viewCount }} · {{ detail.isRead?'已读':'未读' }}</dd></div></dl>
        <div class="notice-copy remote-copy"><p>{{ detail.contentText||detail.summary||'暂无正文内容' }}</p></div>
        <div class="notice-bottom"><section><h2>附件下载</h2><ul v-if="remoteAttachments.length"><li v-for="file in remoteAttachments" :key="file.id"><b>FILE</b><span>{{ file.name }}</span><small>{{ file.size||'—' }}</small><button type="button" :disabled="!file.fileId||!operationExecutor" @click="downloadRemoteAttachment(file)">下载</button></li></ul><p v-else class="remote-empty">暂无附件</p></section><section><h2>关联对象</h2><article v-for="relation in remoteRelations" :key="relation.id"><AppIcon name="app-screen" :size="48" /><div><strong>{{ relation.name }}</strong><p>{{ relation.description||'暂无说明' }}</p></div><a v-if="relation.route" :href="relation.route">查看</a><button v-else type="button" disabled title="未返回可用的本系统目标">不可用</button></article><p v-if="!remoteRelations.length" class="remote-empty">暂无关联对象</p></section></div>
        <nav class="notice-adjacent" aria-label="相邻公告"><a v-if="safeApprovedRoute(detail.previous?.detailPath||detail.previous?.path)" :href="safeApprovedRoute(detail.previous?.detailPath||detail.previous?.path)">上一篇：{{ detail.previous.title||'上一则公告' }}</a><span v-else>上一篇：无</span><a v-if="safeApprovedRoute(detail.next?.detailPath||detail.next?.path)" :href="safeApprovedRoute(detail.next?.detailPath||detail.next?.path)">下一篇：{{ detail.next.title||'下一则公告' }}</a><span v-else>下一篇：无</span></nav>
      </section>
      <footer class="notice-footer">物资供应领域数智化转型平台　© 2025 版权所有　　建议使用 1920×1080 及以上分辨率浏览</footer>
    </template>
    <section v-else-if="state === 'loading'" class="notice-detail-state" aria-live="polite"><h1>正在加载通知</h1><p>请稍候。</p></section>
    <section v-else-if="state === 'error'" class="notice-detail-state" role="alert"><h1>通知加载失败</h1><p>飞书公告服务暂不可用。</p><div><button type="button" @click="goBack">返回公告列表</button></div></section>
    <section v-else-if="state === 'empty'" class="notice-detail-state"><h1>通知内容不可用</h1><button type="button" @click="goBack">返回公告列表</button></section>
    <section v-else-if="state === 'permission-denied'" class="notice-detail-state" role="alert"><h1>访问受限</h1><p>当前角色无权查看此内容。</p><a href="/workbench">返回工作台</a></section>
  </article>
</template>

<style scoped>
.notice-page{padding:14px 17px 0;color:#132849}.crumb{height:33px;display:flex;gap:10px;align-items:center;font-size:12px}.crumb a,.crumb button{padding:0;color:#536985;background:none;border:0;font:inherit}.notice-sheet{padding:18px;background:#fafcff;border:1px solid #dce6f0;border-radius:6px}.notice-sheet>header{display:flex;align-items:center;gap:30px}.notice-sheet h1{margin:0;font-size:26px;color:#101722}.notice-sheet mark{padding:8px 14px;color:#0060a6;background:#eaf3ff;border-radius:5px;font-weight:700}.notice-meta{display:flex;gap:45px;margin:16px 0 12px;padding-bottom:14px;border-bottom:1px solid #dce5ef}.notice-meta div{display:flex;font-size:12px}.notice-meta dt{color:#4c6179}.notice-meta dd{margin:0;color:#163971;font-weight:700}.notice-copy{font-size:12px;line-height:1.9}.notice-copy p{padding-left:32px}.notice-visual{display:grid;grid-template-columns:minmax(0,862px) minmax(330px,1fr);gap:18px;margin-top:18px}.notice-visual img{width:100%;height:206px;object-fit:cover;border-radius:7px}.notice-visual aside{padding:19px 24px;border:1px solid #f2c36d;background:#fffaf1;border-radius:7px}.notice-visual aside h2{margin:0;color:#e97200;font-size:18px}.notice-visual aside li{margin-top:16px;color:#566579;font-size:11px;line-height:1.7}.notice-highlights h2,.notice-bottom h2{margin:14px 0 8px;color:#0060a6;font-size:15px}.notice-highlights ol{list-style:none;margin:0;padding:0}.notice-highlights li{display:grid;grid-template-columns:24px 140px 1fr;align-items:center;min-height:25px;font-size:12px}.notice-highlights li>span{width:18px;height:18px;display:grid;place-items:center;color:#fff;background:#0060a6;border-radius:50%;font-size:10px}.notice-bottom{display:grid;grid-template-columns:1fr 1fr;gap:20px}.notice-bottom>section{padding:0 14px 10px;border:1px solid #dce5ef;border-radius:6px}.notice-bottom h2>button{float:right;padding:0;color:#0060a6;background:none;border:0;font-size:11px}.notice-bottom ul{list-style:none;margin:0;padding:0}.notice-bottom li,.notice-bottom article{min-height:38px;display:flex;align-items:center;gap:13px;font-size:11px}.notice-bottom li b{min-width:38px;color:#fff;background:#e83030;border-radius:3px;text-align:center;font-size:9px}.notice-bottom li:nth-child(2) b{background:#18a75b}.notice-bottom li:nth-child(3) b{background:#0060a6}.notice-bottom li span{flex:1}.notice-bottom li small{width:70px}.notice-bottom article div{flex:1}.notice-bottom article p{color:#687b91;font-size:10px}.notice-bottom button{padding:6px 17px;color:#0060a6;background:#fff;border:1px solid #9bc2f5;border-radius:4px}.notice-bottom button:disabled{color:#94a1b0;background:#eef1f4;border-color:#d9dfe6}.notice-footer{padding:18px;text-align:center;color:#75869a;font-size:10px}.notice-detail-state{min-height:500px;display:grid;place-content:center;justify-items:center;text-align:center;background:#fff;border:1px solid #dce6f0}.notice-detail-state h1{margin:0 0 8px;font-size:22px}.notice-detail-state p{color:#65778d}.notice-detail-state div{display:flex;gap:12px}.notice-detail-state button,.notice-detail-state a{min-height:38px;padding:0 18px;display:inline-grid;place-items:center;color:#fff;background:#0060a6;border:0;border-radius:4px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}a:focus-visible,button:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:900px){.notice-visual,.notice-bottom{grid-template-columns:1fr}.notice-meta{flex-wrap:wrap;gap:10px 22px}.notice-sheet h1{font-size:20px}}
.notice-page{padding:28px 21px 0 7px}
.notice-summary{margin:14px 0 0;color:#526982;line-height:1.7}.remote-copy{min-height:210px;white-space:pre-wrap}.remote-copy p{padding-left:0}.remote-empty{color:#71849d;font-size:12px}.notice-bottom article>a{padding:6px 17px;color:#0060a6;background:#fff;border:1px solid #9bc2f5;border-radius:4px}.notice-adjacent{display:flex;justify-content:space-between;gap:20px;margin-top:18px;padding-top:14px;border-top:1px solid #dce5ef;font-size:12px}.notice-adjacent a{color:#0060a6}
</style>
