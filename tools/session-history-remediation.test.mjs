import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSessionStore } from '../src/state/session-store.js';

const store=createSessionStore(['/apps/rpa-001','/apps/ai-001']);
let factoryCalls=0;
const first=store.controller('messages',()=>{factoryCalls+=1;return {page:1};});
first.page=3;
const second=store.controller('messages',()=>{factoryCalls+=1;return {page:1};});
assert.equal(factoryCalls,1);
assert.equal(second.page,3,'详情往返应复用页面控制器状态');
store.capture('/messages',{scrollTop:416,focusId:'message-message-021'});
assert.deepEqual(store.snapshot('/messages'),{scrollTop:416,focusId:'message-message-021'});
assert.equal(store.favorites.has('/apps/rpa-001'),true);
store.toggleFavorite('/apps/rpa-001');
assert.equal(store.favorites.has('/apps/rpa-001'),false);
store.setFavorite('/apps/report-001',true);
assert.equal(store.favorites.has('/apps/report-001'),true);

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const app=read('src/App.vue');
const apps=read('src/pages/AppsPage.vue');
const favorites=read('src/pages/FavoritesPage.vue');
const messages=read('src/pages/MessagesPage.vue');
for(const contract of ['captureRouteSession','restoreRouteSession','routeSession.snapshot'])assert.ok(app.includes(contract),`F04 路由会话缺失：${contract}`);
assert.ok(apps.includes('routeSession.isRouteFavorite')&&apps.includes('routeSession.toggleRouteFavorite'),'应用中心必须通过 canonical route 映射使用收藏集合');
assert.ok(favorites.includes('createFavoritesController(FAVORITE_FIXTURES,routeSession)'),'收藏页必须按唯一收藏 ID 使用共享集合');
for(const source of [apps,favorites,messages])assert.ok(source.includes('routeSession.controller'),'已实现页面必须复用共享控制器');

console.log('009 会话修复：筛选分页、滚动焦点快照与跨页收藏集合通过');
