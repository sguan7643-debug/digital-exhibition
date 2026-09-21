<script setup>
// Reference SHA-256: 5ADAECAADC46CCC242A570AEE5037A045FCECF39CBDA7D091283CE288DF9BE4F
import { computed, reactive, ref } from 'vue';

const props = defineProps({ integrationData: { type: Object, default: null }, integrationState: { type: String, default: 'mock' } });
const remoteMode = computed(() => props.integrationState !== 'mock');
const publishConfigured = computed(() => !remoteMode.value || props.integrationData?.['ANN-004']?.configured === true);
const attachmentPicker = ref(null);
const showAppChooser = ref(false);
const showPreview = ref(false);
const statusMessage = ref('');
const savedDraft = ref(null);
const attachments = ref(['数智展厅 V2.0 新功能说明.docx', '应用上线操作指南.pdf']);
const draft = reactive({
  title: '数智展厅 V2.0 新应用上线通知', type: '新应用上线', publishAt: '2025-06-08 10:18',
  validity: '2025-06-08 00:00 ~ 2025-07-08 23:59', relatedApp: '智能报表系统',
  content: `数智展厅 V2.0 全新升级，多款应用重磅上线！\n\n为进一步提升业务数字化能力，优化用户体验，数智展厅 V2.0 版本正式发布，新增多款应用并持续优化功能，助力各单位高效协同、智能决策。\n\n本次更新亮点\n1. 新增智能报表、数据画像等 8 款应用，覆盖更多业务场景\n2. 优化应用体验与权限管理，提升系统稳定性与安全性\n3. 支持多端展示与符合单点登录与组织架构同步`
});
const contentLength = computed(() => draft.content.length);
const availableApps = ['智能报表系统', '经营分析可视化报表', '海能work应用', '供应商信息自动录入机器人'];

function notice(message) { statusMessage.value = message; }
function openAttachmentPicker() { attachmentPicker.value?.click(); }
function selectAttachments(event) {
  const names = Array.from(event.target?.files || []).map(file => file.name).filter(Boolean);
  if (!names.length) return;
  attachments.value = [...attachments.value, ...names];
  notice(`已选择 ${names.length} 个附件；文件仅保存在当前浏览器会话，尚未上传飞书。`);
  event.target.value = '';
}
function removeAttachment(index) { attachments.value = attachments.value.filter((_, current) => current !== index); }
function chooseApp(name) { draft.relatedApp = name; showAppChooser.value = false; notice(`已关联“${name}”。`); }
function saveDraft() {
  if (remoteMode.value) { notice('正式公告写入合同尚未配置，草稿未发送到飞书；你可继续预览或在已配置写入合同后提交。'); return; }
  savedDraft.value = { ...draft, attachments: [...attachments.value] };
  notice('草稿已保存在当前浏览器会话，未发送到飞书。');
}
function previewDraft() { showPreview.value = true; notice('已生成本地预览，未发送到飞书。'); }
function publishAnnouncement() {
  if (remoteMode.value || !publishConfigured.value) { notice('正式公告发布合同尚未配置，本次操作未发送请求、未写入飞书。'); return; }
  notice('演示发布已完成，仅保存在当前浏览器会话，未写入飞书。');
}
function resetDraft() { showPreview.value = false; showAppChooser.value = false; notice('已取消本次编辑；浏览器会话中的未保存更改不会发送到飞书。'); }
</script>

<template>
  <article class="editor-page" aria-labelledby="announcement-editor-title">
    <nav>运营管理　/　公告管理</nav>
    <header><h1 id="announcement-editor-title">公告发布与编辑</h1><p>发布公告通知，支持全平台或指定范围的组织与用户接收。</p></header>
    <p v-if="remoteMode" class="editor-blocked" role="alert">正式公告发布合同尚未配置。可编辑、选择附件与预览，但保存或发布不会发送请求，也不会写入飞书。</p>
    <p v-if="statusMessage" class="editor-feedback" role="status">{{ statusMessage }}</p>
    <form @submit.prevent="publishAnnouncement">
      <section><h2><span>1</span> 基本信息</h2><div class="basic-grid">
        <label>公告标题 *<input v-model="draft.title" required /></label>
        <fieldset><legend>公告类型 *</legend><label v-for="type in ['新应用上线','活动通知','平台通知']" :key="type"><input v-model="draft.type" type="radio" :value="type" />{{ type }}</label></fieldset>
        <label>发布时间 *<input v-model="draft.publishAt" required /></label><label>有效期 *<input v-model="draft.validity" required /></label>
      </div></section>
      <section><h2><span>2</span> 公告正文 *</h2><textarea v-model="draft.content" rows="10" required></textarea><small>共 {{ contentLength }} 字</small></section>
      <div class="editor-split">
        <section><h2><span>3</span> 附件上传（选填）</h2><input ref="attachmentPicker" class="sr-only" type="file" multiple @change="selectAttachments" /><button type="button" class="upload" @click="openAttachmentPicker">点击选择附件<br /><small>文件只保存在当前浏览器会话</small></button><ul><li v-for="(file, index) in attachments" :key="`${file}-${index}`">{{ file }} <button type="button" @click="removeAttachment(index)">移除</button></li></ul></section>
        <section><h2><span>4</span> 关联对象（选填）</h2><p>关联后可在应用详情页展示该公告</p><div class="selected">{{ draft.relatedApp || '暂未关联应用' }} <button v-if="draft.relatedApp" type="button" @click="draft.relatedApp=''">移除</button></div><button type="button" class="choose" @click="showAppChooser = !showAppChooser">{{ showAppChooser ? '收起应用列表' : '选择应用' }}</button><div v-if="showAppChooser" class="app-options"><button v-for="app in availableApps" :key="app" type="button" @click="chooseApp(app)">{{ app }}</button></div></section>
      </div>
      <footer><button type="button" @click="saveDraft">保存草稿</button><button type="button" @click="previewDraft">预览</button><button type="submit">发布</button><button type="reset" @click="resetDraft">取消</button></footer>
    </form>
    <section v-if="showPreview" class="preview-panel" aria-label="公告本地预览"><div><h2>本地预览</h2><button type="button" @click="showPreview=false">关闭</button></div><h3>{{ draft.title || '未命名公告' }}</h3><p class="preview-meta">{{ draft.type }}　{{ draft.publishAt }}　{{ draft.validity }}</p><p class="preview-content">{{ draft.content }}</p><p v-if="draft.relatedApp">关联应用：{{ draft.relatedApp }}</p></section>
  </article>
</template>

<style scoped>
.editor-page{padding:20px 35px;color:#17304f}.editor-page>nav{font-size:11px}.editor-page h1{margin:12px 0 4px;font-size:24px}.editor-page header p{font-size:11px}.editor-blocked,.editor-feedback{padding:10px 12px;border-radius:4px;font-size:13px}.editor-blocked{color:#76530a;background:#fff9e8;border:1px solid #efd68e}.editor-feedback{color:#155e43;background:#effaf4;border:1px solid #b7e2ca}.editor-page form>section,.editor-split>section,.preview-panel{margin-top:18px;padding:18px;background:#fff;border:1px solid #dce5ef;border-radius:6px}.editor-page h2{margin:0 0 20px;color:#0060a6;font-size:15px}.editor-page h2 span{display:inline-grid;place-items:center;width:18px;height:18px;color:#fff;background:#0060a6;border-radius:50%;font-size:10px}.basic-grid{display:grid;grid-template-columns:1.2fr 1.2fr 1fr 1.4fr;gap:25px}.basic-grid>label,.basic-grid fieldset{display:grid;gap:10px;margin:0;padding:0;border:0;font-size:11px}.basic-grid input,.editor-page textarea{padding:10px;border:1px solid #d8e2ec;border-radius:4px}.basic-grid fieldset{display:flex;align-items:end}.basic-grid legend{position:absolute}.editor-page textarea{width:100%;resize:vertical;line-height:2}.editor-page form>section>small{float:right}.editor-split{display:grid;grid-template-columns:1fr 1fr;gap:18px}.upload{width:100%;height:75px;color:#17304f;background:#fff;border:1px dashed #a9c8ef}.editor-page ul{list-style:none;padding:0;font-size:12px}.editor-page li{display:flex;justify-content:space-between;gap:10px;padding:6px 0}.editor-page li button,.selected button{color:#0060a6;background:transparent;border:0}.selected{padding:12px;background:#f7f9fc;border:1px solid #dce5ef}.choose{width:100%;height:38px;color:#0060a6;background:#fff;border:1px solid #dce5ef}.app-options{display:grid;gap:6px;margin-top:8px}.app-options button{padding:8px;color:#17304f;text-align:left;background:#fff;border:1px solid #dce5ef}.editor-page form>footer{display:flex;justify-content:center;gap:30px;padding:20px}.editor-page footer button{height:38px;min-width:140px;color:#0060a6;background:#fff;border:1px solid #0060a6}.editor-page footer button[type=submit]{color:#fff;background:#0060a6}.preview-panel>div{display:flex;justify-content:space-between;align-items:center}.preview-panel>div button{color:#0060a6;background:#fff;border:1px solid #0060a6}.preview-meta{color:#61758b;font-size:12px}.preview-content{white-space:pre-wrap;line-height:1.8}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}button:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:900px){.basic-grid,.editor-split{grid-template-columns:1fr 1fr}}
</style>
