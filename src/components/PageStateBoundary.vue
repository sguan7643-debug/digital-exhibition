<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const RESULT_SELECTOR='[data-state-result],.panel,.message-stats,.message-panel,.favorite-stats,.favorite-grid,.favorite-pagination,.notice-stats,.notice-table,.apps-tools,.apps-grid,.apps-empty,.apps-pagination,.point-stats,.point-layout,.rule-panel,.detail-stats,.point-tabs,.point-table,.course-grid,.training-pagination,.ops-stats,.ops-grid,.operations-page>footer,.admin-stats,.admin-table,.app-admin-stats,.app-admin-table,.config-grid,.log-panel,.talent-people main>section,.talent-projects main>section,.progress-table';

const props=defineProps({
  page:{type:Object,required:true},
  state:{type:String,default:'normal'}
});
const emit=defineEmits(['restore']);
const normalizeState=value=>value==='empty'&&!props.page.empty?'normal':value;
const localState=ref(normalizeState(props.state));
const stateHeading=ref(null);
const retainedPage=ref(null);
const announcement=ref('');
const recovering=ref('');
let loadingTimer;

const contentVisible=computed(()=>['normal','empty','disabled'].includes(localState.value)||recovering.value==='empty');
const contentDisabled=computed(()=>localState.value==='disabled');
function syncResultRegions(){
  nextTick(()=>{
    const hidden=localState.value==='empty'||recovering.value==='empty';
    retainedPage.value?.querySelectorAll(RESULT_SELECTOR).forEach(node=>{
      if(hidden){node.hidden=true;node.setAttribute('inert','');node.setAttribute('aria-hidden','true');}
      else{node.hidden=false;node.removeAttribute('inert');node.removeAttribute('aria-hidden');}
    });
  });
}
function focusResult(){
  nextTick(()=>{
    const target=retainedPage.value?.querySelector('[data-state-result-heading]')||retainedPage.value?.querySelector('h1,h2,[role="heading"]');
    if(!target)return;
    target.setAttribute('data-state-result-heading','');
    target.setAttribute('tabindex','-1');
    target.focus();
  });
}
function finishLoading(){
  window.clearTimeout(loadingTimer);
  loadingTimer=window.setTimeout(()=>{
    announcement.value='内容加载完成';
    emit('restore');
    nextTick(focusResult);
  },800);
}
function retry(){
  if(recovering.value)return;
  recovering.value='error';
  localState.value='loading';
  announcement.value='正在重新加载';
  finishLoading();
}
function restore(){
  if(recovering.value)return;
  recovering.value='empty';
  localState.value='loading';
  announcement.value='正在恢复当前页面';
  syncResultRegions();
  finishLoading();
}
function syncState(value){
  window.clearTimeout(loadingTimer);
  recovering.value='';
  localState.value=normalizeState(value);
  announcement.value='';
  if(localState.value==='loading'){announcement.value='正在加载页面';finishLoading();}
  if(localState.value==='permission-denied')nextTick(()=>stateHeading.value?.focus());
  syncResultRegions();
}

onMounted(()=>syncState(props.state));
watch(()=>props.state,syncState);
onBeforeUnmount(()=>window.clearTimeout(loadingTimer));
</script>

<template>
  <section class="page-state-boundary" :data-state="localState" :aria-busy="localState==='loading'">
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <div v-if="localState!=='permission-denied'" ref="retainedPage" class="retained-page" :hidden="!contentVisible" :inert="contentDisabled || !contentVisible" :aria-hidden="contentVisible?undefined:'true'">
      <p v-if="contentDisabled" class="disabled-notice" role="status">当前页面操作暂不可用</p>
      <div :aria-disabled="contentDisabled||undefined"><slot /></div>
    </div>
    <section v-if="localState==='loading'&&!recovering" class="state-surface"><h1>{{ page.title }}</h1><p>内容加载中，请稍候。</p></section>
    <section v-else-if="localState==='empty'||recovering==='empty'" class="inline-state" role="status"><p>{{ recovering?'正在恢复当前页面':'当前筛选条件下暂无内容。' }}</p><button type="button" :aria-disabled="recovering?'true':undefined" @click="restore">{{ recovering?'恢复中':'恢复当前页面' }}</button></section>
    <section v-else-if="localState==='error'||recovering==='error'" class="state-surface" :role="recovering?'status':'alert'"><h1>{{ recovering?'正在重新加载':`${page.title}加载失败` }}</h1><p>{{ recovering?'内容加载中，请稍候。':'本地演示数据暂时不可用。' }}</p><button type="button" :aria-disabled="recovering?'true':undefined" @click="retry">{{ recovering?'重试中':'重试' }}</button></section>
    <section v-else-if="localState==='permission-denied'" class="state-surface" role="alert"><h1 ref="stateHeading" tabindex="-1">访问受限</h1><p>当前角色无权访问该页面。</p><a href="/workbench">返回工作台</a></section>
  </section>
</template>

<style scoped>
.page-state-boundary{min-height:100%}.retained-page{position:relative}.retained-page[aria-hidden=true]{display:none}.retained-page[aria-disabled=true],.retained-page:has(>[aria-disabled=true]){opacity:.72}.disabled-notice{position:sticky;z-index:5;top:0;margin:0;padding:8px 16px;color:#7b5b16;background:#fff7dc;border-bottom:1px solid #f1d680;text-align:center}.inline-state{position:sticky;z-index:4;bottom:12px;display:flex;align-items:center;justify-content:center;gap:16px;margin:12px;padding:12px;color:#30465c;background:#f6f9fc;border:1px solid #d6e2ed;border-radius:4px}.inline-state p{margin:0}.state-surface{min-height:calc(100vh - 69px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;color:#30465c;text-align:center;background:#fff}.state-surface h1{margin:0 0 8px;font-size:20px}.state-surface p{margin:0 0 20px;color:#8794a1}.state-surface button,.state-surface a,.inline-state button{min-width:104px;min-height:38px;display:inline-grid;place-items:center;padding:0 18px;border:0;color:#fff;background:#1677df;border-radius:4px}.state-surface :focus-visible,.inline-state :focus-visible{outline:3px solid #ff9f1a;outline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style>
