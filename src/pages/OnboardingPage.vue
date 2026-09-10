<script setup>
// Reference SHA-256: FC7F33ED038DD52F20892D1C4A7F58FAFF57FB54658B06443A1A885B1EB86F68
import { computed, onMounted, ref } from 'vue';
import { getOnboardingStatus } from '../integration/onboarding-approval.js';

const query = new URLSearchParams(window.location.search);
const instanceId = query.get('instanceId') || '';
const source = query.get('source') || '';
const status = ref(instanceId ? 'LOADING' : source ? 'PENDING' : 'NOT_STARTED');
const error = ref('');
const labels = Object.freeze({
  NOT_STARTED: ['待申请', '尚未发起申请'], LOADING: ['查询中', '正在读取真实审批状态'],
  PENDING: ['审批中', '审批流程进行中'], APPROVED: ['审批完成', '审批已通过'],
  REJECTED: ['审批退回', '审批未通过，已退回'], CANCELLED: ['审批取消', '审批申请已取消'],
  ERROR: ['查询失败', '暂时无法读取审批状态']
});
const current = computed(() => labels[status.value] || labels.PENDING);

async function loadStatus() {
  if (!instanceId) return;
  status.value = 'LOADING';
  error.value = '';
  try {
    const result = await getOnboardingStatus(instanceId);
    status.value = result.status;
  } catch (reason) {
    status.value = 'ERROR';
    error.value = reason instanceof Error ? reason.message : '审批状态查询失败';
  }
}

onMounted(loadStatus);
</script>
<template><article class="onboarding-page" aria-labelledby="onboarding-title"><nav aria-label="面包屑">我的首页　/　数字化认证　/　应用审批</nav><section><h1 id="onboarding-title">审批状态</h1><div class="approval-live" role="status" aria-live="polite"><span :class="status.toLowerCase()" aria-hidden="true">{{ status === 'APPROVED' ? '✓' : status === 'REJECTED' ? '!' : '…' }}</span><div><strong>{{ current[0] }}</strong><p>{{ current[1] }}</p><small v-if="instanceId">实例：{{ instanceId }}</small></div></div><p v-if="error" class="status-error" role="alert">{{ error }}</p><button v-if="status === 'ERROR'" type="button" @click="loadStatus">重新查询</button><a v-if="!instanceId" href="/apps/onboarding/apply">发起应用上架申请</a></section></article></template>
<style scoped>.onboarding-page{padding:17px;color:#17304f}.onboarding-page>nav{height:32px;color:#60758d;font-size:12px}.onboarding-page>section{min-height:240px;padding:28px;background:#fff;border:1px solid #dce5ef;border-radius:6px}.onboarding-page h1{margin:0 0 28px;font-size:18px}.approval-live{display:flex;align-items:center;gap:18px}.approval-live>span{width:54px;height:54px;display:grid;place-items:center;color:#0060a6;background:#fff;border:2px solid #0060a6;border-radius:50%;font-weight:700}.approval-live>span.approved{color:#18865f;border-color:#18865f}.approval-live>span.rejected,.approval-live>span.cancelled,.approval-live>span.error{color:#c93737;border-color:#c93737}.approval-live strong{font-size:16px}.approval-live p{margin:8px 0;color:#6b7d93;font-size:12px}.approval-live small{color:#7a8c9e}.status-error{color:#a52222}.onboarding-page button,.onboarding-page a{display:inline-flex;margin-top:22px;padding:9px 16px;color:#0060a6;background:#fff;border:1px solid #7da8d6;border-radius:4px}.onboarding-page :is(button,a):focus-visible{outline:3px solid rgba(11,103,199,.28);outline-offset:2px}@media(max-width:700px){.onboarding-page>section{padding:20px}}
</style>
