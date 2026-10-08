<script setup>
import { computed } from 'vue';

const props = defineProps({
  projection: { type: Object, required: true },
  kind: { type: String, required: true },
});

const detail = computed(() => props.projection.detail?.value || props.projection.detail || {});
const display = value => String(value ?? '').trim() || '—';
const metrics = computed(() => [
  { label: '访问次数', value: detail.value.usageCount == null ? '—' : `${detail.value.usageCount} 次` },
  { label: '应用类型', value: display(props.projection.typeName) },
  { label: '所属业务域', value: display(detail.value.domainName || detail.value.businessScope) },
  { label: '最近更新', value: display(props.projection.updatedAt) },
  { label: '开发单位', value: display(detail.value.developerOrgName || detail.value.responsibleOrgName) },
  { label: '负责人', value: display(detail.value.ownerName), person: true },
  { label: '开发者', value: display(detail.value.developerName), person: true },
]);
</script>

<template>
  <dl v-if="projection.remoteMode" class="detail-metrics" :class="{ 'rpa-metrics': kind === 'rpa' }" aria-label="应用关键指标">
    <div v-for="(metric, index) in metrics" :key="metric.label">
      <b aria-hidden="true">{{ index + 1 }}</b>
      <dt>{{ metric.label }}</dt>
      <dd :data-person-name="metric.person || undefined">{{ metric.value }}</dd>
    </div>
  </dl>
</template>
