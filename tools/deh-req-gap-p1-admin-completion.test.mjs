import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileScript, parse } from '@vue/compiler-sfc';
import { createRenderer, nextTick } from 'vue';

globalThis.window={location:{origin:'http://127.0.0.1:4173',href:'http://127.0.0.1:4173/admin'}};
let requests=0;globalThis.fetch=()=>{requests+=1;throw new Error('admin projection must not request directly');};
const flatten=node=>[node,...(node.children||[]).flatMap(flatten)];
const textOf=node=>[node?.text||'',...(node?.children||[]).map(textOf)].join('');
const hostOps={createElement:type=>({type,tagName:String(type).toUpperCase(),props:{},children:[],addEventListener(){},removeEventListener(){},setAttribute(){}}),createText:text=>({type:'#text',text}),createComment:text=>({type:'#comment',text}),setText:(node,text)=>{node.text=text;},setElementText:(node,text)=>{node.text=text;node.children=[];},parentNode:node=>node.parent||null,nextSibling:()=>null,insert:(child,parent)=>{child.parent=parent;parent.children.push(child);},remove:child=>{if(child.parent)child.parent.children=child.parent.children.filter(node=>node!==child);},patchProp:(node,key,_old,value)=>{node.props[key]=value;},insertStaticContent:(content,parent)=>{const node={type:'#static',text:content,parent};parent.children.push(node);return[node,node];}};
const renderer=createRenderer(hostOps);
async function load(){const fileUrl=new URL('../src/pages/AdminPage.vue',import.meta.url);const {descriptor,errors}=parse(readFileSync(fileUrl,'utf8'),{filename:fileUrl.pathname});assert.deepEqual(errors,[]);let code=compileScript(descriptor,{id:'admin-completion',inlineTemplate:true}).content;const vueUrl=new URL('../node_modules/vue/index.mjs',import.meta.url).href;code=code.replace(/import TypeLineIcon from ['"]\.\.\/components\/TypeLineIcon\.vue['"];?/,`const TypeLineIcon={template:'<span />'};`).replace(/from\s+(['"])vue\1/g,`from '${vueUrl}'`).replace(/from\s+(['"])(\.\.\/[^'"]+)\1/g,(_m,_q,relative)=>`from '${new URL(relative,fileUrl).href}'`);return(await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default;}
async function mount(component,props){const root={type:'root',children:[]};renderer.createApp(component,props).mount(root);await nextTick();return root;}

const Admin=await load();
const remoteData={
  'ADM-006':{policyVersion:'GOV-9',status:'ACTIVE'},
  'ADM-007':{permissionCode:'admin.integrations.view',allowed:true},
  'INT-001':{items:[{connectionCode:'CONN-9',domainCode:'OPS',readEnabled:true,lastVerifiedStatus:'HEALTHY'}]},
  'INT-003':{dryRun:true,status:'PASSED',checkedCount:9},
  'INT-004':{items:[{executionId:'EXEC-9',status:'DONE',progress:100}]},
  'INT-005':{connectionCode:'CONN-9',status:'MATCHED',differenceCount:0},
  'ADM-003':{items:[{auditId:'AUD-9',occurredAt:'2026-09-11',resourceName:'权威审计对象',actionName:'读取',resultCode:'SUCCESS'}]},
  'ADM-004':{items:[{logId:'LOG-9',startedAt:'2026-09-11',integrationCode:'CONN-9',operationCode:'READ',status:'SUCCESS'}]},
  'ARC-002':{archiveTaskId:'ARC-9',status:'VERIFIED'}
};
const remote=await mount(Admin,{integrationState:'normal',integrationData:remoteData});const remoteText=textOf(remote);
for(const expected of ['GOV-9','admin.integrations.view','CONN-9','PASSED','MATCHED','EXEC-9','权威审计对象','ARC-9','正式配置读取未配置','监控告警未配置'])assert.match(remoteText,new RegExp(expected));
for(const leaked of ['可视化','生产运营','记录号 FX-817-0','未处理告警 2'])assert.doesNotMatch(remoteText,new RegExp(leaked));
const writes=flatten(remote).filter(node=>node.type==='button'&&/新增|修改|删除|写入|处理|恢复/.test(textOf(node)));assert.ok(writes.length>0,'远程态必须保留受控写入入口的可见反馈');
const newTopicDomain=writes.find(node=>textOf(node)==='新增主题域');assert.ok(newTopicDomain,'远程态必须提供新增主题域入口');newTopicDomain.props.onClick();await nextTick();assert.match(textOf(remote),/确认限制/,'远程态点击新增主题域必须打开写入限制说明，而不是无反馈');
for(const state of ['loading','authentication-required','permission-denied','error','empty','disabled']){const root=await mount(Admin,{integrationState:state,integrationData:remoteData});const text=textOf(root);assert.doesNotMatch(text,/GOV-9|CONN-9|权威审计对象|ARC-9|可视化|生产运营|记录号 FX-817-0/);}
const mock=await mount(Admin,{integrationState:'mock'});assert.match(textOf(mock),/可视化/);assert.match(textOf(mock),/生产运营/);assert.match(textOf(mock),/记录号 FX-817-0/);assert.match(textOf(mock),/未处理告警 2/);
assert.equal(requests,0);
console.log('后台管理 SFC mounted：权威投影、阻断态隔离、mock 保留、写入限制反馈与零请求通过');
