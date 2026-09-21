import { createFeishuProxyFetch } from './feishu-proxy-dispatcher.mjs';

const API_ROOT = 'https://open.feishu.cn/open-apis';
const PAGE_SIZES = new Set([10, 20, 50, 100]);

export function resolveFeishuUpstreamTimeoutMs(value) {
  const configured = Number(value ?? 8_000);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 8_000) : 8_000;
}

export class FeishuProxyError extends Error {
  constructor(code, message, status = 500, details = {}) {
    super(message);
    this.name = 'FeishuProxyError';
    this.code = code;
    this.status = status;
    Object.assign(this, details);
  }
}

function safeJson(response) {
  return response.json().catch(() => {
    throw new FeishuProxyError('UPSTREAM_INVALID_JSON', '飞书服务返回了无效数据', 502);
  });
}

function safeUpstreamDetails(value) {
  if (!value || typeof value !== 'object') return undefined;
  const allowed = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!/field|error|request|log|detail|reason/i.test(key)) continue;
    if (/token|secret|authorization|cookie|credential/i.test(key)) continue;
    allowed[key] = typeof entry === 'object' ? JSON.parse(JSON.stringify(entry, (nestedKey, nestedValue) => {
      if (/token|secret|authorization|cookie|credential/i.test(nestedKey)) return '[REDACTED]';
      return typeof nestedValue === 'string' ? nestedValue.slice(0, 240) : nestedValue;
    })) : String(entry).slice(0, 240);
  }
  return Object.keys(allowed).length ? allowed : undefined;
}

function normalizePageSize(value) {
  const pageSize = value == null ? 10 : Number(value);
  if (!PAGE_SIZES.has(pageSize)) throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量仅支持 10、20、50、100', 400);
  return pageSize;
}

function createUpstreamLimiter(maxConcurrentRequests) {
  let active = 0;
  const waiting = [];
  const runNext = () => {
    if (active >= maxConcurrentRequests || !waiting.length) return;
    active += 1;
    const job = waiting.shift();
    Promise.resolve().then(job.task).then(job.resolve, job.reject).finally(() => {
      active -= 1;
      runNext();
    });
  };
  return task => new Promise((resolve, reject) => {
    waiting.push({ task, resolve, reject });
    runNext();
  });
}

export function createFeishuOpenApiClient(options = {}) {
  const appId = options.appId ?? process.env.FEISHU_APP_ID ?? '';
  const appSecret = options.appSecret ?? process.env.FEISHU_APP_SECRET ?? '';
  const baseToken = options.baseToken ?? process.env.FEISHU_BASE_TOKEN ?? '';
  const fetchImpl = createFeishuProxyFetch(options.fetchImpl ?? globalThis.fetch, {
    dispatcher: options.proxyDispatcher,
    env: options.proxyEnv,
    ProxyAgentClass: options.ProxyAgentClass
  });
  const now = options.now ?? Date.now;
  const upstreamTimeoutMs = resolveFeishuUpstreamTimeoutMs(options.upstreamTimeoutMs ?? process.env.FEISHU_UPSTREAM_TIMEOUT_MS);
  const configuredConcurrency = Number(options.maxConcurrentRequests ?? process.env.FEISHU_MAX_CONCURRENT_REQUESTS ?? 8);
  const maxConcurrentRequests = Number.isInteger(configuredConcurrency) && configuredConcurrency > 0 ? Math.min(configuredConcurrency, 8) : 8;
  const scheduleUpstream = createUpstreamLimiter(maxConcurrentRequests);
  const credentialsReady = Boolean(appId && appSecret && baseToken);
  let cachedTenantToken = '';
  let tokenExpiresAt = 0;
  let tenantTokenPending = null;

  function requireCredentials() {
    if (!credentialsReady) {
      throw new FeishuProxyError('SERVICE_CREDENTIALS_MISSING', '飞书服务端凭据尚未配置', 503);
    }
  }

  async function fetchUpstream(url, init, upstreamPath) {
    return scheduleUpstream(async () => {
    const controller = new AbortController();
    const startedAt = now();
    let timedOut = false;
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new Error('Feishu upstream timeout'));
      }, upstreamTimeoutMs);
    });
    try {
      return await Promise.race([
        Promise.resolve().then(() => fetchImpl(url, { ...init, signal: controller.signal })),
        deadline
      ]);
    } catch (cause) {
      if (timedOut) {
        throw new FeishuProxyError('FEISHU_UPSTREAM_TIMEOUT', '飞书服务响应超时', 504, {
          upstreamPath,
          elapsedMs: Math.max(0, Number(now()) - Number(startedAt))
        });
      }
      throw cause;
    } finally {
      clearTimeout(timer);
    }
    });
  }

  async function getTenantToken() {
    requireCredentials();
    if (cachedTenantToken && now() < tokenExpiresAt) return cachedTenantToken;
    if (tenantTokenPending) return tenantTokenPending;
    tenantTokenPending = (async () => {
      try {
        const response = await fetchUpstream(`${API_ROOT}/auth/v3/tenant_access_token/internal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app_id: appId, app_secret: appSecret })
        }, '/auth/v3/tenant_access_token/internal');
        const body = await safeJson(response);
        if (!response.ok || body.code !== 0 || !body.tenant_access_token) {
          throw new FeishuProxyError('TENANT_TOKEN_FAILED', '飞书租户访问令牌获取失败', response.status || 502);
        }
        cachedTenantToken = body.tenant_access_token;
        const validSeconds = Math.max(60, Number(body.expire || 7200) - 300);
        tokenExpiresAt = now() + validSeconds * 1000;
        return cachedTenantToken;
      } finally {
        tenantTokenPending = null;
      }
    })();
    return tenantTokenPending;
  }

  async function approvalRequest(pathname, { method = 'GET', body, accessToken } = {}, upstreamPath = pathname) {
    requireCredentials();
    const token = accessToken || await getTenantToken();
    const response = await fetchUpstream(`${API_ROOT}${pathname}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body == null ? {} : { 'Content-Type': 'application/json' })
      },
      body: body == null ? undefined : JSON.stringify(body)
    }, upstreamPath);
    const result = await safeJson(response);
    if (!response.ok || result.code !== 0 || !result.data || typeof result.data !== 'object') {
      const status = response.status === 401 ? 401 : response.status === 403 ? 403 : response.status === 429 ? 429 : 502;
      throw new FeishuProxyError('FEISHU_APPROVAL_FAILED', '飞书审批服务暂不可用', status, {
        upstreamCode: Number.isInteger(result.code) ? result.code : undefined,
        upstreamMessage: String(result.msg || result.error_msg || '').slice(0, 240),
        upstreamRequestId: String(result.request_id || result.RequestId || '').slice(0, 120),
        upstreamPath,
        upstreamDetails: safeUpstreamDetails(result.data)
      });
    }
    return result.data;
  }

  async function createApprovalDefinition(input, options = {}) {
    const approverUserId = String(input?.approverUserId || '');
    if (!approverUserId) throw new FeishuProxyError('APPROVER_REQUIRED', '测试审批人不能为空', 400);
    const data = await approvalRequest('/approval/v4/approvals?department_id_type=open_department_id&user_id_type=user_id', {
      method: 'POST', accessToken: options.accessToken,
      body: {
        approval_name: '@i18n@approval_name',
        settings: { revert_interval: 0 },
        config: {
          can_update_viewer: false,
          can_update_form: false,
          can_update_process: false,
          can_update_revert: false
        },
        icon: 0,
        description: '@i18n@description',
        process_manager_ids: [],
        viewers: [{ viewer_type: 'TENANT' }],
        form: { form_content: JSON.stringify([
          { id: 'application_name', name: '@i18n@application_name', type: 'input', required: true },
          { id: 'application_code', name: '@i18n@application_code', type: 'input', required: true },
          { id: 'application_description', name: '@i18n@application_description', type: 'textarea', required: true }
        ]) },
        node_list: [
          { id: 'START', privilege_field: {
            writable: ['application_name', 'application_code', 'application_description'],
            readable: ['application_name', 'application_code', 'application_description']
          } },
          { id: 'TEST_APPROVAL_NODE', name: '@i18n@approver_node', node_type: 'OR', approver: [{ type: 'Free' }] },
          { id: 'END', privilege_field: {
            writable: [],
            readable: ['application_name', 'application_code', 'application_description']
          } }
        ],
        i18n_resources: [{
          locale: 'zh-CN',
          is_default: true,
          texts: [
            { key: '@i18n@approval_name', value: input.approvalName },
            { key: '@i18n@description', value: input.description },
            { key: '@i18n@application_name', value: '应用名称' },
            { key: '@i18n@application_code', value: '应用编码' },
            { key: '@i18n@application_description', value: '申请说明' },
            { key: '@i18n@approver_node', value: '测试审批' }
          ]
        }]
      }
    });
    return { approvalCode: String(data.approval_code || '') };
  }

  async function createApprovalInstance(input, options = {}) {
    const data = await approvalRequest('/approval/v4/instances', {
      method: 'POST', accessToken: options.accessToken,
      body: {
        approval_code: input.approvalCode,
        user_id: input.applicantUserId,
        form: JSON.stringify([
          { id: 'application_name', type: 'input', value: input.title },
          { id: 'application_code', type: 'input', value: input.applicationCode },
          { id: 'application_description', type: 'textarea', value: input.description }
        ]),
        node_approver_user_id_list: [{ key: 'TEST_APPROVAL_NODE', value: [input.approverUserId] }],
        uuid: input.requestId
      }
    });
    return { instanceCode: String(data.instance_code || ''), status: 'PENDING' };
  }

  async function getApprovalInstance(instanceCode, options = {}) {
    const normalized = String(instanceCode || '');
    if (!/^[A-Za-z0-9_-]{1,256}$/.test(normalized)) throw new FeishuProxyError('INVALID_APPROVAL_INSTANCE_ID', '审批实例标识非法', 400);
    const data = await approvalRequest(
      `/approval/v4/instances/${encodeURIComponent(normalized)}`,
      { accessToken: options.accessToken },
      '/approval/v4/instances/{instanceCode}'
    );
    let formValues = {};
    try {
      const form = typeof data.form === 'string' ? JSON.parse(data.form) : data.form;
      if (Array.isArray(form)) formValues = Object.fromEntries(form
        .filter(item => item && typeof item === 'object' && (item.custom_id || item.id))
        .map(item => [String(item.custom_id || item.id), item.value]));
    } catch {
      formValues = {};
    }
    return {
      instanceCode: String(data.instance_code || normalized),
      approvalCode: String(data.approval_code || ''),
      status: String(data.status || ''),
      formValues,
      taskList: Array.isArray(data.task_list) ? data.task_list.map(task => ({
        id: String(task.id || task.task_id || ''), status: String(task.status || ''),
        userId: String(task.user_id || ''), openId: String(task.open_id || '')
      })) : []
    };
  }

  async function approveApprovalTask(input, options = {}) {
    await approvalRequest('/approval/v4/tasks/approve?user_id_type=user_id', {
      method: 'POST', accessToken: options.accessToken,
      body: {
        approval_code: input.approvalCode,
        instance_code: input.instanceCode,
        user_id: input.userId,
        task_id: input.taskId,
        comment: input.comment || 'TEST_自动化验收审批'
      }
    });
    return { ok: true };
  }

  async function listRecords(tableId, query = {}) {
    requireCredentials();
    if (!/^tbl[A-Za-z0-9]+$/.test(tableId || '')) throw new FeishuProxyError('INVALID_TABLE_ID', '飞书表标识非法', 400);
    if (query.viewId && !/^vew[A-Za-z0-9]+$/.test(query.viewId)) throw new FeishuProxyError('INVALID_VIEW_ID', '飞书视图标识非法', 400);
    const pageSize = normalizePageSize(query.pageSize);
    const token = await getTenantToken();
    const url = new URL(`${API_ROOT}/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables/${encodeURIComponent(tableId)}/records`);
    url.searchParams.set('page_size', String(pageSize));
    if (query.viewId) url.searchParams.set('view_id', query.viewId);
    if (query.pageToken) url.searchParams.set('page_token', String(query.pageToken));
    if (Array.isArray(query.fieldNames) && query.fieldNames.length) {
      url.searchParams.set('field_names', JSON.stringify(query.fieldNames));
    }
    const response = await fetchUpstream(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    }, '/bitable/v1/apps/{base}/tables/{tableId}/records');
    const body = await safeJson(response);
    const emptySuccess = body.code === 0 && body.data && body.data.items == null && Number(body.data.total || 0) === 0;
    if (!response.ok || body.code !== 0 || !body.data || (!Array.isArray(body.data.items) && !emptySuccess)) {
      const status = response.status === 429 ? 429 : response.status === 403 ? 403 : 502;
      throw new FeishuProxyError('FEISHU_RECORDS_FAILED', '飞书记录读取失败', status, {
        upstreamCode: Number.isInteger(body.code) ? body.code : undefined,
        upstreamMessage: String(body.msg || body.error_msg || '').slice(0, 240),
        upstreamPath: '/bitable/v1/apps/{base}/tables/{tableId}/records'
      });
    }
    const items = Array.isArray(body.data.items) ? body.data.items : [];
    return {
      items,
      total: Number(body.data.total || items.length),
      hasMore: Boolean(body.data.has_more),
      nextPageToken: body.data.page_token || ''
    };
  }

  async function downloadMedia(fileToken) {
    requireCredentials();
    const normalized = String(fileToken || '');
    if (!/^[A-Za-z0-9_-]{1,256}$/.test(normalized)) {
      throw new FeishuProxyError('INVALID_FILE_TOKEN', '飞书文件标识非法', 400);
    }
    const token = await getTenantToken();
    const response = await fetchUpstream(`${API_ROOT}/drive/v1/medias/${encodeURIComponent(normalized)}/download`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/octet-stream' }
    }, '/drive/v1/medias/{fileToken}/download');
    if (!response.ok) {
      const status = response.status === 403 ? 403 : response.status === 404 ? 404 : response.status === 429 ? 429 : 502;
      throw new FeishuProxyError('FEISHU_MEDIA_DOWNLOAD_FAILED', '飞书文件下载失败', status);
    }
    return response;
  }

  async function contactList(pathname, query = {}) {
    requireCredentials();
    const pageSize = query.pageSize == null ? 50 : Number(query.pageSize);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
      throw new FeishuProxyError('INVALID_CONTACT_PAGE_SIZE', '通讯录页容量必须是 1 至 50 的整数', 400);
    }
    const token = await getTenantToken();
    const url = new URL(`${API_ROOT}${pathname}`);
    url.searchParams.set('page_size', String(pageSize));
    url.searchParams.set('user_id_type', query.userIdType || 'user_id');
    url.searchParams.set('department_id_type', query.departmentIdType || 'open_department_id');
    if (query.pageToken) url.searchParams.set('page_token', String(query.pageToken));
    const response = await fetchUpstream(url, {
      method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    }, '/contact/v3/departments/{departmentId}/children');
    const body = await safeJson(response);
    if (!response.ok || body.code !== 0 || (body.data?.items != null && !Array.isArray(body.data.items))) {
      const status = response.status === 429 ? 429 : response.status === 403 ? 403 : 502;
      throw new FeishuProxyError('FEISHU_CONTACT_FAILED', '飞书通讯录读取失败', status, {
        upstreamCode: Number.isInteger(body.code) ? body.code : undefined
      });
    }
    return {
      items: body.data?.items || [],
      hasMore: Boolean(body.data?.has_more),
      nextPageToken: body.data?.page_token || ''
    };
  }

  async function listDepartmentChildren(departmentId = '0', query = {}) {
    const normalized = String(departmentId || '');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_\-@.]{0,63}$/.test(normalized)) {
      throw new FeishuProxyError('INVALID_DEPARTMENT_ID', '飞书部门标识非法', 400);
    }
    return contactList(`/contact/v3/departments/${encodeURIComponent(normalized)}/children`, query);
  }

  const listUsersByDepartmentWithId = async (departmentId = '0', query = {}) => {
    requireCredentials();
    const normalized = String(departmentId || '');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_\-@.]{0,63}$/.test(normalized)) {
      throw new FeishuProxyError('INVALID_DEPARTMENT_ID', '飞书部门标识非法', 400);
    }
    const pageSize = query.pageSize == null ? 50 : Number(query.pageSize);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
      throw new FeishuProxyError('INVALID_CONTACT_PAGE_SIZE', '通讯录页容量必须是 1 至 50 的整数', 400);
    }
    const token = await getTenantToken();
    const url = new URL(`${API_ROOT}/contact/v3/users/find_by_department`);
    url.searchParams.set('department_id', normalized);
    url.searchParams.set('page_size', String(pageSize));
    url.searchParams.set('user_id_type', query.userIdType || 'user_id');
    url.searchParams.set('department_id_type', query.departmentIdType || 'open_department_id');
    if (query.pageToken) url.searchParams.set('page_token', String(query.pageToken));
    const response = await fetchUpstream(url, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }, '/contact/v3/users/find_by_department');
    const body = await safeJson(response);
    if (!response.ok || body.code !== 0 || (body.data?.items != null && !Array.isArray(body.data.items))) {
      const status = response.status === 429 ? 429 : response.status === 403 ? 403 : 502;
      throw new FeishuProxyError('FEISHU_CONTACT_FAILED', '飞书通讯录读取失败', status, { upstreamCode: Number.isInteger(body.code) ? body.code : undefined });
    }
    return { items: body.data?.items || [], hasMore: Boolean(body.data?.has_more), nextPageToken: body.data?.page_token || '' };
  };

  return Object.freeze({
    credentialsReady, listRecords, downloadMedia, listDepartmentChildren,
    listUsersByDepartment: listUsersByDepartmentWithId,
    createApprovalDefinition, createApprovalInstance, getApprovalInstance, approveApprovalTask
  });
}
