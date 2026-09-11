<script setup>
defineProps({ projection: { type: Object, required: true } });
</script>
<template>
  <slot v-if="projection.contentVisible" />
  <section v-else class="detail-inline-state" :role="projection.state === 'loading' || projection.state === 'empty' ? 'status' : 'alert'">
    <span v-if="projection.state === 'loading'">正在加载应用详情…</span>
    <span v-else-if="projection.state === 'auth'">需要完成飞书授权或获得应用详情权限。</span>
    <span v-else-if="projection.state === 'error'">应用详情暂不可用，请稍后重试。</span>
    <span v-else>当前没有可展示的真实应用详情。</span>
  </section>
</template>
<style scoped>.detail-inline-state{min-height:320px;display:grid;place-items:center;margin:18px 22px;padding:24px;color:#61758b;background:#fff;border:1px solid #dce5ef;border-radius:7px}.detail-inline-state[role=alert]{color:#963229}</style>
