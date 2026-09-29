import { FeishuProxyError } from './feishu-open-api-client.mjs';

const AGGREGATE_PATH = '/api/v1/homepage';
const SYNC_PATH = /^\/api\/v1\/sync-jobs\/([A-Za-z0-9-]{8,160})$/;
const LIVE_PATH = '/api/v1/health/live';
const READY_PATH = '/api/v1/health/ready';

function readJsonBody(request, maxBytes = 16 * 1024) {
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

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  if (status === 202 && Number.isInteger(body?.pollAfterMs)) {
    response.setHeader('Retry-After', String(Math.max(1, Math.ceil(body.pollAfterMs / 1000))));
  }
  response.end(JSON.stringify(body));
}

function errorBody(error, traceId) {
  const controlled = error instanceof FeishuProxyError;
  return {
    status: controlled ? error.status : 500,
    body: {
      code: controlled ? error.code : 'HOMEPAGE_AGGREGATE_ERROR',
      message: controlled ? error.message : '首页数据服务暂不可用',
      traceId: error?.traceId || traceId
    }
  };
}

export function createHomepageAggregateNodeMiddleware(options = {}) {
  const service = options.service;
  if (!service?.readHomepage || !service?.getSyncStatus) throw new Error('缺少首页聚合服务');
  const resolveRequestContext = options.resolveRequestContext || (() => ({}));
  const traceIdFactory = options.traceIdFactory || (() => `trace-${globalThis.crypto?.randomUUID?.() || Date.now()}`);

  return async function homepageAggregateMiddleware(request, response, next) {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    const syncMatch = SYNC_PATH.exec(pathname);
    const matched = pathname === AGGREGATE_PATH || pathname === LIVE_PATH || pathname === READY_PATH || syncMatch;
    if (!matched) return next();
    const traceId = traceIdFactory();
    try {
      if (pathname === LIVE_PATH) {
        if (request.method !== 'GET') return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: '该接口仅接受 GET', traceId });
        return sendJson(response, 200, { code: 'OK', state: 'live', traceId });
      }
      if (pathname === READY_PATH) {
        if (request.method !== 'GET') return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: '该接口仅接受 GET', traceId });
        const readiness = service.getReadiness();
        return sendJson(response, readiness.ready ? 200 : 503, { code: readiness.ready ? 'OK' : 'NOT_READY', ...readiness, traceId });
      }
      const requestContext = await resolveRequestContext(request);
      if (syncMatch) {
        if (request.method !== 'GET') return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: '该接口仅接受 GET', traceId });
        return sendJson(response, 200, service.getSyncStatus(syncMatch[1], requestContext || {}));
      }
      if (request.method !== 'POST') return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: '该接口仅接受 POST', traceId });
      const contentType = String(request.headers?.['content-type'] || '').toLowerCase();
      if (!contentType.startsWith('application/json')) {
        return sendJson(response, 415, { code: 'UNSUPPORTED_MEDIA_TYPE', message: '请求必须使用 application/json', traceId });
      }
      const body = await readJsonBody(request);
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'forceRefresh')) {
        return sendJson(response, 400, { code: 'INVALID_REQUEST_BODY', message: '首页聚合请求体包含未允许字段', traceId });
      }
      if (body.forceRefresh != null && typeof body.forceRefresh !== 'boolean') {
        return sendJson(response, 400, { code: 'INVALID_REQUEST_BODY', message: 'forceRefresh 必须为布尔值', traceId });
      }
      const result = await service.readHomepage(requestContext || {}, { forceRefresh: body.forceRefresh === true });
      return sendJson(response, result.status, result.body);
    } catch (error) {
      const result = errorBody(error, traceId);
      return sendJson(response, result.status, result.body);
    }
  };
}
