import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const contract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const namesById = new Map([...contract.byName.values()].map(table => [table.tableId, table.name]));
const identity = { tenantKey: 'tenant-real', userId: 'ou-user-a', adAccount: 'user.a', employeeNo: 'E001', displayName: '张三' };
const context = { identity };

function page(items = []) {
  return { items, total: items.length, hasMore: false, nextPageToken: '' };
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

function signedBaseline(value) {
  const unsigned = { ...value };
  delete unsigned.sha256;
  return { ...unsigned, sha256: createHash('sha256').update(JSON.stringify(stable(unsigned))).digest('hex') };
}

const appRows = new Map([
  ['应用索引', page([{ record_id: 'rec-app-1', fields: {
    应用ID: 'APP-1', 应用名称: '正式应用', 应用类型: 'REPORT', 状态: 'ONLINE',
    负责人ID: 'user.a', 开发者ID: 'user.b', 所属部门ID: 'dept-a', 开发部门ID: 'dept-b', 应用关键字: ['FORMAL_TAG']
  } }])],
  ['应用类型配置', page([{ record_id: 'rec-type', fields: { 类型编码: 'REPORT', 类型名称: '报表', 状态: '启用' } }])],
  ['用户字典', page([
    { record_id: 'rec-user-a', fields: { AD账号: 'user.a', 工号: 'E001', 姓名: '张三', 所属部门ID: 'dept-a', 所属部门名称: '运营部' } },
    { record_id: 'rec-user-b', fields: { AD账号: 'user.b', 工号: 'E002', 姓名: '李四', 所属部门ID: 'dept-b', 所属部门名称: '研发部' } }
  ])],
  ['部门字典', page([
    { record_id: 'rec-dept-a', fields: { 部门ID: 'dept-a', 部门名称: '运营部' } },
    { record_id: 'rec-dept-b', fields: { 部门ID: 'dept-b', 部门名称: '研发部' } }
  ])],
  ['业务域字典', page([])],
  ['场景字典', page([])]
]);

function clientFor(rows = appRows, extra = {}) {
  return {
    async listRecords(tableId) { return rows.get(namesById.get(tableId)) || page([]); },
    ...extra
  };
}

// APP-001/002/003 share one batched projection and may never copy IDs into Name fields.
const appService = createFeishuReadOnlyService({ identifierContract: contract, realtimeAuthorization: false, client: clientFor() });
const appList = await appService.execute('APP-002', { page: 1, pageSize: 10, query: '', filters: {}, sort: 'default' }, context);
assert.equal(appList.schemaVersion, 'feishu-app-read.v2');
assert.deepEqual(
  Object.fromEntries(['ownerName', 'developerName', 'responsibleOrgName', 'developerOrgName'].map(key => [key, appList.data.items[0][key]])),
  { ownerName: '张三', developerName: '李四', responsibleOrgName: '运营部', developerOrgName: '研发部' }
);
assert.notEqual(appList.data.items[0].ownerName, appList.data.items[0].ownerId);
const appDetail = await appService.execute('APP-003', { appId: 'APP-1' }, context);
assert.equal(appDetail.schemaVersion, 'feishu-app-read.v2');
appService.close();

const app0076Rows = new Map(appRows);
app0076Rows.set('应用索引', page([{ record_id: 'rec-app-0076', fields: {
  应用ID: 'APP0076', 应用名称: '正式 RPA 应用', 应用类型: 'REPORT', 状态: 'ONLINE',
  负责人ID: 'user.a', 开发者ID: 'user.b', 所属部门ID: 'dept-a', 开发部门ID: 'dept-b'
} }]));
let app0076Reads = 0;
const app0076Service = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  client: {
    async listRecords(tableId) {
      app0076Reads += 1;
      return app0076Rows.get(namesById.get(tableId)) || page([]);
    }
  }
});
const app0076 = await app0076Service.execute('APP-003', { appId: ' APP0076 ', include: 'developer,owner' }, context);
assert.deepEqual(
  [app0076.data.appId, app0076.data.ownerName, app0076.data.developerName, app0076.data.responsibleOrgName, app0076.data.developerOrgName],
  ['APP0076', '张三', '李四', '运营部', '研发部']
);
const app0076ReadCount = app0076Reads;
const warmApp0076 = await app0076Service.execute('APP-003', { appId: 'APP0076', include: ['owner', 'developer'] }, context);
assert.equal(warmApp0076.cacheStatus, 'fresh');
assert.equal(app0076Reads, app0076ReadCount, 'APP0076 详情完成后必须稳定命中同一缓存');
app0076Service.close();

let currentUserReads = 0;
const currentUserQueries = [];
const currentUserService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  client: {
    async listRecords(tableId, query = {}) {
      currentUserReads += 1;
      currentUserQueries.push({ tableName: namesById.get(tableId), query });
      return appRows.get(namesById.get(tableId)) || page([]);
    }
  }
});
const currentUser = await currentUserService.execute('COM-001', {}, context);
assert.equal(currentUser.data.displayName, '张三');
assert.equal(currentUser.data.departmentName, '运营部');
const boundedCurrentUserRead = currentUserQueries.find(item => item.tableName === '用户字典');
assert.match(String(boundedCurrentUserRead?.query?.filter || ''), /用户ID|AD账号/);
assert.match(String(boundedCurrentUserRead?.query?.filter || ''), /user\.a/);
assert.ok(
  currentUserQueries.every(item => ['用户字典', '用户权限'].includes(item.tableName)),
  'COM-001 首屏身份读取不得同时扫描消息、收藏和积分表；非身份统计允许返回空结构'
);
const currentUserReadCount = currentUserReads;
const warmCurrentUser = await currentUserService.execute('COM-001', {}, context);
assert.equal(warmCurrentUser.cacheStatus, 'fresh');
assert.equal(currentUserReads, currentUserReadCount, 'COM-001 完成后不得再次读取飞书');
currentUserService.close();

const objectPersonRows = new Map(appRows);
objectPersonRows.set('应用索引', page([{ record_id: 'rec-app-object-person', fields: {
  应用ID: 'APP-OBJECT-PERSON', 应用名称: '人员对象字段应用', 应用类型: 'REPORT', 状态: 'ONLINE',
  负责人ID: [{ id: 'ou-owner', name: '王负责人' }],
  开发者ID: { open_id: 'ou-developer', display_name: '赵开发者' },
  所属部门ID: 'dept-a', 开发部门ID: 'dept-b'
} }]));
const objectPersonService = createFeishuReadOnlyService({ identifierContract: contract, realtimeAuthorization: false, client: clientFor(objectPersonRows) });
const objectPersonList = await objectPersonService.execute('APP-002', { page: 1, pageSize: 10, query: '', filters: {}, sort: 'default' }, context);
assert.deepEqual(
  [objectPersonList.data.items[0].ownerId, objectPersonList.data.items[0].ownerName, objectPersonList.data.items[0].developerId, objectPersonList.data.items[0].developerName],
  ['ou-owner', '王负责人', 'ou-developer', '赵开发者']
);
objectPersonService.close();

const unresolvedRows = new Map(appRows);
unresolvedRows.set('用户字典', page([]));
const unresolvedService = createFeishuReadOnlyService({ identifierContract: contract, realtimeAuthorization: false, syncRetryAttempts: 1, client: clientFor(unresolvedRows) });
await assert.rejects(
  () => unresolvedService.execute('APP-002', { page: 1, pageSize: 10, query: '', filters: {}, sort: 'default' }, context),
  error => error?.status === 422 && error?.code === 'NAME_PROJECTION_INCOMPLETE' && error?.retryable === false
);
unresolvedService.close();

// Test and dirty application rows are quarantined per record. They must not
// abort the valid formal projection, leak identifiers as names, or enter cache.
const mixedProjectionRows = new Map(appRows);
mixedProjectionRows.set('用户字典', page([
  ...appRows.get('用户字典').items,
  { record_id: 'rec-old-user-1', fields: { AD账号: 'U001', 工号: 'TEST_001', 姓名: '张三丰', 所属部门ID: 'D004', 所属部门名称: '物资采购中心' } },
  { record_id: 'rec-old-user-4', fields: { AD账号: 'U004', 工号: 'TEST_004', 姓名: '赵六', 所属部门ID: 'D004', 所属部门名称: '物资采购中心' } }
]));
mixedProjectionRows.set('部门字典', page([
  ...appRows.get('部门字典').items,
  { record_id: 'rec-old-dept', fields: { 部门ID: 'D004', 部门名称: '物资采购中心' } }
]));
mixedProjectionRows.set('应用索引', page([
  ...appRows.get('应用索引').items,
  { record_id: 'rec-test-app', fields: {
    应用ID: 'TEST_APP_001', 应用名称: 'TEST_初始化应用', 应用类型: 'REPORT', 状态: 'ONLINE',
    负责人ID: 'test-user', 所属部门ID: 'dept-a'
  } },
  { record_id: 'rec-dirty-app', fields: {
    应用ID: 'APP-DIRTY', 应用名称: '待治理应用', 应用类型: 'REPORT', 状态: 'ONLINE',
    负责人ID: 'missing-user', 所属部门ID: 'dept-a'
  } },
  { record_id: 'rec-formal-id-old-test-refs', fields: {
    应用ID: 'APP-OLD-CONTAMINATED', 应用名称: '历史测试引用应用', 应用类型: 'REPORT', 状态: 'ONLINE',
    负责人ID: 'U001', 开发者ID: 'U004', 所属部门ID: 'D004', 开发部门ID: 'D004'
  } }
]));
const mixedProjectionEvents = [];
const mixedProjectionService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  eventLogger: event => mixedProjectionEvents.push(event),
  client: clientFor(mixedProjectionRows)
});
const mixedProjection = await mixedProjectionService.execute('APP-002', { page: 1, pageSize: 10, query: '', filters: {}, sort: 'default' }, context);
assert.deepEqual(mixedProjection.data.items.map(item => item.appId), ['APP-1']);
assert.equal(mixedProjectionEvents.filter(event => event.event === 'app-record-quarantined').length, 3);
assert.deepEqual(
  [...new Set(mixedProjectionEvents.filter(event => event.event === 'app-record-quarantined').map(event => event.errorCode))].sort(),
  ['CONTROLLED_TEST_RECORD', 'NAME_PROJECTION_INCOMPLETE']
);
mixedProjectionService.close();

// COM-004 supports an authorized safe directory and a separate self-contact mode.
let contactCalls = 0;
let directoryCalls = 0;
const contactService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  operationCachePolicies: {},
  client: clientFor(appRows, {
    async getContactUser(userId) {
      contactCalls += 1;
      return { userId, employeeNo: 'E001', displayName: '张三', departmentIds: ['dept-a'], mobile: '13800000000', email: 'zhangsan@example.com', contactFieldsVisible: true, enabled: true };
    },
    async listDepartmentChildren() { directoryCalls += 1; return page([]); },
    async listUsersByDepartment() { directoryCalls += 1; return page([]); }
  })
});
const selfContact = await contactService.execute('COM-004', { userId: 'user.a', includeContact: true, page: 1, pageSize: 10, sort: 'name,asc' }, context);
assert.equal(selfContact.data.items[0].mobile, '13800000000');
assert.equal(selfContact.data.items[0].departmentName, '运营部');
assert.equal(contactCalls, 1);
assert.equal(directoryCalls, 0);
const compatibleSelfContact = await contactService.execute('COM-004', { userId: 'user.a', includeContact: true, page: 9, pageSize: 100, sort: 'name,asc' }, context);
assert.equal(compatibleSelfContact.data.items[0].mobile, '13800000000', '本人联系方式模式必须兼容页面附带的分页参数');
await assert.rejects(
  () => contactService.execute('COM-004', { userId: 'user.b', includeContact: true }, context),
  error => error?.status === 403 && error?.code === 'CONTACT_SELF_ONLY'
);
contactService.close();

let directoryContactCalls = 0;
const directoryRows = new Map(appRows);
directoryRows.set('用户字典', page([
  ...appRows.get('用户字典').items,
  { record_id: 'rec-initial-user', fields: { AD账号: 'U001', 工号: 'TEST_EMPLOYEE', 姓名: '张三丰', 所属部门ID: 'dept-a', 所属部门名称: '运营部', 启用: true } },
  { record_id: 'rec-initial-user-3', fields: { AD账号: 'U003', 工号: 'TEST_EMPLOYEE_3', 姓名: '王五', 所属部门ID: 'dept-a', 所属部门名称: '运营部', 启用: true } },
  { record_id: 'rec-initial-user-4', fields: { AD账号: 'U004', 工号: 'TEST_EMPLOYEE_4', 姓名: '赵六', 所属部门ID: 'dept-a', 所属部门名称: '运营部', 启用: true } },
  { record_id: 'rec-initial-user-5', fields: { AD账号: 'U005', 工号: 'TEST_EMPLOYEE_5', 姓名: '陈晓明', 所属部门ID: 'dept-a', 所属部门名称: '运营部', 启用: true } }
]));
const directoryService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  client: clientFor(directoryRows, {
    async getContactUser(userId) {
      directoryContactCalls += 1;
      return { userId: 'user.a', employeeNo: 'E001', displayName: '张三', departmentIds: ['od-dept-a'], enabled: true };
    },
    async getContactDepartment(departmentId) {
      directoryContactCalls += 1;
      return { id: departmentId, name: '运营部', parentId: '0', enabled: true };
    },
    async listUsersByDepartment(departmentId) {
      directoryContactCalls += 1;
      assert.equal(departmentId, 'od-dept-a');
      return page([
        { user_id: 'user.a', employee_no: 'E001', name: '张三', department_ids: ['od-dept-a'], status: {} },
        { user_id: 'user.b', employee_no: 'E002', name: '李四', department_ids: ['od-dept-a'], status: {} },
        { user_id: 'U004', employee_no: 'TEST_004', name: '赵六', department_ids: ['od-dept-a'], status: {} }
      ]);
    }
  })
});
const directory = await directoryService.execute('COM-004', { page: 1, pageSize: 100, sort: 'name,asc' }, context);
assert.deepEqual(directory.data.items.map(item => [item.userId, item.displayName, item.departmentName]), [
  ['user.b', '李四', '运营部'],
  ['user.a', '张三', '运营部']
]);
assert.ok(directory.data.items.every(item => item.mobile == null && item.email == null && item.mobileMasked == null && item.emailMasked == null));
assert.equal(directoryContactCalls, 3, '目录模式必须有界读取当前真实飞书用户及其部门，不得读取旧用户字典快照');
assert.ok(directory.data.items.every(item => !['U001', 'U003', 'U004', 'U005'].includes(item.userId)), '正式人员目录不得返回初始化测试人员');
const contaminatedDirectory = structuredClone(directory);
contaminatedDirectory.data.items.push({
  ...contaminatedDirectory.data.items[0],
  userId: 'U003', employeeNo: 'TEST_EMPLOYEE_3', displayName: '王五'
});
contaminatedDirectory.data.total += 1;
assert.throws(
  () => directoryService.validateOperationSuccess('COM-004', contaminatedDirectory),
  error => error?.code === 'CONTROLLED_TEST_RECORD',
  '旧持久快照中的测试人员必须在恢复校验时被拒绝'
);
const warmDirectory = await directoryService.execute('COM-004', { includeContact: false, page: 1, pageSize: 100, sort: 'name,asc' }, context);
assert.equal(warmDirectory.cacheStatus, 'fresh', '显式 false 与省略 includeContact 必须命中同一目录缓存');
directoryService.close();

// A cold handoff must persist an immutable, contract-validated business input.
// Mutating the browser/request object after the 202 response must never pollute
// the worker replay with sync metadata.
const delayedDirectoryService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 500,
  client: {
    async listRecords(tableId) { return directoryRows.get(namesById.get(tableId)) || page([]); },
    async getContactUser() {
      await new Promise(resolve => setTimeout(resolve, 40));
      return { userId: 'user.a', employeeNo: 'E001', displayName: '张三', departmentIds: ['od-dept-a'], enabled: true };
    },
    async getContactDepartment(departmentId) {
      return { id: departmentId, name: '运营部', parentId: '0', enabled: true };
    },
    async listUsersByDepartment() {
      return page([
        { user_id: 'user.a', employee_no: 'E001', name: '张三', department_ids: ['od-dept-a'], status: {} },
        { user_id: 'user.b', employee_no: 'E002', name: '李四', department_ids: ['od-dept-a'], status: {} }
      ]);
    }
  }
});
const mutableDirectoryInput = { page: 1, pageSize: 100, sort: 'name,asc' };
const directoryHandoff = await delayedDirectoryService.execute('COM-004', mutableDirectoryInput, context).catch(error => error);
assert.equal(directoryHandoff.code, 'FEISHU_INITIAL_SYNCING');
mutableDirectoryInput.syncId = directoryHandoff.syncId;
mutableDirectoryInput.traceId = 'trace-must-not-reach-worker';
mutableDirectoryInput.state = 'running';
await delayedDirectoryService.waitForIdle();
let delayedDirectoryStatus = await delayedDirectoryService.getReadSyncStatus(directoryHandoff.syncId, context);
for (let attempt = 0; attempt < 20 && delayedDirectoryStatus.state === 'running'; attempt += 1) {
  await new Promise(resolve => setTimeout(resolve, 5));
  delayedDirectoryStatus = await delayedDirectoryService.getReadSyncStatus(directoryHandoff.syncId, context);
}
assert.equal(delayedDirectoryStatus.state, 'completed', 'worker 必须只重放创建任务时已校验的原始业务 input');
assert.deepEqual(delayedDirectoryStatus.result.data.items.map(item => item.userId).sort(), ['user.a', 'user.b']);
delayedDirectoryService.close();

// APP-001 only needs the first page metadata for detail-table counts. It must
// not scan every detail record or page before application facets can complete.
const detailTableNames = new Set([
  '可视化驾驶舱详情', '可视化报表详情', 'RPA应用详情', '数据集应用详情', '指标应用详情',
  'AI应用详情', '海能work应用详情', 'EAD应用详情', '工具应用详情'
]);
const detailReadQueries = [];
const appFacetService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  client: {
    async listRecords(tableId, query = {}) {
      const tableName = namesById.get(tableId);
      if (detailTableNames.has(tableName)) {
        detailReadQueries.push({ tableName, query });
        if (query.pageToken) return page([{ record_id: `${tableName}-second`, fields: {} }]);
        return { items: [{ record_id: `${tableName}-first`, fields: {} }], total: 88, hasMore: true, nextPageToken: 'next' };
      }
      return appRows.get(tableName) || page([]);
    }
  }
});
const appFacets = await appFacetService.execute('APP-001', {}, context);
assert.equal(appFacets.data.typeDetailCounts.length, 9);
assert.ok(appFacets.data.typeDetailCounts.every(item => item.count === 88));
assert.equal(detailReadQueries.length, 9, 'APP-001 不得为计数全量翻页读取详情表');
assert.ok(detailReadQueries.every(item => item.query.pageSize === 10 && item.query.fieldNames?.length === 0));
appFacetService.close();

// APP-001 detail counts must not flood both ordinary Feishu slots before its
// shared application projection can start. Keeping one bounded detail read in
// flight leaves capacity for APP-002/WB-002 and startup projection work.
let releaseBlockedDetail;
const blockedDetailGate = new Promise(resolve => { releaseBlockedDetail = resolve; });
let applicationIndexStartedBeforeDetailRelease = false;
let detailReleased = false;
const fairDetailService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  maxSyncConcurrency: 3,
  client: {
    async listRecords(tableId) {
      const tableName = namesById.get(tableId);
      if (detailTableNames.has(tableName)) {
        await blockedDetailGate;
        return { items: [], total: 0, hasMore: false, nextPageToken: '' };
      }
      if (tableName === '应用索引' && !detailReleased) applicationIndexStartedBeforeDetailRelease = true;
      return appRows.get(tableName) || page([]);
    }
  }
});
const fairDetailRead = fairDetailService.execute('APP-001', {}, context);
await new Promise(resolve => setTimeout(resolve, 20));
detailReleased = true;
releaseBlockedDetail();
await fairDetailRead;
assert.equal(
  applicationIndexStartedBeforeDetailRelease,
  true,
  'APP-001 详情统计不得抢占全部普通读取槽并阻塞共享应用投影'
);
fairDetailService.close();

// A transient failure in one detail-count source retries only that source.
// Counts already read successfully are retained for the operation retry so a
// single slow table cannot multiply nine upstream calls and exhaust 25s.
const perSourceCountReads = new Map();
const partialCountRetryEvents = [];
const partialCountRetryService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  syncRetryAttempts: 2,
  syncTaskTimeoutMs: 5_000,
  eventLogger: event => partialCountRetryEvents.push(event),
  client: {
    async listRecords(tableId) {
      const tableName = namesById.get(tableId);
      if (detailTableNames.has(tableName)) {
        const reads = (perSourceCountReads.get(tableName) || 0) + 1;
        perSourceCountReads.set(tableName, reads);
        if (tableName === '可视化驾驶舱详情' && reads === 1) {
          throw Object.assign(new Error('transient detail timeout'), {
            code: 'FEISHU_UPSTREAM_TIMEOUT', status: 504
          });
        }
        return { items: [], total: 7, hasMore: false, nextPageToken: '' };
      }
      return appRows.get(tableName) || page([]);
    }
  }
});
const partialCountResult = await partialCountRetryService.execute('APP-001', {}, context);
assert.deepEqual(
  partialCountRetryEvents.filter(event => event.event === 'sync-attempt').map(event => event.attempt),
  [1, 2]
);
assert.equal(partialCountResult.data.typeDetailCounts.length, 9);
assert.equal(perSourceCountReads.get('可视化驾驶舱详情'), 2);
for (const tableName of [...detailTableNames].filter(name => name !== '可视化驾驶舱详情')) {
  assert.equal(perSourceCountReads.get(tableName), 1, `${tableName} 成功后不得因其他详情表失败而重复读取`);
}
partialCountRetryService.close();

// APP-001 and APP-002 share their expensive projection and both background
// jobs must become completed within the controlled task deadline.
const delayedAppService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  coldMissBudgetMs: 5,
  syncTaskTimeoutMs: 500,
  client: {
    async listRecords(tableId) {
      await new Promise(resolve => setTimeout(resolve, 20));
      return appRows.get(namesById.get(tableId)) || page([]);
    }
  }
});
const [appFacetHandoff, appListHandoff] = await Promise.all([
  delayedAppService.execute('APP-001', {}, context).catch(error => error),
  delayedAppService.execute('APP-002', { page: 1, pageSize: 10, query: '', filters: {}, sort: 'default' }, context).catch(error => error)
]);
assert.equal(appFacetHandoff.code, 'FEISHU_INITIAL_SYNCING');
assert.equal(appListHandoff.code, 'FEISHU_INITIAL_SYNCING');
await delayedAppService.waitForIdle();
for (const handoff of [appFacetHandoff, appListHandoff]) {
  let status = await delayedAppService.getReadSyncStatus(handoff.syncId, context);
  for (let attempt = 0; attempt < 20 && status.state === 'running'; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 5));
    status = await delayedAppService.getReadSyncStatus(handoff.syncId, context);
  }
  assert.equal(status.state, 'completed', `${handoff.operationId} 后台任务必须进入 completed`);
  assert.equal(status.result.code, 'OK');
}
const warmAppList = await delayedAppService.execute('APP-002', { page: 1, pageSize: 10, query: '', filters: {}, sort: 'default' }, context);
assert.equal(warmAppList.cacheStatus, 'fresh');
delayedAppService.close();

const idAsNameService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  client: clientFor(appRows, {
    async getContactUser(userId) {
      return { userId, employeeNo: 'E001', displayName: userId, departmentIds: ['dept-a'], mobile: null, email: null, contactFieldsVisible: true, enabled: true };
    }
  })
});
await assert.rejects(
  () => idAsNameService.execute('COM-004', { userId: 'user.a', includeContact: true, page: 1, pageSize: 10, sort: 'name,asc' }, context),
  error => error?.status === 422 && error?.code === 'NAME_PROJECTION_INCOMPLETE'
);
idAsNameService.close();

// COM-005 deterministically filters TEST_/disabled/initialization rows and verifies a signed baseline.
const baseline = signedBaseline({
  baselineVersion: 'formal-2026-10-10', effectiveAt: '2026-10-10T00:00:00Z', approvedBy: '闫瑾', approvedAt: '2026-10-10T00:00:00Z',
  dictTypes: {
    APPLICATION_TYPE: {
      tableName: '应用类型配置', valueFields: ['类型编码', '类型ID'], labelField: '类型名称', initializationMarkers: ['INIT_ONLY'],
      options: [{ value: 'REPORT', label: '报表', enabled: true, parentValue: null, sortOrder: 1 }]
    }
  }
});
const dictionaryRows = new Map(appRows);
dictionaryRows.set('应用类型配置', page([
  { record_id: 'formal', fields: { 类型编码: 'REPORT', 类型名称: '报表', 排序: 1, 状态: '启用' } },
  { record_id: 'test', fields: { 类型编码: 'TEST_FAKE', 类型名称: 'TEST_假数据', 排序: 2, 状态: '启用' } },
  { record_id: 'init', fields: { 类型编码: 'INIT_ONLY', 类型名称: '初始化', 排序: 3, 状态: '启用' } },
  { record_id: 'disabled', fields: { 类型编码: 'OLD', 类型名称: '旧类型', 排序: 4, 状态: '停用' } }
]));
const dictionaryService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  formalDictionaryBaselineRequired: true,
  formalDictionaryBaseline: baseline,
  client: clientFor(dictionaryRows)
});
const dictionary = await dictionaryService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, context);
assert.deepEqual(dictionary.data.itemsByType.APPLICATION_TYPE.map(item => item.value), ['REPORT']);
assert.equal(dictionary.data.version, 'formal-2026-10-10');
assert.equal(dictionary.data.baselineHash, baseline.sha256);
await assert.rejects(
  () => dictionaryService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: true }, context),
  error => error?.status === 400 && error?.code === 'DISABLED_DICTIONARY_ITEMS_FORBIDDEN'
);
dictionaryService.close();

const missingBaselineService = createFeishuReadOnlyService({ identifierContract: contract, realtimeAuthorization: false, client: clientFor(dictionaryRows) });
const liveDictionary = await missingBaselineService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, context);
assert.deepEqual(liveDictionary.data.itemsByType.APPLICATION_TYPE.map(item => item.value), ['REPORT']);
assert.match(liveDictionary.data.version, /^feishu-live\.v\d+$/);
assert.match(liveDictionary.data.baselineHash, /^[a-f0-9]{64}$/);
missingBaselineService.close();

const unapprovedBaselineService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  formalDictionaryBaseline: signedBaseline({ ...baseline, approvedBy: '未授权人员', sha256: undefined }),
  client: clientFor(dictionaryRows)
});
const unapprovedFallback = await unapprovedBaselineService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE'], includeDisabled: false }, context);
assert.deepEqual(unapprovedFallback.data.itemsByType.APPLICATION_TYPE.map(item => item.value), ['REPORT']);
assert.match(unapprovedFallback.data.version, /^feishu-live\.v\d+$/);
unapprovedBaselineService.close();

// FAV-002 is APP-only/current-user and includes a positive concurrency version.
const favoriteRows = new Map(appRows);
favoriteRows.set('应用收藏', page([
  { record_id: 'fav-a', fields: { 主键: 'FAV-A', 用户ID: 'user.a', 资源类型: 'APP', 资源ID: 'APP-1', 收藏时间: '2026-10-10T01:00:00Z', 有效: '是', 版本: 3 } },
  { record_id: 'fav-b', fields: { 主键: 'FAV-B', 用户ID: 'user.b', 资源类型: 'APP', 资源ID: 'APP-1', 收藏时间: '2026-10-10T02:00:00Z', 有效: '是', 版本: 7 } }
]));
const favoriteService = createFeishuReadOnlyService({ identifierContract: contract, realtimeAuthorization: false, client: clientFor(favoriteRows) });
const favorites = await favoriteService.execute('FAV-002', { resourceType: 'APP', page: 1, pageSize: 20, sort: 'favoritedAt,desc' }, context);
assert.deepEqual(favorites.data.items.map(item => [item.favoriteId, item.favoriteVersion]), [['FAV-A', 3]]);
const taggedFavorites = await favoriteService.execute('FAV-002', { resourceType: 'APP', tagCode: 'FORMAL_TAG', page: 1, pageSize: 20, sort: 'favoritedAt,desc' }, context);
assert.deepEqual(taggedFavorites.data.items.map(item => item.favoriteId), ['FAV-A']);
await assert.rejects(
  () => favoriteService.execute('FAV-002', { page: 1, pageSize: 20, sort: 'favoritedAt,desc' }, context),
  error => error?.status === 400 && error?.code === 'INVALID_OPERATION_INPUT'
);
favoriteService.close();

// WB-003 keeps the authorized identity even when statistics, messages and todos are empty.
const workbenchService = createFeishuReadOnlyService({ identifierContract: contract, realtimeAuthorization: false, client: clientFor(appRows) });
const workbench = await workbenchService.execute('WB-003', { recentMessageLimit: 5, todoLimit: 5 }, context);
assert.equal(workbench.data.user.userId, 'user.a');
assert.equal(workbench.data.user.displayName, '张三');
assert.deepEqual(workbench.data.recentMessages, []);
assert.deepEqual(workbench.data.todos, []);
assert.equal(workbench.data.stats.favoriteCount, 0);
workbenchService.close();

// MAT-002 returns null for no file, an opaque non-token fileId for a file, and MAT-003 differentiates no-file/mismatch.
const materialRows = new Map(appRows);
materialRows.set('素材中心', page([
  { record_id: 'mat-empty', fields: { 素材ID: 'MAT-EMPTY', 素材名称: '无文件素材', 状态: 'ONLINE' } },
  { record_id: 'mat-file', fields: { 素材ID: 'MAT-FILE', 素材名称: '正式素材', 状态: 'ONLINE', 适用应用类型: ['REPORT'], 业务域ID: ['DOMAIN-A'], 标签编码: ['FORMAL_TAG'], 素材文件: [{ file_token: 'secret-token', name: 'guide.pdf', mime_type: 'application/pdf', size: 42 }] } }
]));
const materialService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  fileAccessService: { createGrant() { return { url: '/api/v1/files/content/grant-1', expiresAt: '2026-10-10T03:00:00Z' }; } },
  client: clientFor(materialRows)
});
const materials = await materialService.execute('MAT-002', { page: 1, pageSize: 20, sort: 'updatedAt,desc' }, context);
assert.equal(materials.schemaVersion, 'feishu-first-batch-detail.v2');
const emptyMaterial = materials.data.items.find(item => item.materialId === 'MAT-EMPTY');
const fileMaterial = materials.data.items.find(item => item.materialId === 'MAT-FILE');
assert.equal(emptyMaterial.primaryFile, null);
assert.equal(emptyMaterial.permissions.canDownload, false);
assert.deepEqual(fileMaterial.primaryFile, { fileId: 'MAT-FILE', fileName: 'guide.pdf', mimeType: 'application/pdf', sizeBytes: 42 });
assert.ok(!JSON.stringify(fileMaterial).includes('secret-token'));
const filteredMaterials = await materialService.execute('MAT-002', { appTypeCode: 'REPORT', domainId: 'DOMAIN-A', status: 'ONLINE', page: 1, pageSize: 20, sort: 'name,asc' }, context);
assert.deepEqual(filteredMaterials.data.items.map(item => item.materialId), ['MAT-FILE']);
await assert.rejects(
  () => materialService.execute('MAT-003', { materialId: 'MAT-EMPTY', fileId: 'MAT-EMPTY', purpose: 'DOWNLOAD', sourcePage: 'materials', clientOccurredAt: '2026-10-10T00:00:00Z' }, context),
  error => error?.status === 404 && error?.code === 'MATERIAL_FILE_NOT_AVAILABLE'
);
await assert.rejects(
  () => materialService.execute('MAT-003', { materialId: 'MAT-FILE', fileId: 'OTHER', purpose: 'DOWNLOAD', sourcePage: 'materials', clientOccurredAt: '2026-10-10T00:00:00Z' }, context),
  error => error?.status === 404 && error?.code === 'MATERIAL_FILE_MISMATCH'
);
const grant = await materialService.execute('MAT-003', { materialId: 'MAT-FILE', fileId: 'MAT-FILE', purpose: 'DOWNLOAD', sourcePage: 'materials', clientOccurredAt: '2026-10-10T00:00:00Z' }, context);
assert.equal(grant.schemaVersion, 'feishu-secure-resource.v2');
assert.match(grant.data.accessUrl, /^\/api\/v1\/files\/content\//);
await assert.rejects(
  () => materialService.execute('MAT-003', { materialId: 'MAT-FILE', fileId: 'MAT-FILE' }, context),
  error => error?.status === 400 && error?.code === 'INVALID_OPERATION_INPUT'
);
materialService.close();

// A terminal sibling failure aborts and drains other Feishu reads before the operation leaves pending.
let activeReads = 0;
let abortedReads = 0;
const drainService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  syncRetryAttempts: 1,
  tableReadCacheMs: 0,
  client: {
    async listRecords(tableId, _query, options = {}) {
      const tableName = namesById.get(tableId);
      if (tableName === '应用类型配置') throw Object.assign(new Error('terminal'), { code: 'FEISHU_RECORDS_FAILED', status: 422 });
      if (tableName !== '场景字典') return page([]);
      activeReads += 1;
      return new Promise(resolve => {
        const timer = setTimeout(() => { activeReads -= 1; resolve(page([])); }, 200);
        options.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          activeReads -= 1;
          abortedReads += 1;
          resolve(page([]));
        }, { once: true });
      });
    }
  }
});
await assert.rejects(() => drainService.execute('COM-005', { dictTypes: ['APPLICATION_TYPE', 'SCENE'], includeDisabled: false }, context));
assert.equal(activeReads, 0);
assert.equal(abortedReads, 1);
assert.deepEqual(drainService.getPerformanceSnapshot().inflight, {
  cacheableOperations: 0, strongOperations: 0, tableReads: 0, feishuSyncs: 0,
  queuedFeishuSyncs: 0, queuedAuthorizationSyncs: 0, maxFeishuSyncs: 3, syncTaskTimeoutMs: 25000
});
drainService.close();

// Startup terminal events carry one safe correlation tuple and settle all counters on success and failure.
const startupEvents = [];
const startupService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  eventLogger: event => startupEvents.push(event),
  client: clientFor(new Map())
});
await startupService.prewarm();
await startupService.waitForIdle();
const startupTerminals = startupEvents.filter(event => event.event === 'startup-prewarm' && event.transition === 'completed');
assert.deepEqual(startupTerminals.map(event => event.operationId).sort(), ['COM-005', 'WB-002']);
for (const event of startupTerminals) {
  assert.ok(event.traceId && event.syncId && event.keyDigest);
  assert.ok(event.attempt >= 1);
  assert.ok(event.elapsedMs >= 0);
}
assert.equal(startupService.getPerformanceSnapshot().inflight.feishuSyncs, 0);
startupService.close();
assert.equal(
  startupEvents.some(event => event.event === 'startup-prewarm' && event.operationId === 'WB-001'),
  false,
  'WB-001 用户隔离结果不得使用虚拟启动身份预热'
);

const startupFailureEvents = [];
const startupFailureService = createFeishuReadOnlyService({
  identifierContract: contract,
  realtimeAuthorization: false,
  syncRetryAttempts: 1,
  eventLogger: event => startupFailureEvents.push(event),
  client: {
    async listRecords(tableId) {
      if (namesById.get(tableId) === '应用类型配置') {
        throw Object.assign(new Error('startup terminal failure'), { code: 'FEISHU_RECORDS_FAILED', status: 422 });
      }
      return page([]);
    }
  }
});
await assert.rejects(() => startupFailureService.prewarm());
const failedStartup = startupFailureEvents.find(event => event.event === 'startup-prewarm' && event.operationId === 'COM-005' && event.transition === 'failed');
assert.ok(failedStartup?.traceId && failedStartup?.syncId && failedStartup?.keyDigest);
assert.equal(failedStartup.attempt, 1);
assert.equal(failedStartup.resource, '应用类型配置');
assert.match(failedStartup.upstreamPath, /bitable/);
assert.deepEqual(startupFailureService.getPerformanceSnapshot().inflight, {
  cacheableOperations: 0, strongOperations: 0, tableReads: 0, feishuSyncs: 0,
  queuedFeishuSyncs: 0, queuedAuthorizationSyncs: 0, maxFeishuSyncs: 3, syncTaskTimeoutMs: 25000
});
startupFailureService.close();

console.log('server real-data read contracts passed');
