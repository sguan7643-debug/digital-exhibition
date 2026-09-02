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
.integration-auth-banner{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:12px 24px 0;padding:12px 16px;color:#17304f;background:#f1f7ff;border:1px solid #b8d4f5;border-radius:6px;font-size:13px}.integration-auth-banner a{flex:0 0 auto;padding:8px 14px;color:#fff;background:#075fc4;border-radius:4px;text-decoration:none}.integration-auth-banner a:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:760px){.integration-auth-banner{margin:10px 12px 0;align-items:flex-start;flex-direction:column}}
</style>
