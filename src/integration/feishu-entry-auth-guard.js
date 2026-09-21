const SESSION_ENDPOINT = '/api/v1/auth/feishu/session';
const OAUTH_START_ENDPOINT = '/api/v1/auth/feishu/start';
import { isPathWithinAppBase, normalizeAppBasePath } from './app-base-path.js';

function decodePathSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function sanitizeFeishuEntryReturnTo(locationLike, appBasePath = '/') {
  const current = locationLike instanceof URL
    ? locationLike
    : new URL(String(locationLike?.href || '/'), 'http://local.invalid');
  const target = `${current.pathname}${current.search}${current.hash}`;
  const decodedTarget = decodePathSegment(target);
  if (!isPathWithinAppBase(current.pathname, appBasePath)
    || target.startsWith('//') || target.includes('\\') || decodedTarget.startsWith('//') || decodedTarget.includes('\\')) {
    throw new Error('飞书授权返回地址非法');
  }
  const normalized = new URL(target, 'http://local.invalid');
  if (normalized.origin !== 'http://local.invalid') {
    throw new Error('飞书授权返回地址非法');
  }
  return `${normalized.pathname}${normalized.search}${normalized.hash}`;
}

export function shouldGuardFeishuEntry(locationLike, appBasePath = '/') {
  const current = locationLike instanceof URL
    ? locationLike
    : new URL(String(locationLike?.href || '/'), 'http://local.invalid');
  return isPathWithinAppBase(current.pathname, appBasePath);
}

export function createFeishuEntryAuthGuard({
  appBasePath = '/',
  location = globalThis.location,
  fetchImpl = globalThis.fetch,
  redirect = href => globalThis.location.assign(href)
} = {}) {
  const activeBasePath = normalizeAppBasePath(appBasePath);

  function unavailable() {
    return { authorized: false, render: true, reason: 'session-unavailable', retry: ensureAuthorized };
  }

  async function ensureAuthorized() {
    const current = location instanceof URL ? location : new URL(location.href);
    if (!shouldGuardFeishuEntry(current, activeBasePath)) {
      return { authorized: false, render: false, reason: 'outside-app-base' };
    }
    let response;
    try {
      response = await fetchImpl(SESSION_ENDPOINT, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
    } catch {
      return unavailable();
    }
    if (response.ok) return { authorized: true, render: true };
    if (response.status === 401) {
      const start = new URL(OAUTH_START_ENDPOINT, current.origin);
      start.searchParams.set('returnTo', sanitizeFeishuEntryReturnTo(current, activeBasePath));
      redirect(`${start.pathname}${start.search}`);
      return { authorized: false, render: false };
    }
    return unavailable();
  }
  return Object.freeze({ ensureAuthorized });
}
