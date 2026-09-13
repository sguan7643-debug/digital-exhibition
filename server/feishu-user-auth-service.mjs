import { randomUUID } from 'node:crypto';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

const AUTHORIZE_URL = 'https://accounts.feishu.cn/open-apis/authen/v1/authorize';
const TOKEN_URL = 'https://accounts.feishu.cn/oauth/v3/token';
const USER_INFO_URL = 'https://open.feishu.cn/open-apis/authen/v1/user_info';
const STATE_COOKIE = 'exhibition_feishu_oauth_state';
const SESSION_COOKIE = 'exhibition_feishu_session';

function safeJson(response) {
  return response.json().catch(() => {
    throw new FeishuProxyError('UPSTREAM_INVALID_JSON', '飞书身份服务返回了无效数据', 502);
  });
}

function parseCookies(header = '') {
  return Object.fromEntries(String(header).split(';').map(value => value.trim()).filter(Boolean).map(value => {
    const index = value.indexOf('=');
    if (index < 0) return [value, ''];
    return [value.slice(0, index), decodeURIComponent(value.slice(index + 1))];
  }));
}

function normalizeReturnTo(value = '/workbench') {
  const text = String(value || '/workbench');
  if (!text.startsWith('/') || text.startsWith('//') || text.includes('\\')) {
    throw new FeishuProxyError('INVALID_RETURN_PATH', '授权完成后的返回地址非法', 400);
  }
  const url = new URL(text, 'http://local.invalid');
  if (url.origin !== 'http://local.invalid') {
    throw new FeishuProxyError('INVALID_RETURN_PATH', '授权完成后的返回地址非法', 400);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function validateCode(value) {
  const code = String(value || '');
  if (!/^[A-Za-z0-9_-]{1,512}$/.test(code)) {
    throw new FeishuProxyError('INVALID_AUTHORIZATION_CODE', '飞书授权码格式非法', 400);
  }
  return code;
}

function createCookie(name, value, { maxAge, secure = false } = {}) {
  return [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
    Number.isFinite(maxAge) ? `Max-Age=${Math.max(0, Math.floor(maxAge))}` : ''
  ].filter(Boolean).join('; ');
}

function sanitizedIdentity(data = {}) {
  const userId = String(data.user_id || '');
  const openId = String(data.open_id || '');
  if (!userId && !openId) {
    throw new FeishuProxyError('FEISHU_USER_ID_MISSING', '飞书未返回可用的用户标识', 502);
  }
  return Object.freeze({
    userId,
    // 飞书 user_id 只负责把授权会话解析到企业账号；业务查询统一读取 adAccount。
    adAccount: userId,
    openId,
    unionId: String(data.union_id || ''),
    displayName: String(data.name || ''),
    avatarUrl: String(data.avatar_url || ''),
    employeeNo: String(data.employee_no || ''),
    tenantKey: String(data.tenant_key || ''),
    identityType: userId ? 'user_id' : 'open_id'
  });
}

export function createFeishuUserAuthService(options = {}) {
  const appId = options.appId ?? process.env.FEISHU_APP_ID ?? '';
  const appSecret = options.appSecret ?? process.env.FEISHU_APP_SECRET ?? '';
  const redirectUri = options.redirectUri ?? process.env.FEISHU_OAUTH_REDIRECT_URI ?? '';
  const scopes = String(options.scopes ?? process.env.FEISHU_OAUTH_SCOPES ?? '').trim();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const randomId = options.randomId ?? randomUUID;
  const onAuthorized = options.onAuthorized;
  const stateTtlSeconds = Number(options.stateTtlSeconds || 300);
  const sessionTtlSeconds = Number(options.sessionTtlSeconds || 8 * 60 * 60);
  const credentialsReady = Boolean(appId && appSecret && redirectUri);
  const secureCookies = redirectUri.startsWith('https://');
  const pendingStates = new Map();
  const sessions = new Map();

  if (typeof fetchImpl !== 'function') throw new Error('缺少服务端 fetch 实现');

  function requireConfiguration() {
    if (!credentialsReady) {
      throw new FeishuProxyError('USER_AUTH_NOT_CONFIGURED', '飞书当前用户授权尚未配置回调地址', 503);
    }
    const parsed = new URL(redirectUri);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash) {
      throw new FeishuProxyError('INVALID_OAUTH_REDIRECT_URI', '飞书 OAuth 回调地址配置非法', 503);
    }
  }

  function removeExpired() {
    const timestamp = now();
    for (const [state, item] of pendingStates) if (item.expiresAt <= timestamp) pendingStates.delete(state);
    for (const [sessionId, item] of sessions) if (item.expiresAt <= timestamp) sessions.delete(sessionId);
  }

  function beginAuthorization({ returnTo = '/workbench' } = {}) {
    requireConfiguration();
    removeExpired();
    const normalizedReturnTo = normalizeReturnTo(returnTo);
    const state = randomId();
    pendingStates.set(state, { returnTo: normalizedReturnTo, expiresAt: now() + stateTtlSeconds * 1000 });
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', appId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    if (scopes) url.searchParams.set('scope', scopes);
    return Object.freeze({
      authorizationUrl: url.toString(),
      stateCookie: createCookie(STATE_COOKIE, state, { maxAge: stateTtlSeconds, secure: secureCookies })
    });
  }

  async function exchangeCode(code) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code', client_id: appId, client_secret: appSecret, code, redirect_uri: redirectUri
    });
    const response = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    const result = await safeJson(response);
    if (!response.ok || result.code !== 0 || !result.access_token) {
      throw new FeishuProxyError('FEISHU_USER_AUTH_FAILED', '飞书用户授权失败或授权码已失效', response.status === 429 ? 429 : 401, {
        upstreamCode: Number.isInteger(result.code) ? result.code : undefined
      });
    }
    return result.access_token;
  }

  async function fetchUserInfo(accessToken) {
    const response = await fetchImpl(USER_INFO_URL, {
      method: 'GET', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
    });
    const result = await safeJson(response);
    if (!response.ok || result.code !== 0 || !result.data || typeof result.data !== 'object') {
      throw new FeishuProxyError('FEISHU_USER_INFO_FAILED', '飞书当前用户信息读取失败', response.status === 429 ? 429 : 401, {
        upstreamCode: Number.isInteger(result.code) ? result.code : undefined
      });
    }
    return sanitizedIdentity(result.data);
  }

  async function completeAuthorization({ code, state, cookieHeader = '' } = {}) {
    requireConfiguration();
    removeExpired();
    const normalizedState = String(state || '');
    const cookies = parseCookies(cookieHeader);
    if (!normalizedState || cookies[STATE_COOKIE] !== normalizedState) {
      throw new FeishuProxyError('OAUTH_STATE_MISMATCH', '飞书授权状态校验失败', 401);
    }
    const pending = pendingStates.get(normalizedState);
    if (!pending) throw new FeishuProxyError('OAUTH_STATE_INVALID', '飞书授权状态已失效或已使用', 401);
    pendingStates.delete(normalizedState);
    const accessToken = await exchangeCode(validateCode(code));
    const identity = await fetchUserInfo(accessToken);
    const sessionId = randomId();
    sessions.set(sessionId, { identity, accessToken, expiresAt: now() + sessionTtlSeconds * 1000 });
    if (typeof onAuthorized === 'function') {
      await Promise.resolve(onAuthorized(identity)).catch(() => {});
    }
    return Object.freeze({
      identity,
      redirectTo: pending.returnTo,
      sessionCookie: createCookie(SESSION_COOKIE, sessionId, { maxAge: sessionTtlSeconds, secure: secureCookies }),
      clearStateCookie: createCookie(STATE_COOKIE, '', { maxAge: 0, secure: secureCookies })
    });
  }

  function resolveIdentity(cookieHeader = '') {
    return resolveSession(cookieHeader)?.identity || null;
  }

  function resolveSession(cookieHeader = '') {
    removeExpired();
    const sessionId = parseCookies(cookieHeader)[SESSION_COOKIE];
    return sessionId ? sessions.get(sessionId) || null : null;
  }

  return Object.freeze({ credentialsReady, beginAuthorization, completeAuthorization, resolveIdentity, resolveSession });
}

export const FEISHU_AUTH_PATHS = Object.freeze({
  start: '/api/v1/auth/feishu/start',
  callback: '/api/v1/auth/feishu/callback'
});
