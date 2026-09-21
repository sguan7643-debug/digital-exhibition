import { trackRequest } from './request-status.js';

const SAFE_INSTANCE_ID = /^[A-Za-z0-9_-]{1,256}$/;
const APPROVAL_STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);

export function resolveApprovalTransport(applicationType) {
  if (applicationType === 'T003') return Object.freeze({ kind: 'rpa', path: '/api/processInstanceStart', contentType: 'multipart/form-data' });
  if (applicationType === 'T005') return Object.freeze({ kind: 'feishu', path: '/api/v1/approvals/instances', contentType: 'application/json' });
  throw new Error('该应用类型尚未配置真实审批');
}

async function readResult(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || `审批接口请求失败（${response.status}）`);
    error.code = String(result.code || 'APPROVAL_REQUEST_FAILED');
    error.status = response.status;
    throw error;
  }
  return result;
}

function createApprovalIdempotencyKey(resourceId) {
  const nonce = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `TEST_IDEM_T005_${resourceId}_${String(nonce).replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

export async function submitOnboarding(form, files = [], fetchImpl = globalThis.fetch) {
  const transport = resolveApprovalTransport(form.type);
  if (transport.kind === 'rpa') {
    const body = new FormData();
    body.append('request', JSON.stringify(form.rpaRequest || {}));
    files.forEach(file => body.append('file', file, file.name));
    const result = await readResult(await trackRequest(
      () => fetchImpl(transport.path, { method: 'POST', body, credentials: 'same-origin' }),
      '正在提交 RPA 审批'
    ));
    if (result.code !== '00000') throw new Error(result.message || '提交失败');
    const instanceId = String(result.instanceId || result.data?.instanceId || '');
    return Object.freeze({
      kind: 'rpa', instanceId,
      status: instanceId ? 'PENDING' : 'ACCEPTED_UNTRACKED',
      message: instanceId ? (result.message || '操作成功') : '已受理但暂无可查询编号，请稍后重试'
    });
  }
  const applicationCode = String(form.applicationCode || 'UNSPECIFIED').trim().slice(0, 128);
  const normalizedCode = applicationCode.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 123);
  const resourceId = normalizedCode.startsWith('TEST_') ? normalizedCode : `TEST_${normalizedCode}`;
  const submitFeishuApproval = async idempotencyKey => readResult(await trackRequest(
    () => fetchImpl(transport.path, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      applicationType: 'T005', title: form.name,
      applicationCode,
      resourceId,
      businessKey: `TEST_T005_${resourceId}`,
      idempotencyKey,
      description: form.summary,
      detailFields: form.detailFields || {},
      application: {
        name: form.name,
        applicationCode,
        summary: form.summary,
        description: form.description || form.summary,
        scenario: form.scenario,
        collaboration: form.collaboration,
        webAddress: form.webAddress,
        mobileAddress: form.mobileAddress,
        applicant: form.applicant,
        department: form.department,
        contact: form.contact,
        contactDepartment: form.contactDepartment,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        phone: form.phone,
        email: form.email,
        domain: form.domain,
        users: form.users,
        accessDepartment: form.accessDepartment,
        roles: form.roles,
        scope: form.scope,
        remarks: form.remarks,
        detailFields: form.detailFields || {}
      }
      })
    }),
    '正在提交海能Work审批'
  ));
  let result;
  try {
    result = await submitFeishuApproval(createApprovalIdempotencyKey(resourceId));
  } catch (error) {
    if (error?.code !== 'APPROVAL_IDEMPOTENCY_EXPIRED') throw error;
    result = await submitFeishuApproval(createApprovalIdempotencyKey(resourceId));
  }
  const instanceId = String(result.instanceId || '');
  const status = String(result.status || '').toUpperCase();
  if (!instanceId) return Object.freeze({ kind: 'feishu', instanceId: '', resourceId, status: 'SUBMITTED_UNTRACKED', message: '已受理但暂无可查询编号，请稍后重试' });
  if (!APPROVAL_STATUSES.has(status)) return Object.freeze({ kind: 'feishu', instanceId, resourceId, status: 'ERROR', message: '审批状态返回异常，请稍后重试' });
  return Object.freeze({ kind: 'feishu', instanceId, resourceId, status, message: '飞书审批已提交' });
}

export async function getOnboardingStatus(instanceId, fetchImpl = globalThis.fetch, resourceId = '') {
  const normalized = String(instanceId || '');
  if (!SAFE_INSTANCE_ID.test(normalized)) throw new Error('审批实例标识非法');
  const suffix = resourceId ? `?resourceId=${encodeURIComponent(resourceId)}` : '';
  const result = await readResult(await trackRequest(
    () => fetchImpl(`/api/v1/approvals/instances/${encodeURIComponent(normalized)}${suffix}`, {
      method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }
    }),
    '正在查询审批状态'
  ));
  const status = String(result.status || '').toUpperCase();
  return Object.freeze({ instanceId: normalized, status: APPROVAL_STATUSES.has(status) ? status : 'ERROR' });
}
