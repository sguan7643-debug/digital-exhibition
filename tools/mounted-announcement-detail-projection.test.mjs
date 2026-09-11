import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileScript, parse } from '@vue/compiler-sfc';
import { createRenderer, nextTick } from 'vue';

let downloadClicks=0;let executedScript=false;
const fakeBody={appendChild(){}};
globalThis.window={location:{origin:'http://127.0.0.1:4173',protocol:'http:',pathname:'/announcements/notice-001',href:'http://127.0.0.1:4173/announcements/notice-001'},history:{state:{},length:1,pushState(){},back(){}},dispatchEvent(){},clearTimeout, setTimeout};
globalThis.document={body:fakeBody,createElement(){return{hidden:false,click(){downloadClicks+=1;},remove(){}};}};
globalThis.PopStateEvent=class PopStateEvent{};
globalThis.__announcementScriptProbe=()=>{executedScript=true;};
const flatten=node=>[node,...(node.children||[]).flatMap(flatten)];
const textOf=node=>[node?.text||'',...(node?.children||[]).map(textOf)].join('');
const hostOps={createElement:type=>({type,props:{},children:[]}),createText:text=>({type:'#text',text}),createComment:text=>({type:'#comment',text}),setText:(node,text)=>{node.text=text;},setElementText:(node,text)=>{node.text=text;node.children=[];},parentNode:node=>node.parent||null,nextSibling:()=>null,insert:(child,parent)=>{child.parent=parent;parent.children.push(child);},remove:child=>{if(child.parent)child.parent.children=child.parent.children.filter(node=>node!==child);},patchProp:(node,key,_old,value)=>{node.props[key]=value;},insertStaticContent:(content,parent)=>{const node={type:'#static',text:content,parent};parent.children.push(node);return[node,node];}};
const fileUrl=new URL('../src/pages/NoticeDetailPage.vue',import.meta.url);
const {descriptor,errors}=parse(readFileSync(fileUrl,'utf8'),{filename:fileUrl.pathname});assert.deepEqual(errors,[]);
let code=compileScript(descriptor,{id:'mounted-announcement-detail',inlineTemplate:true}).content;
const vueUrl=new URL('../node_modules/vue/index.mjs',import.meta.url).href;
code=code.replace(/from\s+(['"])vue\1/g,`from '${vueUrl}'`).replace(/from\s+(['"])(\.\.\/[^'"]+)\1/g,(_m,_q,relative)=>`from '${new URL(relative,fileUrl).href}'`);
const component=(await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default;
const renderer=createRenderer(hostOps);const createApp=renderer.createApp.bind(renderer);renderer.createApp=(...args)=>{const app=createApp(...args);app.component('AppIcon',{template:'<span />'});return app;};
const detail={announcementId:'ANN-9',title:'真实公告标题',typeName:'平台通知',typeCode:'NOTICE',summary:'真实摘要',contentText:'真实纯文本正文',contentHtml:'<img src=x onerror="__announcementScriptProbe()"><script>__announcementScriptProbe()</script>',publisherName:'发布员甲',publisherOrgName:'组织甲',publishAt:'2026-09-11',scopeType:'ALL',viewCount:12,readCount:7,isRead:true,attachments:[{fileId:'FILE-9',fileName:'真实附件.pdf',sizeText:'8 KB'}],relatedApps:[{appId:'A1',name:'站内应用',description:'可用目标',detailPath:'/apps/report-001'}],associatedActivities:[],previous:null,next:null};
const data={'ANN-003':detail,'ANN-005':{items:[{relationId:'R2',title:'外部目标',path:'https://evil.example/item'}]}};
const calls=[];const executor=async(operationId,input)=>{calls.push([operationId,input]);return{data:{url:'http://127.0.0.1:4173/api/files/grant-9',fileName:'真实附件.pdf'}};};
const root={type:'root',children:[]};renderer.createApp(component,{integrationState:'normal',integrationData:data,operationExecutor:executor}).mount(root);await nextTick();
assert.match(textOf(root),/真实公告标题/);assert.match(textOf(root),/真实纯文本正文/);assert.match(textOf(root),/发布员甲/);assert.match(textOf(root),/真实附件\.pdf/);assert.match(textOf(root),/站内应用/);assert.doesNotMatch(textOf(root),/供应商风险预警应用已发布上线|多源数据融合/);assert.equal(executedScript,false);
const download=flatten(root).find(node=>node.type==='button'&&textOf(node)==='下载');download.props.onClick();await new Promise(resolve=>setTimeout(resolve,0));
assert.deepEqual(calls,[['COM-008',{fileId:'FILE-9',mode:'DOWNLOAD',disposition:'ATTACHMENT',fileNameOverride:'真实附件.pdf'}]]);assert.equal(downloadClicks,1);
const hrefs=flatten(root).filter(node=>node.type==='a').map(node=>node.props.href).filter(Boolean);assert.ok(hrefs.includes('/apps/report-001'));assert.ok(!hrefs.some(value=>String(value).includes('evil.example')));

for(const integrationState of ['empty','error','permission-denied']){const stateRoot={type:'root',children:[]};renderer.createApp(component,{integrationState,integrationData:data,operationExecutor:executor}).mount(stateRoot);await nextTick();assert.doesNotMatch(textOf(stateRoot),/真实公告标题|供应商风险预警应用已发布上线/);}
const mockRoot={type:'root',children:[]};renderer.createApp(component,{integrationState:'mock',integrationData:null}).mount(mockRoot);await nextTick();assert.match(textOf(mockRoot),/供应商风险预警应用已发布上线/);
console.log('真实 NoticeDetailPage mounted：ANN 投影、纯文本、COM-008、站内路由及状态隔离通过');
