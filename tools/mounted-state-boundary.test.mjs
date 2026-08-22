import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileScript, parse } from '@vue/compiler-sfc';
import { createRenderer, h, nextTick } from 'vue';
import { ref as vueRef } from 'vue';

const filename=new URL('../src/components/PageStateBoundary.vue',import.meta.url);
const source=readFileSync(filename,'utf8');
const {descriptor,errors}=parse(source,{filename:filename.pathname});
assert.deepEqual(errors,[]);
let compiled=compileScript(descriptor,{id:'mounted-state-boundary',inlineTemplate:true}).content;
const vueModuleUrl=new URL('../node_modules/vue/index.mjs',import.meta.url).href;
compiled=compiled.replace(/from\s+(['"])vue\1/g,`from '${vueModuleUrl}'`);
const component=(await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)).default;
globalThis.window=globalThis;
globalThis.Document=class Document{};
globalThis.ShadowRoot=class ShadowRoot{};

const matchesSelector=(node,selector)=>selector.split(',').some(part=>{
  const token=part.trim().split('>').pop().trim();
  if(token.startsWith('.'))return String(node.props?.class||'').split(/\s+/).includes(token.slice(1));
  if(token==='[data-state-result-heading]')return node.props?.['data-state-result-heading']!==undefined;
  if(token==='[data-state-result]')return node.props?.['data-state-result']!==undefined;
  if(token==='h1'||token==='h2')return node.type===token;
  if(token==='[role="heading"]')return node.props?.role==='heading';
  return false;
});

const hostOps={
  createElement:type=>({type,props:{},children:[],text:'',value:'',focus(){this.focused=true;globalThis.document.activeElement=this;},getRootNode(){return globalThis.document;},addEventListener(event,handler){this.props[`native:${event}`]=handler;},removeEventListener(event){delete this.props[`native:${event}`];},setAttribute(key,value){this.props[key]=value;},removeAttribute(key){delete this.props[key];},querySelectorAll(selector){return flatten(this).filter(node=>node!==this&&matchesSelector(node,selector));},querySelector(selector){return flatten(this).find(node=>node!==this&&matchesSelector(node,selector));}}),createText:text=>({type:'#text',text}),createComment:text=>({type:'#comment',text}),
  setText:(node,text)=>{node.text=text;},setElementText:(node,text)=>{node.text=text;node.children=[];},parentNode:node=>node.parent||null,nextSibling:()=>null,
  insert:(child,parent)=>{child.parent=parent;parent.children.push(child);},remove:child=>{if(child.parent)child.parent.children=child.parent.children.filter(node=>node!==child);},
  patchProp:(node,key,_old,value)=>{node.props[key]=value;},
  insertStaticContent:(content,parent)=>{const node={type:'#static',text:content,parent};parent.children.push(node);return [node,node];}
};
const renderer=createRenderer(hostOps);
const flatten=node=>[node,...(node.children||[]).flatMap(flatten)];
const textOf=node=>[node.text||'',...(node.children||[]).map(textOf)].join('');
async function mountState(state,{empty=true}={}){
  const root={type:'root',children:[]};let restored=0;const currentState=vueRef(state);
  renderer.createApp({render:()=>h(component,{page:{title:'受限对象名称',empty},state:currentState.value,onRestore:()=>{restored+=1;currentState.value='normal';}},{default:()=>[h('form',{id:'real-filter'},[h('input',{id:'filter-input'})]),h('section',{'data-state-result':''},[h('h2',{'data-state-result-heading':'',tabindex:-1},'结果标题'),h('button',{id:'real-page-action'},'真实页面操作')])]} )}).mount(root);
  await nextTick();await nextTick();return {root,get restored(){return restored;}};
}
globalThis.document=new globalThis.Document();
globalThis.document.activeElement=null;

const denied=await mountState('permission-denied');
assert.match(textOf(denied.root),/访问受限/);
assert.doesNotMatch(textOf(denied.root),/受限对象名称/,'无权限不得泄露页面标题');
assert.ok(flatten(denied.root).find(node=>node.type==='h1')?.focused,'仅 permission-denied 应聚焦权限标题');

const disabled=await mountState('disabled');
assert.match(textOf(disabled.root),/真实页面操作/,'disabled 必须保留真实页面 DOM');
assert.ok(flatten(disabled.root).some(node=>node.props?.inert!==undefined),'disabled 页面目标必须不可操作');

const empty=await mountState('empty');
assert.ok(flatten(empty.root).some(node=>node.props?.id==='filter-input'),'empty=A 必须保留筛选控件');
const emptyResult=flatten(empty.root).find(node=>node.props?.['data-state-result']!==undefined);
assert.equal(emptyResult.hidden,true,'empty=A 必须隐藏旧结果');
assert.ok(emptyResult.props.inert!==undefined,'empty=A 旧结果动作必须不可操作');
const emptyButton=flatten(empty.root).find(node=>node.type==='button'&&textOf(node).includes('恢复当前页面'));
emptyButton.focus();
emptyButton.props.onClick();await nextTick();
assert.equal(emptyButton.props['aria-disabled'],'true','empty 恢复期间按钮节点必须保持可聚焦且不可重复触发');
assert.equal(globalThis.document.activeElement,emptyButton,'empty 恢复 loading 期间焦点应留在按钮');
await new Promise(resolve=>setTimeout(resolve,850));await nextTick();
assert.equal(empty.restored,1,'empty 恢复必须留在当前路由');
assert.equal(globalThis.document.activeElement.props['data-state-result-heading'],'','empty 恢复 normal 后必须聚焦结果标题');

const emptyNa=await mountState('empty',{empty:false});
assert.match(textOf(emptyNa.root),/真实页面操作/,'empty=NA 应归一为详情允许的 normal 状态');
assert.doesNotMatch(textOf(emptyNa.root),/当前筛选条件下暂无内容/,'empty=NA 不得伪造空详情');

const loading=await mountState('loading');
assert.equal(flatten(loading.root).find(node=>node.type==='h1')?.focused,undefined,'loading 不得抢焦点');

const error=await mountState('error');
const retry=flatten(error.root).find(node=>node.type==='button'&&textOf(node).includes('重试'));
retry.focus();
retry.props.onClick();await nextTick();
assert.match(textOf(error.root),/正在重新加载/);
assert.equal(retry.focused,true,'重试进入 loading 后焦点应保留在重试按钮');
assert.equal(retry.props['aria-disabled'],'true','重试期间不得原生 disabled 当前焦点节点');
assert.equal(flatten(error.root).find(node=>node.type==='h1')?.focused,undefined,'error/retry 不得把焦点移到标题');
await new Promise(resolve=>setTimeout(resolve,850));await nextTick();
assert.equal(error.restored,1,'error 必须经 800ms loading 后恢复');
assert.equal(globalThis.document.activeElement.props['data-state-result-heading'],'','error 恢复 normal 后必须聚焦结果标题');

async function compilePage(file){
  const fileUrl=new URL(`../src/pages/${file}`,import.meta.url);
  const parsed=parse(readFileSync(fileUrl,'utf8'),{filename:fileUrl.pathname});
  assert.deepEqual(parsed.errors,[]);
  let code=compileScript(parsed.descriptor,{id:`real-${file}`,inlineTemplate:true}).content;
  code=code.replace(/from\s+(['"])vue\1/g,`from '${vueModuleUrl}'`);
  code=code.replace(/from\s+(['"])(\.\.\/[^'"]+)\1/g,(_match,_quote,relative)=>`from '${new URL(relative,fileUrl).href}'`);
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default;
}
const FavoritesPage=await compilePage('FavoritesPage.vue');
const realRoot={type:'root',children:[]};
const realState=vueRef('error');
renderer.createApp({render:()=>h(component,{page:{title:'我的收藏',empty:true},state:realState.value,onRestore:()=>{realState.value='normal';}},{default:()=>h(FavoritesPage)})}).mount(realRoot);
await nextTick();
const realRetry=flatten(realRoot).find(node=>node.type==='button'&&textOf(node)==='重试');
realRetry.focus();realRetry.props.onClick();await nextTick();
await new Promise(resolve=>setTimeout(resolve,850));await nextTick();await nextTick();
assert.equal(globalThis.document.activeElement?.props?.['data-state-result-heading'],'','真实 FavoritesPage 恢复后必须聚焦真实结果标题，而非合成测试节点');
assert.match(textOf(globalThis.document.activeElement),/收藏应用列表/,'真实恢复焦点必须落在可感知的收藏结果标题');

const appSource=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8');
assert.ok(appSource.includes('PageStateBoundary'));
assert.doesNotMatch(appSource,/page\.state === 'normal'/,'真实页面不得仅在 normal 时挂载并让其他状态退化 GenericPage');

const pages=await import('../src/fixtures/pages.js');
assert.equal(pages.resolvePage('http://127.0.0.1/apps/tool-001?state=empty','empty').id,'08','empty=NA 不得错误回退 ID01');
assert.equal(pages.resolvePage('http://127.0.0.1/apps/tool-001?state=empty','empty').state,'normal','empty=NA 应归一为 normal');

console.log('真实 SFC mounted：六态恢复、权限隐藏与 disabled 页面保留行为通过');
