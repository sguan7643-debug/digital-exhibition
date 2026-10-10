<script setup>
import { computed, ref, watch } from 'vue';
import TypeLineIcon from './TypeLineIcon.vue';
import AppDetailStateBoundary from './AppDetailStateBoundary.vue';
import AppDetailRemoteFacts from './AppDetailRemoteFacts.vue';
import AppDetailAuthoritativeBody from './AppDetailAuthoritativeBody.vue';
import AppDetailLiveSections from './AppDetailLiveSections.vue';
import { projectAppDetailDirectoryNames, resolveAppDetailDirectoryNames } from '../integration/app-detail-directory-names.js';

const props = defineProps({
  projection: { type: Object, required: true },
  integrationData: { type: Object, default: null },
  icon: { type: String, required: true },
  kind: { type: String, required: true },
  operationExecutor: { type: Function, default: null },
  actionExecutor: { type: Function, default: null },
  writesEnabled: { type: Boolean, default: false },
});

const detail = computed(() => props.projection.detail?.value || props.projection.detail || {});
const resolvedDirectoryNames = ref({});
let directoryResolutionRun = 0;
const directoryResolutionKey = computed(() => {
  const source = detail.value;
  return [
    source.appId,
    source.ownerId, source.ownerName,
    source.developerId, source.developerName,
    source.responsibleOrgId, source.responsibleOrgName,
    source.developerOrgId, source.developerOrgName,
    typeof props.operationExecutor === 'function' ? 'enabled' : 'disabled',
  ].map(value => String(value ?? '').trim()).join('\u0000');
});
watch(directoryResolutionKey, async () => {
  const run = ++directoryResolutionRun;
  resolvedDirectoryNames.value = {};
  if (!detail.value.appId || typeof props.operationExecutor !== 'function') return;
  const names = await resolveAppDetailDirectoryNames({ ...detail.value }, props.operationExecutor);
  if (run === directoryResolutionRun) resolvedDirectoryNames.value = names;
}, { immediate: true });
const displayDetail = computed(() => projectAppDetailDirectoryNames(detail.value, resolvedDirectoryNames.value));
const displayProjection = computed(() => ({
  ...props.projection,
  detail: displayDetail.value,
  ownerName: displayDetail.value.ownerName || displayDetail.value.developerName || '—',
  departmentName: displayDetail.value.responsibleOrgName || displayDetail.value.developerOrgName || '—',
}));
const FAMILY_CLASSES = Object.freeze({
  tool: 'tool-detail', work: 'work-detail', report: 'report-detail', dashboard: 'dashboard-detail',
  dataset: 'dataset-detail', metric: 'metric-detail', ai: 'ai-detail', ead: 'ead-detail', rpa: 'rpa-detail',
});
const familyClass = computed(() => FAMILY_CLASSES[props.kind] || 'tool-detail');
const categoryLabel = computed(() => props.projection.typeName || '应用');
const tags = computed(() => {
  const values = [
    ...(Array.isArray(detail.value.keywords) ? detail.value.keywords : []),
    ...(Array.isArray(detail.value.sceneNames) ? detail.value.sceneNames : []),
    detail.value.domainName,
  ].map(value => String(value || '').trim()).filter(Boolean);
  return [...new Set(values)].slice(0, 5);
});
const supportsMetricBuild = computed(() => ['report', 'dashboard', 'metric'].includes(props.kind));

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <article
    v-if="projection.contentVisible"
    class="product-detail remote-app-detail"
    :class="familyClass"
    aria-labelledby="remote-app-title"
    data-authoritative-detail="true"
    :data-detail-family="kind"
  >
    <nav class="detail-crumb" aria-label="面包屑">
      <a href="/apps" data-detail-return>应用中心</a><span aria-hidden="true">/</span><span>{{ categoryLabel }}</span><span aria-hidden="true">/</span><span>应用详情</span>
    </nav>
    <header class="detail-hero">
      <div class="detail-hero-main">
        <span class="detail-logo detail-type-icon" role="img" aria-label="应用类型图标">
          <TypeLineIcon :name="icon" :size="34" />
        </span>
        <div class="detail-title">
          <h1 id="remote-app-title">{{ projection.name }}</h1>
          <mark v-if="projection.typeName">{{ projection.typeName }}</mark>
          <p>{{ projection.summary || '—' }}</p>
          <p>应用URL地址　{{ detail.externalUrl || '本地受控访问' }}</p>
          <div class="detail-tags" aria-label="应用标签">
            <strong>应用关键词</strong>
            <mark v-for="tag in tags" :key="tag">{{ tag }}</mark>
            <span v-if="!tags.length">—</span>
          </div>
        </div>
        <div class="detail-hero-side" aria-label="应用操作">
          <button type="button" aria-controls="live-app-actions" @click="scrollTo('live-app-actions')">收藏</button>
          <button type="button" aria-controls="live-app-actions" @click="scrollTo('live-app-actions')">申请使用</button>
          <button v-if="supportsMetricBuild" type="button" class="metric-build-trigger" aria-controls="detail-features" @click="scrollTo('detail-features')">个性化指标构建</button>
        </div>
      </div>
    </header>
    <AppDetailRemoteFacts :projection="displayProjection" :kind="kind" />
    <AppDetailAuthoritativeBody :projection="displayProjection" :kind="kind" />
    <AppDetailLiveSections
      :integration-data="integrationData || { 'APP-003': detail }"
      integration-state="normal"
      :operation-executor="operationExecutor"
      :action-executor="actionExecutor"
      :writes-enabled="writesEnabled"
    />
  </article>
  <AppDetailStateBoundary v-else :projection="projection" />
</template>

<style scoped>
.remote-app-detail { min-height: 100%; overflow: visible; }
.remote-app-detail .detail-hero { min-height: 0; }
.detail-crumb span { color: #6b7d91; }
a:focus-visible { outline: 3px solid #ff9f1a; outline-offset: 2px; }
</style>
