import { FeishuProxyError } from './feishu-open-api-client.mjs';
import { FEISHU_AUTH_PATHS } from './feishu-user-auth-service.mjs';

const jsonHeaders = Object.freeze({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });

function normalizeRecoveryPath(value = '/test2/') {
  const text = String(value || '/test2/');
  if (!text.startsWith('/') || text.startsWith('//') || text.includes('\\')) return '/test2/';
  const url = new URL(text, 'http://local.invalid');
  return url.origin === 'http://local.invalid' ? `${url.pathname}${url.search}${url.hash}` : '/test2/';
}

function callbackRecoveryResult(error, authService, defaultReturnTo) {
  const controlled = error instanceof FeishuProxyError;
  const code = controlled ? error.code : 'INTERNAL_AUTH_ERROR';
  const target = new URL(normalizeRecoveryPath(defaultReturnTo), 'http://local.invalid');
  target.searchParams.set('authError', code);
  const clearCookie = authService.clearStateCookie?.();
  return {
    status: 302,
    headers: {
      Location: `${target.pathname}${target.search}${target.hash}`,
      ...(clearCookie ? { 'Set-Cookie': [clearCookie] } : {}),
      'Cache-Control': 'no-store'
    },
    body: null
  };
}

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

function publicIdentity(identity = {}, contact = {}, directory = {}) {
  identity = identity || {};
  contact = contact || {};
  directory = directory || {};
  return Object.freeze({
    userId: String(identity.userId || ''),
    adAccount: String(identity.adAccount || ''),
    openId: String(identity.openId || ''),
    unionId: String(identity.unionId || ''),
    displayName: String(identity.displayName || ''),
    avatarUrl: String(identity.avatarUrl || ''),
    employeeNo: String(identity.employeeNo || ''),
    tenantKey: String(identity.tenantKey || ''),
    identityType: String(identity.identityType || ''),
    phone: String(contact.phone || ''),
    email: String(contact.email || ''),
    tenantName: String(directory.tenantName || ''),
    orgId: String(directory.orgId || ''),
    orgName: String(directory.orgName || ''),
    departmentId: String(directory.departmentId || ''),
    departmentName: String(directory.departmentName || '')
  });
}

export function createFeishuAuthDispatcher({ authService, resolveIdentityProfile, defaultReturnTo = '/test2/' } = {}) {
  if (!authService?.beginAuthorization || !authService?.completeAuthorization || !authService?.resolveIdentity) {
    throw new Error('飞书授权分发器缺少授权服务');
  }
  return async function dispatch(request = {}) {
    const url = new URL(request.url || '/', 'http://localhost');
    if (![FEISHU_AUTH_PATHS.start, FEISHU_AUTH_PATHS.callback, FEISHU_AUTH_PATHS.session].includes(url.pathname)) return null;
    if (request.method !== 'GET') {
      return { status: 405, headers: jsonHeaders, body: { code: 'METHOD_NOT_ALLOWED', message: '飞书授权入口仅接受 GET' } };
    }
    try {
      if (url.pathname === FEISHU_AUTH_PATHS.session) {
        const cookieHeader = String(request.headers?.cookie || request.headers?.Cookie || '');
        const identity = authService.resolveIdentity(cookieHeader);
        if (!identity) {
          return { status: 401, headers: jsonHeaders, body: { code: 'USER_AUTH_REQUIRED', message: '需要先完成飞书用户授权' } };
        }
        const profile = typeof authService.resolveSessionProfile === 'function'
          ? await authService.resolveSessionProfile(cookieHeader).catch(() => null)
          : null;
        const directory = typeof resolveIdentityProfile === 'function'
          ? await resolveIdentityProfile(identity).catch(() => null)
          : null;
        return { status: 200, headers: jsonHeaders, body: { authenticated: true, identity: publicIdentity(identity, profile?.contact, directory) } };
      }
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
      if (url.pathname === FEISHU_AUTH_PATHS.callback) {
        return callbackRecoveryResult(error, authService, defaultReturnTo);
      }
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
