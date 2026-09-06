<script setup>
import { nextTick, reactive, ref } from "vue";
import TypeLineIcon from "./TypeLineIcon.vue";

defineProps({ appName: { type: String, required: true } });
const emit = defineEmits(["submit"]);
const dialog = ref(null);
const formElement = ref(null);
const firstField = ref(null);
const draft = reactive({ name: "", objective: "", definition: "", scope: "", expectedDate: "", notes: "" });

async function open() {
  dialog.value?.showModal();
  await nextTick();
  firstField.value?.focus();
}
function close() {
  dialog.value?.close();
}
function submit() {
  if (!formElement.value?.reportValidity()) return;
  emit("submit", { ...draft });
  Object.assign(draft, { name: "", objective: "", definition: "", scope: "", expectedDate: "", notes: "" });
  close();
}

defineExpose({ open, close });
</script>

<template>
  <dialog ref="dialog" class="indicator-dialog" aria-labelledby="indicator-dialog-title" @cancel.prevent="close">
    <form ref="formElement" @submit.prevent="submit">
      <header><span><TypeLineIcon name="metric" :size="27" /></span><div><h2 id="indicator-dialog-title">个性化指标构建</h2><p>基于“{{ appName }}”发起指标构建申请，提交后进入本地审批演示流程。</p></div><button type="button" aria-label="关闭个性化指标构建" @click="close">×</button></header>
      <div class="indicator-grid">
        <label><span>指标名称<b>*</b></span><input ref="firstField" v-model.trim="draft.name" maxlength="50" required placeholder="请输入指标名称" /></label>
        <label><span>数据范围<b>*</b></span><select v-model="draft.scope" required><option value="" disabled>请选择数据范围</option><option>集团公司</option><option>专业分公司</option><option>直属单位</option><option>指定部门</option></select></label>
        <label class="wide"><span>构建目标<b>*</b></span><textarea v-model.trim="draft.objective" maxlength="200" required placeholder="说明业务目标、使用场景与预期价值"></textarea></label>
        <label class="wide"><span>指标口径<b>*</b></span><textarea v-model.trim="draft.definition" maxlength="200" required placeholder="说明统计周期、计算逻辑、数据来源与口径"></textarea></label>
        <label><span>期望完成时间<b>*</b></span><input v-model="draft.expectedDate" type="date" required /></label>
        <label><span>补充说明</span><input v-model.trim="draft.notes" maxlength="100" placeholder="选填" /></label>
      </div>
      <footer><button type="button" @click="close">取消</button><button type="submit">发起申请</button></footer>
    </form>
  </dialog>
</template>

<style scoped>
.indicator-dialog{width:min(720px,calc(100% - 32px));padding:0;color:#183553;border:0;border-radius:8px;box-shadow:0 20px 65px rgba(5,28,52,.28)}.indicator-dialog::backdrop{background:rgba(4,27,51,.44)}.indicator-dialog form{display:grid;gap:18px;padding:22px}.indicator-dialog header{display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:13px}.indicator-dialog header>span{width:48px;height:48px;display:grid;place-items:center;color:#0060a6;background:#f2f7fc;border:1px solid #d4e0ec;border-radius:6px}.indicator-dialog h2{margin:0;color:#153451;font-size:20px}.indicator-dialog header p{margin:5px 0 0;color:#61758a;font-size:13px;line-height:1.6}.indicator-dialog header button{width:30px;height:30px;color:#3e5570;background:#fff;border:0;font-size:24px}.indicator-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.indicator-grid label{display:grid;gap:7px;color:#29445f;font-size:13px}.indicator-grid label span{font-weight:650}.indicator-grid b{margin-left:3px;color:#c62828}.indicator-grid .wide{grid-column:1/-1}.indicator-grid :is(input,select,textarea){width:100%;min-width:0;padding:0 11px;color:#243e59;background:#fff;border:1px solid #cbd9e6;border-radius:4px}.indicator-grid :is(input,select){height:40px}.indicator-grid textarea{min-height:78px;padding-block:9px;resize:vertical}.indicator-grid :is(input,select,textarea):focus{border-color:#0060a6;outline:3px solid rgba(0,96,166,.12)}.indicator-dialog footer{display:flex;justify-content:flex-end;gap:10px}.indicator-dialog footer button{min-width:96px;height:38px;color:#0060a6;background:#fff;border:1px solid #91acc7;border-radius:4px}.indicator-dialog footer button[type=submit]{color:#fff;background:#0060a6;border-color:#0060a6}@media(max-width:620px){.indicator-grid{grid-template-columns:1fr}.indicator-grid .wide{grid-column:1}}
</style>
