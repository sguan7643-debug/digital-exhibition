<script setup>
import TypeLineIcon from './TypeLineIcon.vue';
import AppDetailStateBoundary from './AppDetailStateBoundary.vue';
import AppDetailRemoteFacts from './AppDetailRemoteFacts.vue';
import AppDetailAuthoritativeBody from './AppDetailAuthoritativeBody.vue';

defineProps({
  projection: { type: Object, required: true },
  icon: { type: String, required: true },
});
</script>

<template>
  <article
    v-if="projection.contentVisible"
    class="product-detail remote-app-detail"
    aria-labelledby="remote-app-title"
    data-authoritative-detail="true"
  >
    <nav class="detail-crumb" aria-label="面包屑">
      <a href="/apps" data-detail-return>应用中心</a>　/　应用详情
    </nav>
    <header class="detail-hero">
      <div class="detail-hero-main">
        <span class="detail-logo detail-type-icon" role="img" aria-label="应用类型图标">
          <TypeLineIcon :name="icon" :size="34" />
        </span>
        <div class="detail-title">
          <h1 id="remote-app-title">{{ projection.name }}</h1>
          <p>{{ projection.summary || '飞书多维表格未提供应用摘要。' }}</p>
          <mark v-if="projection.typeName">{{ projection.typeName }}</mark>
        </div>
      </div>
    </header>
    <AppDetailRemoteFacts :projection="projection" />
    <AppDetailAuthoritativeBody :projection="projection" />
  </article>
  <AppDetailStateBoundary v-else :projection="projection" />
</template>

<style scoped>
.remote-app-detail { min-height: 100%; }
.remote-app-detail .detail-hero { min-height: 180px; }
a:focus-visible { outline: 3px solid #ff9f1a; outline-offset: 2px; }
</style>
