const API_ROOT = 'https://open.feishu.cn/open-apis';
const PAGE_SIZES = new Set([10, 20, 50, 100]);

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

function normalizePageSize(value) {
  const pageSize = value == null ? 10 : Number(value);
  if (!PAGE_SIZES.has(pageSize)) throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量仅支持 10、20、50、100', 400);
  return pageSize;
}

export function createFeishuOpenApiClient(options = {}) {
  const appId = options.appId ?? process.env.FEISHU_APP_ID ?? '';
  const appSecret = options.appSecret ?? process.env.FEISHU_APP_SECRET ?? '';
  const baseToken = options.baseToken ?? process.env.FEISHU_BASE_TOKEN ?? '';
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const credentialsReady = Boolean(appId && appSecret && baseToken);
  let cachedTenantToken = '';
  let tokenExpiresAt = 0;

  if (typeof fetchImpl !== 'function') throw new Error('缺少服务端 fetch 实现');

  function requireCredentials() {
    if (!credentialsReady) {
      throw new FeishuProxyError('SERVICE_CREDENTIALS_MISSING', '飞书服务端凭据尚未配置', 503);
    }
  }

  async function getTenantToken() {
    requireCredentials();
    if (cachedTenantToken && now() < tokenExpiresAt) return cachedTenantToken;
    const response = await fetchImpl(`${API_ROOT}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    const body = await safeJson(response);
    if (!response.ok || body.code !== 0 || !body.tenant_access_token) {
      throw new FeishuProxyError('TENANT_TOKEN_FAILED', '飞书租户访问令牌获取失败', response.status || 502);
    }
    cachedTenantToken = body.tenant_access_token;
    const validSeconds = Math.max(60, Number(body.expire || 7200) - 300);
    tokenExpiresAt = now() + validSeconds * 1000;
    return cachedTenantToken;
  }

  async function approvalRequest(pathname, { method = 'GET', body, accessToken } = {}) {
    requireCredentials();
    const token = accessToken || await getTenantToken();
    const response = await fetchImpl(`${API_ROOT}${pathname}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body == null ? {} : { 'Content-Type': 'application/json' })
      },
      body: body == null ? undefined : JSON.stringify(body)
    });
    const result = await safeJson(response);
    if (!response.ok || result.code !== 0 || !result.data || typeof result.data !== 'object') {
      const status = response.status === 401 ? 401 : response.status === 403 ? 403 : response.status === 429 ? 429 : 502;
      throw new FeishuProxyError('FEISHU_APPROVAL_FAILED', '飞书审批服务暂不可用', status, {
        upstreamCode: Number.isInteger(result.code) ? result.code : undefined
      });
    }
    return result.data;
  }

  async function createApprovalDefinition(input, options = {}) {
    const approverUserId = String(input?.approverUserId || '');
    if (!approverUserId) throw new FeishuProxyError('APPROVER_REQUIRED', '测试审批人不能为空', 400);
    const data = await approvalRequest('/approval/v4/approvals', {
      method: 'POST', accessToken: options.accessToken,
      body: {
        approval_name: input.approvalName,
        approval_status: 'ACTIVE',
        description: input.description,
        viewers: [{ viewer_type: 'TENANT' }],
        form: { form_content: JSON.stringify([
          { id: 'application_name', name: '应用名称', type: 'input', required: true },
          { id: 'application_code', name: '应用编码', type: 'input', required: true },
          { id: 'application_description', name: '申请说明', type: 'textarea', required: true }
        ]) },
        node_list: [
          { id: 'START', name: '发起', node_type: 'START' },
          { id: 'TEST_APPROVAL_NODE', name: '测试审批', node_type: 'APPROVAL', approver: [{ type: 'USER', user_id: approverUserId }] },
          { id: 'END', name: '结束', node_type: 'END' }
        ]
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
    const data = await approvalRequest(`/approval/v4/instances/${encodeURIComponent(normalized)}`, { accessToken: options.accessToken });
    return {
      instanceCode: String(data.instance_code || normalized),
      approvalCode: String(data.approval_code || ''),
      status: String(data.status || ''),
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
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
    const body = await safeJson(response);
    const emptySuccess = body.code === 0 && body.data && body.data.items == null && Number(body.data.total || 0) === 0;
    if (!response.ok || body.code !== 0 || !body.data || (!Array.isArray(body.data.items) && !emptySuccess)) {
      const status = response.status === 429 ? 429 : response.status === 403 ? 403 : 502;
      throw new FeishuProxyError('FEISHU_RECORDS_FAILED', '飞书记录读取失败', status);
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
    const response = await fetchImpl(`${API_ROOT}/drive/v1/medias/${encodeURIComponent(normalized)}/download`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/octet-stream' }
    });
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
    const response = await fetchImpl(url, {
      method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
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
    const response = await fetchImpl(url, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
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
