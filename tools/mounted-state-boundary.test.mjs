import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileScript, parse } from '@vue/compiler-sfc';
import { createRenderer, h, nextTick } from 'vue';

const filename=new URL('../src/components/PageStateBoundary.vue',import.meta.url);
const source=readFileSync(filename,'utf8');
const {descriptor,errors}=parse(source,{filename:filename.pathname});
assert.deepEqual(errors,[]);
let compiled=compileScript(descriptor,{id:'mounted-state-boundary',inlineTemplate:true}).content;
const vueModuleUrl=new URL('../node_modules/vue/index.mjs',import.meta.url).href;
compiled=compiled.replace(/from\s+(['"])vue\1/g,`from '${vueModuleUrl}'`);
const component=(await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)).default;
globalThis.window=globalThis;

const hostOps={
  createElement:type=>({type,props:{},children:[],text:'',focus(){this.focused=true;}}),createText:text=>({type:'#text',text}),createComment:text=>({type:'#comment',text}),
  setText:(node,text)=>{node.text=text;},setElementText:(node,text)=>{node.text=text;node.children=[];},parentNode:node=>node.parent||null,nextSibling:()=>null,
  insert:(child,parent)=>{child.parent=parent;parent.children.push(child);},remove:child=>{if(child.parent)child.parent.children=child.parent.children.filter(node=>node!==child);},
  patchProp:(node,key,_old,value)=>{node.props[key]=value;}
};
const renderer=createRenderer(hostOps);
const flatten=node=>[node,...(node.children||[]).flatMap(flatten)];
const textOf=node=>[node.text||'',...(node.children||[]).map(textOf)].join('');
async function mountState(state){
  const root={type:'root',children:[]};let restored=0;
  renderer.createApp({render:()=>h(component,{page:{title:'受限对象名称'},state,onRestore:()=>{restored+=1;}},{default:()=>h('button',{id:'real-page-action'},'真实页面操作')})}).mount(root);
  await nextTick();return {root,get restored(){return restored;}};
}

const denied=await mountState('permission-denied');
assert.match(textOf(denied.root),/访问受限/);
assert.doesNotMatch(textOf(denied.root),/受限对象名称/,'无权限不得泄露页面标题');

const disabled=await mountState('disabled');
assert.match(textOf(disabled.root),/真实页面操作/,'disabled 必须保留真实页面 DOM');
assert.ok(flatten(disabled.root).some(node=>node.props?.inert!==undefined),'disabled 页面目标必须不可操作');

const empty=await mountState('empty');
const emptyButton=flatten(empty.root).find(node=>node.type==='button');
emptyButton.props.onClick();await nextTick();
assert.equal(empty.restored,1,'empty 恢复必须留在当前路由');

const error=await mountState('error');
const retry=flatten(error.root).find(node=>node.type==='button');
retry.props.onClick();await nextTick();
assert.match(textOf(error.root),/正在重新加载/);
await new Promise(resolve=>setTimeout(resolve,850));await nextTick();
assert.equal(error.restored,1,'error 必须经 800ms loading 后恢复');

const appSource=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8');
assert.ok(appSource.includes('PageStateBoundary'));
assert.doesNotMatch(appSource,/page\.state === 'normal'/,'真实页面不得仅在 normal 时挂载并让其他状态退化 GenericPage');

console.log('真实 SFC mounted：六态恢复、权限隐藏与 disabled 页面保留行为通过');
