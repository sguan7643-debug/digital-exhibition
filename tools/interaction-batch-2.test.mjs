import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FAVORITE_FIXTURES,
  MESSAGE_FIXTURES,
  createFavoritesController,
  createMessagesController
} from '../src/state/content-controllers.js';

const messages = createMessagesController(MESSAGE_FIXTURES);
assert.equal(messages.results.length, MESSAGE_FIXTURES.length);
messages.setStatus('unread');
assert.ok(messages.results.every(item => !item.read));
messages.markRead(messages.results[0].id);
assert.equal(messages.results.every(item => !item.read), true, '已读项应立即退出未读结果');
messages.setStatus('all');
messages.setFilter('query', '采购合同');
assert.deepEqual(messages.results.map(item => item.id), ['message-002']);
messages.markAllRead();
assert.equal(messages.fixtures.every(item => item.read), true);
messages.refresh();
assert.ok(messages.fixtures.some(item => !item.read));
messages.toggleSort();
assert.equal(messages.sort, 'oldest');

const favorites = createFavoritesController(FAVORITE_FIXTURES);
favorites.setFilter('query', '智能采购');
assert.deepEqual(favorites.results.map(item => item.id), ['favorite-007']);
favorites.resetFilters();
favorites.setFilter('type', 'RPA机器人');
assert.ok(favorites.results.every(item => item.type === 'RPA机器人'));
const removed = favorites.results[0].id;
favorites.cancel(removed);
assert.ok(!favorites.results.some(item => item.id === removed));
favorites.resetData();
assert.ok(favorites.results.some(item => item.id === removed));

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const messageSource = read('src/pages/MessagesPage.vue');
const favoriteSource = read('src/pages/FavoritesPage.vue');
for (const contract of ['createMessagesController', 'role="tablist"', 'aria-selected', 'markAllRead', 'refresh'])
  assert.ok(messageSource.includes(contract), `PP02 未接线：${contract}`);
for (const contract of ['createFavoritesController', 'filteredCards', 'cancelFavorite', 'resetData'])
  assert.ok(favoriteSource.includes(contract), `PP03 未接线：${contract}`);

console.log('第二批 interaction：消息中心与收藏筛选、状态、复位行为通过');
