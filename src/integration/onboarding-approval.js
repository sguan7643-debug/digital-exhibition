import { trackRequest } from './request-status.js';

const SAFE_INSTANCE_ID = /^[A-Za-z0-9_-]{1,256}$/;
const APPROVAL_STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
const APPLICATION_TYPE_ALIASES = Object.freeze({
  AI: 'T001',
  EAD: 'T002',
  RPA: 'T003',
  TOOL: 'T004',
  HAINENG: 'T005',
  REPORT: 'T006',
  DASHBOARD: 'T007',
  DATASET: 'T008',
  METRIC: 'T009',
});

export function normalizeApplicationType(applicationType) {
  const value = String(applicationType || '').trim().toUpperCase();
  return APPLICATION_TYPE_ALIASES[value] || value;
}

export function resolveApprovalTransport(applicationType) {
  const normalizedType = normalizeApplicationType(applicationType);
  if (normalizedType === 'T003') return Object.freeze({ kind: 'rpa', path: '/api/processInstanceStart', contentType: 'multipart/form-data' });
  if (normalizedType === 'T005') return Object.freeze({ kind: 'feishu', path: '/api/v1/approvals/instances', contentType: 'application/json' });
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

export function createOnboardingAttempt(existing = '') {
  if (/^TEST_ATTEMPT_[A-Za-z0-9_-]{1,180}$/.test(String(existing || ''))) return String(existing);
  const nonce = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `TEST_ATTEMPT_${String(nonce).replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

async function onboardingRequest(path, { method = 'GET', body, label = '正在读取上线申请' } = {}, fetchImpl = globalThis.fetch) {
  try {
    return await readResult(await trackRequest(
      () => fetchImpl(path, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      }),
      label
    ));
  } catch (error) {
    error.uncertain = !error.status || error.status === 408 || error.status === 429 || error.status >= 500;
    throw error;
  }
}

function bytesToBase64(bytes) {
  let result = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) result += String.fromCharCode(...bytes.subarray(index, index + chunk));
  return btoa(result);
}

export async function uploadOnboardingFile({ attemptId, purpose, file }, fetchImpl = globalThis.fetch) {
  if (!(file instanceof Blob)) throw new Error('请选择有效文件');
  const bytes = new Uint8Array(await file.arrayBuffer());
  return onboardingRequest('/api/v1/onboarding/uploads', {
    method: 'POST',
    body: { attemptId, purpose, fileName: file.name, mimeType: file.type, base64: bytesToBase64(bytes) },
    label: `正在上传${purpose === 'APPLICATION_ICON' ? '应用图标' : '申请附件'}`
  }, fetchImpl);
}

export function removeOnboardingFile(uploadId, fetchImpl = globalThis.fetch) {
  return onboardingRequest(`/api/v1/onboarding/uploads/${encodeURIComponent(uploadId)}`, { method: 'DELETE', label: '正在移除文件' }, fetchImpl);
}

export function confirmOnboardingAttempt(attemptId, fetchImpl = globalThis.fetch) {
  return onboardingRequest(`/api/v1/onboarding/attempts/${encodeURIComponent(attemptId)}/confirm`, { method: 'POST', body: {}, label: '正在确认原提交结果' }, fetchImpl);
}

export function listOnboardingApplications(fetchImpl = globalThis.fetch) {
  return onboardingRequest('/api/v1/onboarding/applications', { label: '正在读取我的上线申请' }, fetchImpl);
}

export function getOnboardingApplication(applicationId, fetchImpl = globalThis.fetch) {
  return onboardingRequest(`/api/v1/onboarding/applications/${encodeURIComponent(applicationId)}`, { label: '正在读取上线申请详情' }, fetchImpl);
}

export function syncOnboardingApplication(applicationId, fetchImpl = globalThis.fetch) {
  return onboardingRequest(`/api/v1/onboarding/applications/${encodeURIComponent(applicationId)}/sync`, { method: 'POST', body: {}, label: '正在同步审批状态' }, fetchImpl);
}

export function authorizeOnboardingFile(applicationId, fileId, mode = 'DOWNLOAD', fetchImpl = globalThis.fetch) {
  return onboardingRequest(`/api/v1/onboarding/applications/${encodeURIComponent(applicationId)}/files/${encodeURIComponent(fileId)}/grant`, { method: 'POST', body: { mode }, label: '正在获取文件访问权限' }, fetchImpl);
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
  const attemptId = createOnboardingAttempt(form.attemptId);
  const result = await onboardingRequest('/api/v1/onboarding/applications', {
    method: 'POST',
    body: { attemptId, application: { ...form, type: 'T005' }, uploadIds: Array.isArray(form.uploadIds) ? form.uploadIds : [] },
    label: '正在提交海能Work审批'
  }, fetchImpl);
  const applicationId = String(result.applicationId || '');
  const instanceId = String(result.instanceId || '');
  const resourceId = String(result.resourceId || '');
  const status = String(result.status || '').toUpperCase();
  if (!applicationId) throw new Error('提交成功响应缺少 applicationId');
  if (!APPROVAL_STATUSES.has(status)) return Object.freeze({ kind: 'feishu', applicationId, instanceId, resourceId, status: 'ERROR', message: '审批状态返回异常，请稍后重试' });
  return Object.freeze({ kind: 'feishu', applicationId, instanceId, resourceId, status, message: instanceId ? '飞书审批已提交' : '申请已保存，但暂无审批跟踪编号' });
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
