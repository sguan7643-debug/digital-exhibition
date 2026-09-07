import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileScript, parse } from '@vue/compiler-sfc';
import { createRenderer, h, nextTick } from 'vue';

globalThis.window=globalThis;
globalThis.Document=class Document{};
globalThis.ShadowRoot=class ShadowRoot{};
globalThis.document=new globalThis.Document();
globalThis.document.activeElement=null;
let requestCount=0;
globalThis.fetch=()=>{requestCount+=1;throw new Error('PP30 本地行为禁止请求');};

const flatten=node=>[node,...(node.children||[]).flatMap(flatten)];
const textOf=node=>[node.text||'',...(node.children||[]).map(textOf)].join('');
const hostOps={
  createElement:type=>({type,props:{},children:[],text:'',focus(){globalThis.document.activeElement=this;},getRootNode(){return globalThis.document;},addEventListener(event,handler){this.props[`native:${event}`]=handler;},removeEventListener(event){delete this.props[`native:${event}`];},setAttribute(key,value){this.props[key]=value;},removeAttribute(key){delete this.props[key];}}),
  createText:text=>({type:'#text',text}),createComment:text=>({type:'#comment',text}),
  setText:(node,text)=>{node.text=text;},setElementText:(node,text)=>{node.text=text;node.children=[];},parentNode:node=>node.parent||null,nextSibling:()=>null,
  insert:(child,parent)=>{child.parent=parent;parent.children.push(child);},remove:child=>{if(child.parent)child.parent.children=child.parent.children.filter(node=>node!==child);},patchProp:(node,key,_old,value)=>{node.props[key]=value;},
  insertStaticContent:(content,parent)=>{const node={type:'#static',text:content,parent};parent.children.push(node);return [node,node];}
};
const PaginationStub={props:['total','page','pageSize','label'],emits:['update:page','update:page-size'],render(){return h('footer',{'data-pagination-total':this.total,'data-pagination-page':this.page,'aria-label':this.label});}};
const renderer=createRenderer(hostOps);
const fileUrl=new URL('../src/pages/TalentProgressPage.vue',import.meta.url);
const {descriptor,errors}=parse(readFileSync(fileUrl,'utf8'),{filename:fileUrl.pathname});
assert.deepEqual(errors,[]);
let code=compileScript(descriptor,{id:'mounted-talent-progress',inlineTemplate:true}).content;
const vueUrl=new URL('../node_modules/vue/index.mjs',import.meta.url).href;
code=code.replace(/from\s+(['"])vue\1/g,`from '${vueUrl}'`);
code=code.replace(/import\s+PaginationControl\s+from\s+['"][^'"]+\.vue['"];?/,`const PaginationControl=globalThis.__talentProgressPaginationStub;`);
code=code.replace(/from\s+(['"])(\.\.\/[^'"]+)\1/g,(_match,_quote,relative)=>`from '${new URL(relative,fileUrl).href}'`);
globalThis.__talentProgressPaginationStub=PaginationStub;
const component=(await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default;
const root={type:'root',children:[]};
renderer.createApp(component).mount(root);
await nextTick();

const nodes=()=>flatten(root);
const findInput=()=>nodes().find(node=>node.type==='input'&&node.props?.['aria-label']==='项目关键词');
const findForm=()=>nodes().find(node=>node.type==='form');
const live=()=>nodes().find(node=>node.props?.['aria-live']==='polite');
const bodyRows=()=>nodes().filter(node=>node.type==='tr'&&node.parent?.type==='tbody');

assert.equal(typeof findInput()?.props?.onInput,'function','关键词输入必须绑定真实查询草稿');
const selects=nodes().filter(node=>node.type==='select');
assert.equal(selects.length,4,'必须保留四个条件选择框');
for(const select of selects)assert.ok(flatten(select).filter(node=>node.type==='option').length>1,'每个筛选必须有真实 fixture 选项');

findInput().props.onInput({target:{value:'不存在的项目'}});
findForm().props.onSubmit({preventDefault(){}});
await nextTick();
assert.equal(bodyRows().length,0,'关键词查询必须真实过滤结果');
assert.match(textOf(live()),/查询完成，共 0 个项目/,'结果数必须通过 polite 区域播报');

findForm().props.onReset({preventDefault(){}});
await nextTick();
assert.equal(bodyRows().length,8,'重置必须恢复全部固定 fixture');
assert.match(textOf(live()),/已重置筛选，共 8 个项目/);

for(const [index,value] of [[0,'进行中'],[1,'数字化转型'],[2,'方案设计'],[3,'正常']])selects[index].props.onChange({target:{value}});
findForm().props.onSubmit({preventDefault(){}});
await nextTick();
assert.equal(bodyRows().length,1,'四个筛选必须按 AND 组合');
assert.match(textOf(bodyRows()[0]),/海上平台数字化人才培养项目/);

const documentButton=nodes().find(node=>node.type==='button'&&node.props?.['aria-label']==='海上平台数字化人才培养项目 工作计划书');
assert.ok(documentButton,'文档动作必须包含项目名和文档列名');
documentButton.props.onClick();await nextTick();
assert.match(textOf(live()),/海上平台数字化人才培养项目的工作计划书仅作本地说明/);
const detailButton=nodes().find(node=>node.type==='button'&&node.props?.['aria-label']==='查看 海上平台数字化人才培养项目 详情');
detailButton.props.onClick();await nextTick();
assert.match(textOf(live()),/海上平台数字化人才培养项目详情仅在当前页说明/);
assert.equal(requestCount,0,'筛选、重置、文档和详情行为必须零请求');

const exportButton=nodes().find(node=>node.type==='button'&&textOf(node)==='导出');
assert.notEqual(exportButton.props.disabled,undefined,'导出必须保持明确 disabled');

console.log('真实 TalentProgressPage mounted：AND筛选、重置、公告、文档与详情零请求合同通过');
