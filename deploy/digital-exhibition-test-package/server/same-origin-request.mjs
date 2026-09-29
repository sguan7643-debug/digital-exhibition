function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim();
}

function normalizedHost(authority, protocol) {
  const value = firstHeaderValue(authority);
  if (!value) return '';
  try { return new URL(`${protocol}//${value}`).host; }
  catch { return ''; }
}

function isLoopbackHost(authority) {
  const value = firstHeaderValue(authority);
  if (!value) return false;
  try {
    const hostname = new URL(`http://${value}`).hostname;
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]';
  } catch { return false; }
}

function normalizedOrigin(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.origin : '';
  } catch { return ''; }
}

function configuredPublicOrigins(environment = process.env) {
  const explicit = [
    environment.EXHIBITION_PUBLIC_ORIGIN,
    environment.EXHIBITION_PUBLIC_ORIGINS
  ].flatMap(value => String(value || '').split(','));
  const oauthOrigin = normalizedOrigin(environment.FEISHU_OAUTH_REDIRECT_URI);
  return new Set([...explicit.map(normalizedOrigin), oauthOrigin].filter(Boolean));
}

export function isSameOriginRequest(headers = {}, method = '') {
  const origin = firstHeaderValue(headers.origin || headers.Origin);
  if (!origin && method === 'GET') {
    return firstHeaderValue(headers['sec-fetch-site'] || headers['Sec-Fetch-Site']).toLowerCase() === 'same-origin';
  }
  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (configuredPublicOrigins().has(parsed.origin)) return true;
    const directHost = firstHeaderValue(headers.host || headers.Host);
    if (parsed.host === normalizedHost(directHost, parsed.protocol)) return true;

    const forwardedHost = firstHeaderValue(headers['x-forwarded-host'] || headers['X-Forwarded-Host']);
    const forwardedProto = firstHeaderValue(headers['x-forwarded-proto'] || headers['X-Forwarded-Proto']).toLowerCase();
    return isLoopbackHost(directHost)
      && Boolean(forwardedHost)
      && (!forwardedProto || `${forwardedProto}:` === parsed.protocol)
      && parsed.host === normalizedHost(forwardedHost, parsed.protocol);
  } catch { return false; }
}
