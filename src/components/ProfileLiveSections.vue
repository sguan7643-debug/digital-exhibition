<script setup>
import { computed } from 'vue';
const props=defineProps({integrationData:{type:Object,default:null},integrationState:{type:String,default:'loading'}});
const organizations=computed(()=>props.integrationData?.['COM-003']?.items||[]);
const contacts=computed(()=>props.integrationData?.['COM-004']?.items||[]);
const todos=computed(()=>props.integrationData?.['WB-003']?.todos||[]);
const remoteState=computed(()=>{
  if(props.integrationState==='loading')return 'loading';
  if(['authentication-required','permission-denied'].includes(props.integrationState))return 'permission-denied';
  if(['error','timeout','rate-limited','schema-drift','security-error'].includes(props.integrationState))return 'error';
  return organizations.value.length||contacts.value.length||todos.value.length?'normal':'empty';
});
function safeLocalPath(path){
  if(!path||typeof window==='undefined')return '';
  try{const url=new URL(path,window.location.origin);return url.origin===window.location.origin&&url.pathname.startsWith('/')?`${url.pathname}${url.search}${url.hash}`:'';}catch{return '';}
}
</script>

<template>
  <div class="profile-live" data-live-profile-sections :data-state="remoteState">
    <p v-if="remoteState==='loading'" class="live-state" role="status">正在加载组织、联系人和待办…</p>
    <p v-else-if="remoteState==='permission-denied'" class="live-state" role="alert">当前身份无权查看组织、联系人和待办。</p>
    <p v-else-if="remoteState==='error'" class="live-state" role="alert">组织、联系人和待办暂不可用。</p>
    <p v-else-if="remoteState==='empty'" class="live-state" role="status">当前身份暂无可见组织、联系人或待办。</p>
    <template v-else>
    <section><header><h2>我的待办</h2><small>飞书身份范围内 {{ todos.length }} 项</small></header><ul v-if="todos.length"><li v-for="todo in todos" :key="todo.todoId"><a v-if="safeLocalPath(todo.detailPath)" :href="safeLocalPath(todo.detailPath)">{{ todo.title }}</a><strong v-else>{{ todo.title }}</strong><span>{{ todo.statusName||todo.statusCode }}</span><time>{{ todo.submittedAt||'—' }}</time></li></ul><p v-else>暂无待办事项</p></section>
    <section><header><h2>组织与联系人</h2><small>{{ organizations.length }} 个组织 · {{ contacts.length }} 位可见联系人</small></header><div class="directory"><article v-for="org in organizations.slice(0,6)" :key="org.orgId"><strong>{{ org.orgName }}</strong><span>{{ org.userCount }} 人</span></article><article v-for="contact in contacts.slice(0,6)" :key="contact.userId"><strong>{{ contact.displayName }}</strong><span>{{ contact.departmentName||contact.orgName||'—' }}</span></article></div><p v-if="!organizations.length&&!contacts.length">当前身份暂无可见组织通讯录</p></section>
    </template>
  </div>
</template>

<style scoped>
.profile-live{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 22px 24px;color:#17385f}.profile-live section{padding:18px;background:#fff;border:1px solid #dce5ef;border-radius:7px}.profile-live header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.profile-live h2{margin:0;font-size:15px}.profile-live small,.profile-live p{color:#71849d;font-size:10px}.profile-live ul{list-style:none;margin:0;padding:0}.profile-live li{display:grid;grid-template-columns:1fr 100px 150px;gap:10px;padding:10px 0;border-bottom:1px solid #e5ebf1;font-size:10px}.profile-live li a{color:#0b5eb5}.profile-live li span,.profile-live li time{color:#667b96}.directory{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.directory article{display:flex;justify-content:space-between;padding:10px;background:#f7f9fc;border-radius:4px;font-size:10px}.directory span{color:#71849d}@media(max-width:900px){.profile-live{grid-template-columns:1fr}.profile-live li{grid-template-columns:1fr}}
.live-state{grid-column:1/-1;min-height:120px;display:grid;place-items:center;padding:20px;background:#fff;border:1px solid #dce5ef;border-radius:7px}.live-state[role=alert]{color:#8f2d24}
</style>
