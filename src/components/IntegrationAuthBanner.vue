<script setup>
defineProps({ href: { type: String, required: true } });
</script>

<template>
  <aside class="integration-auth-banner" role="status" aria-live="polite">
    <span>当前页面包含仅限本人的飞书数据，请先完成飞书登录。</span>
    <a :href="href">登录飞书并读取本人数据</a>
  </aside>
</template>

<style scoped>
.integration-auth-banner{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0;padding:13px 15px;color:#17304f;background:rgba(241,247,255,.98);border:1px solid #b8d4f5;border-radius:12px;box-shadow:0 12px 32px rgba(8,35,70,.18);backdrop-filter:blur(10px);font-size:13px;animation:integration-auth-in .2s ease-out}.integration-auth-banner a{flex:0 0 auto;padding:8px 12px;color:#fff;background:#075fc4;border-radius:7px;text-decoration:none;white-space:nowrap}.integration-auth-banner a:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@keyframes integration-auth-in{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:none}}@media(max-width:760px){.integration-auth-banner{align-items:flex-start;flex-direction:column}.integration-auth-banner a{width:100%;text-align:center}}@media(prefers-reduced-motion:reduce){.integration-auth-banner{animation:none}}
</style>
