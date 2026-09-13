import { writeFile } from 'node:fs/promises';

function safeCode(error) {
  return String(error?.code || error?.name || 'OAUTH_WRITE_ACCEPTANCE_FAILED').slice(0, 80);
}

export function createFeishuOAuthAuthorizedHandler({
  evidencePath = '',
  writeAcceptanceEnabled = false,
  readService,
  writeAcceptance,
  now = () => new Date()
} = {}) {
  if (!readService?.execute) throw new Error('OAuth 授权验收缺少读取服务');
  if (writeAcceptanceEnabled && !writeAcceptance?.run) throw new Error('OAuth 授权验收缺少写入验收服务');
  return async identity => {
    if (!evidencePath) return;
    const evidence = {
      verifiedAt: now().toISOString(), authenticated: true,
      identityType: identity.identityType,
      hasUserId: Boolean(identity.userId), hasOpenId: Boolean(identity.openId),
      permissionLookupSucceeded: false, schemaVersion: '', permissionCount: 0,
      hasWildcardExecute: false, hasAnyExecute: false, errorCode: ''
    };
    try {
      const currentUser = await readService.execute('COM-001', {}, { identity });
      const permissions = Array.isArray(currentUser?.data?.permissions) ? currentUser.data.permissions : [];
      evidence.permissionLookupSucceeded = true;
      evidence.schemaVersion = String(currentUser?.schemaVersion || '');
      evidence.permissionCount = permissions.length;
      evidence.hasWildcardExecute = permissions.includes('operation:*:execute');
      evidence.hasAnyExecute = permissions.some(value => /^operation:.+:execute$/.test(String(value)));
    } catch (error) {
      evidence.errorCode = safeCode(error);
    }
    if (writeAcceptanceEnabled) {
      try {
        evidence.writeAcceptance = await writeAcceptance.run(identity);
      } catch (error) {
        evidence.writeAcceptance = {
          attempted: true, permissionCreated: false, permissionRecognized: false,
          operationId: 'FAV-003', operationSucceeded: false,
          testRecordCleaned: false, permissionCleaned: false, errorCode: safeCode(error)
        };
      }
    }
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8' });
  };
}

export function createFeishuOAuthWriteAcceptance({
  safeRecordService,
  compositeService,
  now = () => new Date(),
  randomId = () => globalThis.crypto?.randomUUID?.() || String(Date.now())
} = {}) {
  if (!safeRecordService?.createOnce || !safeRecordService?.remove) throw new Error('OAuth 写验收缺少 TEST_ 记录服务');
  if (!compositeService?.execute) throw new Error('OAuth 写验收缺少复合接口服务');

  async function run(identity = {}) {
    const userId = String(identity.userId || identity.openId || '').trim();
    const suffix = String(randomId()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    const permissionKey = `TEST_OAUTH_PERMISSION_${suffix}`;
    const permissionIdempotencyKey = `TEST_OAUTH_PERMISSION_IDEM_${suffix}`;
    const favoriteKey = `TEST_OAUTH_FAV_${suffix}`;
    const favoriteIdempotencyKey = `TEST_OAUTH_FAV_IDEM_${suffix}`;
    let permissionVersion = 0;
    let favoriteVersion = 0;
    const evidence = {
      attempted: true,
      permissionCreated: false,
      permissionRecognized: false,
      operationId: 'FAV-003',
      operationSucceeded: false,
      testRecordCleaned: false,
      permissionCleaned: false,
      errorCode: ''
    };

    try {
      if (!userId) throw Object.assign(new Error('OAuth 身份缺少稳定用户标识'), { code: 'OAUTH_IDENTITY_MISSING' });
      const permission = await safeRecordService.createOnce({
        tableName: '用户权限', keyField: '主键', businessKey: permissionKey,
        idempotencyKey: permissionIdempotencyKey,
        fields: {
          应用ID: 'TEST_OAUTH_ACCEPTANCE', AD账号: userId,
          主体类型: 'USER', 主体ID: userId,
          权限编码: 'operation:*:execute', 数据范围: 'TEST_',
          状态: 'ENABLED', 启用: true, 授权时间: now().toISOString()
        }
      });
      permissionVersion = Number(permission.version || 1);
      evidence.permissionCreated = true;

      const response = await compositeService.execute('FAV-003', {
        businessKey: favoriteKey,
        idempotencyKey: favoriteIdempotencyKey,
        fields: { 应用ID: 'TEST_OAUTH_ACCEPTANCE', 用户ID: userId, 收藏时间: now().toISOString() }
      }, { identity, sameOriginRequest: true });
      favoriteVersion = Number(response?.data?.version || 1);
      evidence.permissionRecognized = true;
      evidence.operationSucceeded = response?.code === 'OK';
    } catch (error) {
      evidence.errorCode = safeCode(error);
    } finally {
      if (favoriteVersion > 0) {
        try {
          const cleanup = await safeRecordService.remove({
            tableName: '应用收藏', keyField: '主键', businessKey: favoriteKey, ifMatch: favoriteVersion
          });
          evidence.testRecordCleaned = Boolean(cleanup.deleted || cleanup.alreadyAbsent);
        } catch (error) {
          evidence.errorCode ||= safeCode(error);
        }
      }
      if (permissionVersion > 0) {
        try {
          const cleanup = await safeRecordService.remove({
            tableName: '用户权限', keyField: '主键', businessKey: permissionKey, ifMatch: permissionVersion
          });
          evidence.permissionCleaned = Boolean(cleanup.deleted || cleanup.alreadyAbsent);
        } catch (error) {
          evidence.errorCode ||= safeCode(error);
        }
      }
    }
    return Object.freeze(evidence);
  }

  return Object.freeze({ run });
}
