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
  const recordWriteEnabled = options.recordWriteEnabled ?? process.env.FEISHU_TEST_WRITE_ENABLED === '1';
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

  async function call(pathname, { method = 'GET', body, writeGate = '' } = {}) {
    requireCredentials();
    if (writeGate === 'schema' && !schemaWriteEnabled) throw new FeishuProxyError('SCHEMA_WRITE_DISABLED', '表结构写入门禁未开启', 403);
    if (writeGate === 'record' && !recordWriteEnabled) throw new FeishuProxyError('TEST_RECORD_WRITE_DISABLED', '测试记录写入门禁未开启', 403);
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

  async function callMultipart(pathname, form, { writeGate = '' } = {}) {
    requireCredentials();
    if (writeGate === 'record' && !recordWriteEnabled) throw new FeishuProxyError('TEST_RECORD_WRITE_DISABLED', '测试记录写入门禁未开启', 403);
    const token = await tenantToken();
    const response = await fetchImpl(`${API_ROOT}${pathname}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      body: form
    });
    const payload = await readJson(response);
    if (!response.ok || payload.code !== 0) {
      throw new FeishuProxyError('FEISHU_MEDIA_UPLOAD_FAILED', '飞书测试附件上传失败', response.status === 403 ? 403 : 502, {
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

  async function listViews(tableId) {
    const items = [];
    let pageToken = '';
    do {
      const query = new URLSearchParams({ page_size: '100' });
      if (pageToken) query.set('page_token', pageToken);
      const data = await call(`/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables/${encodeURIComponent(tableId)}/views?${query}`);
      items.push(...(data.items || []));
      pageToken = data.has_more ? String(data.page_token || '') : '';
    } while (pageToken);
    return items;
  }

  async function createTable(schema) {
    const data = await call(`/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables`, {
      method: 'POST', writeGate: 'schema',
      body: { table: { name: schema.table_name, default_view_name: schema.default_view_name, fields: schema.fields.map(toFeishuFieldDefinition) } }
    });
    return { tableId: data.table_id, viewId: data.default_view_id || '', fieldIds: data.field_id_list || [] };
  }

  async function createField(tableId, field) {
    const data = await call(`/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables/${encodeURIComponent(tableId)}/fields`, {
      method: 'POST', writeGate: 'schema', body: toFeishuFieldDefinition(field)
    });
    return data.field || data;
  }

  async function searchRecords(tableId, fieldName, value, { pageSize = 100 } = {}) {
    const query = new URLSearchParams({ page_size: String(pageSize), automatic_fields: 'true' });
    const data = await call(`/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables/${encodeURIComponent(tableId)}/records/search?${query}`, {
      method: 'POST', body: {
        filter: { conjunction: 'and', conditions: [{ field_name: fieldName, operator: 'is', value: [value] }] }
      }
    });
    return { items: data.items || [], total: Number(data.total || data.items?.length || 0), hasMore: Boolean(data.has_more), pageToken: data.page_token || '' };
  }

  async function createRecord(tableId, fields) {
    const data = await call(`/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables/${encodeURIComponent(tableId)}/records`, {
      method: 'POST', writeGate: 'record', body: { fields }
    });
    return data.record || data;
  }

  async function updateRecord(tableId, recordId, fields) {
    const data = await call(`/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`, {
      method: 'PUT', writeGate: 'record', body: { fields }
    });
    return data.record || data;
  }

  async function deleteRecord(tableId, recordId) {
    return call(`/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`, {
      method: 'DELETE', writeGate: 'record'
    });
  }

  async function uploadMedia({ fileName, bytes, mimeType = 'application/octet-stream', parentType = 'bitable_file', parentNode = baseToken }) {
    const safeName = String(fileName || '').trim();
    if (!safeName.startsWith('TEST_')) throw new FeishuProxyError('TEST_PREFIX_REQUIRED', '测试附件文件名必须使用 TEST_ 前缀', 403);
    const content = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    if (content.byteLength < 1 || content.byteLength > 20 * 1024 * 1024) throw new FeishuProxyError('INVALID_TEST_FILE_SIZE', '测试附件大小必须在 1 字节到 20MB 之间', 422);
    if (!parentNode) throw new FeishuProxyError('PARENT_NODE_REQUIRED', '测试附件缺少父节点', 422);
    const form = new FormData();
    form.append('file_name', safeName);
    form.append('parent_type', parentType);
    form.append('parent_node', parentNode);
    form.append('size', String(content.byteLength));
    form.append('file', new Blob([content], { type: mimeType }), safeName);
    const data = await callMultipart('/drive/v1/medias/upload_all', form, { writeGate: 'record' });
    const fileToken = String(data.file_token || '');
    if (!fileToken) throw new FeishuProxyError('FEISHU_MEDIA_TOKEN_MISSING', '飞书未返回测试附件令牌', 502);
    return { fileToken };
  }

  return Object.freeze({
    schemaWriteEnabled, recordWriteEnabled, listTables, listFields, listViews, createTable, createField,
    searchRecords, createRecord, updateRecord, deleteRecord, uploadMedia
  });
}
