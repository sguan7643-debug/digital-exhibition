export function validateSameOriginProxyBase(value, origin = globalThis.location?.origin || 'http://localhost') {
  const base = String(value || '/api/v1').trim();
  if (!base || !base.startsWith('/') || base.startsWith('//')) {
    throw new Error('安全代理必须使用同源相对路径');
  }
  let decoded = base;
  try {
    for (let depth = 0; depth < 5; depth += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    throw new Error('安全代理路径编码无效');
  }
  if (
    decoded.includes('//')
    || decoded.includes('\\')
    || /%(?:2f|5c|2e)/i.test(decoded)
    || /(^|\/)\.{1,2}(?:\/|$)/.test(decoded)
    || /(?:open\.feishu\.cn|open-apis|bitable\/v1|larkoffice)/i.test(decoded)
  ) {
    throw new Error('浏览器只能访问受控安全代理，禁止直连飞书开放平台');
  }
  const originUrl = new URL(origin);
  const resolved = new URL(decoded, originUrl);
  if (resolved.origin !== originUrl.origin || resolved.username || resolved.password || resolved.search || resolved.hash) {
    throw new Error('安全代理必须解析为无凭据、无查询参数的同源 URL');
  }
  const pathname = resolved.pathname.replace(/\/+$/, '');
  if (!pathname || pathname === '/') throw new Error('安全代理路径不能解析为站点根路径');
  return pathname;
}
export function resolveIntegrationRuntime(options = {}) {
  const requestedMode = ['mock', 'remote', 'disabled'].includes(options.requestedMode) ? options.requestedMode : 'mock';
  const remoteEnabled = options.remoteEnabled === true;
  const contractEvidenceComplete = options.contractEvidenceComplete === true;
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : null;
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
    timeoutMs,
    reason
  });
}
