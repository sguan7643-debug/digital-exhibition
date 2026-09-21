import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPageIntegrationContract } from '../src/integration/page-integration-matrix.js';

const contract = getPageIntegrationContract('/profile');
assert.deepEqual(
  contract.readOperationIds,
  ['COM-003', 'COM-004', 'WB-003'],
  '个人中心首屏只能读取通讯录和一个个人聚合，不能并发重复读取身份与待办'
);

const liveSections = await readFile(new URL('../src/components/ProfileLiveSections.vue', import.meta.url), 'utf8');
assert.match(liveSections, /\['WB-003'\]\?\.todos/, '待办展示必须复用个人聚合结果');
assert.doesNotMatch(liveSections, /\['WB-004'\]/, '个人中心不应再单独请求重复待办聚合');

console.log('profile entry read plan avoids duplicate Feishu aggregate reads');
