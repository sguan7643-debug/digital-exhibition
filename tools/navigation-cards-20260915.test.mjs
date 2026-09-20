import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileScript, parse } from '@vue/compiler-sfc';
import { createRenderer, nextTick, toRaw } from 'vue';
import { APP_FIXTURES } from '../src/fixtures/mock-data.js';
import { normalizeAppCategory } from '../src/state/interaction-controllers.js';

// Exercise actual compiled SFC handlers/render updates without controlling a browser.
globalThis.window = globalThis;
globalThis.Document = class {};
globalThis.ShadowRoot = class {};
const roots = [];
const flatten = node => [node, ...(node.children || []).flatMap(flatten)];
const textOf = node => [node.text || '', ...(node.children || []).map(textOf)].join('');
const listeners = new Map();
globalThis.document = new Document();
document.activeElement = null;
document.querySelector = () => roots.flatMap(flatten).find(n => n.type === 'input');
globalThis.location = new URL('http://127.0.0.1:4174/apps');
globalThis.history = { state: {}, pushState(_s, _t, url) { globalThis.location = new URL(url, location); }, replaceState(_s, _t, url) { globalThis.location = new URL(url, location); } };
globalThis.addEventListener = (name, fn) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); };
globalThis.removeEventListener = (name, fn) => listeners.get(name)?.delete(fn);
globalThis.dispatchEvent = event => { for (const fn of listeners.get(event.type) || []) fn(event); };
globalThis.PopStateEvent = class { constructor(type) { this.type = type; } };
const media = { matches: false, addEventListener(_name, fn) { this.change = fn; }, removeEventListener() {} };
globalThis.matchMedia = () => media;
let resizeCallback;
globalThis.ResizeObserver = class { constructor(fn) { resizeCallback = fn; } observe() {} disconnect() {} };
const host = {
  createElement(type) { return { type, tagName:type.toUpperCase(), props:{}, children:[], text:'', style:{}, value:'', scrollHeight:44, clientHeight:44,
    get options() { return this.children.filter(n => n.type === 'option'); },
    focus() { document.activeElement = this; }, getRootNode() { return document; },
    addEventListener(name, fn) { this.props['native:'+name] = fn; }, removeEventListener() {},
    getAttribute(name) { return this.props[name]; }, setAttribute(name, value) { this.props[name] = value; }, removeAttribute(name) { delete this.props[name]; },
    contains(node) { return flatten(this).some(child => toRaw(child) === toRaw(node)); },
    querySelector(selector) { return flatten(this).find(n => String(n.props?.class || '').split(' ').includes(selector.slice(1))); } }; },
  createText: text => ({type:'#text',text}), createComment: text => ({type:'#comment',text}),
  setText(node,text) { node.text=text; }, setElementText(node,text) { node.text=text; node.children=[]; },
  parentNode: n => n.parent, nextSibling: n => n.parent?.children[n.parent.children.indexOf(n)+1] || null,
  insert(node,parent,anchor) { if(node.parent) host.remove(node); node.parent=parent; const i=anchor?parent.children.indexOf(anchor):-1; if(i<0)parent.children.push(node);else parent.children.splice(i,0,node); },
  remove(node) { if(node.parent)node.parent.children=node.parent.children.filter(n=>n!==node); },
  patchProp(node,key,_old,value) { node.props[key]=value; },
  insertStaticContent(content,parent) { const node={type:'#static',text:content,parent};parent.children.push(node);return [node,node]; }
};
const renderer = createRenderer(host);
const cache = new Map();
async function load(file) {
  const url = new URL('../src/' + file, import.meta.url);
  if(cache.has(url.href))return cache.get(url.href);
  const { descriptor } = parse(readFileSync(url, 'utf8'));
  let code = compileScript(descriptor, { id:file, inlineTemplate:true, templateOptions:{compilerOptions:{hoistStatic:false}} }).content;
  code=code.replace(/import TypeLineIcon from ['"][^'"]+['"];?/g, "const TypeLineIcon={render(){return null;}};");
  code=code.replace(/import\s*\{([^}]*)\}\s*from ['"]@lucide\/vue['"];?/g, (_match, names) => {
    const bindings = names.split(',').map(name => name.trim()).filter(Boolean);
    return `const LucideStub={render(){return null;}};const ${bindings.map(name => `${name}=LucideStub`).join(',')};`;
  });
  for(const match of [...code.matchAll(/import (\w+) from ['"]([^'"]+\.vue)['"];?/g)]) {
    const childUrl = new URL(match[2], url);
    const childFile = decodeURIComponent(childUrl.pathname.split('/src/')[1]);
    code=code.replace(match[0], `import ${match[1]} from '${await load(childFile)}';`);
  }
  code=code.replace(/from\s+(['"])vue\1/g, `from '${new URL('../node_modules/vue/index.mjs',import.meta.url).href}'`);
  code=code.replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/g, (_m,_q,p)=>`from '${new URL(p,url).href}'`);
  const data='data:text/javascript;base64,'+Buffer.from(code).toString('base64'); cache.set(url.href,data); return data;
}
async function mount(file,props={}) {
  const component=(await import(await load(file))).default;
  const root={type:'root',children:[]}; roots.push(root);
  const app=renderer.createApp(component,props); app.mount(root); await nextTick();
  return {root,app};
}
const byClass=(root,cls)=>flatten(root).find(n=>String(n.props?.class || '').split(' ').includes(cls));
const click=async node=>{node.props.onClick({stopPropagation(){},preventDefault(){}});await nextTick();};

const shell=await mount('components/ExhibitionShell.vue',{page:{id:'07',route:'/apps',role:'普通员工'}});
const topNav=byClass(shell.root,'primary-nav');
const brand=byClass(shell.root,'brand');
assert.equal(brand.props.href,'/workbench');
assert.equal(byClass(brand,'brand-logo'),undefined,'header no longer displays the corporate logo');
assert.equal(flatten(brand).some(n=>n.type==='img'),false);
assert.equal(textOf(byClass(brand,'brand-title')),'数智产品展厅');
assert.deepEqual(flatten(topNav).filter(n=>n.type==='a').map(n=>n.props.href),['/workbench','/apps','/materials','/certification','/training','/talent/people','/operations']);
assert.equal(flatten(shell.root).some(n=>n.props?.id==='materials-group-menu'),false);
const account = byClass(shell.root,'account-menu');
const accountRoutes = flatten(account).filter(n=>n.type==='a').map(n=>n.props.href);
assert.ok(accountRoutes.includes('/profile') && accountRoutes.includes('/profile#my-points'));
assert.equal(accountRoutes.includes('/admin'),false,'ordinary viewers do not acquire an admin entry');
account.setAttribute('open','');
dispatchEvent({type:'click',target:account});
assert.equal(account.getAttribute('open'),'','clicking inside keeps the menu open');
dispatchEvent({type:'keydown',key:'Escape'});
assert.equal(account.getAttribute('open'),undefined,'Escape dismisses the account menu');
account.setAttribute('open','');
dispatchEvent({type:'click',target:topNav});
assert.equal(account.getAttribute('open'),undefined,'outside click dismisses the account menu');
await click(byClass(shell.root,'sidebar-toggle'));
assert.match(byClass(shell.root,'exhibition-shell').props.class,/sidebar-collapsed/);
assert.equal(byClass(shell.root,'sidebar-toggle').props['aria-expanded'],'false');
const category=flatten(shell.root).find(n=>n.type==='button'&&n.props?.['aria-label']==='RPA');
await click(category);
assert.equal(category.props['aria-pressed'],true,'collapsed category buttons remain usable');
await click(byClass(shell.root,'compact-scene-search'));
assert.doesNotMatch(byClass(shell.root,'exhibition-shell').props.class,/sidebar-collapsed/);
assert.equal(document.activeElement?.type,'input','scene search expands and receives focus');
await click(byClass(shell.root,'sidebar-toggle'));
media.matches=true;media.change(media);await nextTick();
assert.doesNotMatch(byClass(shell.root,'exhibition-shell').props.class,/sidebar-collapsed/,'mobile never inherits desktop collapse');
await click(byClass(shell.root,'mobile-nav-toggle'));
assert.equal(byClass(shell.root,'sidebar').props['aria-modal'],'true');
await click(byClass(shell.root,'mobile-drawer-close'));
assert.equal(byClass(shell.root,'sidebar').props['aria-hidden'],'true');
shell.app.unmount();
media.matches=false;
globalThis.location=new URL('http://127.0.0.1:4174/apps');
const apps=await mount('pages/AppsPage.vue');
const workCategory = flatten(byClass(apps.root,'app-type-overview')).find(n=>n.type==='button'&&n.props['aria-label']?.startsWith('海能work应用'));
assert.ok(workCategory);
assert.deepEqual(flatten(workCategory).filter(n=>String(n.props?.class)==='category-name-part').map(textOf),['海能work','应用'],'long category wraps between complete words');
assert.deepEqual(flatten(byClass(apps.root,'filter-actions')).filter(n=>n.type==='button').map(n=>n.props.type),['reset','submit'],'filter actions remain together');
assert.equal(byClass(apps.root,'view-switch').props.role,'group');
assert.ok(flatten(byClass(apps.root,'catalogue-controls')).some(n=>n.type==='select'&&n.props['aria-label']==='排序'),'sort and view controls share one toolbar group');
const star=byClass(apps.root,'card-favorite');
const before=star.props['aria-pressed'];
await click(star);assert.notEqual(star.props['aria-pressed'],before);
assert.match(star.props['aria-label'],star.props['aria-pressed']?/取消收藏/ : /收藏/);
await click(star);assert.equal(star.props['aria-pressed'],before,'favorite toggles both ways');
for(const card of flatten(apps.root).filter(n=>String(n.props?.class)==='application-card')) {
 const fixture = APP_FIXTURES.find(app=>app.id===card.props['data-app-id']);
 assert.ok(fixture);
 let detailClicks=0;
 const backgroundEvent={button:0,target:{closest:(selector)=>selector.split(',').some(s=>s.trim()==='[tabindex]')?{id:'main-content'}:null},currentTarget:{querySelector:()=>({click(){detailClicks++;}})}};
 card.props.onClick(backgroundEvent);
 assert.equal(detailClicks,1,'clicking card background forwards to the existing detail link');
 for (const target of ['button','a','[tabindex]']) {
   card.props.onClick({...backgroundEvent,target:{closest:()=>({type:target})}});
 }
 card.props.onClick({...backgroundEvent,ctrlKey:true});
 card.props.onClick({...backgroundEvent,defaultPrevented:true});
 assert.equal(detailClicks,1,'independent actions, tooltip targets and modified clicks do not trigger card navigation');
 assert.equal(textOf(byClass(card,'catalog-type-tag')),normalizeAppCategory(fixture.category),'title badge matches the navigation category');
 const expectedTags=fixture.sceneTags || [fixture.scene];
 assert.equal(byClass(card,'catalog-tags').parent.type,'header','tags occupy a full-width row below the description, without the icon indent');
 assert.deepEqual(flatten(byClass(card,'catalog-tags')).filter(n=>n.type==='mark').map(textOf),expectedTags,'scene tags respect the display limit without changing source values');
 if (fixture.id === 'app-rpa-001') assert.equal(flatten(byClass(card,'catalog-tags')).filter(n=>n.type==='mark').length,3,'the RPA example displays three tags');
 const people=byClass(card,'catalog-people');
 assert.deepEqual(flatten(people).filter(n=>n.type==='dd').map(textOf),[fixture.department,fixture.developer,fixture.owner],'department, developer and owner values remain in the requested order');
 const copy=byClass(card,'catalog-copy');
 const title=byClass(card,'card-title-link');
 const description=byClass(card,'catalog-description');
 assert.equal(title.props.href,fixture.route,'clicking the title retains the detail route');
 assert.equal(title.props['data-session-focus'],`app-${fixture.id}`,'return navigation can restore title focus');
 assert.equal(title.parent.type,'h2');
 assert.equal(people.parent,copy);
 assert.equal(description.parent,copy,'description is in the same right-hand column as the title and people');
 assert.ok(copy.children.indexOf(byClass(card,'catalog-title-row'))<copy.children.indexOf(people));
 assert.ok(copy.children.indexOf(people)<copy.children.indexOf(description));
 for (const role of ['catalog-developer','catalog-owner']) assert.ok(flatten(byClass(card,role)).some(n=>n.type==='svg'),'developer and owner retain small role icons');
 assert.equal(byClass(card,'card-detail'),undefined,'the separate detail button is removed');
 assert.ok(textOf(byClass(card,'catalog-owner')).includes(fixture.owner));
 assert.ok(textOf(byClass(card,'catalog-developer')).includes(fixture.developer));
 const footer=flatten(card).find(n=>n.type==='footer');
 const actions=byClass(footer,'catalog-actions');
 const metrics=byClass(footer,'catalog-metrics');
 assert.equal(actions.children.filter(n=>['a','button'].includes(n.type)).length,1,'only the primary access action remains');
 assert.ok(footer.children.indexOf(metrics)<footer.children.indexOf(actions),'usage and favorites appear to the left of the access action');
 assert.deepEqual(flatten(metrics).filter(n=>n.type==='dt').map(textOf),['使用量：','收藏量：']);
 assert.equal(copy.parent.children.filter(n=>typeof n.type==='string'&&!n.type.startsWith('#')).at(-1),byClass(card,'catalog-tags'),'business tags follow the description at the bottom of the header');
 assert.deepEqual(flatten(metrics).filter(n=>n.type==='dd').map(textOf),[fixture.usage.toLocaleString('zh-CN'),fixture.favorites.toLocaleString('zh-CN')],'moving metrics preserves both values');
 assert.ok(flatten(card).filter(n=>n.type==='dt'&&['负责部门','负责人','开发者'].includes(textOf(n))).every(n=>n.props.class==='sr-only'));
}
const listButton=flatten(apps.root).find(n=>n.props?.['aria-label']==='列表视图');
await click(listButton);assert.match(byClass(apps.root,'application-grid').props.class,/list-view/);
apps.app.unmount();
const rpaDetail=await mount('pages/RpaDetailPage.vue');
const rpaFixture=APP_FIXTURES.find(app=>app.id==='app-rpa-001');
assert.equal(textOf(flatten(rpaDetail.root).find(n=>n.type==='h1')),rpaFixture.name);
assert.equal(textOf(byClass(rpaDetail.root,'rpa-category')),normalizeAppCategory(rpaFixture.category));
assert.deepEqual(flatten(byClass(rpaDetail.root,'detail-tags')).filter(n=>n.type==='mark').map(textOf),rpaFixture.sceneTags);
assert.ok(textOf(byClass(rpaDetail.root,'detail-title')).includes(rpaFixture.description));
const rpaMetrics=byClass(rpaDetail.root,'rpa-metrics');
assert.equal(flatten(rpaMetrics).filter(n=>n.type==='dt').length,8);
assert.equal(textOf(rpaMetrics).includes('RPA流程名'),false);
for (const value of [rpaFixture.department,rpaFixture.developer,rpaFixture.owner,rpaFixture.domain]) assert.ok(textOf(rpaMetrics).includes(value));
assert.ok(textOf(byClass(rpaDetail.root,'rpa-recording')).includes('暂无录屏文件'));
assert.equal(flatten(rpaDetail.root).some(n=>n.type==='img'&&String(n.props.class||'').includes('rpa-video')),false);
rpaDetail.app.unmount();
const appsSource=readFileSync(new URL('../src/pages/AppsPage.vue',import.meta.url),'utf8');
assert.ok(appsSource.includes('.category-name-part{white-space:nowrap}'),'category words never split into orphan characters');
assert.ok(appsSource.includes('.app-type-overview>button[aria-pressed=true] :is(strong,b,.category-name-part){color:#fff}'),'selected category labels and counts override global dark heading styles');
assert.ok(appsSource.includes('grid-template-rows:40px 26px'),'category counts align below two-line label slots');
assert.ok(appsSource.includes('gap:8px;padding:14px'),'compact spacing retains readable font sizes');
assert.match(appsSource,/\.catalog-metrics\{display:flex;[^}]*padding:0;[^}]*background:transparent/,'metrics have no background or inset padding');
assert.ok(appsSource.includes('.application-card>footer{display:grid;grid-template-columns:minmax(0,1fr) auto;'),'metrics and access action share a flexible row');
assert.ok(appsSource.includes('.catalog-type-tag{color:#0060a6;background:#eaf3fc}'),'category badge uses light blue');
assert.ok(appsSource.includes('.card-favorite[aria-pressed=true]{color:#e6a700;background:#fff7df}'),'selected favorite uses yellow');
assert.ok(appsSource.includes('.catalog-people dd{display:block;margin:0;overflow:visible;white-space:normal;overflow-wrap:anywhere}'),'names wrap instead of being clipped');
const description=await mount('components/ClampedText.vue',{text:'测试应用的完整多行说明',id:'description-test'});
const p=flatten(description.root).find(n=>n.type==='p');p.scrollHeight=88;resizeCallback();await nextTick();
const wrapper=byClass(description.root,'catalog-description');
assert.equal(wrapper.props.tabindex,0);
wrapper.props.onFocus();await nextTick();
assert.ok(flatten(description.root).some(n=>n.props?.role==='tooltip'),'keyboard focus reveals full clipped description');
wrapper.props.onKeydown({key:'Escape',stopPropagation(){}});await nextTick();
assert.equal(flatten(description.root).some(n=>n.props?.role==='tooltip'),false);
p.scrollHeight=44;resizeCallback();await nextTick();
assert.equal(wrapper.props.tabindex,undefined,'unclipped descriptions need no extra focus stop');
description.app.unmount();
const tagsExample=['财务管理','招标采购','发票查验'];
const overflowTags=await mount('components/OverflowTags.vue',{tags:tagsExample,id:'tags-test'});
const tagRail=byClass(overflowTags.root,'catalog-tag-rail');
tagRail.scrollWidth=410;tagRail.clientWidth=220;resizeCallback();await nextTick();
const tagWrapper=byClass(overflowTags.root,'catalog-tags');
assert.equal(tagWrapper.props.tabindex,0,'clipped tags are keyboard accessible');
tagWrapper.props.onMouseenter();await nextTick();
assert.equal(textOf(byClass(overflowTags.root,'catalog-tag-tooltip')),tagsExample.join(' · '),'hover reveals every full tag');
tagWrapper.props.onMouseleave();await nextTick();
assert.equal(byClass(overflowTags.root,'catalog-tag-tooltip'),undefined);
tagWrapper.props.onFocus();await nextTick();
assert.ok(byClass(overflowTags.root,'catalog-tag-tooltip'),'focus reveals hidden tags');
tagWrapper.props.onKeydown({key:'Escape',stopPropagation(){}});await nextTick();
assert.equal(byClass(overflowTags.root,'catalog-tag-tooltip'),undefined,'Escape dismisses the tooltip');
tagRail.clientWidth=500;resizeCallback();await nextTick();
assert.equal(tagWrapper.props.tabindex,undefined,'wide cards need no overflow affordance');
assert.equal(byClass(overflowTags.root,'catalog-tag-more'),undefined);
overflowTags.app.unmount();
const longTags=['招投标业务管理','发票智能识别','票据合规查验','额外业务标签'];
const limitedTags=await mount('components/OverflowTags.vue',{tags:longTags,id:'limited-tags'});
const shownTags=flatten(limitedTags.root).filter(n=>n.type==='mark').map(textOf);
assert.deepEqual(shownTags,['招投标业务管理','发票智能识别','票据合规…'],'the shared budget preserves full labels until eighteen characters');
assert.equal(shownTags.reduce((total,tag)=>total+Array.from(tag).length,0),18,'displayed tags use at most eighteen characters including ellipses');
assert.equal(textOf(byClass(limitedTags.root,'catalog-tag-more')),'+1');
byClass(limitedTags.root,'catalog-tags').props.onMouseenter();await nextTick();
assert.equal(textOf(byClass(limitedTags.root,'catalog-tag-tooltip')),longTags.join(' · '),'full labels remain available after count and character limits');
limitedTags.app.unmount();
for (const tags of [['供应链管理'],['供应链管理','招投标','发票查验'],['财务共享管理','招标采购管理','发票智能查验']]) {
 const withinBudget=await mount('components/OverflowTags.vue',{tags,id:'within-budget'});
 assert.deepEqual(flatten(withinBudget.root).filter(n=>n.type==='mark').map(textOf),tags,'labels longer than four characters remain intact when the total fits');
 assert.equal(byClass(withinBudget.root,'catalog-tags').props.tabindex,undefined,'unclipped labels do not need a tooltip');
 withinBudget.app.unmount();
}
const tagsSource=readFileSync(new URL('../src/components/OverflowTags.vue',import.meta.url),'utf8');
for (const columns of [2,3,4]) {
 const threshold=340*columns+12*(columns-1);
 assert.ok(appsSource.includes('@container(min-width:'+threshold+'px){#main-content .application-grid:not(.list-view){grid-template-columns:repeat('+columns+',minmax(340px,1fr))}}'),'340px cards and gaps determine column thresholds; fractional tracks fill the remaining width');
}
assert.ok(appsSource.includes('grid-template-columns:minmax(min(100%,340px),1fr)'),'single cards fill the available width and shrink safely on mobile');
assert.doesNotMatch(appsSource,/minmax\(360px,460px\)/,'the old fixed maximum must not leave unused row space');
assert.ok(appsSource.includes('.application-card>header>.catalog-tags{grid-column:1/-1;'),'tags span both icon and text columns');
assert.ok(appsSource.includes('grid-template-columns:64px minmax(0,1fr)'),'large icon and flexible text column share the header');
assert.ok(appsSource.includes('categoryIconName(app.category)" :size="40"'),'larger app icon uses sharp vector rendering');
assert.ok(tagsSource.includes('flex-wrap:nowrap') && tagsSource.includes('overflow:hidden'),'tag rail clips instead of wrapping');
const profile = await mount('pages/ProfilePage.vue');
const points = byClass(profile.root,'profile-points');
assert.equal(points.props.id,'my-points');
assert.deepEqual(flatten(points).filter(n=>n.type==='a').map(n=>n.props.href),['/points','/points/details','/points#rule']);
profile.app.unmount();
console.log('真实组件：顶部顺序、侧栏收缩/分类/搜索、移动抽屉、收藏、列表和简介提示通过');
