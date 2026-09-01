const sensitiveKeys = new Set([
  'app_secret','app_token','tenant_access_token','user_access_token','access_token',
  'table_id','view_id','tenant_key','authorization','cookie','secret','token'
]);

function assertSafePayload(value, path = 'payload') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (sensitiveKeys.has(key.toLowerCase())) throw new Error(`浏览器请求包含敏感字段：${path}.${key}`);
    assertSafePayload(child, `${path}.${key}`);
  }
}
function validateBaseUrl(baseUrl) {
  const value = String(baseUrl || '/api/v1').replace(/\/$/, '');
  if (!value.startsWith('/') || /(?:open\.feishu\.cn|open-apis|bitable\/v1|larkoffice)/i.test(value)) {
    throw new Error('浏览器只能访问同源安全代理');
  }
  return value;
}

export function normalizeIntegrationError(error = {}) {
  const status = Number(error.status || error.response?.status || 0);
  const code = String(error.code || error.name || '').toLowerCase();
  if (status === 403) return { state: 'permission-denied', retryable: false };
  if (status === 429) return { state: 'rate-limited', retryable: true };
  if (status === 409) return { state: 'conflict', retryable: false };
  if (/timeout/.test(code)) return { state: 'timeout', retryable: true };
  if (/schema/.test(code)) return { state: 'schema-drift', retryable: false };
  if (/partial.write/.test(code)) return { state: 'partial-write', retryable: false };
  if (/partial/.test(code)) return { state: 'partial', retryable: true };
  return { state: 'error', retryable: status >= 500 || status === 0 };
}

export class IntegrationRequestError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'IntegrationRequestError';
    Object.assign(this, details);
  }
}

export function createSafeProxyClient(options = {}) {
  const baseUrl = validateBaseUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('缺少安全代理请求实现');
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : null;
  const traceIdFactory = options.traceIdFactory || (() => globalThis.crypto?.randomUUID?.() || `trace-${Date.now()}`);

  function execute(operationId, payload = {}, requestOptions = {}) {
    if (!/^[A-Z]{3}-\d{3}$/.test(operationId)) throw new Error('无效的 operationId');
    assertSafePayload(payload);
    const traceId = traceIdFactory();
    return (async () => {
      const controller = new AbortController();
      const abortFromCaller = () => controller.abort(requestOptions.signal?.reason);
      requestOptions.signal?.addEventListener?.('abort', abortFromCaller, { once: true });
      let timer;
      if (timeoutMs) timer = setTimeout(() => controller.abort(new DOMException('请求超时', 'TimeoutError')), timeoutMs);
      try {
        const response = await fetchImpl(`${baseUrl}/operations/${operationId}`, {
          method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'X-Trace-Id': traceId },
          body: JSON.stringify({ operationId, input: payload })
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || (body.code && body.code !== 'OK')) {
          throw Object.assign(new Error(body.message || '安全代理请求失败'), { status: response.status, code: body.code, traceId });
        }
        return { ...body, traceId: body.traceId || traceId };
      } catch (error) {
        const normalized = controller.signal.aborted && !error?.status
          ? { state: 'timeout', retryable: true }
          : normalizeIntegrationError(error);
        throw new IntegrationRequestError(error?.message || '安全代理请求失败', { ...normalized, status: error?.status, traceId });
      } finally {
        if (timer) clearTimeout(timer);
        requestOptions.signal?.removeEventListener?.('abort', abortFromCaller);
      }
    })();
  }

  return Object.freeze({ execute });
}
