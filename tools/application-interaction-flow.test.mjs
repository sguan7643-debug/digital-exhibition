import assert from 'node:assert/strict';
import { buildApplicationWriteInput, resolveDownloadFileId } from '../src/integration/application-actions.js';

const options = { randomId: () => 'uuid-2', now: () => '2026-09-10T09:00:00.000Z' };
const favorite = buildApplicationWriteInput('FAV-003', 'APP-1', {}, options);
assert.deepEqual(favorite.fields, { 应用ID: 'APP-1', 收藏时间: '2026-09-10T09:00:00.000Z' });
const comment = buildApplicationWriteInput('APP-008', 'APP-1', { comment: 'TEST_真实评论' }, options);
assert.deepEqual(comment.fields, { 应用ID: 'APP-1', 评论内容: 'TEST_真实评论', 评论时间: '2026-09-10T09:00:00.000Z' });
const training = buildApplicationWriteInput('TRN-004', 'COURSE-1', {}, options);
assert.deepEqual(training.fields, { 课程ID: 'COURSE-1', 状态: '已报名', 报名时间: '2026-09-10T09:00:00.000Z' });
assert.equal(resolveDownloadFileId({ primaryFile: { fileId: 'file-token-1' }, materialId: 'MAT-1' }), 'file-token-1');
assert.equal(resolveDownloadFileId({ materialId: 'MAT-1' }), '');
assert.throws(() => buildApplicationWriteInput('APP-008', 'APP-1', { comment: '' }, options), /评论/);
console.log('favorites, comments, training, and downloads use canonical resources and deterministic TEST_ write inputs');
