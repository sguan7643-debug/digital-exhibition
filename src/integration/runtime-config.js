export function validateSameOriginProxyBase(value, origin = globalThis.location?.origin || 'http://localhost') {
  const base = String(value || '/api/v1').trim();
  const pathnameGrammar = /^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/?$/;
  if (!pathnameGrammar.test(base)) {
    throw new Error('安全代理必须使用同源相对路径');
  }
  const originUrl = new URL(origin);
  const resolved = new URL(base, originUrl);
  if (resolved.origin !== originUrl.origin || resolved.username || resolved.password || resolved.search || resolved.hash) {
    throw new Error('安全代理必须解析为无凭据、无查询参数的同源 URL');
  }
  const pathname = resolved.pathname.replace(/\/+$/, '');
  if (!pathname || pathname === '/') throw new Error('安全代理路径不能解析为站点根路径');
  return pathname;
}
export function isRemoteRuntime(runtime) {
  return runtime?.mode === 'remote';
}
export function resolveIntegrationRuntime(options = {}) {
  const requestedMode = ['mock', 'remote', 'disabled'].includes(options.requestedMode) ? options.requestedMode : 'mock';
  const remoteEnabled = options.remoteEnabled === true;
  const contractEvidenceComplete = options.contractEvidenceComplete === true;
  const testWritesEnabled = options.testWritesEnabled === true && requestedMode === 'remote' && remoteEnabled && contractEvidenceComplete;
  const configuredTimeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : null;
  const timeoutMs = remoteEnabled
    ? Math.min(configuredTimeoutMs ?? 12_000, 12_000)
    : configuredTimeoutMs;
  let mode = requestedMode;
  let reason = 'explicit-mode';
  if (requestedMode === 'mock' && !remoteEnabled) reason = 'remote-disabled-by-default';
  if (requestedMode === 'remote' && (!remoteEnabled || !contractEvidenceComplete || !timeoutMs)) {
    mode = 'disabled';
    reason = !remoteEnabled ? 'kill-switch-disabled' : !contractEvidenceComplete ? 'contract-evidence-incomplete' : 'timeout-contract-missing';
  }
  return Object.freeze({
    mode,
    proxyBase: validateSameOriginProxyBase(options.proxyBase, options.origin),
    remoteEnabled,
    contractEvidenceComplete,
    testWritesEnabled,
    timeoutMs,
    reason
  });
}
