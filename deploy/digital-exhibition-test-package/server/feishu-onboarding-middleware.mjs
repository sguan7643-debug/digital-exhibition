import { FeishuProxyError } from './feishu-open-api-client.mjs';
import { isSameOriginRequest } from './same-origin-request.mjs';

const ROOT = '/api/v1/onboarding/';
const MAX_BODY_BYTES = 30 * 1024 * 1024;
const JSON_HEADERS = Object.freeze({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
const APPLICATION_ROUTE = /^\/api\/v1\/onboarding\/applications\/(TEST_[A-Za-z0-9_-]{1,256})(\/sync)?$/;
const ATTEMPT_ROUTE = /^\/api\/v1\/onboarding\/attempts\/(TEST_ATTEMPT_[A-Za-z0-9_-]{1,180})\/confirm$/;
const UPLOAD_ROUTE = /^\/api\/v1\/onboarding\/uploads\/(TEST_[A-Za-z0-9_-]{1,256})$/;
const GRANT_ROUTE = /^\/api\/v1\/onboarding\/applications\/(TEST_[A-Za-z0-9_-]{1,256})\/files\/(TEST_[A-Za-z0-9_-]{1,256})\/grant$/;

function failure(error) {
  const controlled = error instanceof FeishuProxyError;
  return { status: controlled ? error.status : 500, headers: JSON_HEADERS, body: { code: controlled ? error.code : 'INTERNAL_ONBOARDING_ERROR', message: controlled ? error.message : '上线申请服务暂不可用' } };
}

function reportUnexpectedError(error) {
  if (error instanceof FeishuProxyError) return;
  console.error('[onboarding] unexpected failure', {
    name: String(error?.name || 'Error'),
    code: String(error?.code || ''),
    message: String(error?.message || 'unknown error'),
    causeCode: String(error?.cause?.code || ''),
    causeMessage: String(error?.cause?.message || '')
  });
}

function methodError() {
  return { status: 405, headers: JSON_HEADERS, body: { code: 'METHOD_NOT_ALLOWED', message: '上线申请接口请求方法不允许' } };
}

function assertSessionApplicant(body, session) {
  const identity = session?.identity || {};
  const subject = String(identity.userId || identity.openId || identity.subject || '').trim();
  const applicant = String(body?.application?.applicant || '').trim();
  if (applicant && applicant !== subject) throw new FeishuProxyError('ONBOARDING_APPLICANT_MISMATCH', '申请人必须与当前登录用户一致', 403);
}

export function createFeishuOnboardingDispatcher({ service, resolveUserSession } = {}) {
  if (!service?.submit || !service?.list || !service?.get || !service?.sync || !service?.grantFileAccess || !service?.uploadFile || !service?.removeUploadedFile || !service?.confirmAttempt) throw new Error('上线申请分发器缺少服务');
  if (typeof resolveUserSession !== 'function') throw new Error('上线申请分发器缺少会话解析器');
  return async function dispatch(request = {}) {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (!pathname.startsWith(ROOT)) return null;
    if (!isSameOriginRequest(request.headers, request.method)) return failure(new FeishuProxyError('CROSS_ORIGIN_REQUEST_BLOCKED', '已阻止跨源上线申请请求', 403));
    if (Number(request.bodyBytes || 0) > MAX_BODY_BYTES) return failure(new FeishuProxyError('REQUEST_TOO_LARGE', '单次上传请求不能超过 30MB', 413));
    if (['POST', 'DELETE'].includes(request.method) && request.method === 'POST') {
      const contentType = String(request.headers?.['content-type'] || request.headers?.['Content-Type'] || '');
      if (!contentType.toLowerCase().startsWith('application/json')) return failure(new FeishuProxyError('UNSUPPORTED_MEDIA_TYPE', '请求必须使用 application/json', 415));
    }
    const session = resolveUserSession(request);
    if (!session) return failure(new FeishuProxyError('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401));
    try {
      if (pathname === `${ROOT}uploads`) {
        if (request.method !== 'POST') return methodError();
        return { status: 201, headers: JSON_HEADERS, body: await service.uploadFile(request.body || {}, session) };
      }
      const upload = UPLOAD_ROUTE.exec(pathname);
      if (upload) {
        if (request.method !== 'DELETE') return methodError();
        return { status: 200, headers: JSON_HEADERS, body: await service.removeUploadedFile(upload[1], session) };
      }
      if (pathname === `${ROOT}applications`) {
        if (request.method === 'GET') return { status: 200, headers: JSON_HEADERS, body: await service.list(session) };
        if (request.method === 'POST') {
          assertSessionApplicant(request.body, session);
          return { status: 201, headers: JSON_HEADERS, body: await service.submit(request.body || {}, session) };
        }
        return methodError();
      }
      const attempt = ATTEMPT_ROUTE.exec(pathname);
      if (attempt) {
        if (request.method !== 'POST') return methodError();
        return { status: 200, headers: JSON_HEADERS, body: await service.confirmAttempt(attempt[1], session) };
      }
      const grant = GRANT_ROUTE.exec(pathname);
      if (grant) {
        if (request.method !== 'POST') return methodError();
        return { status: 200, headers: JSON_HEADERS, body: await service.grantFileAccess(grant[1], grant[2], request.body?.mode, session) };
      }
      const application = APPLICATION_ROUTE.exec(pathname);
      if (application) {
        if (application[2]) {
          if (request.method !== 'POST') return methodError();
          return { status: 200, headers: JSON_HEADERS, body: await service.sync(application[1], session) };
        }
        if (request.method !== 'GET') return methodError();
        return { status: 200, headers: JSON_HEADERS, body: await service.get(application[1], session) };
      }
      return { status: 404, headers: JSON_HEADERS, body: { code: 'ONBOARDING_ROUTE_NOT_FOUND', message: '上线申请接口不存在' } };
    } catch (error) {
      reportUnexpectedError(error);
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
        reject(new FeishuProxyError('REQUEST_TOO_LARGE', '单次上传请求不能超过 30MB', 413));
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

export function createFeishuOnboardingNodeMiddleware(options = {}) {
  const dispatch = createFeishuOnboardingDispatcher(options);
  return async function onboardingMiddleware(request, response, next) {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (!pathname.startsWith(ROOT)) return next();
    try {
      const parsed = request.method === 'POST' ? await readJsonBody(request) : { body: {}, bodyBytes: 0 };
      const result = await dispatch({ method: request.method, url: request.url, headers: request.headers, ...parsed });
      response.statusCode = result.status;
      for (const [name, value] of Object.entries(result.headers || {})) response.setHeader(name, value);
      response.end(JSON.stringify(result.body));
    } catch (error) {
      reportUnexpectedError(error);
      const result = failure(error);
      response.statusCode = result.status;
      for (const [name, value] of Object.entries(result.headers)) response.setHeader(name, value);
      response.end(JSON.stringify(result.body));
    }
  };
}
