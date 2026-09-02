import assert from 'node:assert/strict';
import { createVerifiedReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { resolveRemoteReadOperation } from '../src/integration/remote-operation-capabilities.js';
import { mapRemoteApp } from '../src/integration/app-read-model.js';
import { mapRemoteAnnouncement } from '../src/integration/announcement-read-model.js';

const contracts = createVerifiedReadOperationContracts();
assert.deepEqual(Object.keys(contracts).sort(), [
  'ANN-001', 'ANN-002', 'ANN-003', 'ANN-005', 'APP-001', 'APP-002', 'APP-003', 'APP-007', 'APP-009', 'APP-010', 'CER-001', 'CER-002', 'CER-003',
  'COM-001', 'COM-002', 'COM-003', 'COM-004', 'COM-005', 'COM-010', 'FAV-001', 'FAV-002', 'MAT-001', 'MAT-002', 'MSG-001', 'MSG-002',
  'OPS-003', 'PTS-001', 'PTS-002', 'PTS-003', 'PTS-004', 'TAL-001',
  'TAL-002', 'TAL-003', 'TAL-005', 'TRN-001', 'TRN-002', 'TRN-003', 'TRN-006', 'WB-001', 'WB-002', 'WB-003', 'WB-004'
]);
assert.equal(resolveRemoteReadOperation('APP-001').remoteEnabled, true);
assert.equal(resolveRemoteReadOperation('APP-002').remoteEnabled, true);
assert.equal(resolveRemoteReadOperation('ANN-001').remoteEnabled, true);
assert.equal(resolveRemoteReadOperation('ANN-002').remoteEnabled, true);
assert.equal(resolveRemoteReadOperation('COM-003').remoteEnabled, true);
assert.equal(resolveRemoteReadOperation('COM-004').remoteEnabled, true);

const remoteItem = {
  id: 'rec-app', appId: 'APP-001', name: '经营分析可视化报表', typeCode: 'REPORT', typeName: '可视化报表',
  categoryCode: '经营分析', categoryName: '经营分析', domainId: 'DOMAIN-OPS', domainName: '生产运营',
  sceneIds: ['SCENE-OPS'], sceneNames: ['生产运营'], keywords: ['经营', '分析'], summary: '经营指标展示',
  status: 'ONLINE', usageCount: 1418, favoriteCount: 731, ownerId: 'U-001', ownerName: '张三丰',
  developerId: 'U-002', developerName: '李明', responsibleOrgId: 'D-001', responsibleOrgName: '经营管理部',
  developerOrgId: 'D-002', developerOrgName: '数据管理中心', updatedAt: '2026-08-31', iconName: 'app-report',
  detailPath: '/apps/report-001'
};
const success = {
  code: 'OK', data: {
    items: [remoteItem], total: 1, page: 1, pageSize: 10, totalPages: 1,
    hasPrevious: false, hasNext: false, hasMore: false, sort: 'default', filtersApplied: {},
    facetsVersion: 'feishu-app-facets.v1'
  }, traceId: 'trace-app', schemaVersion: 'feishu-read-only.v1', sourceUpdatedAt: '2026-09-02T08:00:00.000Z',
  isComplete: true, dataStale: false
};
assert.doesNotThrow(() => validateContractSchema(success, contracts['APP-002'].successSchema));
const mapped = mapRemoteApp(remoteItem);
assert.equal(mapped.id, 'APP-001');
assert.equal(mapped.image, 'app-report');
assert.equal(mapped.category, '可视化报表');
assert.equal(mapped.scene, '生产运营');
assert.equal(mapped.usage, 1418);
assert.equal(mapped.route, '/apps/report-001');

const remoteAnnouncement = {
  id: 'rec-ann', announcementId: 'ANN-001', title: '系统上线', category: '系统公告',
  summary: '平台能力已完成更新。', status: '已发布', pinned: true, publishedAt: '2026-09-02 09:30:00'
};
const announcementSuccess = {
  code: 'OK', data: {
    items: [remoteAnnouncement], total: 1, page: 1, pageSize: 10, totalPages: 1,
    hasPrevious: false, hasNext: false, hasMore: false, sort: 'published-desc',
    filtersApplied: {}, facetsVersion: 'feishu-announcement-facets.v1'
  }, traceId: 'trace-ann', schemaVersion: 'feishu-read-only.v1', sourceUpdatedAt: '2026-09-02T08:00:00.000Z',
  isComplete: true, dataStale: false
};
assert.doesNotThrow(() => validateContractSchema(announcementSuccess, contracts['ANN-002'].successSchema));
const mappedAnnouncement = mapRemoteAnnouncement(remoteAnnouncement);
assert.equal(mappedAnnouncement.id, 'ANN-001');
assert.equal(mappedAnnouncement.type, '系统公告');
assert.equal(mappedAnnouncement.read, null, '飞书表没有已读字段时必须保持未知');
assert.equal(mappedAnnouncement.status, '已发布');

console.log('APP/ANN browser contracts, selective remote gate and view-model projections passed');
