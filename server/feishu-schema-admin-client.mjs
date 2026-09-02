import { FeishuProxyError } from './feishu-open-api-client.mjs';

const API_ROOT = 'https://open.feishu.cn/open-apis';

async function readJson(response) {
  try { return await response.json(); } catch {
    throw new FeishuProxyError('UPSTREAM_INVALID_JSON', '飞书服务返回了无效数据', 502);
  }
}

export function toFeishuFieldDefinition(field) {
  const result = { field_name: field.field_name, type: field.type };
  if (field.ui_type) result.ui_type = field.ui_type;
  if (field.property && Object.keys(field.property).length) result.property = field.property;
  if (field.business_code) {
    result.description = { disable_sync: true, text: `business_code=${field.business_code}` };
  }
  return result;
}

export function createFeishuSchemaAdminClient(options = {}) {
  const appId = options.appId ?? process.env.FEISHU_APP_ID ?? '';
  const appSecret = options.appSecret ?? process.env.FEISHU_APP_SECRET ?? '';
  const baseToken = options.baseToken ?? process.env.FEISHU_BASE_TOKEN ?? '';
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const schemaWriteEnabled = options.schemaWriteEnabled ?? process.env.FEISHU_SCHEMA_WRITE_ENABLED === '1';
  let cachedToken = '';
  let tokenExpiresAt = 0;

  function requireCredentials() {
    if (!appId || !appSecret || !baseToken) throw new FeishuProxyError('SERVICE_CREDENTIALS_MISSING', '飞书服务端凭据尚未配置', 503);
  }

  async function tenantToken() {
    requireCredentials();
    if (cachedToken && now() < tokenExpiresAt) return cachedToken;
    const response = await fetchImpl(`${API_ROOT}/auth/v3/tenant_access_token/internal`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    const body = await readJson(response);
    if (!response.ok || body.code !== 0 || !body.tenant_access_token) {
      throw new FeishuProxyError('TENANT_TOKEN_FAILED', '飞书租户访问令牌获取失败', response.status || 502, { upstreamCode: body.code });
    }
    cachedToken = body.tenant_access_token;
    tokenExpiresAt = now() + Math.max(60, Number(body.expire || 7200) - 300) * 1000;
    return cachedToken;
  }

  async function call(pathname, { method = 'GET', body, write = false } = {}) {
    requireCredentials();
    if (write && !schemaWriteEnabled) throw new FeishuProxyError('SCHEMA_WRITE_DISABLED', '表结构写入门禁未开启', 403);
    const token = await tenantToken();
    const response = await fetchImpl(`${API_ROOT}${pathname}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const payload = await readJson(response);
    if (!response.ok || payload.code !== 0) {
      const status = response.status === 403 || payload.code === 1254302 ? 403 : response.status === 429 || payload.code === 1254290 ? 429 : 502;
      throw new FeishuProxyError('FEISHU_SCHEMA_FAILED', '飞书表结构操作失败', status, {
        upstreamCode: payload.code, upstreamMessage: String(payload.msg || '').slice(0, 200)
      });
    }
    return payload.data || {};
  }

  async function listTables() {
    const items = [];
    let pageToken = '';
    do {
      const query = new URLSearchParams({ page_size: '100' });
      if (pageToken) query.set('page_token', pageToken);
      const data = await call(`/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables?${query}`);
      items.push(...(data.items || []));
      pageToken = data.has_more ? String(data.page_token || '') : '';
    } while (pageToken);
    return items;
  }

  async function listFields(tableId) {
    const items = [];
    let pageToken = '';
    do {
      const query = new URLSearchParams({ page_size: '100' });
      if (pageToken) query.set('page_token', pageToken);
      const data = await call(`/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables/${encodeURIComponent(tableId)}/fields?${query}`);
      items.push(...(data.items || []));
      pageToken = data.has_more ? String(data.page_token || '') : '';
    } while (pageToken);
    return items;
  }

  async function createTable(schema) {
    const data = await call(`/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables`, {
      method: 'POST', write: true,
      body: { table: { name: schema.table_name, default_view_name: schema.default_view_name, fields: schema.fields.map(toFeishuFieldDefinition) } }
    });
    return { tableId: data.table_id, viewId: data.default_view_id || '', fieldIds: data.field_id_list || [] };
  }

  async function createField(tableId, field) {
    const data = await call(`/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables/${encodeURIComponent(tableId)}/fields`, {
      method: 'POST', write: true, body: toFeishuFieldDefinition(field)
    });
    return data.field || data;
  }

  return Object.freeze({ schemaWriteEnabled, listTables, listFields, createTable, createField });
}
