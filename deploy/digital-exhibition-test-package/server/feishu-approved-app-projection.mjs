import { createHash } from 'node:crypto';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

export const FEISHU_APPROVED_APP_PROJECTION_VERSION = 'feishu-approved-app-projection.2026-09-26.v3';

function text(value, maximum = 2000) {
  return String(value ?? '').trim().slice(0, maximum);
}

function fieldText(value, maximum = 2000) {
  if (Array.isArray(value)) {
    return value.map(item => {
      if (item && typeof item === 'object' && 'text' in item) return String(item.text || '');
      return String(item ?? '');
    }).join('').trim().slice(0, maximum);
  }
  return text(value, maximum);
}

function stableTestKey(prefix, resourceId) {
  const digest = createHash('sha256').update(String(resourceId)).digest('hex').slice(0, 24);
  return `TEST_${prefix}_${digest}`;
}

function submittedAt(record, fallback) {
  const value = Number(record?.createdAt);
  const date = Number.isFinite(value) && value > 0 ? new Date(value) : fallback;
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function applicationSnapshot(record = {}) {
  const application = record.application && typeof record.application === 'object' ? record.application : {};
  const name = text(application.name || record.title);
  const applicationCode = text(application.applicationCode || record.applicationCode, 128);
  if (!name || !applicationCode) {
    throw new FeishuProxyError('APPROVED_APP_DATA_INCOMPLETE', '审批已通过，但应用名称或应用编码缺失，暂不能上架', 409);
  }
  return {
    ...application,
    name,
    applicationCode,
    summary: text(application.summary || application.description || record.description),
    description: text(application.description || application.summary || record.description),
    webAddress: text(application.webAddress, 1000),
    mobileAddress: text(application.mobileAddress, 1000),
    applicant: text(application.applicant || record.creatorUserId, 256),
    department: text(application.department, 256),
    contact: text(application.contact || record.creatorUserId, 256),
    contactDepartment: text(application.contactDepartment || application.department, 256),
    contactPhone: text(application.contactPhone || application.phone, 128),
    contactEmail: text(application.contactEmail || application.email, 256),
    domain: text(application.domain, 256),
    accessDepartment: text(application.accessDepartment, 512),
    users: text(application.users, 512),
    roles: text(application.roles, 512),
    collaboration: text(application.collaboration),
    scenario: text(application.scenario),
    remarks: text(application.remarks)
  };
}

export function createFeishuApprovedAppProjection({ safeRecordService, orchestrator = null, now = () => new Date() } = {}) {
  if (!safeRecordService?.createOnce) throw new Error('审批上架投影缺少安全写入服务');

  async function publish(record = {}) {
    const resourceId = text(record.resourceId, 128);
    if (!resourceId.startsWith('TEST_')) {
      throw new FeishuProxyError('TEST_RESOURCE_REQUIRED', '审批上架只允许写入 TEST_ 应用资源', 403);
    }
    const application = applicationSnapshot(record);
    const timestamp = now().toISOString().replace('T', ' ').slice(0, 19);
    const approvalStatus = String(record.status || '').toUpperCase();
    const displayStatus = approvalStatus === 'APPROVED' ? '审核通过'
      : approvalStatus === 'REJECTED' ? '审核驳回'
      : approvalStatus === 'CANCELLED' ? '已取消'
      : '审核中';
    const instanceId = text(record.instanceId, 256);
    const authorizationUser = text(application.users, 512);
    const authorizationDepartment = text(application.accessDepartment, 512);
    if (!instanceId || !authorizationUser || !authorizationDepartment) {
      throw new FeishuProxyError('ONBOARDING_REQUEST_DATA_INCOMPLETE', '上架申请缺少审批实例、适用用户或适用部门', 409);
    }
    const runId = text(application.runId || record.runId || orchestrator?.prepared?.runId, 256);
    const write = async input => {
      const request = { governance: { versionField: '', sourceField: '', traceField: '', deletedField: '' }, ...input };
      orchestrator?.assertRecordWrite(request.tableName, { ...request.fields, [request.keyField]: request.businessKey });
      const result = await safeRecordService.createOnce(request);
      if (result.replayed && runId && fieldText(result.record?.fields?.['运行标识']) !== runId) {
        throw new FeishuProxyError('POC_RECORD_OWNERSHIP_CONFLICT', '目标记录不属于当前 POC runId', 409);
      }
      if (!result.replayed) orchestrator?.appendLedger({ objectType: 'RECORD', tableName: input.tableName, tableId: result.tableId, recordId: String(result.record?.record_id || ''), keyField: input.keyField, businessKey: input.businessKey, instanceId, cleanupStrategy: 'EXACT_RECORD_DELETE' });
      return result;
    };
    const requestResult = await write({
      tableName: '上架申请',
      keyField: '申请单号',
      businessKey: text(record.applicationId, 128) || stableTestKey('ONBOARDING', record.idempotencyKey || instanceId),
      idempotencyKey: stableTestKey('ONBOARDING_TRACE', record.idempotencyKey || instanceId),
      governance: { versionField: '', sourceField: '', traceField: '', deletedField: '' },
      reconcileFields: ['唯一标识', '审批实例ID', '授权用户', '授权部门', '状态', '当前审批节点', '最近同步时间', '完成时间', '退回原因'],
      fields: {
        '唯一标识': text(application.uniqueIdentifier || record.uniqueIdentifier, 128),
        '关联应用ID': resourceId,
        '应用类型ID': 'T005',
        '申请人ID': application.applicant || text(record.creatorUserId, 256),
        '应用名称': application.name,
        '应用编码': application.applicationCode,
        '所属业务域ID': application.domain,
        '摘要': application.summary,
        '状态': approvalStatus,
        '当前审批节点': approvalStatus === 'PENDING' ? '飞书审批中' : displayStatus,
        '提交时间': submittedAt(record, now()),
        ...(approvalStatus === 'PENDING' ? {} : { '完成时间': now().getTime() }),
        '退回原因': text(record.rejectionReason),
        '审批来源': '飞书审批',
        '审批实例ID': instanceId,
        '授权用户': authorizationUser,
        '授权部门': authorizationDepartment,
        '表单AttemptID': text(application.attemptId || record.idempotencyKey, 256),
        '最近同步时间': now().getTime(),
        '追踪ID': runId,
        '运行标识': runId
      }
    });
    const attachmentRecords = [];
    for (const file of application.uploads || []) {
      const attachmentKey = stableTestKey('ATTACHMENT', file.uploadId || `${resourceId}-${file.sha256}`);
      const attachment = await write({
        tableName: '附件资料', keyField: '主键', businessKey: attachmentKey,
        idempotencyKey: stableTestKey('ATTACHMENT_TRACE', file.uploadId || file.sha256),
        governance: { versionField: '', sourceField: '', traceField: '', deletedField: '' },
        reconcileFields: ['审批实例ID'],
        fields: {
          应用ID: resourceId, 文件名称: file.originalName, 附件: [{ file_token: file.fileToken }], 文件大小: String(file.sizeBytes || 0),
          MIME类型: file.mimeType, SHA256: file.sha256, 上传时间: file.uploadedAt, 上传人ID: application.applicant || record.creatorUserId,
          用途: file.purpose, 上传ID: file.uploadId, 审批实例ID: instanceId, 追踪ID: runId, 运行标识: runId
        }
      });
      attachmentRecords.push(String(attachment.record?.record_id || ''));
    }
    if (approvalStatus !== 'APPROVED') {
      return Object.freeze({ resourceId, onboardingRecordId: String(requestResult.record?.record_id || ''), attachmentRecordIds: attachmentRecords, indexRecordId: '', detailRecordId: '', version: 0, approvalStatus, displayStatus, published: false, replayed: Boolean(requestResult.replayed) });
    }
    const indexResult = await write({
      tableName: '应用索引',
      keyField: '应用ID',
      businessKey: resourceId,
      idempotencyKey: stableTestKey('APP_INDEX', resourceId),
      reconcileFields: ['状态', '最近更新日期', '应用图标'],
      fields: {
        '应用名称': application.name,
        '应用类型': 'T005',
        '摘要': application.summary,
        '应用简介': application.summary,
        '应用URL地址': application.webAddress || application.mobileAddress,
        '移动端地址': application.mobileAddress,
        '状态': displayStatus,
        '发布时间': timestamp,
        '创建日期': timestamp,
        '最近更新日期': timestamp,
        '适用用户AD账号': application.users,
        '适用部门ID': application.accessDepartment,
        '适用角色': application.roles,
        '权限范围': application.scope,
        '申请人AD账号': application.applicant,
        '所属业务域ID': application.domain,
        '适用对象': [application.accessDepartment, application.users, application.roles].filter(Boolean).join('；'),
        '应用编码': application.applicationCode,
        '应用简称': application.name,
        '分类编码': 'T005',
        '分类名称': '海能work应用',
        '标签': ['新上线'],
        '访问方式': '申请',
        '打开方式': '新窗口',
        'SSO模式': '飞书',
        '应用图标': (application.uploads || []).filter(file => file.purpose === 'APPLICATION_ICON').map(file => ({ file_token: file.fileToken })),
        '追踪ID': runId,
        '运行标识': runId
      }
    });
    const indexRecord = indexResult.record;
    const indexVersion = indexResult.version;
    const detailResult = await write({
      tableName: '海能work应用详情',
      keyField: '主键',
      businessKey: stableTestKey('HW_DETAIL', resourceId),
      idempotencyKey: stableTestKey('HW_DETAIL_TRACE', resourceId),
      governance: { versionField: '', sourceField: '', traceField: '', deletedField: '' },
      reconcileFields: ['应用图标', '申请附件', '审批实例ID', '最近同步时间'],
      fields: {
        '应用ID': resourceId,
        '应用编码': application.applicationCode,
        '版本号': 'V1.0',
        '使用指南': application.scenario || application.summary,
        '使用功能': application.collaboration,
        '使用说明文档链接': application.webAddress,
        '应用描述': application.description || application.summary,
        '应用图标': (application.uploads || []).filter(file => file.purpose === 'APPLICATION_ICON').map(file => ({ file_token: file.fileToken })),
        '申请附件': (application.uploads || []).filter(file => file.purpose === 'APPLICATION_ATTACHMENT').map(file => ({ file_token: file.fileToken })),
        '审批实例ID': instanceId,
        '最近同步时间': now().getTime(),
        '追踪ID': runId,
        '运行标识': runId
      }
    });
    return Object.freeze({
      resourceId,
      onboardingRecordId: String(requestResult.record?.record_id || ''),
      indexRecordId: String(indexRecord?.record_id || ''),
      detailRecordId: String(detailResult.record?.record_id || ''),
      version: indexVersion,
      approvalStatus,
      displayStatus,
      attachmentRecordIds: attachmentRecords,
      published: true,
      replayed: Boolean(requestResult.replayed && indexResult.replayed && detailResult.replayed)
    });
  }

  return Object.freeze({ version: FEISHU_APPROVED_APP_PROJECTION_VERSION, publish });
}
