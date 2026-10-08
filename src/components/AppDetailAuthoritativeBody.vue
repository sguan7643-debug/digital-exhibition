<script setup>
import { computed } from 'vue';
import { normalizeAttachmentPresentation } from '../integration/attachment-presentation.js';

const props = defineProps({
  projection: { type: Object, required: true },
  kind: { type: String, required: true },
});

const detail = computed(() => props.projection.detail?.value || props.projection.detail || {});
const display = value => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map(display).filter(item => item !== '—').join('、') || '—';
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, child]) => ['string', 'number', 'boolean'].includes(typeof child))
      .map(([key, child]) => `${key}：${child}`)
      .join('；') || '—';
  }
  return String(value);
};
const list = value => Array.isArray(value) ? value : [];
const titleOf = item => display(item?.title || item?.name || item?.label || item?.fieldName || item?.stepName || item);
const descriptionOf = item => display(item?.description || item?.summary || item?.content || item?.definition || item?.value || '');
const appCode = computed(() => display(detail.value.appCode || props.projection.appCode));
const attachments = computed(() => list(detail.value.attachments).map(normalizeAttachmentPresentation));
const trainings = computed(() => list(detail.value.trainings));
const relatedItems = computed(() => [...list(detail.value.relatedApps), ...list(detail.value.relatedMaterials)]);
const features = computed(() => list(detail.value.features));
const fields = computed(() => list(detail.value.fieldDefinitions));
const steps = computed(() => list(detail.value.processSteps));
const previews = computed(() => [...list(detail.value.previews), ...list(detail.value.videos)]);
const guides = computed(() => list(detail.value.guides));
const metrics = computed(() => list(detail.value.metrics));

const infoRows = computed(() => {
  const source = detail.value;
  const common = [
    ['应用编码', appCode.value],
    ['版本号', props.projection.versionName],
    ['应用类型', props.projection.typeName],
    ['所属场景', source.domainName || source.businessScope],
    ['负责部门', source.responsibleOrgName || source.developerOrgName || props.projection.departmentName],
    ['负责人', source.ownerName || props.projection.ownerName, true],
    ['开发者', source.developerName, true],
    ['应用描述', source.description || source.summary],
  ];
  const extra = {
    work: [['应用图片或视频', previews.value.length ? `${previews.value.length} 项` : '—']],
    report: [['集成数据', source.dataSourceSummary], ['数据更新频率', source.updateFrequency], ['适用对象', source.applicableUsers], ['应用URL地址', source.externalUrl]],
    dashboard: [['集成数据', source.dataSourceSummary], ['数据更新频率', source.updateFrequency], ['适用对象', source.applicableUsers], ['应用URL地址', source.externalUrl]],
    dataset: [['所属领域', source.domainName], ['应用场景', source.businessScope], ['更新频率', source.updateFrequency], ['适用对象', source.applicableUsers]],
    ead: [['应用内容', source.dataSourceSummary]],
    rpa: [['RPA所属平台', source.typeExtension?.platform || source.externalSystemCode], ['所属描述', source.description || source.summary]],
  }[props.kind] || [];
  return [...common, ...extra].filter(([label], index, rows) => rows.findIndex(([candidate]) => candidate === label) === index);
});

const sizeLabel = value => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return '—';
  if (number < 1024) return `${number} B`;
  if (number < 1024 * 1024) return `${(number / 1024).toFixed(1)} KB`;
  return `${(number / 1024 / 1024).toFixed(1)} MB`;
};
</script>

<template>
  <template v-if="projection.remoteMode">
  <section data-detail-section="information" class="detail-panel detail-panel--full" :class="{ 'detail-panel--half': ['work', 'report', 'dashboard', 'ead'].includes(kind) }">
    <h2>{{ ['report', 'dashboard', 'metric'].includes(kind) ? '应用简介' : '应用基本信息' }}</h2>
    <dl class="info-grid" :class="{ 'work-info': kind === 'work', 'ead-info': kind === 'ead' }">
      <div v-for="([label, value, person]) in infoRows" :key="label">
        <dt>{{ label }}</dt>
        <dd :data-person-name="person || undefined">{{ display(value) }}</dd>
      </div>
    </dl>
  </section>

  <section v-if="['report', 'dashboard'].includes(kind)" id="detail-features" data-detail-section="features" class="detail-panel detail-panel--half">
    <h2>核心功能</h2>
    <div v-if="features.length" class="feature-grid">
      <article v-for="(item, index) in features" :key="item.id || index"><b>{{ index + 1 }}</b><strong>{{ titleOf(item) }}</strong><p>{{ descriptionOf(item) }}</p></article>
    </div>
    <p v-else class="detail-empty">暂无核心功能</p>
  </section>

  <section v-if="['report', 'dashboard'].includes(kind)" data-detail-section="preview" class="detail-panel detail-panel--full detail-panel--preview">
    <h2>演示截图</h2>
    <figure v-if="previews.length"><div class="preview-wide preview-placeholder">{{ titleOf(previews[0]) }}</div><figcaption>{{ descriptionOf(previews[0]) }}</figcaption></figure>
    <p v-else class="detail-empty preview-wide">暂无演示截图</p>
  </section>

  <section v-if="kind === 'work'" data-detail-section="guide" class="detail-panel detail-panel--half video-cell">
    <h2>使用指南</h2>
    <dl class="info-grid">
      <div><dt>使用功能</dt><dd>{{ features.length ? features.map(titleOf).join('、') : '—' }}</dd></div>
      <div><dt>使用说明</dt><dd>{{ guides.length ? guides.map(titleOf).join('、') : '—' }}</dd></div>
    </dl>
  </section>

  <section v-if="kind === 'dataset'" data-detail-section="fields" class="detail-panel detail-panel--full">
    <h2>数据列表 <span class="more">共 {{ fields.length }} 个字段</span></h2>
    <div class="table-scroll wide">
      <table class="file-list">
        <thead><tr><th>字段名称</th><th>字段类型</th><th>字段定义</th></tr></thead>
        <tbody><tr v-if="!fields.length"><td colspan="3">暂无字段定义</td></tr><tr v-for="(item, index) in fields" :key="item.id || index"><td>{{ titleOf(item) }}</td><td>{{ display(item.type || item.fieldType) }}</td><td>{{ descriptionOf(item) }}</td></tr></tbody>
      </table>
    </div>
  </section>

  <section v-if="kind === 'metric'" id="detail-features" data-detail-section="metrics" class="detail-panel detail-panel--full metric-strip">
    <h2>应用简介</h2>
    <p class="metric-copy">{{ display(detail.description || detail.summary) }}</p>
    <div class="table-scroll"><table class="metric-table"><thead><tr><th>指标名称</th><th>定义</th><th>口径</th></tr></thead><tbody><tr v-if="!metrics.length"><td colspan="3">暂无指标</td></tr><tr v-for="(item, index) in metrics" :key="item.id || index"><td>{{ titleOf(item) }}</td><td>{{ descriptionOf(item) }}</td><td>{{ display(item.formula || item.caliber) }}</td></tr></tbody></table></div>
  </section>

  <section v-if="kind === 'ai'" id="detail-features" data-detail-section="capabilities" class="detail-panel detail-panel--full">
    <h2>应用基本信息</h2>
    <div class="table-scroll"><table class="ai-table"><thead><tr><th>能力</th><th>说明</th></tr></thead><tbody><tr v-if="!features.length"><td colspan="2">暂无能力说明</td></tr><tr v-for="(item, index) in features" :key="item.id || index"><td>{{ titleOf(item) }}</td><td>{{ descriptionOf(item) }}</td></tr></tbody></table></div>
  </section>

  <section v-if="kind === 'ead'" data-detail-section="content" class="detail-panel detail-panel--half ead-content">
    <h2>应用内容</h2>
    <p :class="{ 'ead-empty': !features.length }">{{ features.length ? features.map(titleOf).join('、') : '暂无应用内容' }}</p>
  </section>
  <section v-if="kind === 'ead'" id="detail-features" data-detail-section="flow" class="detail-panel detail-panel--full">
    <h2>使用说明与流程</h2>
    <ol class="ead-flow"><li v-if="!steps.length">暂无流程步骤</li><li v-for="(item, index) in steps" :key="item.id || index"><strong>{{ index + 1 }}. {{ titleOf(item) }}</strong><p>{{ descriptionOf(item) }}</p></li></ol>
  </section>

  <section v-if="kind === 'rpa'" data-detail-section="recording" class="detail-panel detail-panel--full detail-panel--preview">
    <h2>流程录屏</h2>
    <div class="rpa-recording"><div v-if="previews.length" class="rpa-recording-content">{{ titleOf(previews[0]) }}</div><p v-else class="rpa-recording-empty">暂无流程录屏</p></div>
  </section>
  <section v-if="kind === 'rpa'" id="detail-features" data-detail-section="flow" class="detail-panel detail-panel--full">
    <h2>操作流程概览</h2>
    <ol class="rpa-flow"><li v-if="!steps.length">暂无流程步骤</li><li v-for="(item, index) in steps" :key="item.id || index"><span class="rpa-category">{{ index + 1 }}</span><strong>{{ titleOf(item) }}</strong><p>{{ descriptionOf(item) }}</p></li></ol>
  </section>

  <section v-if="['tool', 'report', 'dashboard', 'metric'].includes(kind)" data-detail-section="guide" class="detail-panel detail-panel--half usage-panel">
    <h2>使用说明</h2>
    <ul v-if="guides.length" class="related-row"><li v-for="(item, index) in guides" :key="item.id || index">{{ titleOf(item) }}</li></ul>
    <p v-else class="detail-empty">暂无使用说明</p>
  </section>

  <section data-detail-section="attachments" class="detail-panel detail-panel--half">
    <h2>附件资料</h2>
    <div class="table-scroll wide attachment-items"><table class="file-list" :class="{ 'rpa-attachments': kind === 'rpa' }"><thead><tr><th>文件名称</th><th>类型</th><th>大小</th><th>状态</th></tr></thead><tbody><tr v-if="!attachments.length"><td colspan="4">暂无附件资料</td></tr><tr v-for="file in attachments" :key="file.key"><td>{{ file.name }}</td><td>{{ file.type }}</td><td>{{ sizeLabel(file.sizeBytes) }}</td><td>{{ file.downloadable ? '可下载' : '仅展示' }}</td></tr></tbody></table></div>
  </section>

  <section data-detail-section="training" class="detail-panel detail-panel--half" :class="{ 'dataset-training': kind === 'dataset' }">
    <h2>相关培训内容</h2>
    <div v-if="trainings.length" class="training-row"><article v-for="(item, index) in trainings" :key="item.trainingId || item.id || index"><div><h3>{{ titleOf(item) }}</h3><p>{{ descriptionOf(item) }}</p></div></article></div>
    <div v-else-if="kind === 'rpa'" class="table-scroll"><table class="file-list rpa-training-list"><tbody><tr><td>暂无相关培训</td></tr></tbody></table></div>
    <p v-else class="detail-empty">暂无相关培训</p>
  </section>

  <section data-detail-section="related" class="detail-panel detail-panel--full">
    <h2>关联素材</h2>
    <div v-if="relatedItems.length" class="related-row"><article v-for="(item, index) in relatedItems" :key="item.appId || item.materialId || item.id || index"><div><h3>{{ titleOf(item) }}</h3><p>{{ descriptionOf(item) }}</p></div></article></div>
    <p v-else class="detail-empty">暂无关联素材</p>
  </section>
  </template>
</template>

<style scoped>
.detail-empty{min-height:72px;display:grid;place-items:center;margin:0;color:#6b7d91;text-align:center}
.table-scroll{max-width:100%;overflow:auto}
.preview-placeholder{min-height:190px;display:grid;place-items:center;color:#6b7d91;background:#f5f7fa;border:1px dashed #ccd8e5}
.metric-copy{margin:0 0 14px;color:#3e5571;line-height:1.7}
.metric-table,.ai-table{width:100%;border-collapse:collapse;color:#3e5571}
.metric-table th,.metric-table td,.ai-table th,.ai-table td{padding:10px 12px;border:1px solid #e7edf3;text-align:left}
.metric-table th,.ai-table th{color:#102a4c;background:#f5f7fa}
.ead-flow,.rpa-flow{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.ead-flow li,.rpa-flow li{min-height:62px;padding:12px;border:1px solid #e7edf3;border-radius:6px}
.ead-flow p,.rpa-flow p{margin:5px 0 0;color:#6b7d91}
.rpa-category{display:inline-grid;place-items:center;width:24px;height:24px;margin-right:8px;color:#0060a6;background:#eaf1f8;border-radius:5px}
.rpa-recording{min-height:190px;display:grid;place-items:center;background:#f5f7fa;border:1px dashed #ccd8e5}
.rpa-recording-empty{color:#6b7d91}
.related-row{margin:0;padding:0;list-style:none}
@media(max-width:760px){.metric-table,.ai-table{min-width:560px}.preview-placeholder,.rpa-recording{min-height:130px}}
</style>
