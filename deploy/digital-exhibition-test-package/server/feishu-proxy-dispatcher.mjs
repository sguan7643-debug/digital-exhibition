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
  const dispatcher = options.dispatcher === undefined
    ? createFeishuProxyDispatcher(options)
    : options.dispatcher;
  if (!dispatcher) return fetchImpl;
  return (input, init = {}) => fetchImpl(input, {
    ...init,
    ...(init.dispatcher ? {} : { dispatcher })
  });
}
