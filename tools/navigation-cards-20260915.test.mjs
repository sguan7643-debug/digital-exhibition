import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileScript, parse } from '@vue/compiler-sfc';
import { createRenderer, nextTick, toRaw } from 'vue';
import { mapRemoteApp } from '../src/integration/app-read-model.js';
import { normalizeAppCategory } from '../src/state/interaction-controllers.js';

const REMOTE_RECORDS = Object.freeze([
  Object.freeze({ appId:'APP_RPA_001', name:'TEST_RPA 自动化', typeCode:'T003', typeName:'RPA', summary:'用于验证真实应用目录卡片', businessScope:'供应链管理', domainName:'供应链管理', tags:['流程自动化'], usageCount:21, favoriteCount:3, ownerDepartmentName:'数字化部', ownerName:'测试负责人', developerName:'测试开发者' }),
  Object.freeze({ appId:'APP_HW_001', name:'TEST_海能 Work 应用', typeCode:'T005', typeName:'海能work应用', summary:'用于验证长分类名称和申请入口', businessScope:'生产运营', domainName:'生产运营', tags:['协同'], usageCount:12, favoriteCount:2, ownerDepartmentName:'运营部', ownerName:'测试负责人二', developerName:'测试开发者二' }),
  Object.freeze({ appId:'APP_REPORT_001', name:'TEST_经营报表', typeCode:'T006', typeName:'报表', summary:'用于验证远端报表详情入口', businessScope:'经营分析', domainName:'经营分析', tags:['经营分析'], usageCount:8, favoriteCount:1, ownerDepartmentName:'财务部', ownerName:'测试负责人三', developerName:'测试开发者三' }),
]);
const EXPECTED_APPS = REMOTE_RECORDS.map(mapRemoteApp);

globalThis.window = globalThis;
globalThis.Document = class {};
globalThis.ShadowRoot = class {};
const roots = [];
const flatten = node => [node, ...(node.children || []).flatMap(flatten)];
const textOf = node => node ? [node.text || '', ...(node.children || []).map(textOf)].join('') : '';
const listeners = new Map();
globalThis.document = new Document();
document.activeElement = null;
document.querySelector = () => roots.flatMap(flatten).find(node => node.type === 'input');
globalThis.location = new URL('http://127.0.0.1:4173/apps');
globalThis.history = { state:{}, pushState(_state,_title,url){ globalThis.location=new URL(url,location); }, replaceState(_state,_title,url){ globalThis.location=new URL(url,location); } };
globalThis.addEventListener = (name,fn) => { if(!listeners.has(name)) listeners.set(name,new Set()); listeners.get(name).add(fn); };
globalThis.removeEventListener = (name,fn) => listeners.get(name)?.delete(fn);
globalThis.dispatchEvent = event => { for(const fn of listeners.get(event.type)||[]) fn(event); };
globalThis.PopStateEvent = class { constructor(type){ this.type=type; } };
globalThis.getSelection = () => ({ toString:() => '' });
const media = { matches:false, addEventListener(_name,fn){ this.change=fn; }, removeEventListener(){} };
globalThis.matchMedia = () => media;
let resizeCallback;
globalThis.ResizeObserver = class { constructor(fn){ resizeCallback=fn; } observe(){} disconnect(){} };

const host = {
  createElement(type){ return { type, tagName:type.toUpperCase(), props:{}, children:[], text:'', style:{}, value:'', scrollHeight:44, clientHeight:44,
    get options(){ return this.children.filter(node=>node.type==='option'); }, focus(){ document.activeElement=this; }, click(){ this.props.onClick?.({button:0,target:this,currentTarget:this,stopPropagation(){},preventDefault(){}}); }, getRootNode(){ return document; },
    addEventListener(name,fn){ this.props['native:'+name]=fn; }, removeEventListener(){}, getAttribute(name){ return this.props[name]; },
    setAttribute(name,value){ this.props[name]=value; }, removeAttribute(name){ delete this.props[name]; },
    contains(node){ return flatten(this).some(child=>toRaw(child)===toRaw(node)); },
    querySelector(selector){ return flatten(this).find(node=>String(node.props?.class||'').split(' ').includes(selector.slice(1))); } }; },
  createText:text=>({type:'#text',text}), createComment:text=>({type:'#comment',text}), setText(node,text){node.text=text;},
  setElementText(node,text){node.text=text;node.children=[];}, parentNode:node=>node.parent,
  nextSibling:node=>node.parent?.children[node.parent.children.indexOf(node)+1]||null,
  insert(node,parent,anchor){ if(node.parent)host.remove(node);node.parent=parent;const index=anchor?parent.children.indexOf(anchor):-1;if(index<0)parent.children.push(node);else parent.children.splice(index,0,node); },
  remove(node){ if(node.parent)node.parent.children=node.parent.children.filter(child=>child!==node); },
  patchProp(node,key,_old,value){node.props[key]=value;},
  insertStaticContent(content,parent){const node={type:'#static',text:content,parent};parent.children.push(node);return[node,node];},
};
const renderer=createRenderer(host);
const cache=new Map();
async function load(file){
  const url=new URL('../src/'+file,import.meta.url);
  if(cache.has(url.href))return cache.get(url.href);
  const {descriptor}=parse(readFileSync(url,'utf8'));
  let code=compileScript(descriptor,{id:file,inlineTemplate:true,templateOptions:{compilerOptions:{hoistStatic:false}}}).content;
  code=code.replaceAll('import.meta.env.BASE_URL', "'/'");
  code=code.replace(/import TypeLineIcon from ['"][^'"]+['"];?/g,"const TypeLineIcon={render(){return null;}};");
  for(const match of [...code.matchAll(/import (\w+) from ['"]([^'"]+\.vue)['"];?/g)]){
    const childUrl=new URL(match[2],url);const childFile=decodeURIComponent(childUrl.pathname.split('/src/')[1]);
    code=code.replace(match[0],`import ${match[1]} from '${await load(childFile)}';`);
  }
  code=code.replace(/from\s+(['"])vue\1/g,`from '${new URL('../node_modules/vue/index.mjs',import.meta.url).href}'`);
  code=code.replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/g,(_match,_quote,path)=>`from '${new URL(path,url).href}'`);
  const data='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(url.href,data);return data;
}
async function mount(file,props={}){const component=(await import(await load(file))).default;const root={type:'root',children:[]};roots.push(root);const app=renderer.createApp(component,props);app.mount(root);await nextTick();return{root,app};}
const byClass=(root,name)=>flatten(root).find(node=>String(node.props?.class||'').split(' ').includes(name));
const click=async node=>{node.props.onClick({button:0,stopPropagation(){},preventDefault(){},target:node,currentTarget:node});await nextTick();};

const shell=await mount('components/ExhibitionShell.vue',{page:{id:'07',route:'/apps',role:'普通员工'}});
const topNav=byClass(shell.root,'primary-nav');
const brand=byClass(shell.root,'brand');
assert.equal(brand.props.href,'/workbench');
assert.equal(textOf(byClass(brand,'brand-title')),'数智产品展厅');
assert.deepEqual(flatten(topNav).filter(node=>node.type==='a').map(node=>node.props.href),['/workbench','/apps','/materials','/certification','/training','/talent/people','/operations']);
const account=byClass(shell.root,'account-menu');
assert.ok(flatten(account).filter(node=>node.type==='a').map(node=>node.props.href).includes('/profile'));
await click(byClass(shell.root,'sidebar-toggle'));
assert.match(byClass(shell.root,'exhibition-shell').props.class,/sidebar-collapsed/);
await click(byClass(shell.root,'compact-scene-search'));
assert.equal(document.activeElement?.type,'input');
media.matches=true;media.change(media);await nextTick();
assert.doesNotMatch(byClass(shell.root,'exhibition-shell').props.class,/sidebar-collapsed/);
await click(byClass(shell.root,'mobile-nav-toggle'));
assert.equal(byClass(shell.root,'sidebar').props['aria-modal'],'true');
await click(byClass(shell.root,'mobile-drawer-close'));
assert.equal(byClass(shell.root,'sidebar').props['aria-hidden'],'true');
shell.app.unmount();

media.matches=false;
globalThis.location=new URL('http://127.0.0.1:4173/apps');
const operationExecutor=async()=>({data:{items:REMOTE_RECORDS,allowed:false,launchUrl:null,reasonMessage:'测试环境未开放'}});
const apps=await mount('pages/AppsPage.vue',{integrationState:'normal',integrationData:{'APP-001':{typeDetailCounts:[{category:'RPA',count:1},{category:'海能work应用',count:1},{category:'报表',count:1}]},'APP-002':{items:REMOTE_RECORDS}},operationExecutor});
assert.equal(flatten(byClass(apps.root,'application-grid')).filter(node=>String(node.props?.class)==='application-card').length,3);
assert.deepEqual(flatten(byClass(apps.root,'onboarding-actions')).filter(node=>node.type==='a').map(node=>node.props.href),['/apps/onboarding/apply','/apps/onboarding/status']);
const workCategory=flatten(byClass(apps.root,'app-type-overview')).find(node=>node.type==='button'&&node.props['aria-label']?.startsWith('海能work应用'));
assert.deepEqual(flatten(workCategory).filter(node=>String(node.props?.class)==='category-name-part').map(textOf),['海能work','应用']);
const cards=flatten(apps.root).filter(node=>String(node.props?.class)==='application-card');
for(const card of cards){
  const expected=EXPECTED_APPS.find(app=>app.id===card.props['data-app-id']);assert.ok(expected);
  const title=byClass(card,'card-title-link');
  assert.equal(title.props.href,expected.route);
  assert.equal(textOf(byClass(card,'catalog-type-tag')),normalizeAppCategory(expected.category));
  assert.deepEqual(flatten(byClass(card,'catalog-people')).filter(node=>node.type==='dd').map(textOf),[expected.department,expected.developer,expected.owner]);
  assert.deepEqual(flatten(byClass(card,'catalog-metrics')).filter(node=>node.type==='dd').map(textOf),[expected.usage.toLocaleString('zh-CN'),expected.favorites.toLocaleString('zh-CN')]);
  let detailClicks=0;title.props.onClick=()=>{detailClicks+=1;};
  card.props.onClick({button:0,target:{closest:()=>null},currentTarget:{querySelector:()=>title},defaultPrevented:false});
  assert.equal(detailClicks,1,'卡片空白区域必须进入真实详情链接');
}
const favorite=byClass(apps.root,'card-favorite');const before=favorite.props['aria-pressed'];await click(favorite);assert.notEqual(favorite.props['aria-pressed'],before);await click(favorite);assert.equal(favorite.props['aria-pressed'],before);
await click(flatten(apps.root).find(node=>node.props?.['aria-label']==='列表视图'));
assert.match(byClass(apps.root,'application-grid').props.class,/list-view/);
apps.app.unmount();

const rpa=REMOTE_RECORDS[0];
const rpaDetail=await mount('pages/RpaDetailPage.vue',{integrationState:'normal',integrationData:{'APP-003':{...rpa,appCode:rpa.appId,versionName:'V1.0',description:rpa.summary,updatedAt:'2026-09-28',attachments:[],metrics:[],features:[],fieldDefinitions:[],processSteps:[],previews:[],videos:[],guides:[],trainings:[],relatedApps:[],relatedMaterials:[]}}});
assert.equal(textOf(flatten(rpaDetail.root).find(node=>node.type==='h1')),rpa.name);
assert.equal(byClass(rpaDetail.root,'remote-app-detail').props['data-authoritative-detail'],'true');
assert.equal(flatten(rpaDetail.root).find(node=>node.props?.['data-detail-return']!==undefined).props.href,'/apps');
assert.ok(textOf(byClass(rpaDetail.root,'remote-detail-facts')).includes(rpa.appId));
rpaDetail.app.unmount();

const description=await mount('components/ClampedText.vue',{text:'测试应用的完整多行说明',id:'description-test'});
const paragraph=flatten(description.root).find(node=>node.type==='p');paragraph.scrollHeight=88;resizeCallback();await nextTick();
const descriptionWrapper=byClass(description.root,'catalog-description');assert.equal(descriptionWrapper.props.tabindex,0);descriptionWrapper.props.onFocus();await nextTick();assert.ok(flatten(description.root).some(node=>node.props?.role==='tooltip'));
descriptionWrapper.props.onKeydown({key:'Escape',stopPropagation(){}});await nextTick();assert.equal(flatten(description.root).some(node=>node.props?.role==='tooltip'),false);description.app.unmount();

const tags=['招投标业务管理','发票智能识别','票据合规查验','额外业务标签'];
const overflow=await mount('components/OverflowTags.vue',{tags,id:'tags-test'});
assert.deepEqual(flatten(overflow.root).filter(node=>node.type==='mark').map(textOf),['招投标业务管理','发票智能识别','票据合规…']);
assert.equal(textOf(byClass(overflow.root,'catalog-tag-more')),'+1');
overflow.app.unmount();

const appsSource=readFileSync(new URL('../src/pages/AppsPage.vue',import.meta.url),'utf8');
assert.ok(appsSource.includes('.category-name-part{white-space:nowrap}'));
assert.ok(appsSource.includes('grid-template-columns:minmax(min(100%,340px),1fr)'));
assert.ok(appsSource.includes('.application-card>header>.catalog-tags{grid-column:1/-1;'));
assert.ok(appsSource.includes('categoryIconName(app.category)" :size="40"'));
assert.doesNotMatch(appsSource,/mock-data\.js|APP_FIXTURES/,'运行时应用目录不得回退到模拟数据');
console.log('真实组件：顶部导航、侧栏/移动抽屉、真实应用卡片、详情返回、收藏与文本提示通过');
