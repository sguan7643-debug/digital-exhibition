<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  page: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['restore']);
const announcement = ref('');
let loadingTimer;

onMounted(() => {
  if (props.page.state === 'loading') {
    loadingTimer = window.setTimeout(() => {
      announcement.value = '内容加载完成';
      emit('restore');
    }, 800);
  }
});

onBeforeUnmount(() => window.clearTimeout(loadingTimer));
</script>

<template>
  <article class="generic-page" :data-state="page.state" :aria-busy="page.state === 'loading'">
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>

    <template v-if="page.state === 'normal'">
      <header class="page-title">
        <div><span>数智展厅</span><h1>{{ page.title }}</h1></div>
        <span class="page-role">{{ page.role }}</span>
      </header>
      <section class="content-card">
        <div class="reference-badge" aria-hidden="true">{{ page.id }}</div>
        <h2>{{ page.title }}</h2>
        <p>页面使用固定种子 817 的本地演示数据。</p>
        <div class="mock-grid" aria-label="确定性演示内容">
          <div v-for="index in 6" :key="index"><strong>{{ String(index).padStart(2, '0') }}</strong><span>演示条目 {{ index }}</span></div>
        </div>
      </section>
    </template>

    <section v-else-if="page.state === 'loading'" class="state-card" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span><h1>{{ page.title }}</h1><p>内容加载中，请稍候。</p>
    </section>

    <section v-else-if="page.state === 'empty'" class="state-card">
      <span class="state-symbol" aria-hidden="true">◇</span><h1>{{ page.title }}</h1><p>暂无可展示内容。</p>
      <a href="/workbench">返回工作台</a>
    </section>

    <section v-else-if="page.state === 'error'" class="state-card" role="alert">
      <span class="state-symbol danger" aria-hidden="true">!</span><h1>{{ page.title }}</h1><p>内容加载失败，请重试。</p>
      <button type="button" @click="$emit('restore')">重试</button>
    </section>

    <section v-else-if="page.state === 'disabled'" class="state-card">
      <span class="state-symbol" aria-hidden="true">×</span><h1>{{ page.title }}</h1><p>该功能当前不可用。</p>
      <button type="button" disabled>暂不可用</button>
    </section>

    <section v-else-if="page.state === 'permission-denied'" class="state-card" role="alert">
      <span class="state-symbol danger" aria-hidden="true">!</span><h1>{{ page.title }}</h1><p>当前角色无权访问该页面。</p>
      <a href="/workbench">返回工作台</a>
    </section>
  </article>
</template>

<style scoped>
.generic-page { min-height: calc(100vh - 62px); padding: 20px; }
.page-title { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
.page-title span { color: #8d9aa8; font-size: 12px; }
.page-title h1 { margin: 5px 0 0; color: #253a51; font-size: 22px; }
.page-role { padding: 6px 11px; color: #247ed9 !important; background: #eaf4ff; border-radius: 3px; }
.content-card { position: relative; min-height: 450px; padding: 36px; overflow: hidden; background: #fff; border: 1px solid #e8edf3; border-radius: 5px; box-shadow: 0 2px 9px rgb(34 64 94 / 5%); }
.reference-badge { position: absolute; top: -18px; right: 23px; color: #eaf2fa; font-size: 130px; line-height: 1; font-weight: 800; }
.content-card h2 { position: relative; margin: 0 0 10px; color: #2c4259; font-size: 20px; }
.content-card p { position: relative; color: #8a97a5; font-size: 13px; }
.mock-grid { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 30px; }
.mock-grid div { min-height: 100px; padding: 21px; background: #f7f9fc; border: 1px solid #edf1f5; border-radius: 4px; }
.mock-grid strong, .mock-grid span { display: block; }
.mock-grid strong { color: #2a84df; font-size: 20px; }
.mock-grid span { margin-top: 12px; color: #69798a; font-size: 13px; }
.state-card { min-height: 430px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; text-align: center; background: #fff; border: 1px solid #e8edf3; border-radius: 5px; }
.state-card h1 { margin: 16px 0 7px; color: #30465c; font-size: 20px; }
.state-card p { margin: 0 0 20px; color: #8794a1; font-size: 14px; }
.state-card button, .state-card a { min-width: 104px; min-height: 38px; display: inline-grid; place-items: center; padding: 0 18px; border: 0; color: #fff; background: #1677df; border-radius: 4px; cursor: pointer; }
.state-card button:disabled { color: #9ca6b1; background: #e8ebef; cursor: not-allowed; }
.state-symbol { width: 60px; height: 60px; display: grid; place-items: center; color: #6c91b8; background: #edf4fb; border-radius: 50%; font-size: 30px; }
.state-symbol.danger { color: #e26767; background: #fff0f0; }
.spinner { width: 42px; height: 42px; border: 4px solid #dceafb; border-top-color: #1677df; border-radius: 50%; animation: spin .8s linear infinite; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
button:focus-visible, a:focus-visible { outline: 3px solid #ff9f1a; outline-offset: 3px; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation: none; border-top-color: #1677df; } }
@media (max-width: 760px) { .generic-page { padding: 12px; } .mock-grid { grid-template-columns: 1fr; } }
</style>
