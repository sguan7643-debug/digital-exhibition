import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileScript, parse } from '@vue/compiler-sfc';
import { createRenderer, nextTick } from 'vue';

globalThis.window=globalThis;
globalThis.Document=class Document{};
globalThis.ShadowRoot=class ShadowRoot{};
globalThis.document=new globalThis.Document();
globalThis.document.activeElement=null;
let requestCount=0;
globalThis.fetch=()=>{requestCount+=1;throw new Error('详情行为禁止请求');};
const flatten=node=>[node,...(node.children||[]).flatMap(flatten)];
const textOf=node=>[node.text||'',...(node.children||[]).map(textOf)].join('');
const hostOps={
  createElement:type=>({type,props:{},children:[],text:'',value:'',focus(){globalThis.document.activeElement=this;},getRootNode(){return globalThis.document;},addEventListener(event,handler){this.props[`native:${event}`]=handler;},removeEventListener(event){delete this.props[`native:${event}`];},setAttribute(key,value){this.props[key]=value;},removeAttribute(key){delete this.props[key];}}),createText:text=>({type:'#text',text}),createComment:text=>({type:'#comment',text}),
  setText:(node,text)=>{node.text=text;},setElementText:(node,text)=>{node.text=text;node.children=[];},parentNode:node=>node.parent||null,nextSibling:()=>null,
  insert:(child,parent)=>{child.parent=parent;parent.children.push(child);},remove:child=>{if(child.parent)child.parent.children=child.parent.children.filter(node=>node!==child);},patchProp:(node,key,_old,value)=>{node.props[key]=value;},
  insertStaticContent:(content,parent)=>{const node={type:'#static',text:content,parent};parent.children.push(node);return [node,node];}
};
const renderer=createRenderer(hostOps);
const vueUrl=new URL('../node_modules/vue/index.mjs',import.meta.url).href;

async function mountSfc(file){
  const fileUrl=new URL(`../src/pages/${file}`,import.meta.url);
  const {descriptor,errors}=parse(readFileSync(fileUrl,'utf8'),{filename:fileUrl.pathname});
  assert.deepEqual(errors,[]);
  let code=compileScript(descriptor,{id:`mounted-${file}`,inlineTemplate:true}).content;
  code=code.replace(/import BusinessPreviewGallery from ['"]\.\.\/components\/BusinessPreviewGallery\.vue['"];?/,"const BusinessPreviewGallery={name:'BusinessPreviewGallery',render(){return null;}}");
  code=code.replace(/import TypeLineIcon from ['"]\.\.\/components\/TypeLineIcon\.vue['"];?/,"const TypeLineIcon={name:'TypeLineIcon',render(){return null;}}");
  code=code.replace(/import IndicatorBuildDialog from ['"]\.\.\/components\/IndicatorBuildDialog\.vue['"];?/,"const IndicatorBuildDialog={name:'IndicatorBuildDialog',methods:{open(){}},render(){return null;}}");
  code=code.replace(/import AppDetailStateBoundary from ['"]\.\.\/components\/AppDetailStateBoundary\.vue['"];?/,"const AppDetailStateBoundary={name:'AppDetailStateBoundary',props:['projection'],render(){return this.projection.contentVisible?this.$slots.default?.():null;}};");
  code=code.replace(/import AppDetailRemoteFacts from ['"]\.\.\/components\/AppDetailRemoteFacts\.vue['"];?/,"const AppDetailRemoteFacts={name:'AppDetailRemoteFacts',render(){return null;}};");
  code=code.replace(/from\s+(['"])vue\1/g,`from '${vueUrl}'`);
  code=code.replace(/from\s+(['"])(\.\.\/[^'"]+)\1/g,(_match,_quote,relative)=>`from '${new URL(relative,fileUrl).href}'`);
  const component=(await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default;
  const root={type:'root',children:[]};renderer.createApp(component).mount(root);await nextTick();return root;
}

for(const file of ['ToolDetailPage.vue','HainengWorkDetailPage.vue','ReportDetailPage.vue','DashboardDetailPage.vue']){
  const root=await mountSfc(file);
  const nodes=flatten(root);
  const live=nodes.find(node=>node.props?.['aria-live']==='polite');
  const favorite=nodes.find(node=>node.type==='button'&&['收藏','已收藏'].includes(textOf(node).trim()));
  const before=favorite.props['aria-pressed'];favorite.props.onClick();await nextTick();assert.notEqual(favorite.props['aria-pressed'],before,`${file} 收藏必须响应式切换`);
  nodes.find(node=>node.type==='button'&&textOf(node).trim()==='申请使用').props.onClick();await nextTick();assert.match(textOf(live),/申请使用已在本地演示中登记/);
  const download=nodes.find(node=>node.type==='button'&&/下载|使用说明文档/.test(textOf(node)));download.props.onClick();await nextTick();assert.match(textOf(live),/不提供真实下载/);
  assert.ok(nodes.some(node=>node.type==='a'&&node.props?.href==='/training'),'培训必须使用批准的本地路由');
  assert.ok(nodes.some(node=>node.type==='a'&&node.props?.['data-detail-return']!==undefined),'返回必须标记真实来源优先行为');
  const input=nodes.find(node=>node.type==='input'&&node.props?.placeholder?.includes('评论'));
  const form=nodes.find(node=>node.type==='form'&&node.props?.onSubmit);
  const submit=flatten(form).find(node=>node.type==='button'&&node.props?.type==='submit');
  for(let index=0;index<2;index++){input.props['onUpdate:modelValue']('重复评价');await nextTick();submit.focus();form.props.onSubmit({preventDefault(){}});await nextTick();}
  assert.equal(globalThis.document.activeElement?.type,'input',`${file} 评论提交后焦点必须留在当前输入框`);
  assert.match(globalThis.document.activeElement?.props?.placeholder||'',/评论/,`${file} 焦点目标必须是评论输入框`);
  const comments=flatten(root).filter(node=>node.type==='li'&&textOf(node)==='重复评价');assert.equal(comments.length,2,`${file} 重复评论必须使用稳定唯一 ID 共存`);
  assert.equal(new Set(comments.map(node=>node.props?.['data-comment-id'])).size,2,`${file} 重复评论 DOM 必须暴露不同稳定 ID`);
  const tables=nodes.filter(node=>node.type==='table');for(const table of tables)assert.ok(flatten(table).some(node=>node.type==='caption'),`${file} 每张表格必须有 caption`);
}
assert.equal(requestCount,0,'详情收藏、申请、下载、评论与返回合同必须零请求');

console.log('真实详情 SFC mounted：PP08–PP11 交互、焦点、表格语义与零请求通过');
