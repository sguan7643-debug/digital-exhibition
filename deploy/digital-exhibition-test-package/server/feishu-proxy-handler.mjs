import { FeishuProxyError } from './feishu-open-api-client.mjs';

const ROUTE_PATTERN = /^\/api\/v1\/operations\/([A-Z]+-[0-9]{3})$/;

function errorResult(error, traceId) {
  const controlled = error instanceof FeishuProxyError;
  const retryAfterSeconds = controlled && Number.isInteger(error.retryAfterSeconds)
    ? Math.min(86400, Math.max(1, error.retryAfterSeconds))
    : undefined;
  return {
    status: controlled ? error.status : 500,
    body: {
      code: controlled ? error.code : 'INTERNAL_PROXY_ERROR',
      message: controlled ? error.message : '安全代理处理失败',
      traceId,
      ...(retryAfterSeconds ? { retryAfterSeconds } : {})
    }
  };
}

export function createFeishuOperationDispatcher(options = {}) {
  const service = options.service;
  if (!service?.execute) throw new Error('接口分发器缺少只读服务');
  const traceIdFactory = options.traceIdFactory || (() => `trace-${globalThis.crypto?.randomUUID?.() || Date.now()}`);
  const resolveRequestContext = options.resolveRequestContext || (() => ({}));

  return async function dispatch(request = {}) {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    const match = ROUTE_PATTERN.exec(pathname);
    if (!match) return null;
    const traceId = traceIdFactory();
    if (request.method !== 'POST') {
      return { status: 405, body: { code: 'METHOD_NOT_ALLOWED', message: '该接口仅接受 POST', traceId } };
    }
    const contentType = String(request.headers?.['content-type'] || request.headers?.get?.('content-type') || '').toLowerCase();
    if (!contentType.startsWith('application/json')) {
      return { status: 415, body: { code: 'UNSUPPORTED_MEDIA_TYPE', message: '请求必须使用 application/json', traceId } };
    }
    const operationId = match[1];
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { status: 400, body: { code: 'INVALID_REQUEST_BODY', message: '请求体必须是 JSON 对象', traceId } };
    }
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
      const requestContext = await resolveRequestContext(request);
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
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (!ROUTE_PATTERN.test(pathname)) return next();
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
    const result = await dispatch({ method: request.method, url: request.url, headers: request.headers, body });
    response.statusCode = result.status;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify(result.body));
  };
}
