import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

const ATTEMPT_PATTERN = /^TEST_ATTEMPT_[A-Za-z0-9_-]{1,180}$/;
const ID_PATTERN = /^TEST_[A-Za-z0-9_-]{1,256}$/;
const STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
const STATUS_NODE_LABELS = Object.freeze({ PENDING: '飞书审批中', APPROVED: '审批通过', REJECTED: '审批拒绝', CANCELLED: '已取消' });
const APPLICATION_TYPE_LABELS = Object.freeze({ T005: '海能Work应用' });
const BUSINESS_DOMAIN_LABELS = Object.freeze({ BD001: '生产运营', BD002: '综合管理', BD003: '供应链管理', BD004: '经营分析', BD005: '数字化办公' });
const MOBILE_PHONE_PATTERN = /^(?:\+?86[ -]?)?1[3-9][0-9]{9}$/;

function fail(code, message, status = 400) {
  throw new FeishuProxyError(code, message, status);
}

function subjectOf(session) {
  const identity = session?.identity || {};
  const subject = String(identity.userId || identity.openId || identity.subject || '');
  if (!subject || !session?.accessToken) fail('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401);
  return subject;
}

function applicationForSession(input, session) {
  const ownerSubject = subjectOf(session);
  const suppliedApplicant = cleanText(input?.applicant, 256);
  if (suppliedApplicant && suppliedApplicant !== ownerSubject) fail('ONBOARDING_APPLICANT_MISMATCH', '申请人必须与当前登录用户一致', 403);
  return { ...(input && typeof input === 'object' ? input : {}), applicant: ownerSubject };
}

function stableId(prefix, value) {
  return `TEST_${prefix}_${createHash('sha256').update(String(value)).digest('hex').slice(0, 24)}`;
}

function atomicWrite(path, value) {
  if (!path) return;
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(temporary, path);
}

function readRegistry(path) {
  if (!path || !existsSync(path)) return { version: 'onboarding-application-registry.v1', applications: [], uploads: [] };
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'));
    if (!Array.isArray(value.applications) || !Array.isArray(value.uploads)) throw new Error('invalid');
    return value;
  } catch {
    fail('ONBOARDING_REGISTRY_INVALID', '上线申请持久化数据无法读取', 500);
  }
}

function cleanText(value, maximum = 4000) {
  return String(value ?? '').trim().slice(0, maximum);
}

function normalizedApplication(input = {}) {
  const result = {};
  for (const key of ['name', 'applicationCode', 'type', 'applicationTypeName', 'domain', 'businessDomainName', 'summary', 'description', 'scenario', 'collaboration', 'webAddress', 'mobileAddress', 'applicant', 'department', 'phone', 'email', 'contact', 'contactName', 'contactDepartment', 'contactPhone', 'contactEmail', 'users', 'authorizedUserName', 'accessDepartment', 'roles', 'scope', 'remarks']) result[key] = cleanText(input[key]);
  result.detailFields = Object.fromEntries(Object.entries(input.detailFields && typeof input.detailFields === 'object' ? input.detailFields : {}).map(([key, value]) => [cleanText(key, 128), cleanText(value)]));
  return result;
}

function publicFile(file) {
  if (!file) return null;
  return Object.freeze({
    fileId: file.uploadId,
    uploadId: file.uploadId,
    purpose: file.purpose,
    fileName: file.originalName,
    sizeBytes: file.sizeBytes,
    mimeType: file.mimeType,
    detectedType: file.detectedType,
    sha256: file.sha256,
    uploadedAt: file.uploadedAt,
    previewable: ['PNG', 'JPEG', 'WEBP', 'PDF'].includes(file.detectedType),
    downloadable: true
  });
}

export function createFeishuOnboardingService({ approvalService, fileAccessService, onboardingFileService = null, uniqueIdentifierProvider = null, referenceResolver = null, readService = null, orchestrator, registryFile = '', now = Date.now } = {}) {
  if (!approvalService?.createInstance || !approvalService?.getInstance) throw new Error('上线申请服务缺少审批服务');
  if (!fileAccessService?.createGrant) throw new Error('上线申请服务缺少文件访问服务');
  const stored = readRegistry(registryFile);
  const applications = new Map(stored.applications.map(record => [record.applicationId, record]));
  const uploads = new Map(stored.uploads.map(record => [record.uploadId, record]));
  const submitPromises = new Map();
  const syncPromises = new Map();
  const uniqueIdentifierPromises = new Map();

  function persist() {
    atomicWrite(registryFile, { version: 'onboarding-application-registry.v1', applications: [...applications.values()], uploads: [...uploads.values()] });
  }

  async function gate(session) {
    const prepared = orchestrator?.execute
      ? await orchestrator.execute({ session })
      : orchestrator?.prepared || await orchestrator?.prepare?.({ session });
    if (!prepared?.ready) fail('POC_GATES_NOT_READY', '申请服务暂不可用', 503);
    return prepared;
  }

  function requireAttempt(value) {
    const attemptId = String(value || '');
    if (!ATTEMPT_PATTERN.test(attemptId)) fail('ONBOARDING_ATTEMPT_INVALID', '提交 attempt 标识非法');
    return attemptId;
  }

  function ownedApplication(applicationId, session) {
    const subject = subjectOf(session);
    const record = applications.get(String(applicationId || ''));
    if (!record || record.ownerSubject !== subject || record.type !== 'APP_ONBOARDING') fail('ONBOARDING_APPLICATION_NOT_AVAILABLE', '无法查看该申请', 404);
    return record;
  }

  function filesFor(record) {
    return record.uploadIds.map(uploadId => uploads.get(uploadId)).filter(file => file && file.ownerSubject === record.ownerSubject && file.applicationId === record.applicationId && file.state !== 'REMOVED');
  }

  function currentNodeLabel(value, status) {
    const normalizedValue = cleanText(value, 64).toUpperCase();
    return STATUS_NODE_LABELS[normalizedValue] || STATUS_NODE_LABELS[status] || cleanText(value, 256);
  }

  async function enrichReferenceNames(record, session) {
    const application = record.application || {};
    if (application.applicationTypeName && application.businessDomainName && (!application.users || application.authorizedUserName)) return;
    if (!referenceResolver?.resolve) return;
    const resolved = await referenceResolver.resolve(application, session).catch(() => null);
    if (!resolved) return;
    let changed = false;
    for (const key of ['applicationTypeName', 'businessDomainName', 'authorizedUserName']) {
      const value = cleanText(resolved[key], 256);
      if (value && !application[key]) { application[key] = value; changed = true; }
    }
    if (changed) persist();
  }

  function toPublic(record) {
    const linked = filesFor(record);
    const application = record.application || {};
    return Object.freeze({
      type: 'APP_ONBOARDING',
      businessId: record.businessId,
      applicationId: record.applicationId,
      resourceId: record.resourceId,
      uniqueIdentifier: record.uniqueIdentifier || '',
      instanceId: record.instanceId || '',
      attemptId: record.attemptId,
      runId: record.runId || '',
      applicationName: application.name,
      applicationCode: application.applicationCode,
      applicationType: application.type || 'T005',
      applicationTypeName: application.applicationTypeName || APPLICATION_TYPE_LABELS[String(application.type || 'T005').toUpperCase()] || application.type || 'T005',
      businessDomain: application.domain,
      businessDomainName: application.businessDomainName || BUSINESS_DOMAIN_LABELS[String(application.domain || '').toUpperCase()] || application.domain,
      applicant: application.applicant || record.ownerSubject,
      applicantName: record.ownerDisplayName || application.applicant || record.ownerSubject,
      authorizedUsers: application.users ? [application.users] : [],
      authorizedUserNames: application.authorizedUserName ? [application.authorizedUserName] : (application.users ? [application.users] : []),
      authorizedDepartments: application.accessDepartment ? [application.accessDepartment] : [],
      submittedAt: record.submittedAt,
      status: STATUSES.has(record.status) ? record.status : 'UNKNOWN',
      currentNode: currentNodeLabel(record.currentNode, record.status),
      completedAt: record.completedAt || '',
      rejectionReason: record.rejectionReason || '',
      lastSyncedAt: record.lastSyncedAt || '',
      publicationStatus: record.publicationStatus || '',
      publicationErrorCode: record.publicationStatus === 'FAILED' ? (record.publicationErrorCode || 'APPROVAL_PROJECTION_FAILED') : '',
      icon: publicFile(linked.find(file => file.purpose === 'APPLICATION_ICON')),
      attachments: linked.filter(file => file.purpose === 'APPLICATION_ATTACHMENT').map(publicFile),
      detailFields: application.detailFields || {}
    });
  }

  function mergeAuthoritativeWithLocal(authoritative, local) {
    if (!local) return authoritative;
    const localValue = toPublic(local);
    return Object.freeze({
      ...localValue,
      ...authoritative,
      icon: localValue.icon,
      attachments: localValue.attachments,
      detailFields: Object.keys(authoritative.detailFields || {}).length ? authoritative.detailFields : localValue.detailFields,
      publicationStatus: localValue.publicationStatus,
      publicationErrorCode: localValue.publicationErrorCode
    });
  }

  function assertUploadCapacity({ attemptId, purpose }, session) {
    const ownerSubject = subjectOf(session);
    const attempt = requireAttempt(attemptId);
    if (!['APPLICATION_ICON', 'APPLICATION_ATTACHMENT'].includes(purpose)) fail('ONBOARDING_FILE_PURPOSE_INVALID', '文件用途非法', 422);
    const existing = [...uploads.values()].filter(file => file.ownerSubject === ownerSubject && file.attemptId === attempt && file.purpose === purpose && file.state !== 'REMOVED');
    const maximum = purpose === 'APPLICATION_ICON' ? 1 : 3;
    if (existing.length >= maximum) fail('ONBOARDING_FILE_COUNT_EXCEEDED', purpose === 'APPLICATION_ICON' ? '应用图标最多 1 个' : '申请附件最多 3 个', 422);
    return true;
  }

  function registerUploadedFile(file, session) {
    const ownerSubject = subjectOf(session);
    const attemptId = requireAttempt(file.attemptId);
    if (!ID_PATTERN.test(String(file.uploadId || ''))) fail('ONBOARDING_UPLOAD_ID_INVALID', '上传标识非法');
    const existing = uploads.get(file.uploadId);
    if (existing && existing.ownerSubject !== ownerSubject) fail('ONBOARDING_UPLOAD_NOT_AVAILABLE', '文件不存在或不可访问', 404);
    const record = { ...file, attemptId, ownerSubject, state: 'READY', applicationId: existing?.applicationId || '' };
    uploads.set(record.uploadId, record);
    persist();
    return publicFile(record);
  }

  function removeUploadedFile(uploadId, session) {
    const ownerSubject = subjectOf(session);
    const record = uploads.get(String(uploadId || ''));
    if (!record || record.ownerSubject !== ownerSubject || record.applicationId) fail('ONBOARDING_UPLOAD_NOT_AVAILABLE', '文件不存在或不可移除', 404);
    record.state = 'REMOVED';
    record.removedAt = new Date(Number(now())).toISOString();
    persist();
    return Object.freeze({ removed: true, uploadId: record.uploadId });
  }

  async function uploadFile(input = {}, session) {
    if (!onboardingFileService?.upload) fail('ONBOARDING_UPLOAD_UNAVAILABLE', '申请文件上传暂不可用', 503);
    assertUploadCapacity(input, session);
    let bytes;
    try { bytes = Uint8Array.from(Buffer.from(String(input.base64 || ''), 'base64')); }
    catch { fail('ONBOARDING_FILE_BODY_INVALID', '文件内容不是有效的 Base64', 400); }
    if (!bytes.byteLength) fail('ONBOARDING_FILE_BODY_INVALID', '文件内容为空', 400);
    const uploaded = await onboardingFileService.upload({ attemptId: input.attemptId, purpose: input.purpose, fileName: input.fileName, mimeType: input.mimeType, bytes }, session);
    return registerUploadedFile({ ...uploaded, attemptId: input.attemptId }, session);
  }

  function validateSubmission(application, selected) {
    if (application.type !== 'T005') fail('ONBOARDING_TYPE_INVALID', '该接口只接受海能Work上线申请');
    const missing = ['name', 'applicationCode', 'domain', 'applicant', 'department', 'users', 'accessDepartment'].filter(key => !application[key]);
    if (missing.length) fail('ONBOARDING_FIELDS_REQUIRED', `上线申请缺少必填字段：${missing.join('、')}`, 422);
    for (const [key, label] of [['phone', '申请人联系电话'], ['contactPhone', '接入人联系电话']]) {
      if (application[key] && !MOBILE_PHONE_PATTERN.test(application[key])) fail('ONBOARDING_PHONE_INVALID', `${label}格式不正确`, 422);
    }
    if (selected.filter(file => file.purpose === 'APPLICATION_ICON').length !== 1) fail('ONBOARDING_ICON_REQUIRED', '海能Work上线申请必须上传 1 个应用图标', 422);
    if (selected.filter(file => file.purpose === 'APPLICATION_ATTACHMENT').length > 3) fail('ONBOARDING_ATTACHMENT_COUNT_EXCEEDED', '申请附件最多 3 个', 422);
  }

  async function submit(input = {}, session) {
    const ownerSubject = subjectOf(session);
    const sessionApplication = applicationForSession(input.application, session);
    const prepared = await gate(session);
    const attemptId = requireAttempt(input.attemptId);
    const existing = [...applications.values()].find(record => record.ownerSubject === ownerSubject && record.attemptId === attemptId);
    if (existing?.instanceId) return toPublic(existing);
    const application = existing?.application || normalizedApplication(sessionApplication);
    const uploadIds = existing?.uploadIds || [...new Set((input.uploadIds || []).map(String))];
    const selected = uploadIds.map(uploadId => uploads.get(uploadId)).filter(file => file && file.ownerSubject === ownerSubject && file.attemptId === attemptId && file.state === 'READY' && !file.applicationId);
    if (!existing && selected.length !== uploadIds.length) fail('ONBOARDING_UPLOAD_NOT_AVAILABLE', '存在不属于当前 attempt 的文件', 404);
    validateSubmission(application, existing ? filesFor(existing) : selected);
    const submitKey = `${ownerSubject}\0${attemptId}`;
    if (!existing?.uniqueIdentifier && !uniqueIdentifierProvider?.getUniqueIdentifier) {
      fail('ONBOARDING_UNIQUE_IDENTIFIER_UNAVAILABLE', '唯一标识服务暂不可用', 503);
    }
    if (!existing?.uniqueIdentifier && !uniqueIdentifierPromises.has(submitKey)) {
      uniqueIdentifierPromises.set(submitKey, Promise.resolve()
        .then(() => uniqueIdentifierProvider.getUniqueIdentifier({ fallbackKey: `${ownerSubject}\0${attemptId}` }))
        .finally(() => uniqueIdentifierPromises.delete(submitKey)));
    }
    const uniqueIdentifier = existing?.uniqueIdentifier || await uniqueIdentifierPromises.get(submitKey);
    const applicationId = existing?.applicationId || stableId('APPLICATION', `${ownerSubject}\0${attemptId}`);
    const record = existing || {
      type: 'APP_ONBOARDING',
      ownerSubject,
      ownerDisplayName: cleanText(session.identity?.displayName || session.identity?.name, 256),
      attemptId,
      applicationId,
      uniqueIdentifier,
      businessId: stableId('ONBOARDING', `${ownerSubject}\0${attemptId}`),
      resourceId: stableId('APP', `${ownerSubject}\0${attemptId}`),
      businessKey: stableId('BUSINESS_ONBOARDING', `${ownerSubject}\0${attemptId}`),
      idempotencyKey: stableId('IDEM_ONBOARDING', `${ownerSubject}\0${attemptId}`),
      runId: prepared.runId,
      application,
      uploadIds,
      instanceId: '',
      status: 'PENDING',
      currentNode: '正在提交',
      submittedAt: new Date(Number(now())).toISOString(),
      lastSyncedAt: '',
      completedAt: '',
      rejectionReason: '',
      outcome: 'UNCERTAIN'
    };
    applications.set(applicationId, record);
    for (const file of selected) file.applicationId = applicationId;
    persist();
    if (!submitPromises.has(submitKey)) submitPromises.set(submitKey, (async () => {
      try {
        const result = await approvalService.createInstance({
          applicationType: 'T005',
          title: application.name,
          applicationCode: application.applicationCode,
          resourceId: record.resourceId,
          businessKey: record.businessKey,
          idempotencyKey: record.idempotencyKey,
          applicationId: record.applicationId,
          businessId: record.businessId,
          uniqueIdentifier: record.uniqueIdentifier,
          runId: record.runId,
          description: application.summary || application.description,
          detailFields: application.detailFields,
          application: { ...application, uniqueIdentifier: record.uniqueIdentifier, applicationId: record.applicationId, businessId: record.businessId, attemptId, runId: record.runId, uploads: filesFor(record) }
        }, session);
        record.instanceId = result.instanceId || '';
        record.status = STATUSES.has(result.status) ? result.status : 'PENDING';
        record.currentNode = STATUS_NODE_LABELS[record.status] || record.status;
        record.lastSyncedAt = new Date(Number(now())).toISOString();
        record.outcome = 'CONFIRMED';
        persist();
        return toPublic(record);
      } catch (error) {
        record.outcome = 'UNCERTAIN';
        record.lastError = cleanText(error?.code || error?.message || 'ONBOARDING_SUBMIT_UNCERTAIN', 240);
        persist();
        throw error;
      }
    })().finally(() => submitPromises.delete(submitKey)));
    return submitPromises.get(submitKey);
  }

  async function confirmAttempt(attemptId, session) {
    const ownerSubject = subjectOf(session);
    const record = [...applications.values()].find(item => item.ownerSubject === ownerSubject && item.attemptId === requireAttempt(attemptId));
    if (!record) fail('ONBOARDING_ATTEMPT_NOT_FOUND', '无法确认该提交结果', 404);
    return submit({ attemptId: record.attemptId, application: record.application, uploadIds: record.uploadIds }, session);
  }

  async function list(session) {
    const ownerSubject = subjectOf(session);
    if (readService?.listCurrentOnboardingApplications) {
      const items = (await readService.listCurrentOnboardingApplications({ identity: session.identity }))
        .map(item => mergeAuthoritativeWithLocal(item, applications.get(item.applicationId)))
        .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
      return Object.freeze({ items, total: items.length });
    }
    const items = [...applications.values()].filter(record => record.ownerSubject === ownerSubject && record.type === 'APP_ONBOARDING').sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))).map(toPublic);
    return Object.freeze({ items, total: items.length });
  }

  async function get(applicationId, session) {
    subjectOf(session);
    if (readService?.getCurrentOnboardingApplication) {
      const authoritative = await readService.getCurrentOnboardingApplication(applicationId, { identity: session.identity });
      return mergeAuthoritativeWithLocal(authoritative, applications.get(String(applicationId || '')));
    }
    const record = ownedApplication(applicationId, session);
    await enrichReferenceNames(record, session);
    return toPublic(record);
  }

  async function sync(applicationId, session) {
    const record = applications.get(String(applicationId || ''));
    if (!record || record.ownerSubject !== subjectOf(session) || record.type !== 'APP_ONBOARDING') {
      if (readService?.getCurrentOnboardingApplication) return get(applicationId, session);
      fail('ONBOARDING_APPLICATION_NOT_AVAILABLE', '无法查看该申请', 404);
    }
    if (!record.instanceId) return toPublic(record);
    if (!syncPromises.has(record.applicationId)) syncPromises.set(record.applicationId, (async () => {
      const result = await approvalService.getInstance(record.instanceId, session, { resourceId: record.resourceId });
      record.status = STATUSES.has(result.status) ? result.status : 'UNKNOWN';
      record.currentNode = STATUS_NODE_LABELS[record.status] || record.status;
      record.lastSyncedAt = new Date(Number(now())).toISOString();
      if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(record.status) && !record.completedAt) record.completedAt = record.lastSyncedAt;
      record.rejectionReason = cleanText(result.rejectionReason || record.rejectionReason);
      record.publicationStatus = cleanText(result.projectionStatus || record.publicationStatus, 32);
      record.publicationErrorCode = record.publicationStatus === 'FAILED' ? cleanText(result.projectionError || 'APPROVAL_PROJECTION_FAILED', 240) : '';
      await enrichReferenceNames(record, session);
      persist();
      if (readService?.getCurrentOnboardingApplication) {
        try { return await get(applicationId, session); } catch { /* 表同步延迟时保留审批接口刚返回的状态。 */ }
      }
      return toPublic(record);
    })().finally(() => syncPromises.delete(record.applicationId)));
    return syncPromises.get(record.applicationId);
  }

  async function grantFileAccess(applicationId, uploadId, mode, session) {
    const record = ownedApplication(applicationId, session);
    const file = filesFor(record).find(item => item.uploadId === uploadId);
    if (!file) fail('ONBOARDING_FILE_NOT_AVAILABLE', '文件不存在或不可访问', 404);
    const normalizedMode = String(mode || 'DOWNLOAD').toUpperCase();
    if (!['PREVIEW', 'DOWNLOAD'].includes(normalizedMode)) fail('ONBOARDING_FILE_MODE_INVALID', '文件访问方式非法');
    if (normalizedMode === 'PREVIEW' && !['PNG', 'JPEG', 'WEBP', 'PDF'].includes(file.detectedType)) fail('ONBOARDING_FILE_PREVIEW_UNAVAILABLE', '该文件不支持安全预览', 409);
    return fileAccessService.createGrant({ fileToken: file.fileToken, fileName: file.originalName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, mode: normalizedMode, disposition: normalizedMode === 'PREVIEW' ? 'INLINE' : 'ATTACHMENT', identity: session.identity });
  }

  return Object.freeze({ assertUploadCapacity, uploadFile, registerUploadedFile, removeUploadedFile, submit, confirmAttempt, list, get, sync, grantFileAccess });
}
