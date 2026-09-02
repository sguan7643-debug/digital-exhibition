import { FeishuProxyError } from './feishu-open-api-client.mjs';
import { FEISHU_AUTH_PATHS } from './feishu-user-auth-service.mjs';

const jsonHeaders = Object.freeze({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });

function errorResult(error) {
  const controlled = error instanceof FeishuProxyError;
  return {
    status: controlled ? error.status : 500,
    headers: jsonHeaders,
    body: {
      code: controlled ? error.code : 'INTERNAL_AUTH_ERROR',
      message: '飞书用户授权暂不可用'
    }
  };
}

export function createFeishuAuthDispatcher({ authService } = {}) {
  if (!authService?.beginAuthorization || !authService?.completeAuthorization) {
    throw new Error('飞书授权分发器缺少授权服务');
  }
  return async function dispatch(request = {}) {
    const url = new URL(request.url || '/', 'http://localhost');
    if (![FEISHU_AUTH_PATHS.start, FEISHU_AUTH_PATHS.callback].includes(url.pathname)) return null;
    if (request.method !== 'GET') {
      return { status: 405, headers: jsonHeaders, body: { code: 'METHOD_NOT_ALLOWED', message: '飞书授权入口仅接受 GET' } };
    }
    try {
      if (url.pathname === FEISHU_AUTH_PATHS.start) {
        const result = authService.beginAuthorization({ returnTo: url.searchParams.get('returnTo') || '/workbench' });
        return {
          status: 302,
          headers: { Location: result.authorizationUrl, 'Set-Cookie': [result.stateCookie], 'Cache-Control': 'no-store' },
          body: null
        };
      }
      const result = await authService.completeAuthorization({
        code: url.searchParams.get('code') || '',
        state: url.searchParams.get('state') || '',
        cookieHeader: String(request.headers?.cookie || request.headers?.Cookie || '')
      });
      return {
        status: 302,
        headers: { Location: result.redirectTo, 'Set-Cookie': [result.sessionCookie, result.clearStateCookie], 'Cache-Control': 'no-store' },
        body: null
      };
    } catch (error) {
      return errorResult(error);
    }
  };
}

export function createFeishuAuthNodeMiddleware(options = {}) {
  const dispatch = createFeishuAuthDispatcher(options);
  return async function feishuAuthMiddleware(request, response, next) {
    const result = await dispatch({ method: request.method, url: request.url, headers: request.headers });
    if (!result) return next();
    response.statusCode = result.status;
    for (const [name, value] of Object.entries(result.headers || {})) response.setHeader(name, value);
    response.end(result.body == null ? '' : JSON.stringify(result.body));
  };
}
