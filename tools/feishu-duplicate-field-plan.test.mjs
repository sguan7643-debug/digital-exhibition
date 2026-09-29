import assert from 'node:assert/strict';
import { planDuplicateFieldCleanup } from '../server/feishu-duplicate-field-cleanup.mjs';

const plan = planDuplicateFieldCleanup('应用索引', [
  { field_id: 'fld-primary', field_name: '应用ID', type: 1, is_primary: true },
  { field_id: 'fld-code-old', field_name: '应用编码', type: 1 },
  { field_id: 'fld-code-new', field_name: '应用编码', type: 1 },
  { field_id: 'fld-tags-old', field_name: '标签', type: 4, property: { options: [{ name: '新上线' }] } },
  { field_id: 'fld-tags-new', field_name: '标签', type: 4, property: { options: [{ name: '新上线' }] } }
]);
assert.deepEqual(plan.keep.map(item => item.fieldId), ['fld-code-old', 'fld-tags-old']);
assert.deepEqual(plan.remove.map(item => item.fieldId), ['fld-code-new', 'fld-tags-new']);
assert.equal(plan.duplicateGroupCount, 2);
assert.equal(plan.removeCount, 2);

assert.throws(
  () => planDuplicateFieldCleanup('应用索引', [
    { field_id: 'fld-a', field_name: '应用编码', type: 1 },
    { field_id: 'fld-b', field_name: '应用编码', type: 2 }
  ]),
  /同名字段类型不一致/,
  '同名异型字段不得自动删除'
);
assert.throws(
  () => planDuplicateFieldCleanup('其他表', []),
  /仅允许清理应用索引/,
  '清理脚本必须锁定用户授权的应用索引表'
);

console.log('duplicate field cleanup retains the first compatible field and rejects unsafe targets');
