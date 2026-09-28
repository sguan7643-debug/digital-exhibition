import { beginRequest, endRequest } from './request-status.js';
import { IntegrationRequestError, normalizeIntegrationError } from './safe-proxy-client.js';
import { validateSameOriginProxyBase } from './runtime-config.js';

function requireObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value;
}

function validateAggregate(body, status) {
  requireObject(body, '首页聚合响应必须为对象');
  if (status === 202) {
    if (body.code !== 'HOMEPAGE_SYNCING' || typeof body.syncId !== 'string' || !body.syncId) {
      throw new Error('首页同步响应合同无效');
    }
    return body;
  }
  if (body.code !== 'OK' || !['fresh', 'stale', 'partial'].includes(body.aggregateState)) {
    throw new Error('首页聚合成功响应合同无效');
  }
  requireObject(body.data, '首页聚合数据必须为对象');
  requireObject(body.sections, '首页聚合分区状态必须为对象');
  return body;
}

function validateStatus(body) {
  requireObject(body, '同步状态响应必须为对象');
  if (body.code !== 'OK' || !['queued', 'running', 'completed', 'failed', 'expired'].includes(body.state)) {
    throw new Error('同步状态响应合同无效');
  }
  return body;
}

export function createHomepageAggregateClient(options = {}) {
  const origin = options.origin || globalThis.location?.origin || 'http://localhost';
  const baseUrl = validateSameOriginProxyBase(options.baseUrl, origin);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('缺少首页聚合请求实现');
  const configuredTimeout = Number(options.timeoutMs);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 29_500;

  async function request(pathname, init, { signal, tracked = false } = {}) {
    const controller = new AbortController();
    let callerCancelled = false;
    let timedOut = false;
    const abortFromCaller = () => {
      callerCancelled = true;
      controller.abort(signal?.reason || new DOMException('请求已取消', 'AbortError'));
    };
    if (signal?.aborted) abortFromCaller();
    else signal?.addEventListener?.('abort', abortFromCaller, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new DOMException('请求超时', 'TimeoutError'));
    }, timeoutMs);
    const requestToken = tracked ? beginRequest('正在同步首页数据') : null;
    try {
      const response = await fetchImpl(pathname, {
        ...init,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(init?.headers || {}) }
      });
      let body;
      try {
        body = await response.json();
      } catch {
        throw new IntegrationRequestError('首页数据响应不是有效 JSON', {
          state: 'schema-drift', retryable: false, status: response.status
        });
      }
      if (!response.ok && response.status !== 202) {
        const normalized = normalizeIntegrationError({ status: response.status, code: body?.code });
        throw new IntegrationRequestError(body?.message || '首页数据请求失败', {
          ...normalized,
          status: response.status,
          traceId: body?.traceId || null,
          code: body?.code || 'HOMEPAGE_REQUEST_FAILED'
        });
      }
      return { status: response.status, body };
    } catch (error) {
      if (error instanceof IntegrationRequestError) throw error;
      if (callerCancelled) throw new IntegrationRequestError('请求已由调用方取消', { state: 'cancelled', retryable: false, cause: error });
      if (timedOut) throw new IntegrationRequestError('首页数据请求超时', { state: 'timeout', retryable: true, cause: error });
      throw new IntegrationRequestError('首页数据请求失败', { state: 'error', retryable: true, cause: error });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener?.('abort', abortFromCaller);
      if (requestToken) endRequest(requestToken);
    }
  }

  async function load({ forceRefresh = false, signal } = {}) {
    const result = await request(`${baseUrl}/homepage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forceRefresh ? { forceRefresh: true } : {})
    }, { signal, tracked: true });
    return { status: result.status, body: validateAggregate(result.body, result.status) };
  }

  async function status(syncId, { signal } = {}) {
    const normalized = String(syncId || '').trim();
    if (!/^[A-Za-z0-9-]{8,160}$/.test(normalized)) throw new Error('同步任务标识无效');
    const result = await request(`${baseUrl}/sync-jobs/${encodeURIComponent(normalized)}`, { method: 'GET' }, { signal });
    return validateStatus(result.body);
  }

  return Object.freeze({ load, status });
}
