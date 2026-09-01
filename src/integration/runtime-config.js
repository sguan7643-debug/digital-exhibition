function validateProxyBase(value) {
  const base = String(value || '/api/v1').trim();
  if (!base || /(?:open\.feishu\.cn|open-apis|bitable\/v1|larkoffice)/i.test(base)) {
    throw new Error('浏览器只能访问受控安全代理，禁止直连飞书开放平台');
  }
  if (/^https?:\/\//i.test(base)) {
    throw new Error('安全代理必须使用同源相对路径');
  }
  if (!base.startsWith('/')) throw new Error('安全代理路径必须从 / 开始');
  return base.replace(/\/$/, '');
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
    proxyBase: validateProxyBase(options.proxyBase),
    remoteEnabled,
    contractEvidenceComplete,
    timeoutMs,
    reason
  });
}
