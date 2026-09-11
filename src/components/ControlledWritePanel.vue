<script setup>
import { reactive } from 'vue';

const props=defineProps({
  actions:{type:Array,default:()=>[]}, executor:{type:Function,default:null}, enabled:{type:Boolean,default:false}
});
const states=reactive({});
function stateFor(action){
  if(!states[action.operationId]){
    const suffix=window.crypto.randomUUID();
    states[action.operationId]={
      businessKey:`TEST_${action.operationId.replace('-','_')}_${suffix}`,
      idempotencyKey:`TEST_IDEM_${action.operationId.replace('-','_')}_${suffix}`,
      ifMatch:'',fieldsText:'{}',confirmed:false,status:'idle',message:'',result:null
    };
  }
  return states[action.operationId];
}
async function execute(action){
  const state=stateFor(action);
  state.message='';state.result=null;
  if(!state.confirmed){state.status='error';state.message='请先明确确认仅操作 TEST_ 隔离记录';return;}
  let fields;
  try{fields=JSON.parse(state.fieldsText);}catch{state.status='error';state.message='字段 JSON 格式错误';return;}
  if(!fields||typeof fields!=='object'||Array.isArray(fields)){state.status='error';state.message='字段必须是 JSON 对象';return;}
  const input={businessKey:state.businessKey,idempotencyKey:state.idempotencyKey,fields};
  if(action.versionConditionRequired){
    const version=Number(state.ifMatch);
    if(!Number.isInteger(version)||version<1){state.status='error';state.message='该操作必须填写正整数版本号';return;}
    input.ifMatch=version;
  }
  state.status='loading';state.message=`正在执行 ${action.operationId}`;
  try{
    const response=await props.executor(action.operationId,input,{confirmed:true});
    state.status='success';state.result=response.data;
    state.message=`完成：记录 ${response.data.recordId||state.businessKey}，版本 ${response.data.version}`;
    if(response.data.version)state.ifMatch=String(response.data.version);
  }catch(error){state.status='error';state.message=error.message||'写接口执行失败';}
}
</script>

<template>
  <section v-if="actions.length" class="controlled-write-panel" :data-write-state="enabled ? 'enabled' : 'blocked'" aria-labelledby="controlled-write-title">
    <header><div><h2 id="controlled-write-title">TEST_ 接口联调</h2><p v-if="enabled">仅供已授权测试 Base。不会自动执行，所有请求仍由服务端重新核验身份、权限、同源和 TEST_ 前缀。</p><p v-else role="alert">当前远程运行模式未启用测试写入通道；写接口保持禁用，不会发送请求。</p></div><strong>{{ actions.length }} 个写接口</strong></header>
    <template v-if="enabled"><details v-for="action in actions" :key="action.operationId">
      <summary><code>{{ action.operationId }}</code><span>{{ action.versionConditionRequired?'需版本前置条件':'创建/幂等操作' }}</span></summary>
      <form @submit.prevent="execute(action)">
        <label>TEST_ 业务键<input v-model="stateFor(action).businessKey" required pattern="TEST_.+" /></label>
        <label>TEST_ 幂等键<input v-model="stateFor(action).idempotencyKey" required pattern="TEST_.+" /></label>
        <label v-if="action.versionConditionRequired">当前版本<input v-model="stateFor(action).ifMatch" required type="number" min="1" step="1" /></label>
        <label class="fields">允许字段 JSON<textarea v-model="stateFor(action).fieldsText" rows="3" spellcheck="false"></textarea></label>
        <label class="confirm"><input v-model="stateFor(action).confirmed" type="checkbox" />我确认仅操作该 TEST_ 隔离记录</label>
        <button type="submit" :disabled="stateFor(action).status==='loading'">{{ stateFor(action).status==='loading'?'执行中…':'执行接口' }}</button>
        <output :class="stateFor(action).status" aria-live="polite">{{ stateFor(action).message }}</output>
      </form>
    </details></template>
  </section>
</template>

<style scoped>
.controlled-write-panel{margin:14px 22px 26px;padding:16px;color:#17385f;background:#fff8e9;border:1px solid #efc76b;border-radius:7px}.controlled-write-panel>header{display:flex;justify-content:space-between;gap:20px;margin-bottom:10px}.controlled-write-panel h2{margin:0 0 5px;font-size:15px}.controlled-write-panel p{margin:0;color:#6c5a32;font-size:10px}.controlled-write-panel>header strong{white-space:nowrap}.controlled-write-panel details{margin-top:8px;background:#fff;border:1px solid #e4d5b3;border-radius:5px}.controlled-write-panel summary{display:flex;justify-content:space-between;padding:10px 12px;cursor:pointer}.controlled-write-panel summary span{font-size:10px;color:#6f6040}.controlled-write-panel form{display:grid;grid-template-columns:1fr 1fr 120px;gap:9px;padding:12px;border-top:1px solid #eadfc6}.controlled-write-panel label{display:grid;gap:4px;font-size:10px}.controlled-write-panel input,.controlled-write-panel textarea{padding:8px;border:1px solid #cbd8e6;border-radius:4px;background:#fff}.controlled-write-panel .fields{grid-column:1/-1}.controlled-write-panel .confirm{grid-column:1/-1;display:flex;align-items:center}.controlled-write-panel .confirm input{width:16px;height:16px}.controlled-write-panel button{width:110px;min-height:34px;color:#fff;background:#075fc0;border:0;border-radius:4px}.controlled-write-panel output{align-self:center;font-size:10px}.controlled-write-panel output.error{color:#b42318}.controlled-write-panel output.success{color:#087a3d}@media(max-width:760px){.controlled-write-panel form{grid-template-columns:1fr}.controlled-write-panel .fields,.controlled-write-panel .confirm{grid-column:auto}}
</style>
