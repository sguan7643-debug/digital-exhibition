import { FeishuProxyError } from './feishu-open-api-client.mjs';

const ROOT = '/api/v1/approvals/';
const INSTANCE_ROUTE = /^\/api\/v1\/approvals\/instances\/([A-Za-z0-9_-]{1,256})(\/approve)?$/;
const MAX_BODY_BYTES = 256 * 1024;
const JSON_HEADERS = Object.freeze({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });

function sameOrigin(headers = {}) {
  const origin = String(headers.origin || headers.Origin || '');
  const host = String(headers.host || headers.Host || '');
  try {
    const parsed = new URL(origin);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.host === host;
  } catch {
    return false;
  }
}

function failure(error) {
  const controlled = error instanceof FeishuProxyError;
  return {
    status: controlled ? error.status : 500,
    headers: JSON_HEADERS,
    body: { code: controlled ? error.code : 'INTERNAL_APPROVAL_ERROR', message: controlled ? error.message : '飞书审批暂不可用' }
  };
}

function methodError() {
  return { status: 405, headers: JSON_HEADERS, body: { code: 'METHOD_NOT_ALLOWED', message: '审批接口请求方法不允许' } };
}

export function createFeishuApprovalDispatcher({ service, resolveUserSession } = {}) {
  if (!service?.createInstance || !service?.getInstance || !service?.approveTestTask || !service?.ensureTestDefinition || !service?.handleEvent) {
    throw new Error('飞书审批分发器缺少服务');
  }
  if (typeof resolveUserSession !== 'function') throw new Error('飞书审批分发器缺少会话解析器');
  return async function dispatch(request = {}) {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (!pathname.startsWith(ROOT)) return null;
    if (!sameOrigin(request.headers)) return failure(new FeishuProxyError('CROSS_ORIGIN_REQUEST_BLOCKED', '已阻止跨源审批请求', 403));
    if (Number(request.bodyBytes || 0) > MAX_BODY_BYTES) return failure(new FeishuProxyError('REQUEST_TOO_LARGE', '请求体不能超过 256 KiB', 413));
    if (request.method === 'POST') {
      const contentType = String(request.headers?.['content-type'] || request.headers?.['Content-Type'] || '');
      if (!contentType.toLowerCase().startsWith('application/json')) return failure(new FeishuProxyError('UNSUPPORTED_MEDIA_TYPE', '请求必须使用 application/json', 415));
    }
    const session = resolveUserSession(request);
    if (!session) return failure(new FeishuProxyError('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401));
    try {
      if (pathname === `${ROOT}definitions/test`) {
        if (request.method !== 'POST') return methodError();
        return { status: 200, headers: JSON_HEADERS, body: await service.ensureTestDefinition(session) };
      }
      if (pathname === `${ROOT}instances`) {
        if (request.method !== 'POST') return methodError();
        return { status: 201, headers: JSON_HEADERS, body: await service.createInstance(request.body || {}, session) };
      }
      if (pathname === `${ROOT}events`) {
        if (request.method !== 'POST') return methodError();
        return { status: 200, headers: JSON_HEADERS, body: await service.handleEvent(request.body || {}) };
      }
      const match = INSTANCE_ROUTE.exec(pathname);
      if (!match) return { status: 404, headers: JSON_HEADERS, body: { code: 'APPROVAL_ROUTE_NOT_FOUND', message: '审批接口不存在' } };
      if (match[2]) {
        if (request.method !== 'POST') return methodError();
        return { status: 200, headers: JSON_HEADERS, body: await service.approveTestTask(match[1], session) };
      }
      if (request.method !== 'GET') return methodError();
      return { status: 200, headers: JSON_HEADERS, body: await service.getInstance(match[1], session) };
    } catch (error) {
      return failure(error);
    }
  };
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bodyBytes = 0;
    request.on('data', chunk => {
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_BODY_BYTES) {
        reject(new FeishuProxyError('REQUEST_TOO_LARGE', '请求体不能超过 256 KiB', 413));
        request.destroy();
      } else chunks.push(chunk);
    });
    request.on('end', () => {
      try { resolve({ body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}, bodyBytes }); }
      catch { reject(new FeishuProxyError('INVALID_JSON', '请求体不是有效 JSON', 400)); }
    });
    request.on('error', reject);
  });
}

export function createFeishuApprovalNodeMiddleware(options = {}) {
  const dispatch = createFeishuApprovalDispatcher(options);
  return async function approvalMiddleware(request, response, next) {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (!pathname.startsWith(ROOT)) return next();
    try {
      const parsed = request.method === 'POST' ? await readJsonBody(request) : { body: {}, bodyBytes: 0 };
      const result = await dispatch({ method: request.method, url: request.url, headers: request.headers, ...parsed });
      response.statusCode = result.status;
      for (const [name, value] of Object.entries(result.headers || {})) response.setHeader(name, value);
      response.end(JSON.stringify(result.body));
    } catch (error) {
      const result = failure(error);
      response.statusCode = result.status;
      for (const [name, value] of Object.entries(result.headers)) response.setHeader(name, value);
      response.end(JSON.stringify(result.body));
    }
  };
}
