const SUPPORTED_TYPES = new Set(['T003', 'T005']);
const CODE_REQUIRED_TYPES = new Set(['T003', 'T005']);
const PHONE_PATTERN = /^(?:\+?86[ -]?)?1[3-9][0-9]{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EDITABLE_FIELDS = Object.freeze([
  'department', 'phone', 'email', 'name', 'applicationCode', 'type', 'domain', 'summary', 'scenario',
  'collaboration', 'webAddress', 'mobileAddress', 'contact', 'contactDepartment', 'contactPhone',
  'contactEmail', 'users', 'accessDepartment', 'roles', 'scope', 'remarks'
]);

function text(value) {
  return String(value ?? '').trim();
}

export function applicationTypePolicy(value) {
  const type = text(value).toUpperCase();
  const supported = SUPPORTED_TYPES.has(type);
  return Object.freeze({
    supported,
    applicationCodeRequired: CODE_REQUIRED_TYPES.has(type),
    reason: supported ? '' : '该应用类型尚未配置真实审批通道，暂不可提交。'
  });
}

export function buildContactAutofill(user = {}) {
  return Object.freeze({
    contactPhone: text(user.phone || user.mobile),
    contactEmail: text(user.email || user.enterpriseEmail)
  });
}

export function validatePhone(value) {
  return PHONE_PATTERN.test(text(value));
}

export function validateEmail(value) {
  return EMAIL_PATTERN.test(text(value));
}

export function normalizePermissionScope(form = {}) {
  const scope = form.scope === 'all' ? 'all' : 'assigned';
  return Object.freeze({
    scope,
    accessDepartment: scope === 'all' ? '' : text(form.accessDepartment),
    users: scope === 'all' ? '' : text(form.users)
  });
}

function publicFile(file) {
  if (!file || typeof file !== 'object') return null;
  return Object.freeze({
    fileId: text(file.fileId || file.uploadId),
    fileName: text(file.fileName || file.name),
    mimeType: text(file.mimeType),
    sizeBytes: Number.isFinite(Number(file.sizeBytes)) ? Number(file.sizeBytes) : null,
    uploadedAt: text(file.uploadedAt),
    previewable: Boolean(file.previewable),
    downloadable: file.downloadable !== false
  });
}

export function buildRejectedApplicationCopy(detail = {}, currentApplicant = '') {
  if (text(detail.status).toUpperCase() !== 'REJECTED') throw new Error('只有被拒绝的申请可以编辑并重新提交');
  if (!text(currentApplicant) || text(detail.applicant) !== text(currentApplicant)) throw new Error('该申请不属于当前用户');
  const stored = detail.detailFields && typeof detail.detailFields === 'object' && !Array.isArray(detail.detailFields)
    ? detail.detailFields
    : {};
  const form = {};
  for (const key of EDITABLE_FIELDS) {
    const fallback = key === 'name' ? detail.applicationName
      : key === 'applicationCode' ? detail.applicationCode
        : key === 'type' ? detail.applicationType
          : key === 'domain' ? detail.businessDomain
            : '';
    form[key] = text(stored[key] ?? fallback);
  }
  form.scope = form.scope === 'all' ? 'all' : 'assigned';
  const nestedDetails = stored.detailFields && typeof stored.detailFields === 'object' && !Array.isArray(stored.detailFields)
    ? Object.fromEntries(Object.entries(stored.detailFields).map(([key, value]) => [text(key), text(value)]).filter(([key]) => key))
    : {};
  return Object.freeze({
    sourceApplicationId: text(detail.applicationId),
    rejectionReason: text(detail.rejectionReason),
    form: Object.freeze(form),
    detailFields: Object.freeze(nestedDetails),
    files: Object.freeze({
      icon: publicFile(detail.icon),
      attachments: Object.freeze((Array.isArray(detail.attachments) ? detail.attachments : []).map(publicFile).filter(Boolean))
    })
  });
}

