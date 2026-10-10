<script setup>
import { computed, ref } from 'vue';
import TypeLineIcon from '../components/TypeLineIcon.vue';
import { buildApplicationWriteInput } from '../integration/application-actions.js';

const props = defineProps({
  integrationData: { type: Object, default: null },
  integrationState: { type: String, default: 'loading' },
  actionExecutor: { type: Function, default: null },
  writesEnabled: { type: Boolean, default: false },
});

const detail = computed(() => props.integrationData?.['APP-003'] || {});
const query = new URLSearchParams(globalThis.location?.search || '');
const queryAppId = String(query.get('appId') || '').trim();
const appId = computed(() => String(detail.value.appId || queryAppId).trim());
const appName = computed(() => String(detail.value.name || detail.value.appName || '当前应用').trim());
const returnHref = computed(() => {
  const candidate = String(query.get('returnTo') || '').trim();
  return candidate.startsWith('/apps/') && !candidate.startsWith('//') ? candidate : '/apps';
});
const reason = ref('');
const submitting = ref(false);
const submitted = ref(false);
const errorMessage = ref('');
const announcement = ref('');

const pageState = computed(() => {
  if (props.integrationState === 'loading') return 'loading';
  if (['authentication-required', 'permission-denied'].includes(props.integrationState)) return 'permission-denied';
  if (['error', 'timeout', 'rate-limited', 'schema-drift', 'security-error'].includes(props.integrationState)) return 'error';
  return appId.value ? 'normal' : 'empty';
});

async function submitRequest() {
  if (submitting.value || submitted.value) return;
  errorMessage.value = '';
  if (!props.writesEnabled || typeof props.actionExecutor !== 'function') {
    errorMessage.value = '应用使用申请通道暂未启用';
    return;
  }
  if (!appId.value) {
    errorMessage.value = '未读取到应用标识，请返回应用详情后重试';
    return;
  }
  const value = reason.value.trim();
  if (value.length < 5) {
    errorMessage.value = '请填写不少于 5 个字的申请理由';
    return;
  }
  submitting.value = true;
  announcement.value = '正在提交应用使用申请';
  try {
    const input = buildApplicationWriteInput('APP-005', appId.value, { reason: value });
    await props.actionExecutor('APP-005', input, { confirmed: true });
    submitted.value = true;
    announcement.value = '应用使用申请已提交';
  } catch (error) {
    errorMessage.value = error?.message || '应用使用申请提交失败，请稍后重试';
    announcement.value = errorMessage.value;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <article class="use-apply-page" aria-labelledby="use-apply-title" :data-state="pageState">
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <nav class="use-apply-crumb" aria-label="面包屑"><a href="/apps">应用中心</a><span>/</span><a :href="returnHref">应用详情</a><span>/</span><span>申请使用</span></nav>
    <header>
      <div><h1 id="use-apply-title">应用使用申请</h1><p>确认应用信息并填写使用理由，提交后由正式业务通道记录申请。</p></div>
      <a :href="returnHref">返回应用详情</a>
    </header>

    <section v-if="pageState !== 'normal'" class="use-apply-state" :role="pageState === 'loading' ? 'status' : 'alert'">
      <template v-if="pageState === 'loading'">正在加载应用信息…</template>
      <template v-else-if="pageState === 'permission-denied'">需要完成飞书授权后才能申请使用。</template>
      <template v-else-if="pageState === 'error'">应用信息暂时无法读取，请返回详情页后重试。</template>
      <template v-else>未读取到有效的应用标识，请返回应用中心重新选择。</template>
    </section>

    <template v-else>
      <section class="use-apply-summary" aria-label="申请应用">
        <span><TypeLineIcon name="rpa" :size="34" /></span>
        <div><small>申请使用</small><h2>{{ appName }}</h2><p>应用编码：{{ detail.appCode || appId }}</p></div>
      </section>
      <section v-if="submitted" class="use-apply-success" role="status">
        <strong>申请已提交</strong><p>系统已记录本次应用使用申请，请在个人中心查看后续状态。</p>
        <div><a href="/profile">前往个人中心</a><a :href="returnHref">返回应用详情</a></div>
      </section>
      <form v-else class="use-apply-form" :aria-busy="submitting" @submit.prevent="submitRequest">
        <label for="use-reason">申请理由<b>*</b></label>
        <textarea id="use-reason" v-model="reason" required minlength="5" maxlength="300" rows="6" placeholder="请说明使用场景、业务目的和预计使用范围" @input="errorMessage = ''"></textarea>
        <small>{{ reason.length }} / 300</small>
        <p v-if="errorMessage" class="use-apply-error" role="alert">{{ errorMessage }}</p>
        <div><a :href="returnHref">取消</a><button type="submit" :disabled="submitting || !writesEnabled">{{ submitting ? '提交中…' : '提交申请' }}</button></div>
      </form>
    </template>
  </article>
</template>

<style scoped>
.use-apply-page{min-height:100%;padding:18px 22px 32px;color:#173451}.use-apply-crumb{min-height:42px;display:flex;align-items:center;gap:10px;color:#687c91;font-size:13px}.use-apply-crumb a{color:#0060a6}.use-apply-page>header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:16px;padding:24px;background:#fff;border:1px solid #dce5ef;border-radius:10px}.use-apply-page h1{margin:0;font-size:28px}.use-apply-page>header p{margin:8px 0 0;color:#647a90}.use-apply-page>header>a,.use-apply-success a,.use-apply-form>div>a{min-height:40px;display:inline-flex;align-items:center;justify-content:center;padding:0 18px;color:#0060a6;background:#fff;border:1px solid #87a9c8;border-radius:7px}.use-apply-state{min-height:320px;display:grid;place-items:center;padding:30px;background:#fff;border:1px solid #dce5ef;border-radius:10px;color:#647a90}.use-apply-summary{display:flex;align-items:center;gap:18px;padding:20px 24px;background:#fff;border:1px solid #dce5ef;border-radius:10px}.use-apply-summary>span{width:64px;height:64px;display:grid;place-items:center;color:#0060a6;background:#eef5fb;border-radius:12px}.use-apply-summary small{color:#647a90}.use-apply-summary h2{margin:4px 0;font-size:22px}.use-apply-summary p{margin:0;color:#647a90}.use-apply-form,.use-apply-success{max-width:880px;margin:16px auto 0;padding:26px;background:#fff;border:1px solid #dce5ef;border-radius:10px}.use-apply-form{display:grid;gap:12px}.use-apply-form label{font-size:16px;font-weight:650}.use-apply-form b{margin-left:4px;color:#c92f2f}.use-apply-form textarea{width:100%;resize:vertical;padding:14px;border:1px solid #bccddd;border-radius:7px;font:inherit;line-height:1.7}.use-apply-form>small{justify-self:end;color:#70839a}.use-apply-form>div,.use-apply-success>div{display:flex;justify-content:flex-end;gap:12px;margin-top:8px}.use-apply-form button{min-width:120px;min-height:40px;color:#fff;background:#0060a6;border:1px solid #0060a6;border-radius:7px}.use-apply-form button:disabled{opacity:.55}.use-apply-error{margin:0;color:#a52222}.use-apply-success strong{font-size:20px}.use-apply-success p{color:#546b83}.use-apply-success a:first-child{color:#fff;background:#0060a6;border-color:#0060a6}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}a:focus-visible,button:focus-visible,textarea:focus-visible{outline:3px solid #1b77d2;outline-offset:3px}@media(max-width:760px){.use-apply-page{padding:12px}.use-apply-page>header{align-items:flex-start;flex-direction:column}.use-apply-page>header>a{width:100%}.use-apply-form>div,.use-apply-success>div{display:grid}.use-apply-form>div>*{width:100%}}
</style>
