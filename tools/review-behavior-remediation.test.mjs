import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FAVORITE_FIXTURES, MESSAGE_FIXTURES, createFavoritesController, createMessagesController } from '../src/state/content-controllers.js';

const messages=createMessagesController(MESSAGE_FIXTURES);
assert.equal(messages.totalCount,128,'消息总数必须从 fixture 派生');
assert.equal(messages.unreadCount,18,'未读数必须从当前状态派生');
assert.equal(messages.readCount,110,'已读数必须从当前状态派生');
assert.equal(messages.todayCount,9,'今日新增必须从 fixture 标记派生');
assert.deepEqual(messages.actionFor(MESSAGE_FIXTURES[0]),{kind:'route',route:'/announcements/notice-001'});
assert.deepEqual(messages.actionFor(MESSAGE_FIXTURES[3]),{kind:'route',route:'/training'});
messages.activate(MESSAGE_FIXTURES[4]);
assert.match(messages.announcement,/演示环境不提供真实下载/,'导出完成不得伪装真实下载');

const favorites=createFavoritesController(FAVORITE_FIXTURES);
assert.equal(favorites.activeCount,28);
favorites.setPage(3);
const lastPageIds=favorites.pagedResults.map(item=>item.id);
assert.equal(lastPageIds.length,4);
lastPageIds.forEach(id=>favorites.cancel(id));
assert.equal(favorites.activeCount,24,'收藏总数必须从未取消集合派生');
assert.equal(favorites.page,2,'删除末页最后一项后页码必须钳制');
assert.equal(favorites.pagedResults.length,12);

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const messagesPage=read('src/pages/MessagesPage.vue');
const favoritesPage=read('src/pages/FavoritesPage.vue');
const talentPage=read('src/pages/TalentPeoplePage.vue');
for(const contract of ['controller.totalCount','controller.unreadCount','actionFor','activateMessage'])assert.ok(messagesPage.includes(contract),`F05 未接线：${contract}`);
for(const contract of ['controller.activeCount','nextTick','restoreFavoriteFocus','data-favorite-id'])assert.ok(favoritesPage.includes(contract),`F06 未接线：${contract}`);
for(const contract of ['aria-label="搜索人才"','<caption','scope="col"'])assert.ok(talentPage.includes(contract),`F08 缺少表格/搜索语义：${contract}`);

console.log('009 行为修复批次：派生统计、动作分派、末页删除与人才表格语义通过');
