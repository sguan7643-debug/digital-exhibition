import assert from 'node:assert/strict';
import { createAppReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';
import { resolveRemoteReadOperation } from '../src/integration/remote-operation-capabilities.js';
import { mapRemoteApp } from '../src/integration/app-read-model.js';

const contracts = createAppReadOperationContracts();
assert.deepEqual(Object.keys(contracts).sort(), ['APP-001', 'APP-002']);
assert.equal(resolveRemoteReadOperation('APP-001').remoteEnabled, true);
assert.equal(resolveRemoteReadOperation('APP-002').remoteEnabled, true);
assert.equal(resolveRemoteReadOperation('ANN-002').remoteEnabled, false);

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

console.log('APP-001/APP-002 browser contracts, selective remote gate and view-model projection passed');
