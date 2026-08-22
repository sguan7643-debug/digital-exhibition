import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FAVORITE_FIXTURES, createFavoritesController } from '../src/state/content-controllers.js';
import { createSessionStore } from '../src/state/session-store.js';

const mappings=FAVORITE_FIXTURES.map(item=>[item.id,item.route]);
const store=createSessionStore(FAVORITE_FIXTURES.map(item=>item.id),mappings);
const favorites=createFavoritesController(FAVORITE_FIXTURES,store);
assert.equal(favorites.activeCount,28,'28 个唯一收藏 fixture 必须全部活跃');
const reportRows=FAVORITE_FIXTURES.filter(item=>item.route==='/apps/report-001');
assert.ok(reportRows.length>1,'fixture 应复现同 route 多收藏条目');
favorites.cancel(reportRows[0].id);
assert.equal(favorites.activeCount,27,'取消一条收藏只能减少一条');
assert.equal(favorites.results.filter(item=>item.route==='/apps/report-001').length,reportRows.length-1,'同 route 其他收藏不得连带删除');
assert.equal(store.isRouteFavorite('/apps/report-001'),true,'同 route 仍有收藏时详情保持已收藏');

const entryA=store.nextEntryKey();
const entryB=store.nextEntryKey();
assert.notEqual(entryA,entryB,'每个 History entry 必须具有唯一 key');
store.capture(entryA,{href:'/apps?category=RPA',scrollTop:321,focusId:'app-app-rpa-001',viewState:{apps:{queryDraft:'发票',filters:{category:'RPA'},page:2}}});
store.capture(entryB,{href:'/apps?category=AI',scrollTop:22,focusId:'app-app-ai-001',viewState:{apps:{queryDraft:'助手',filters:{category:'AI'},page:1}}});
assert.equal(store.snapshot(entryA).href,'/apps?category=RPA');
assert.equal(store.snapshot(entryA).viewState.apps.queryDraft,'发票');
assert.equal(store.snapshot(entryB).viewState.apps.queryDraft,'助手');

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const app=read('src/App.vue');
for(const contract of ['xltEntryKey','nextEntryKey','captureRouteSession(activeEntryKey.value)','xltSource','data-detail-return','history.back()'])assert.ok(app.includes(contract),`F04/F05 App 未接线：${contract}`);
for(const file of ['ToolDetailPage.vue','HainengWorkDetailPage.vue','ReportDetailPage.vue','DashboardDetailPage.vue']){
  const source=read(`src/pages/${file}`);
  assert.ok(source.includes('data-detail-return'),`${file} 必须优先返回真实来源`);
}
for(const file of ['AppsPage.vue','FavoritesPage.vue','MessagesPage.vue']){
  const source=read(`src/pages/${file}`);
  assert.doesNotMatch(source,/const queryDraft=ref\(/,`${file} 查询草稿不得脱离共享 controller`);
  assert.ok(source.includes('controller.queryDraft'),`${file} 查询草稿必须进入可恢复会话状态`);
}

console.log('009 会话修复二：唯一收藏 ID、History entry、查询草稿与真实来源返回通过');
