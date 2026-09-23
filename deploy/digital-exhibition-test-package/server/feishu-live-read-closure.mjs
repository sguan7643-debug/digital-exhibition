const APPROVED_AD_ACCOUNT = '3d8egf55';

const APPROVED_PERMISSION_CODES = Object.freeze([
  'admin.integrations.view',
  'operations.dashboard.view',
  'operations.announcements.manage',
  'operations.apps.manage',
  'admin.audit.view',
  'admin.health.view',
  'admin.permissions.view',
  'admin.archive.view'
]);

function scopedError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, ...details });
}

function text(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join('、');
  if (typeof value === 'object') return text(value.text ?? value.name ?? value.value ?? value.id);
  return String(value).trim();
}

function enabled(value) {
  if (value === true || value === 1) return true;
  return /^(?:true|1|yes|enabled|启用|有效)$/i.test(text(value));
}

function permissionActive(record, account) {
  const fields = record?.fields || {};
  const belongsToAccount = text(fields.AD账号) === account || text(fields.主体ID) === account;
  const state = text(fields.状态);
  const deleted = enabled(fields.已删除);
  return belongsToAccount && enabled(fields.启用) && !deleted && !/^(?:禁用|失效|REVOKED|DISABLED)$/i.test(state);
}

function validatePermissionScope(adAccount, subjectId, permissionCodes) {
  const requested = [...permissionCodes];
  const exactCodes = requested.length === APPROVED_PERMISSION_CODES.length
    && new Set(requested).size === requested.length
    && APPROVED_PERMISSION_CODES.every(code => requested.includes(code));
  if (adAccount !== APPROVED_AD_ACCOUNT || subjectId !== APPROVED_AD_ACCOUNT || !exactCodes) {
    throw scopedError('PERMISSION_SCOPE_REJECTED', '权限补齐请求超出批准的账号或八项精确权限范围');
  }
}

function tableFor(identifierContract, name) {
  const table = identifierContract?.byName?.get(name);
  if (!table?.tableId) throw scopedError('CLOSURE_TABLE_UNAVAILABLE', `缺少 ${name} 标识契约`);
  return table;
}

function stableSnapshot(rows) {
  return rows.map(row => ({ record_id: text(row?.record_id), fields: structuredClone(row?.fields || {}) }));
}

function baselinePreserved(before, after) {
  const byId = new Map(after.map(row => [text(row?.record_id), row?.fields || {}]));
  return before.every(row => byId.has(row.record_id) && JSON.stringify(byId.get(row.record_id)) === JSON.stringify(row.fields));
}

async function readPermissionRows(client, tableId, account) {
  const result = await client.searchRecords(tableId, 'AD账号', account, { pageSize: 100 });
  return result?.items || [];
}

async function rollbackPermissionRows({ client, tableId, created, before }) {
  for (const entry of [...created].reverse()) await client.deleteRecord(tableId, entry.recordId);
  const afterRollback = stableSnapshot(await readPermissionRows(client, tableId, APPROVED_AD_ACCOUNT));
  return { verified: baselinePreserved(before, afterRollback), afterRollback };
}

async function reconcileLiveReadPermissions({
  client,
  identifierContract,
  adAccount = APPROVED_AD_ACCOUNT,
  subjectId = APPROVED_AD_ACCOUNT,
  permissionCodes = APPROVED_PERMISSION_CODES,
  runId
} = {}) {
  validatePermissionScope(text(adAccount), text(subjectId), permissionCodes || []);
  if (!text(runId).startsWith('TEST_')) throw scopedError('PERMISSION_SCOPE_REJECTED', '权限补齐必须提供唯一 TEST_ 执行标识');
  if (!client?.searchRecords || !client?.createRecord || !client?.deleteRecord) {
    throw scopedError('CLOSURE_CLIENT_UNAVAILABLE', '权限补齐客户端能力不完整');
  }
  const table = tableFor(identifierContract, '用户权限');
  const before = stableSnapshot(await readPermissionRows(client, table.tableId, APPROVED_AD_ACCOUNT));
  const activeBefore = new Set(before.filter(row => permissionActive(row, APPROVED_AD_ACCOUNT)).map(row => text(row.fields.权限编码)));
  const missing = APPROVED_PERMISSION_CODES.filter(code => !activeBefore.has(code));
  const created = [];
  let verified = false;
  try {
    for (const code of missing) {
      const businessKey = fixtureKey(runId, `PERMISSION_${code}`);
      const record = await client.createRecord(table.tableId, {
        主键: businessKey,
        AD账号: APPROVED_AD_ACCOUNT,
        权限编码: code,
        状态: '有效',
        启用: true
      });
      const recordId = text(record?.record_id || record?.recordId);
      if (!recordId) throw scopedError('PERMISSION_CREATE_UNTRACEABLE', `权限 ${code} 创建后缺少记录 ID`);
      created.push({ recordId, permissionCode: code, businessKey });
    }

    const after = stableSnapshot(await readPermissionRows(client, table.tableId, APPROVED_AD_ACCOUNT));
    const activeCodes = APPROVED_PERMISSION_CODES.filter(code => after.some(row => text(row.fields.权限编码) === code && permissionActive(row, APPROVED_AD_ACCOUNT)));
    verified = activeCodes.length === APPROVED_PERMISSION_CODES.length;
    if (!verified) throw scopedError('PERMISSION_VERIFICATION_INCOMPLETE', '八项权限写后验证不完整', { activeCodes });
    return {
      account: APPROVED_AD_ACCOUNT,
      requiredCodes: [...APPROVED_PERMISSION_CODES],
      activeCodes,
      before,
      created,
      verified: true,
      retained: true
    };
  } catch (error) {
    if (!verified) {
      const rollback = await rollbackPermissionRows({ client, tableId: table.tableId, created, before });
      error.rollbackVerified = rollback.verified;
      error.permissionLedger = { before, created, afterRollback: rollback.afterRollback };
    }
    throw error;
  }
}

function validateFixtureScope(adAccount, runId) {
  if (text(adAccount) !== APPROVED_AD_ACCOUNT || !text(runId).startsWith('TEST_')) {
    throw scopedError('FIXTURE_SCOPE_REJECTED', '临时读取上下文只允许批准账号和唯一 TEST_ 执行标识');
  }
}

function fixtureKey(runId, suffix) {
  const normalized = text(runId).replace(/[^A-Za-z0-9_-]/g, '_');
  return `${normalized}_${suffix}`.slice(0, 128);
}

function isTransientTransportFailure(error) {
  return !text(error?.code) && /^fetch failed$/i.test(text(error?.message));
}

async function searchFixtureRecords(client, tableId, keyField, businessKey) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await client.searchRecords(tableId, keyField, businessKey, { pageSize: 100 });
    } catch (error) {
      if (!isTransientTransportFailure(error) || attempt === 1) throw error;
    }
  }
  throw scopedError('FIXTURE_SEARCH_UNAVAILABLE', '临时记录核验暂不可用');
}

async function assertFixtureKeyAbsent(client, tableId, keyField, businessKey) {
  const result = await searchFixtureRecords(client, tableId, keyField, businessKey);
  if ((result?.items || []).length) {
    throw scopedError('FIXTURE_KEY_CONFLICT', `临时记录业务键已存在：${businessKey}`, { tableId, keyField, businessKey });
  }
}

async function cleanupLiveReadFixtures({ client, ledger = [] } = {}) {
  if (!client?.deleteRecord || !client?.searchRecords || !Array.isArray(ledger)) {
    throw scopedError('CLOSURE_CLIENT_UNAVAILABLE', '临时记录清理客户端能力不完整');
  }
  const outcomes = [];
  for (const entry of [...ledger].reverse()) {
    try {
      await client.deleteRecord(entry.tableId, entry.recordId);
      outcomes.push({ tableName: entry.tableName, businessKey: entry.businessKey, deleted: true });
    } catch (error) {
      outcomes.push({
        tableName: entry.tableName,
        businessKey: entry.businessKey,
        deleted: false,
        errorCode: error?.code || 'FIXTURE_DELETE_FAILED',
        errorMessage: String(error?.message || error).slice(0, 200)
      });
    }
  }
  const residue = [];
  for (const entry of ledger) {
    try {
      const result = await searchFixtureRecords(client, entry.tableId, entry.keyField, entry.businessKey);
      const count = (result?.items || []).length;
      if (count) residue.push({ tableName: entry.tableName, businessKey: entry.businessKey, count });
    } catch (error) {
      residue.push({
        tableName: entry.tableName,
        businessKey: entry.businessKey,
        count: -1,
        errorCode: error?.code || 'FIXTURE_RESIDUE_CHECK_FAILED'
      });
    }
  }
  const residueFree = residue.length === 0;
  return { ok: outcomes.every(item => item.deleted) && residueFree, residueFree, outcomes, residue };
}

async function createLiveReadFixtures({
  client,
  identifierContract,
  adAccount = APPROVED_AD_ACCOUNT,
  runId,
  now = () => new Date()
} = {}) {
  validateFixtureScope(adAccount, runId);
  if (!client?.searchRecords || !client?.createRecord || !client?.deleteRecord) {
    throw scopedError('CLOSURE_CLIENT_UNAVAILABLE', '临时读取上下文客户端能力不完整');
  }
  const applicationId = fixtureKey(runId, 'APPLICATION');
  const certificationId = fixtureKey(runId, 'CERTIFICATION');
  const exportId = fixtureKey(runId, 'EXPORT');
  const createdAt = now().toISOString();
  const createdAtMs = now().getTime();
  const definitions = [
    {
      tableName: '使用申请', keyField: '主键', businessKey: applicationId,
      fields: {
        主键: applicationId,
        应用ID: fixtureKey(runId, 'APP'),
        申请人ID: APPROVED_AD_ACCOUNT,
        申请理由: 'TEST_正式读取闭环验证',
        状态: 'SUBMITTED',
        申请时间: createdAt
      }
    },
    {
      tableName: '认证项目', keyField: '认证编码', businessKey: certificationId,
      fields: {
        认证编码: certificationId,
        认证名称: 'TEST_正式读取闭环认证',
        认证类型: 'TEST',
        认证说明: 'TEST_仅用于正式读取闭环验证',
        适用人群: 'TEST',
        主办单位: 'TEST_INTEGRATION',
        有效月数: 1,
        启用: true,
        版本: 1,
        已删除: false,
        来源系统: 'TEST_INTEGRATION',
        来源记录ID: text(runId),
        追踪ID: text(runId)
      }
    },
    {
      tableName: '导出任务', keyField: '导出任务ID', businessKey: exportId,
      fields: {
        导出任务ID: exportId,
        导出类型: 'TEST_READ_CLOSURE',
        格式: 'CSV',
        状态: 'COMPLETED',
        进度: 100,
        总行数: 1,
        已处理行数: 1,
        创建用户ID: APPROVED_AD_ACCOUNT,
        完成时间: createdAtMs,
        版本: 1,
        已删除: false,
        来源系统: 'TEST_INTEGRATION',
        来源记录ID: text(runId),
        追踪ID: text(runId)
      }
    }
  ];
  const ledger = [];
  try {
    for (const definition of definitions) {
      const table = tableFor(identifierContract, definition.tableName);
      await assertFixtureKeyAbsent(client, table.tableId, definition.keyField, definition.businessKey);
      const record = await client.createRecord(table.tableId, definition.fields);
      const recordId = text(record?.record_id || record?.recordId);
      if (!recordId) throw scopedError('FIXTURE_CREATE_UNTRACEABLE', `${definition.tableName} 创建后缺少记录 ID`);
      ledger.push({
        tableName: definition.tableName,
        tableId: table.tableId,
        keyField: definition.keyField,
        businessKey: definition.businessKey,
        recordId
      });
    }
    return {
      contextOverrides: { applicationId, certificationId, exportId },
      ledger
    };
  } catch (error) {
    const cleanup = await cleanupLiveReadFixtures({ client, ledger });
    error.fixtureCleanup = cleanup;
    throw error;
  }
}

function elapsedMs(startedAt, finishedAt) {
  const start = Date.parse(text(startedAt));
  const finish = Date.parse(text(finishedAt));
  return Number.isFinite(start) && Number.isFinite(finish) ? Math.max(0, finish - start) : 0;
}

function summarizeLiveReadResults(results, { expected = results?.length || 0, requiredPermissions = {} } = {}) {
  const safeResults = (results || []).map(result => ({
    operationId: text(result?.operationId),
    status: text(result?.status) || 'failed',
    elapsedMs: elapsedMs(result?.startedAt, result?.finishedAt),
    ...(result?.errorCode ? { errorCode: text(result.errorCode) } : {}),
    ...(result?.httpStatus ? { httpStatus: Number(result.httpStatus) } : {}),
    ...(Number.isInteger(result?.upstreamCode) ? { upstreamCode: result.upstreamCode } : {}),
    ...(Array.isArray(result?.requiredInput) ? { requiredInput: result.requiredInput.map(text).filter(Boolean) } : {}),
    ...(requiredPermissions[result?.operationId] ? { requiredPermission: requiredPermissions[result.operationId] } : {})
  }));
  const passedCount = safeResults.filter(result => result.status === 'passed').length;
  const blockedCount = safeResults.filter(result => result.status === 'blocked').length;
  const failedCount = safeResults.filter(result => result.status === 'failed').length;
  return {
    expected: Number(expected),
    executed: safeResults.length,
    passedCount,
    blockedCount,
    failedCount,
    passed: safeResults.length === Number(expected) && passedCount === Number(expected) && blockedCount === 0 && failedCount === 0,
    results: safeResults
  };
}

export {
  APPROVED_AD_ACCOUNT,
  APPROVED_PERMISSION_CODES,
  cleanupLiveReadFixtures,
  createLiveReadFixtures,
  reconcileLiveReadPermissions,
  summarizeLiveReadResults
};
