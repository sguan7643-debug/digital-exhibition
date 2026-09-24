import { createHash } from 'node:crypto';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

function text(value, maximum = 2000) {
  return String(value ?? '').trim().slice(0, maximum);
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

export function createFeishuApprovedAppProjection({ safeRecordService, now = () => new Date() } = {}) {
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
    const requestResult = await safeRecordService.createOnce({
      tableName: '上架申请',
      keyField: '申请单号',
      businessKey: stableTestKey('ONBOARDING', record.idempotencyKey || instanceId),
      idempotencyKey: stableTestKey('ONBOARDING_TRACE', record.idempotencyKey || instanceId),
      governance: { versionField: '', sourceField: '', traceField: '', deletedField: '' },
      fields: {
        '关联应用ID': resourceId,
        '应用类型ID': 'T005',
        '申请人ID': application.applicant || text(record.creatorUserId, 256),
        '状态': displayStatus,
        '当前审批节点': approvalStatus === 'PENDING' ? '飞书审批中' : displayStatus,
        '提交时间': submittedAt(record, now()),
        '退回原因': '',
        '审批来源': '飞书审批',
        '审批实例ID': instanceId,
        '授权用户': authorizationUser,
        '授权部门': authorizationDepartment
      }
    });
    const indexResult = await safeRecordService.createOnce({
      tableName: '应用索引',
      keyField: '应用ID',
      businessKey: resourceId,
      idempotencyKey: stableTestKey('APP_INDEX', resourceId),
      fields: {
        '应用名称': application.name,
        '应用类型': 'T005',
        '子类型（待定）': '海能work应用',
        '摘要': application.summary,
        '应用简介': application.summary,
        '开发合作方信息': application.collaboration,
        '应用URL地址': application.webAddress || application.mobileAddress,
        '移动端地址': application.mobileAddress,
        '状态': displayStatus,
        '访问次数': 0,
        '使用次数': 0,
        '收藏数': 0,
        '发布时间': timestamp,
        '创建日期': timestamp,
        '最近更新日期': timestamp,
        '所属部门ID': application.department || application.contactDepartment,
        '接入人AD账号': application.contact || application.applicant,
        '接入人所属部门ID': application.contactDepartment || application.department,
        '联系电话': application.contactPhone,
        '联系邮箱': application.contactEmail,
        '适用用户AD账号': application.users,
        '适用部门ID': application.accessDepartment,
        '适用角色': application.roles,
        '权限范围': application.scope,
        '申请人AD账号': application.applicant,
        '申请人所属部门ID': application.department,
        '申请人联系电话': application.phone,
        '申请人联系邮箱': application.email,
        '所属业务域ID': application.domain,
        '适用对象': [application.accessDepartment, application.users, application.roles].filter(Boolean).join('；'),
        '应用编码': application.applicationCode,
        '应用简称': application.name,
        '当前结构版本': 'V1.0',
        '分类编码': 'T005',
        '分类名称': '海能work应用',
        '标签': ['新上线'],
        '访问方式': '申请',
        '打开方式': '新窗口',
        'SSO模式': '飞书'
      }
    });
    let indexRecord = indexResult.record;
    let indexVersion = indexResult.version;
    if (indexResult.replayed && String(indexResult.record?.fields?.['状态'] || '') !== displayStatus) {
      const updated = await safeRecordService.update({
        tableName: '应用索引',
        keyField: '应用ID',
        businessKey: resourceId,
        ifMatch: indexResult.version,
        fields: { '状态': displayStatus, '最近更新日期': timestamp }
      });
      indexRecord = updated.record;
      indexVersion = updated.version;
    }
    const detailResult = await safeRecordService.createOnce({
      tableName: '海能work应用详情',
      keyField: '主键',
      businessKey: stableTestKey('HW_DETAIL', resourceId),
      idempotencyKey: stableTestKey('HW_DETAIL_TRACE', resourceId),
      governance: { versionField: '', sourceField: '', traceField: '', deletedField: '' },
      fields: {
        '应用ID': resourceId,
        '应用编码': application.applicationCode,
        '版本号': 'V1.0',
        '使用指南': application.scenario || application.summary,
        '使用功能': application.collaboration,
        '使用说明文档链接': application.webAddress,
        '应用描述': application.description || application.summary
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
      replayed: Boolean(requestResult.replayed && indexResult.replayed && detailResult.replayed)
    });
  }

  return Object.freeze({ publish });
}
