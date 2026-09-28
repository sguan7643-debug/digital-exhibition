import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createFavoritesController, createMessagesController } from '../src/state/content-controllers.js';

const MESSAGE_FIXTURES=Array.from({length:128},(_,index)=>({
  id:`message-${index+1}`,title:`测试消息 ${index+1}`,copy:'测试正文',type:'测试通知',
  read:index>=18,today:index<9,route:index===0?'/announcements/notice-001':index===3?'/training':''
}));
const FAVORITE_FIXTURES=Array.from({length:28},(_,index)=>({
  id:`favorite-${index+1}`,name:`测试收藏 ${index+1}`,description:'测试说明',owner:'测试负责人',developer:'测试开发者',
  type:'RPA',domain:'测试域',tag:'测试',usage:String(index),favorites:String(index),route:index<2?'/apps/report-001':`/apps/test-${index}`
}));

const messages=createMessagesController(MESSAGE_FIXTURES);
assert.equal(messages.totalCount,128,'消息总数必须从 fixture 派生');
assert.equal(messages.unreadCount,18,'未读数必须从当前状态派生');
assert.equal(messages.readCount,110,'已读数必须从当前状态派生');
assert.equal(messages.todayCount,9,'今日新增必须从 fixture 标记派生');
assert.deepEqual(messages.actionFor(MESSAGE_FIXTURES[0]),{kind:'route',route:'/announcements/notice-001'});
assert.deepEqual(messages.actionFor(MESSAGE_FIXTURES[3]),{kind:'route',route:'/training'});
assert.deepEqual(messages.activate(MESSAGE_FIXTURES[4]),{kind:'feedback',message:'该消息没有可用的目标路径'});
assert.equal(messages.announcement,'已标记为已读','本地控制器只更新可见状态，不伪造远端写入成功');

const favorites=createFavoritesController(FAVORITE_FIXTURES);
assert.equal(favorites.activeCount,28);
favorites.setPage(3);
const lastPageIds=favorites.pagedResults.map(item=>item.id);
assert.equal(lastPageIds.length,8);
lastPageIds.forEach(id=>favorites.cancel(id));
assert.equal(favorites.activeCount,20,'收藏总数必须从未取消集合派生');
assert.equal(favorites.page,2,'删除末页最后一项后页码必须钳制');
assert.equal(favorites.pagedResults.length,10);

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const messagesPage=read('src/pages/MessagesPage.vue');
const favoritesPage=read('src/pages/FavoritesPage.vue');
const talentPage=read('src/pages/TalentPeoplePage.vue');
for(const contract of ["remoteStats", "remoteRows", 'actionFor','activateMessage'])assert.ok(messagesPage.includes(contract),`F05 未接线：${contract}`);
for(const contract of ['controller.activeCount','restoreFavoriteFocus','data-favorite-id'])assert.ok(favoritesPage.includes(contract),`F06 未接线：${contract}`);
for(const contract of ['aria-label="搜索人才"','<caption','scope="col"'])assert.ok(talentPage.includes(contract),`F08 缺少表格/搜索语义：${contract}`);

console.log('009 行为修复批次：派生统计、动作分派、末页删除与人才表格语义通过');
