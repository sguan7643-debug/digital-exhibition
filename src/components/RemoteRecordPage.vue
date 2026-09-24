<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  record: { type: Object, default: null },
  state: { type: String, default: 'loading' },
});

const sensitiveKey = /token|secret|cookie|authorization|credential|password/i;
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !sensitiveKey.test(key))
      .map(([key, child]) => [key, sanitize(child)]),
  );
}
function display(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(sanitize(value), null, 2);
  return String(value);
}
const rows = computed(() => Object.entries(sanitize(props.record || {})));
const pageState = computed(() => {
  if (['authentication-required', 'permission-denied'].includes(props.state)) return 'permission-denied';
  if (['error', 'timeout', 'rate-limited', 'schema-drift', 'security-error'].includes(props.state)) return 'error';
  if (props.state === 'loading') return 'loading';
  return rows.value.length ? 'normal' : 'empty';
});
</script>

<template>
  <article class="remote-record-page" :data-state="pageState">
    <header>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </header>
    <section v-if="pageState === 'loading'" role="status">正在从飞书多维表格读取数据…</section>
    <section v-else-if="pageState === 'permission-denied'" role="alert">需要完成飞书授权或获得相应读取权限。</section>
    <section v-else-if="pageState === 'error'" role="alert">飞书数据暂时不可用，请稍后重试。</section>
    <section v-else-if="pageState === 'empty'" role="status">飞书多维表格没有返回可展示的数据。</section>
    <dl v-else>
      <div v-for="([key, value]) in rows" :key="key">
        <dt>{{ key }}</dt>
        <dd><pre v-if="value && typeof value === 'object'">{{ display(value) }}</pre><span v-else>{{ display(value) }}</span></dd>
      </div>
    </dl>
  </article>
</template>

<style scoped>
.remote-record-page { min-height: 100%; padding: 24px 32px; color: #17304f; }
header { margin-bottom: 18px; }
h1 { margin: 0; font-size: 26px; }
header p { color: #61758b; }
section, dl { padding: 18px; background: #fff; border: 1px solid #dce5ef; border-radius: 7px; }
section { min-height: 240px; display: grid; place-items: center; text-align: center; }
section[role='alert'] { color: #8f2d24; }
dl { margin: 0; }
dl > div { display: grid; grid-template-columns: minmax(160px, 24%) 1fr; gap: 20px; padding: 12px 0; border-bottom: 1px solid #e6edf3; }
dl > div:last-child { border-bottom: 0; }
dt { color: #61758b; overflow-wrap: anywhere; }
dd { margin: 0; overflow-wrap: anywhere; }
pre { max-height: 320px; margin: 0; overflow: auto; white-space: pre-wrap; font: inherit; }
</style>
