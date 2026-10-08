import { ProxyAgent } from 'undici';

function firstEnvironmentValue(env, names) {
  for (const name of names) {
    const value = String(env?.[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function hostMatchesNoProxy(hostname, noProxy) {
  const normalizedHost = String(hostname || '').trim().toLowerCase();
  if (!normalizedHost) return false;
  const rules = String(noProxy || '').split(/[\s,]+/).map(value => value.trim().toLowerCase()).filter(Boolean);
  return rules.some(rule => {
    if (rule === '*') return true;
    const candidate = rule.replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/^\*\./, '.');
    if (!candidate) return false;
    if (candidate.startsWith('.')) return normalizedHost.endsWith(candidate) || normalizedHost === candidate.slice(1);
    return normalizedHost === candidate || normalizedHost.endsWith(`.${candidate}`);
  });
}

function isLoopbackProxy(proxyUrl) {
  try {
    const hostname = new URL(proxyUrl).hostname.toLowerCase();
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

function errorChainCodes(error) {
  const codes = new Set();
  let current = error;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (current.code) codes.add(String(current.code).toUpperCase());
    current = current.cause;
  }
  return codes;
}

function canRetryWithoutLoopbackProxy(error, method) {
  const codes = errorChainCodes(error);
  if (['ECONNREFUSED', 'ENETUNREACH', 'EHOSTUNREACH'].some(code => codes.has(code))) return true;
  return ['GET', 'HEAD'].includes(String(method || 'GET').toUpperCase())
    && ['ECONNRESET', 'UND_ERR_SOCKET'].some(code => codes.has(code));
}

export function resolveProxyUrlForTarget(target, env = process.env) {
  let parsed;
  try {
    parsed = new URL(String(target));
  } catch {
    return '';
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return '';
  if (hostMatchesNoProxy(parsed.hostname, firstEnvironmentValue(env, ['NO_PROXY', 'no_proxy']))) return '';
  const configured = parsed.protocol === 'https:'
    ? firstEnvironmentValue(env, ['HTTPS_PROXY', 'https_proxy', 'ALL_PROXY', 'all_proxy'])
    : firstEnvironmentValue(env, ['HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']);
  if (!configured) return '';
  try {
    const proxy = new URL(configured);
    if (!['http:', 'https:'].includes(proxy.protocol) || !proxy.hostname) return '';
    return proxy.toString();
  } catch {
    return '';
  }
}

export function createFeishuProxyDispatcher(options = {}) {
  const target = options.target ?? 'https://open.feishu.cn';
  const proxyUrl = options.proxyUrl ?? resolveProxyUrlForTarget(target, options.env ?? process.env);
  if (!proxyUrl) return null;
  const ProxyAgentClass = options.ProxyAgentClass ?? ProxyAgent;
  return new ProxyAgentClass(proxyUrl);
}

export function createFeishuProxyFetch(fetchImpl = globalThis.fetch, options = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('缺少服务端 fetch 实现');
  const usesEnvironmentProxy = options.dispatcher === undefined;
  const proxyUrl = usesEnvironmentProxy
    ? (options.proxyUrl ?? resolveProxyUrlForTarget(options.target ?? 'https://open.feishu.cn', options.env ?? process.env))
    : '';
  const dispatcher = usesEnvironmentProxy
    ? createFeishuProxyDispatcher({ ...options, proxyUrl })
    : options.dispatcher;
  if (!dispatcher) return fetchImpl;
  const allowDirectFallback = usesEnvironmentProxy
    && options.loopbackDirectFallback !== false
    && isLoopbackProxy(proxyUrl);
  return async (input, init = {}) => {
    const usesManagedDispatcher = !init.dispatcher;
    try {
      return await fetchImpl(input, {
        ...init,
        ...(usesManagedDispatcher ? { dispatcher } : {})
      });
    } catch (error) {
      const requestMethod = init.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET');
      if (!allowDirectFallback || !usesManagedDispatcher || !canRetryWithoutLoopbackProxy(error, requestMethod)) throw error;
      const directInit = { ...init };
      delete directInit.dispatcher;
      return fetchImpl(input, directInit);
    }
  };
}
