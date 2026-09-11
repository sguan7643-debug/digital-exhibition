<script setup>
import { computed } from 'vue';

const props = defineProps({ integrationData: { type: Object, default: null }, integrationState: { type: String, default: 'loading' }, operationExecutor: { type: Function, default: null } });
const detail = computed(() => props.integrationData?.['APP-003'] || null);
const state = computed(() => {
  if (props.integrationState === 'loading') return 'loading';
  if (['authentication-required', 'permission-denied'].includes(props.integrationState)) return 'auth';
  if (['error', 'timeout', 'rate-limited', 'schema-drift', 'security-error'].includes(props.integrationState)) return 'error';
  return detail.value?.appId ? 'normal' : 'empty';
});
const rows = computed(() => state.value === 'normal' ? [
  ['应用编号', detail.value.appCode || detail.value.appId], ['应用类型', detail.value.typeName || detail.value.typeCode || '—'],
  ['版本号', detail.value.versionName || '—'], ['负责人/开发者', detail.value.ownerName || detail.value.developerName || '—'],
  ['负责部门', detail.value.departmentName || detail.value.ownerDepartmentName || '—'], ['更新时间', detail.value.updatedAt || '—'],
  ['应用状态', detail.value.status || '—'], ['附件数量', String(detail.value.attachments?.length || 0)]
] : []);
</script>
<template>
  <article class="product-detail remote-detail" aria-labelledby="remote-app-title" :data-state="state">
    <section v-if="state === 'loading'" role="status">正在加载应用详情的受控只读数据…</section>
    <section v-else-if="state === 'auth'" role="alert">需要完成飞书授权或获得应用详情只读权限后才能查看数据。</section>
    <section v-else-if="state === 'error'" role="alert">应用详情暂不可用，请稍后重试。</section>
    <section v-else-if="state === 'empty'" role="status">当前没有可展示的真实应用详情。</section>
    <template v-else>
      <header class="detail-hero"><div class="detail-title"><h1 id="remote-app-title">{{ detail.name }}</h1><mark>{{ detail.typeName || detail.typeCode || '—' }}</mark><p>{{ detail.summary || detail.description || '—' }}</p></div></header>
      <section class="detail-panel detail-panel--full"><h2>应用基本信息</h2><dl class="info-grid"><div v-for="([label, value]) in rows" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></div></dl></section>
    </template>
  </article>
</template>
<style scoped>
.remote-detail{padding:18px 22px;color:#17304f}.remote-detail>section[role]{min-height:280px;display:grid;place-items:center;background:#fff;border:1px solid #dce5ef;border-radius:7px;color:#61758b}.remote-detail>section[role=alert]{color:#9b3128}.detail-hero,.detail-panel{padding:24px;background:#fff;border:1px solid #dce5ef;border-radius:7px}.detail-title h1{margin:0 0 10px;font-size:28px;color:#173b60}.detail-title p{max-width:850px;line-height:1.7;color:#526b83}.detail-title mark{padding:3px 8px;color:#0060a6;background:#edf5ff}.detail-panel{margin-top:14px}.detail-panel h2{margin-top:0}.info-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0}.info-grid div{padding:12px;background:#f8fafc}.info-grid dt{font-size:13px;color:#718397}.info-grid dd{margin:7px 0 0;color:#173b60}@media(max-width:900px){.info-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
