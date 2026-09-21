import assert from 'node:assert/strict';
import { projectApplicationCards, resolveApplicationRoute } from '../src/integration/app-read-model.js';
import { createAppsController } from '../src/state/interaction-controllers.js';

const records = [
  { appId: 'APP-RPA-1', name: 'TEST_RPA机器人', typeCode: 'T003', typeName: 'RPA', categoryName: 'RPA', domainName: '供应链管理', summary: '自动处理', usageCount: 12, favoriteCount: 3, ownerName: '测试用户', ownerDepartmentName: '测试部门' },
  { appId: 'APP-WORK-1', name: 'TEST_协同应用', typeCode: 'T005', typeName: '海能work应用', categoryName: '海能work应用', domainName: '综合管理', summary: '协同办公', usageCount: 8, favoriteCount: 2 }
];
const cards = projectApplicationCards(records);
assert.equal(cards.length, 2);
assert.equal(cards[0].id, 'APP-RPA-1');
assert.equal(cards[0].category, 'RPA');
assert.equal(cards[0].route, '/apps/rpa-001?appId=APP-RPA-1');
assert.equal(cards[1].route, '/apps/haineng-work-001?appId=APP-WORK-1');
assert.equal(resolveApplicationRoute({ typeCode: 'UNKNOWN' }), '');

const controller = createAppsController([]);
controller.replaceFixtures(cards);
controller.setFilter('category', 'RPA');
assert.deepEqual(controller.results.map(item => item.id), ['APP-RPA-1']);
controller.setFilter('category', '');
controller.setFilter('query', '协同');
assert.deepEqual(controller.results.map(item => item.id), ['APP-WORK-1']);
controller.replaceFixtures([]);
assert.equal(controller.results.length, 0);
assert.equal(controller.page, 1);

console.log('application browse projection uses real APP-002 records, T003 filtering, canonical detail routes, and explicit empty results');
