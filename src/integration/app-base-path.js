const LOCAL_ORIGIN = 'http://app-base.local';

function pathnameOf(value) {
  return new URL(String(value || '/'), LOCAL_ORIGIN).pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
}

export function normalizeAppBasePath(value) {
  return pathnameOf(value);
}

export function isPathWithinAppBase(pathname, basePath) {
  const path = pathnameOf(pathname);
  const base = normalizeAppBasePath(basePath);
  return base === '/' ? path.startsWith('/') : path === base || path.startsWith(`${base}/`);
}

export function stripAppBasePath(pathname, basePath) {
  const path = pathnameOf(pathname);
  const base = normalizeAppBasePath(basePath);
  if (!isPathWithinAppBase(path, base)) return null;
  if (base === '/') return path;
  return path.slice(base.length) || '/';
}

export function prependAppBasePath(route, basePath) {
  const target = new URL(String(route || '/'), LOCAL_ORIGIN);
  if (target.origin !== LOCAL_ORIGIN) throw new Error('应用内路由必须是同源相对路径');
  const base = normalizeAppBasePath(basePath);
  const logicalPath = stripAppBasePath(target.pathname, base) || pathnameOf(target.pathname);
  return `${base === '/' ? '' : base}${logicalPath}${target.search}${target.hash}`;
}

export function prefixAppBaseLinks(root, basePath, { origin, isAppRoute } = {}) {
  const currentOrigin = origin || globalThis.location?.origin || LOCAL_ORIGIN;
  for (const link of root?.querySelectorAll?.('a[href]') || []) {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) continue;
    const target = new URL(href, currentOrigin);
    if (target.origin !== currentOrigin) continue;
    const logicalPath = stripAppBasePath(target.pathname, basePath) || target.pathname;
    if (isAppRoute?.(logicalPath) !== true) continue;
    link.setAttribute('href', prependAppBasePath(`${logicalPath}${target.search}${target.hash}`, basePath));
  }
}
