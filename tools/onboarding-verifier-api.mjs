function normalizeBaseUrl(value, label) {
  const rawValue = String(value || '');
  if (/[?#]/.test(rawValue)) throw new Error(`${label} must not contain query or fragment delimiters`);
  let url;
  try { url = new URL(rawValue); }
  catch { throw new Error(`${label} must be an absolute URL`); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${label} must use http or https`);
  if (url.username || url.password || url.search || url.hash) throw new Error(`${label} must not contain credentials, query, or fragment`);
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url;
}

function normalizePublicBase(value) {
  const rawValue = String(value || '/');
  if (/[?#]/.test(rawValue)) throw new Error('FEISHU_VERIFY_APP_PUBLIC_BASE must not contain query or fragment delimiters');
  const segment = rawValue.trim().replace(/^\/+|\/+$/g, '');
  return segment ? `/${segment}` : '';
}

function joinBase(baseUrl, path) {
  const suffix = String(path || '').replace(/^\/+/, '');
  return suffix ? `${baseUrl.replace(/\/+$/, '')}/${suffix}` : baseUrl;
}

function createVerifierHeaders(inputHeaders, { hasBody, requestOrigin }) {
  const headers = new Headers(inputHeaders || undefined);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (hasBody && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.delete('Origin');
  headers.set('Origin', requestOrigin);
  return Object.fromEntries(headers.entries());
}

export function resolveOnboardingVerifierTargets({
  legacyBaseUrl = 'http://127.0.0.1:4173',
  apiBaseUrl,
  appBaseUrl,
  appPublicBase = '/test2/'
} = {}) {
  const legacy = normalizeBaseUrl(legacyBaseUrl, 'FEISHU_VERIFY_BASE_URL');
  const api = apiBaseUrl
    ? normalizeBaseUrl(apiBaseUrl, 'FEISHU_VERIFY_API_BASE_URL')
    : normalizeBaseUrl(legacy.origin, 'FEISHU_VERIFY_API_BASE_URL');
  const legacyHasPath = legacy.pathname !== '/';
  const app = appBaseUrl
    ? normalizeBaseUrl(appBaseUrl, 'FEISHU_VERIFY_APP_BASE_URL')
    : normalizeBaseUrl(
      legacyHasPath ? legacy.toString() : `${legacy.origin}${normalizePublicBase(appPublicBase)}`,
      'FEISHU_VERIFY_APP_BASE_URL'
    );
  if (api.origin !== app.origin) {
    throw new Error('FEISHU verifier API and app URLs must use the same origin');
  }
  const normalizedApiBaseUrl = api.toString().replace(/\/$/, '');
  const normalizedAppBaseUrl = app.toString().replace(/\/$/, '');
  return {
    origin: api.origin,
    apiBaseUrl: normalizedApiBaseUrl,
    appBaseUrl: normalizedAppBaseUrl,
    apiUrl: path => joinBase(normalizedApiBaseUrl, path),
    appUrl: path => joinBase(normalizedAppBaseUrl, path)
  };
}

export function createOnboardingVerifierApi({ request, apiBaseUrl, baseUrl } = {}) {
  if (typeof request?.fetch !== 'function') throw new Error('onboarding verifier request client is required');
  const normalizedApiBaseUrl = normalizeBaseUrl(apiBaseUrl || baseUrl, 'onboarding verifier API base URL').toString().replace(/\/$/, '');
  const requestOrigin = new URL(normalizedApiBaseUrl).origin;
  return async function api(path, init = {}) {
    const response = await request.fetch(joinBase(normalizedApiBaseUrl, path), {
      method: init.method || 'GET',
      data: init.body,
      headers: createVerifierHeaders(init.headers, { hasBody: init.body != null, requestOrigin })
    });
    return { status: response.status(), body: await response.json().catch(() => ({})) };
  };
}
