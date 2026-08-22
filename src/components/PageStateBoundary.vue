<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props=defineProps({
  page:{type:Object,required:true},
  state:{type:String,default:'normal'}
});
const emit=defineEmits(['restore']);
const localState=ref(props.state);
const stateHeading=ref(null);
const announcement=ref('');
let loadingTimer;

function focusState(){nextTick(()=>stateHeading.value?.focus());}
function finishLoading(){
  window.clearTimeout(loadingTimer);
  loadingTimer=window.setTimeout(()=>{
    announcement.value='内容加载完成';
    emit('restore');
  },800);
}
function retry(){
  localState.value='loading';
  announcement.value='正在重新加载';
  focusState();
  finishLoading();
}
function restore(){announcement.value='正在恢复当前页面';emit('restore');}
function syncState(value){
  window.clearTimeout(loadingTimer);
  localState.value=value;
  announcement.value='';
  if(value==='loading'){announcement.value='正在加载页面';finishLoading();}
  if(!['normal','disabled'].includes(value))focusState();
}

onMounted(()=>syncState(props.state));
watch(()=>props.state,syncState);
onBeforeUnmount(()=>window.clearTimeout(loadingTimer));
</script>

<template>
  <section class="page-state-boundary" :data-state="localState" :aria-busy="localState==='loading'">
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <slot v-if="localState==='normal'" />
    <div v-else-if="localState==='disabled'" class="disabled-page" aria-disabled="true">
      <p class="disabled-notice" role="status">当前页面操作暂不可用</p>
      <div inert><slot /></div>
    </div>
    <section v-else-if="localState==='loading'" class="state-surface" aria-live="polite"><h1 ref="stateHeading" tabindex="-1">正在重新加载</h1><p>内容加载中，请稍候。</p></section>
    <section v-else-if="localState==='empty'" class="state-surface"><h1 ref="stateHeading" tabindex="-1">{{ page.title }}</h1><p>当前筛选条件下暂无内容。</p><button type="button" @click="restore">恢复当前页面</button></section>
    <section v-else-if="localState==='error'" class="state-surface" role="alert"><h1 ref="stateHeading" tabindex="-1">{{ page.title }}加载失败</h1><p>本地演示数据暂时不可用。</p><button type="button" @click="retry">重试</button></section>
    <section v-else-if="localState==='permission-denied'" class="state-surface" role="alert"><h1 ref="stateHeading" tabindex="-1">访问受限</h1><p>当前角色无权访问该页面。</p><a href="/workbench">返回工作台</a></section>
  </section>
</template>

<style scoped>
.page-state-boundary{min-height:100%}.disabled-page{position:relative}.disabled-notice{position:sticky;z-index:5;top:0;margin:0;padding:8px 16px;color:#7b5b16;background:#fff7dc;border-bottom:1px solid #f1d680;text-align:center}.disabled-page>div{opacity:.72}.state-surface{min-height:calc(100vh - 63px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;color:#30465c;text-align:center;background:#fff}.state-surface h1{margin:0 0 8px;font-size:20px}.state-surface p{margin:0 0 20px;color:#8794a1}.state-surface button,.state-surface a{min-width:104px;min-height:38px;display:inline-grid;place-items:center;padding:0 18px;border:0;color:#fff;background:#1677df;border-radius:4px}.state-surface :focus-visible{outline:3px solid #ff9f1a;outline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style>
