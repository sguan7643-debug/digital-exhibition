import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { resolveRemoteReadOperation } from '../src/integration/remote-operation-capabilities.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identifierContract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const rowsByName = new Map([
  ['应用索引', [{ record_id: 'rec-app', fields: { 应用ID: 'APP-001', 应用编码: 'APP-CODE-001', 应用名称: '经营分析', 应用简称: '经营', 应用类型: 'REPORT', 应用简介: '经营分析应用', 状态: 'ONLINE', 使用次数: 8, 收藏数: 2, 应用Logo: 'logo.png', 应用封面: 'cover.png', 版本: 3, 创建时间: '2026-01-01', 更新时间: '2026-09-01' } }]],
  ['附件资料', [{ record_id: 'rec-attachment', fields: { 主键: 'ATT-001', 应用ID: 'APP-001', 文件名称: '使用说明.pdf', 附件文件: [{ file_token: 'file-token' }], 文件大小: 1024, 上传时间: '2026-08-01', 上传人ID: 'U-001' } }]],
  ['演示截图录屏', [{ record_id: 'rec-preview', fields: { 主键: 'PRE-001', 应用ID: 'APP-001', 媒体类型: 'IMAGE', 文件: [{ file_token: 'image-token' }], 说明文字: '首页预览' } }]],
  ['相关培训', [{ record_id: 'rec-training', fields: { 主键: 'TRAIN-001', 应用ID: 'APP-001', 培训标题: '经营分析入门', 培训分类: '线上', 讲师姓名: '讲师甲', '时长(分钟)': 30, 培训链接: '', 排序: 1 } }]],
  ['应用素材关联', [{ record_id: 'rec-material-relation', fields: { 主键: 'AMR-001', 应用ID: 'APP-001', 素材ID: 'MAT-001' } }]],
  ['应用关联', [{ record_id: 'rec-app-relation', fields: { 关联编码: 'REL-001', 应用ID: 'APP-001', 关联类型: 'MATERIAL', 关联资源ID: 'MAT-001', 排序: 1, 启用: true } }]],
  ['素材中心', [{ record_id: 'rec-material', fields: { 素材ID: 'MAT-001', 素材编码: 'MAT-CODE-001', 素材名称: '经营分析模板', 素材摘要: '模板摘要', 素材描述: '模板说明', 素材类型: 'TEMPLATE', 分类ID: 'CAT-001', 分类名称: '模板', 关联应用ID: 'APP-001', 素材文件: [{ file_token: 'material-token', name: '模板.xlsx', size: 2048 }], 版本名称: 'V1', 发布人ID: 'U-001', 发布人姓名: '发布人', 发布时间: '2026-08-20', 浏览量: 3, 下载次数: 4, 状态: 'ONLINE', 版本: 1, 更新时间: '2026-08-21' } }]],
  ['公告通知', [{ record_id: 'rec-ann', fields: { 公告ID: 'ANN-001', 公告标题: '系统通知', 分类: 'SYSTEM', 公告正文: '<p>通知正文</p>', 公告摘要: '通知摘要', 发布部门ID: 'D-001', 发布人ID: 'U-001', 状态: 'PUBLISHED', 是否置顶: true, 发布时间: '2026-08-30', 有效期开始: '2026-08-30', 有效期结束: '2026-09-30', 浏览量: 5, 范围类型: 'ALL', 版本: 2, 创建时间: '2026-08-29', 更新时间: '2026-08-30' } }]],
  ['公告关联对象', [{ record_id: 'rec-ann-rel', fields: { 关联编码: 'ANNREL-001', 公告ID: 'ANN-001', 关联类型: 'APP', 资源ID: 'APP-001', 排序: 1, 启用: true } }]],
  ['用户字典', [{ record_id: 'rec-user', fields: { 用户ID: 'U-001', 姓名: '发布人' } }]],
  ['部门字典', [{ record_id: 'rec-dept', fields: { 部门ID: 'D-001', 部门名称: '运营部' } }]]
]);
const nameByTableId = new Map([...identifierContract.byName.values()].map(table => [table.tableId, table.name]));
const client = {
  async listRecords(tableId) {
    const items = rowsByName.get(nameByTableId.get(tableId)) || [];
    return { items, total: items.length, hasMore: false, nextPageToken: '' };
  }
};
const service = createFeishuReadOnlyService({ client, identifierContract, appProjectionCacheMs: 0, now: () => new Date('2026-09-02T03:00:00.000Z'), traceIdFactory: () => 'trace-first-detail' });
const contracts = createVerifiedReadOperationContracts();

const cases = [
  ['APP-003', { appId: 'APP-001' }],
  ['APP-009', { appId: 'APP-001', relationType: 'MATERIAL', page: 1, pageSize: 10 }],
  ['ANN-003', { announcementId: 'ANN-001', markRead: false }],
  ['ANN-005', { announcementId: 'ANN-001', relationType: 'APP', page: 1, pageSize: 10 }],
  ['MAT-002', { relatedAppId: 'APP-001', page: 1, pageSize: 10 }]
];
for (const [operationId, input] of cases) {
  const response = await service.execute(operationId, input);
  assert.equal(response.code, 'OK');
  assert.equal(response.schemaVersion, 'feishu-first-batch-detail.v1');
  assert.equal(resolveRemoteReadOperation(operationId).remoteEnabled, true);
  assert.doesNotThrow(() => validateContractSchema(response, contracts[operationId].successSchema));
}

const app = (await service.execute('APP-003', { appId: 'APP-001' })).data;
assert.equal(app.appId, 'APP-001');
assert.equal(app.attachments.length, 1);
assert.equal(app.previews.length, 1);
assert.equal(app.trainings.length, 1);
assert.equal(app.relatedMaterials.length, 1);
assert.doesNotMatch(JSON.stringify(app), /file-token|image-token|material-token/);

const appRelations = (await service.execute('APP-009', { appId: 'APP-001', relationType: 'MATERIAL' })).data;
assert.equal(appRelations.items[0].resourceId, 'MAT-001');
assert.equal(appRelations.pageSize, 10);

const announcement = (await service.execute('ANN-003', { announcementId: 'ANN-001', markRead: false })).data;
assert.equal(announcement.publisherName, '发布人');
assert.equal(announcement.publisherOrgName, '运营部');
assert.equal(announcement.relatedApps.length, 1);

const announcementRelations = (await service.execute('ANN-005', { announcementId: 'ANN-001', relationType: 'APP' })).data;
assert.equal(announcementRelations.items[0].resourceId, 'APP-001');

const materials = (await service.execute('MAT-002', { relatedAppId: 'APP-001', page: 1, pageSize: 10 })).data;
assert.equal(materials.items[0].materialId, 'MAT-001');
assert.equal(materials.items[0].permissions.canDownload, false);
assert.equal(materials.items[0].primaryFile.downloadUrl, '');

await assert.rejects(service.execute('APP-003', { appId: 'missing' }), error => error.code === 'RESOURCE_NOT_FOUND');
await assert.rejects(service.execute('ANN-003', { announcementId: 'ANN-001', markRead: true }), error => error.code === 'READ_SIDE_EFFECT_FORBIDDEN');

console.log('APP-003/009, ANN-003/005 and MAT-002 expose exact safe projections without file tokens or read side effects');
