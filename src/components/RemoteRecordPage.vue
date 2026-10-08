<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  record: { type: Object, default: null },
  state: { type: String, default: 'loading' },
  variant: { type: String, default: 'record' },
});

const sensitiveKey = /token|secret|cookie|authorization|credential|password/i;
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !sensitiveKey.test(key))
    .map(([key, child]) => [key, sanitize(child)]));
}
function display(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map(display).join('、') || '—';
  if (typeof value === 'object') return Object.entries(value)
    .filter(([, child]) => ['string', 'number', 'boolean'].includes(typeof child))
    .map(([key, child]) => `${key}：${child}`).join('；') || '—';
  return String(value);
}
const cleanRecord = computed(() => sanitize(props.record || {}));
const rows = computed(() => Object.entries(cleanRecord.value));
const pageState = computed(() => {
  if (['authentication-required', 'permission-denied'].includes(props.state)) return 'permission-denied';
  if (['error', 'timeout', 'rate-limited', 'schema-drift', 'security-error'].includes(props.state)) return 'error';
  if (props.state === 'loading') return 'loading';
  return rows.value.length ? 'normal' : 'empty';
});
const field = (...keys) => {
  for (const key of keys) {
    const value = cleanRecord.value?.[key];
    if (value !== null && value !== undefined && value !== '') return display(value);
  }
  return '—';
};
const collection = value => Array.isArray(value?.items) ? value.items : Array.isArray(value) ? value : [];
const typeRows = computed(() => collection(cleanRecord.value?.['INT-001']).slice(0, 12));
const domainRows = computed(() => collection(cleanRecord.value?.['INT-004']).slice(0, 12));
const auditRows = computed(() => collection(cleanRecord.value?.['ADM-003']).slice(0, 20));
const summaryCells = item => Object.values(item || {}).filter(value => ['string', 'number', 'boolean'].includes(typeof value)).slice(0, 5);
</script>

<template>
  <article v-if="pageState !== 'normal'" class="remote-record-page" :data-state="pageState">
    <header><h1>{{ title }}</h1><p v-if="description">{{ description }}</p></header>
    <section v-if="pageState === 'loading'" role="status">正在从飞书多维表格读取数据…</section>
    <section v-else-if="pageState === 'permission-denied'" role="alert">需要完成飞书授权或获得相应读取权限。</section>
    <section v-else-if="pageState === 'error'" role="alert">飞书数据暂时不可用，请稍后重试。</section>
    <section v-else role="status">飞书多维表格没有返回可展示的数据。</section>
    <dl class="sr-only"><div><dt>状态</dt><dd>{{ pageState }}</dd></div></dl>
  </article>

  <article v-else-if="variant === 'announcement-editor'" class="editor-page" aria-labelledby="announcement-editor-title">
    <nav>运营管理　/　公告管理</nav>
    <header><h1 id="announcement-editor-title">公告发布与编辑</h1><p>{{ description }}</p></header>
    <form @submit.prevent>
      <section><h2><span>1</span> 基本信息</h2><div class="basic-grid">
        <label>公告标题 *<input :value="field('title')" readonly /></label>
        <fieldset><legend>公告类型 *</legend><label><input type="radio" checked disabled />{{ field('typeName', 'typeCode') }}</label></fieldset>
        <label>发布时间 *<input :value="field('publishAt')" readonly /></label>
        <label>有效期 *<input :value="`${field('validFrom')}　~　${field('validTo')}`" readonly /></label>
      </div></section>
      <section><h2><span>2</span> 公告正文 *</h2><textarea :value="field('contentText', 'summary')" rows="10" readonly></textarea></section>
      <div class="editor-split">
        <section><h2><span>3</span> 附件上传（只读）</h2><button type="button" class="upload" disabled>附件写入未启用</button><ul><li v-for="(item, index) in cleanRecord.attachments || []" :key="item.fileId || index">{{ display(item.name || item.fileName) }}</li><li v-if="!(cleanRecord.attachments || []).length">暂无附件</li></ul></section>
        <section><h2><span>4</span> 关联对象</h2><p>当前展示飞书正式数据中的关联应用。</p><div v-for="(item, index) in cleanRecord.relatedApps || []" :key="item.appId || index" class="selected">{{ display(item.name) }}</div><div v-if="!(cleanRecord.relatedApps || []).length" class="selected">暂无关联应用</div><button type="button" class="choose" disabled>选择应用</button></section>
      </div>
      <footer><button type="button" disabled>保存草稿</button><button type="button" disabled>预览</button><button type="submit" disabled>发布</button><button type="button" data-detail-return>返回</button></footer>
    </form>
  </article>

  <article v-else-if="variant === 'app-editor'" class="app-editor" aria-labelledby="app-editor-title">
    <nav>首页　/　运营管理　/　应用管理　/　应用运营编辑</nav>
    <h1 id="app-editor-title">应用运营编辑</h1>
    <p class="hint">{{ description }}</p>
    <form @submit.prevent>
      <div class="edit-main">
        <section><h2>1 基础展示信息</h2><div class="form-grid">
          <label>应用名称 *<input :value="field('name')" readonly /></label>
          <label>所属部门 *<input :value="field('responsibleOrgName', 'developerOrgName')" readonly /></label>
          <label>应用编码<input :value="field('appCode', 'appId')" readonly /></label>
          <label>应用类型<input :value="field('typeName', 'typeCode')" readonly /></label>
          <label class="wide">应用简介<textarea :value="field('description', 'summary')" rows="4" readonly></textarea></label>
        </div></section>
        <section class="assets-form"><h2>2 资源与附件</h2><div class="upload-box">当前资源由飞书正式数据维护</div><ul><li v-for="(item, index) in cleanRecord.attachments || []" :key="item.attachmentId || index">{{ display(item.name) }}</li><li v-if="!(cleanRecord.attachments || []).length">暂无附件</li></ul></section>
      </div>
      <aside><section><h2>发布信息</h2><dl><div><dt>状态</dt><dd>{{ field('submissionStatus', 'status') }}</dd></div><div><dt>版本号</dt><dd>{{ field('versionName', 'version') }}</dd></div><div><dt>负责人</dt><dd data-person-name>{{ field('ownerName') }}</dd></div></dl></section><section class="permission"><h2>权限范围</h2><p>{{ field('businessScope', 'applicableUsers') }}</p></section></aside>
      <footer><button type="button" disabled>保存</button><button type="submit" disabled>发布</button><button type="button" data-detail-return>返回</button></footer>
    </form>
  </article>

  <article v-else-if="variant === 'admin'" class="backend-page" aria-labelledby="backend-title">
    <p class="sr-only" aria-live="polite">后台管理数据来自飞书正式接口</p>
    <nav>运营管理　/　后台管理</nav>
    <header><h1 id="backend-title">后台管理</h1><p>{{ description }}</p></header>
    <div class="config-grid">
      <section><div class="section-heading"><div><h2>应用类型配置</h2><p>展示已接入的正式配置，不提供本地伪写入。</p></div></div><div class="table-scroll"><table><thead><tr><th>名称</th><th>编码 / 描述</th><th>状态</th></tr></thead><tbody><tr v-if="!typeRows.length"><td colspan="3">暂无应用类型配置</td></tr><tr v-for="(item, index) in typeRows" :key="item.connectionCode || item.id || index"><td><span class="table-icon" aria-hidden="true">{{ index + 1 }}</span><strong>{{ display(item.name || item.typeName) }}</strong></td><td><b>{{ display(item.connectionCode || item.typeCode) }}</b><small>{{ display(item.description || item.domainCode) }}</small></td><td>{{ display(item.status || item.enabled) }}</td></tr></tbody></table></div></section>
      <section><div class="section-heading"><div><h2>主题域配置</h2><p>展示正式接口返回的业务域与连接信息。</p></div></div><div class="table-scroll"><table><thead><tr><th>名称</th><th>类型</th><th>状态</th></tr></thead><tbody><tr v-if="!domainRows.length"><td colspan="3">暂无主题域配置</td></tr><tr v-for="(item, index) in domainRows" :key="item.integrationCode || item.id || index"><td><strong>{{ display(item.name) }}</strong></td><td>{{ display(item.direction || item.domainCode) }}</td><td>{{ display(item.status || item.lastVerifiedStatus) }}</td></tr></tbody></table></div></section>
    </div>
    <section class="log-panel"><div class="section-heading"><div><h2>后台操作日志</h2><p>用于审计与追溯的正式操作记录。</p></div><span class="warning">{{ auditRows.length }} 条</span></div><div class="table-scroll"><table><thead><tr><th>时间</th><th>操作对象</th><th>操作类型</th><th>详情信息</th><th>状态</th></tr></thead><tbody><tr v-if="!auditRows.length"><td colspan="5">暂无操作日志</td></tr><tr v-for="(item, index) in auditRows" :key="item.auditId || index"><td>{{ display(item.occurredAt) }}</td><td>{{ display(item.resourceName || item.resourceId) }}</td><td class="operation-type">{{ display(item.actionName || item.actionCode) }}</td><td>{{ display(item.resultMessage || summaryCells(item)) }}</td><td :class="item.resultCode === 'OK' ? 'handled' : 'pending'">{{ display(item.resultCode) }}</td></tr></tbody></table></div></section>
  </article>

  <article v-else class="remote-record-page" data-state="normal">
    <header><h1>{{ title }}</h1><p v-if="description">{{ description }}</p></header>
    <dl><div v-for="([key, value]) in rows" :key="key"><dt>{{ key }}</dt><dd><pre v-if="value && typeof value === 'object'">{{ display(value) }}</pre><span v-else>{{ display(value) }}</span></dd></div></dl>
  </article>
</template>

<style scoped>
.remote-record-page{min-height:100%;padding:24px 32px;color:#17304f}.remote-record-page header{margin-bottom:18px}.remote-record-page h1{margin:0;font-size:26px}.remote-record-page header p{color:#61758b}.remote-record-page section,.remote-record-page dl{padding:18px;background:#fff;border:1px solid #dce5ef;border-radius:7px}.remote-record-page section{min-height:240px;display:grid;place-items:center;text-align:center}.remote-record-page section[role=alert]{color:#8f2d24}.remote-record-page dl{margin:0}.remote-record-page dl>div{display:grid;grid-template-columns:minmax(160px,24%) 1fr;gap:20px;padding:12px 0;border-bottom:1px solid #e6edf3}.remote-record-page dd{margin:0;overflow-wrap:anywhere}.remote-record-page pre{max-height:320px;margin:0;overflow:auto;white-space:pre-wrap;font:inherit}
.editor-page,.app-editor,.backend-page{min-height:100%;padding:18px 22px 28px;color:#17304f}.editor-page>nav,.app-editor>nav,.backend-page>nav{color:#6d8094;font-size:12px}.editor-page h1,.app-editor h1,.backend-page h1{margin:11px 0 5px;color:#102d50;font-size:26px}.editor-page header p,.hint,.backend-page>header p{margin:0 0 15px;color:#61758b}.editor-page form>section,.editor-split>section,.edit-main>section,.app-editor aside>section,.config-grid>section,.log-panel{min-width:0;margin-top:14px;padding:18px;background:#fff;border:1px solid #d7e2ec;border-radius:7px;box-shadow:0 1px 3px rgba(26,54,82,.04)}
.editor-page h2,.app-editor h2,.backend-page h2{margin:0 0 16px;color:#173b60;font-size:20px}.editor-page h2 span{display:inline-grid;place-items:center;width:22px;height:22px;color:#fff;background:#0060a6;border-radius:50%;font-size:12px}.basic-grid,.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 22px}.basic-grid{grid-template-columns:1.2fr 1fr 1fr 1.3fr}.basic-grid label,.form-grid label{display:grid;gap:8px}.basic-grid fieldset{display:flex;align-items:end;margin:0;padding:0;border:0}.basic-grid legend{position:absolute}.editor-page input,.editor-page textarea,.app-editor input,.app-editor textarea{width:100%;min-height:40px;padding:9px 11px;color:#3e5571;background:#f8fafc;border:1px solid #d8e2ec;border-radius:4px}.editor-page textarea,.app-editor textarea{resize:vertical}.editor-split{display:grid;grid-template-columns:1fr 1fr;gap:14px}.upload,.choose,.upload-box{width:100%;min-height:64px;display:grid;place-items:center;color:#6b7d91;background:#f8fafc;border:1px dashed #a9c8ef;border-radius:4px}.selected{margin:8px 0;padding:12px;background:#f7f9fc;border:1px solid #dce5ef}.editor-page footer,.app-editor footer{display:flex;justify-content:center;gap:18px;padding:20px}.editor-page footer button,.app-editor footer button{min-width:120px;min-height:40px;color:#0060a6;background:#fff;border:1px solid #0060a6;border-radius:4px}.editor-page button:disabled,.app-editor button:disabled{color:#929dab;background:#f2f4f7;border-color:#d9e2ec}.app-editor form{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:14px}.edit-main{display:grid;gap:14px}.edit-main>section{margin:0}.form-grid .wide{grid-column:1/-1}.assets-form ul{margin-bottom:0}.app-editor aside>section:first-child{margin-top:0}.app-editor aside dl div{display:grid;grid-template-columns:100px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid #e7edf3}.app-editor aside dd{margin:0}.app-editor footer{grid-column:1/-1}
.config-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.config-grid>section{margin-top:0}.section-heading{min-height:54px;display:flex;align-items:flex-start;justify-content:space-between;gap:15px}.section-heading p{margin:4px 0 0;color:#6b7d91}.table-scroll{max-width:100%;overflow-x:auto}.backend-page table{width:100%;min-width:620px;margin-top:10px;border-collapse:collapse}.backend-page th,.backend-page td{padding:10px 11px;border-bottom:1px solid #e1e8ef;text-align:left}.backend-page th{color:#38536d;background:#f3f6f9;white-space:nowrap}.backend-page td small,.backend-page td b{display:block}.table-icon{width:34px;height:34px;display:inline-grid;place-items:center;margin-right:8px;color:#0060a6;background:#eaf1f8;border-radius:5px}.log-panel{margin-top:14px}.warning{padding:7px 9px;color:#c83a34;background:#fff2f1;border-radius:4px}.operation-type{color:#c7631a;font-weight:700}.pending{color:#bd6b18}.handled{color:#15845e}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
button:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}input:focus-visible,textarea:focus-visible{border-color:#1f6fca;outline:3px solid rgba(0,96,166,.16);outline-offset:0}@media(max-width:1100px){.config-grid,.app-editor form{grid-template-columns:1fr}.app-editor footer{grid-column:1}}@media(max-width:760px){.remote-record-page,.editor-page,.app-editor,.backend-page{padding:10px}.basic-grid,.form-grid,.editor-split{grid-template-columns:1fr}.form-grid .wide{grid-column:1}.editor-page footer,.app-editor footer{flex-wrap:wrap}.editor-page footer button,.app-editor footer button{width:100%}}
</style>
