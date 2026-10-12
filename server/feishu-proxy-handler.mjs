import { FeishuProxyError } from './feishu-open-api-client.mjs';
import { getOperation } from '../src/integration/operation-registry.js';

const ROUTE_PATTERN = /^\/api\/v1\/operations\/([A-Z]+-[0-9]{3})$/;
const BATCH_ROUTE = '/api/v1/operations/batch';
const SYNC_ROUTE = /^\/api\/v1\/operations\/sync-jobs\/([A-Za-z0-9-]{8,160})$/;

function errorResult(error, traceId) {
  const controlled = error instanceof FeishuProxyError;
  const status = controlled ? error.status : 500;
  const retryAfterSeconds = controlled && Number.isInteger(error.retryAfterSeconds)
    ? Math.min(86400, Math.max(1, error.retryAfterSeconds))
    : undefined;
  return {
    status,
    body: {
      code: controlled ? error.code : 'INTERNAL_PROXY_ERROR',
      message: controlled ? error.message : '安全代理处理失败',
      traceId: controlled && error.traceId ? error.traceId : traceId,
      ...(status === 202 ? {} : {
        retryable: typeof error?.retryable === 'boolean'
          ? error.retryable
          : [429, 502, 503, 504].includes(status)
      }),
      ...(retryAfterSeconds && status !== 202 ? { retryAfterSeconds } : {}),
      ...(controlled && error.syncId ? {
        syncId: error.syncId,
        operationId: error.operationId,
        state: error.state || 'running',
        pollAfterMs: error.pollAfterMs || 2000
      } : {}),
      ...(controlled && error.writeCommitted === true ? { writeCommitted: true, retryable: false } : {})
    }
  };
}

export function createFeishuOperationDispatcher(options = {}) {
  const service = options.service;
  if (!service?.execute) throw new Error('接口分发器缺少只读服务');
  const traceIdFactory = options.traceIdFactory || (() => `trace-${globalThis.crypto?.randomUUID?.() || Date.now()}`);
  const resolveRequestContext = options.resolveRequestContext || (() => ({}));

  return async function dispatch(request = {}) {
    const requestReceivedAtMs = Number.isFinite(Number(request.requestReceivedAtMs))
      ? Number(request.requestReceivedAtMs)
      : Date.now();
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    const match = ROUTE_PATTERN.exec(pathname);
    const isBatch = pathname === BATCH_ROUTE;
    const syncMatch = SYNC_ROUTE.exec(pathname);
    if (syncMatch) {
      if (request.method !== 'GET') return { status: 405, body: { code: 'METHOD_NOT_ALLOWED', message: '同步状态仅接受 GET' } };
      try {
        const context = await resolveRequestContext(request);
        return { status: 200, body: await service.getReadSyncStatus(syncMatch[1], context || {}) };
      } catch (error) { return errorResult(error, traceIdFactory()); }
    }
    if (!match && !isBatch) return null;
    const traceId = traceIdFactory();
    if (request.method !== 'POST') {
      return { status: 405, body: { code: 'METHOD_NOT_ALLOWED', message: '该接口仅接受 POST', traceId } };
    }
    const contentType = String(request.headers?.['content-type'] || request.headers?.get?.('content-type') || '').toLowerCase();
    if (!contentType.startsWith('application/json')) {
      return { status: 415, body: { code: 'UNSUPPORTED_MEDIA_TYPE', message: '请求必须使用 application/json', traceId } };
    }
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { status: 400, body: { code: 'INVALID_REQUEST_BODY', message: '请求体必须是 JSON 对象', traceId } };
    }
    if (isBatch) {
      if (Object.keys(body).some(key => key !== 'requests') || !Array.isArray(body.requests)) {
        return { status: 400, body: { code: 'INVALID_BATCH_REQUEST', message: '批量请求必须包含 requests 数组', traceId } };
      }
      if (body.requests.length < 1 || body.requests.length > 16) {
        return { status: 400, body: { code: 'INVALID_BATCH_SIZE', message: '批量请求数量必须为 1 至 16', traceId } };
      }
      const invalid = body.requests.find(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return true;
        if (Object.keys(item).some(key => !['operationId', 'input'].includes(key))) return true;
        if (typeof item.operationId !== 'string' || !getOperation(item.operationId)?.readOnly) return true;
        return item.input != null && (typeof item.input !== 'object' || Array.isArray(item.input));
      });
      if (invalid) {
        return { status: 400, body: { code: 'INVALID_BATCH_ITEM', message: '批量请求仅允许已登记的只读 operation', traceId } };
      }
      const requestContext = {
        ...(await resolveRequestContext(request)),
        freshRead: request.headers?.['x-read-consistency'] === 'fresh',
        requestReceivedAtMs
      };
      const results = await Promise.all(body.requests.map(async item => {
        const itemTraceId = traceIdFactory();
        try {
          const value = await service.execute(item.operationId, item.input || {}, requestContext || {});
          return { operationId: item.operationId, status: 200, body: value };
        } catch (error) {
          const failure = errorResult(error, itemTraceId);
          return { operationId: item.operationId, status: failure.status, body: failure.body };
        }
      }));
      return { status: 200, body: { code: 'OK', results, traceId } };
    }
    const operationId = match[1];
    if (body.operationId !== operationId) {
      return { status: 400, body: { code: 'OPERATION_MISMATCH', message: '路径与请求体 operationId 不一致', traceId } };
    }
    if (Object.keys(body).some(key => !['operationId', 'input'].includes(key))) {
      return { status: 400, body: { code: 'INVALID_REQUEST_BODY', message: '请求体包含未允许字段', traceId } };
    }
    if (body.input != null && (typeof body.input !== 'object' || Array.isArray(body.input))) {
      return { status: 400, body: { code: 'INVALID_OPERATION_INPUT', message: 'input 必须是对象', traceId } };
    }
    try {
      const requestContext = {
        ...(await resolveRequestContext(request)),
        freshRead: request.headers?.['x-read-consistency'] === 'fresh',
        requestReceivedAtMs
      };
      const response = await service.execute(operationId, body.input || {}, requestContext || {});
      return { status: 200, body: response };
    } catch (error) {
      return errorResult(error, traceId);
    }
  };
}

function readJsonBody(request, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new FeishuProxyError('REQUEST_TOO_LARGE', '请求体过大', 413));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new FeishuProxyError('INVALID_JSON', '请求体不是有效 JSON', 400));
      }
    });
    request.on('error', reject);
  });
}

export function createFeishuNodeMiddleware(options = {}) {
  const dispatch = createFeishuOperationDispatcher(options);
  const traceIdFactory = options.traceIdFactory || (() => `trace-${globalThis.crypto?.randomUUID?.() || Date.now()}`);
  return async function feishuProxyMiddleware(request, response, next) {
    const requestReceivedAtMs = Date.now();
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (!ROUTE_PATTERN.test(pathname) && pathname !== BATCH_ROUTE && !SYNC_ROUTE.test(pathname)) return next();
    let body;
    try {
      body = request.method === 'POST' ? await readJsonBody(request) : {};
    } catch (error) {
      const result = errorResult(error, traceIdFactory());
      response.statusCode = result.status;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify(result.body));
      return;
    }
    const result = await dispatch({ method: request.method, url: request.url, headers: request.headers, body, requestReceivedAtMs });
    response.statusCode = result.status;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    if (result.status === 202 && Number.isInteger(result.body?.pollAfterMs)) {
      response.setHeader('Retry-After', String(Math.max(1, Math.ceil(result.body.pollAfterMs / 1000))));
    }
    response.end(JSON.stringify(result.body));
  };
}
