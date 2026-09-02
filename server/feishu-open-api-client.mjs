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

  return Object.freeze({ credentialsReady, listRecords, listDepartmentChildren, listUsersByDepartment: listUsersByDepartmentWithId });
}
