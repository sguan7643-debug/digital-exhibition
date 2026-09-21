import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const namesById = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const rows = new Map([
  ['人才库', [{ record_id: 'talent-1', fields: { 主键: 'TALENT-1', 用户ID: 'U-1', 人才类型: '专业人才', 人才等级: '高级', 擅长领域: '数据治理', 状态: '在库' } }]],
  ['用户字典', [{ record_id: 'user-1', fields: { AD账号: 'U-1', 姓名: '张三', 工号: 'E001', 所属部门ID: 'D-1' } }]],
  ['部门字典', [{ record_id: 'department-1', fields: { 部门ID: 'D-1', 部门名称: '数字化中心' } }]]
]);
const reads = new Map();
const service = createFeishuReadOnlyService({
  identifierContract,
  readSleep: async () => {},
  client: {
    async listRecords(tableId) {
      const name = namesById.get(tableId);
      reads.set(name, (reads.get(name) || 0) + 1);
      if (name === '人才项目' || name === '项目进度') throw Object.assign(new Error(`${name} delayed`), { status: 504 });
      const items = rows.get(name) || [];
      return { items, total: items.length, hasMore: false, nextPageToken: '' };
    }
  }
});

const [people, facets] = await Promise.all([
  service.execute('TAL-001', { page: 1, pageSize: 10 }),
  service.execute('TAL-005', { page: 1, pageSize: 10 })
]);

assert.equal(people.data.items[0].name, '张三');
assert.deepEqual(facets.data.types, [{ code: '专业人才', name: '专业人才', count: 1, sortOrder: 0, enabled: true }]);
assert.equal(reads.get('人才库'), 1, 'TAL-001 和 TAL-005 必须共用人才库读取');
assert.equal(reads.get('用户字典'), 1, 'TAL-001 和 TAL-005 必须共用用户字典读取');
assert.equal(reads.get('部门字典'), 1, 'TAL-001 和 TAL-005 必须共用部门字典读取');
assert.equal(reads.get('人才项目') || 0, 0, '人才库与筛选页不得读取无关的人才项目表');
assert.equal(reads.get('项目进度') || 0, 0, '人才库与筛选页不得读取无关的项目进度表');

console.log('talent people/facets projection avoids unrelated slow tables');
