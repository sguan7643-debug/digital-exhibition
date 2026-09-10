const SAFE_INSTANCE_ID = /^[A-Za-z0-9_-]{1,256}$/;

export function resolveApprovalTransport(applicationType) {
  if (applicationType === 'T003') return Object.freeze({ kind: 'rpa', path: '/api/processInstanceStart', contentType: 'multipart/form-data' });
  if (applicationType === 'T005') return Object.freeze({ kind: 'feishu', path: '/api/v1/approvals/instances', contentType: 'application/json' });
  throw new Error('该应用类型尚未配置真实审批');
}

async function readResult(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || `审批接口请求失败（${response.status}）`);
  return result;
}

export async function submitOnboarding(form, files = [], fetchImpl = globalThis.fetch) {
  const transport = resolveApprovalTransport(form.type);
  if (transport.kind === 'rpa') {
    const body = new FormData();
    body.append('request', JSON.stringify(form.rpaRequest || {}));
    files.forEach(file => body.append('file', file, file.name));
    const result = await readResult(await fetchImpl(transport.path, { method: 'POST', body, credentials: 'same-origin' }));
    if (result.code !== '00000') throw new Error(result.message || '提交失败');
    return Object.freeze({
      kind: 'rpa', instanceId: String(result.instanceId || result.data?.instanceId || ''),
      status: 'PENDING', message: result.message || '操作成功'
    });
  }
  const result = await readResult(await fetchImpl(transport.path, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      applicationType: 'T005', title: form.name,
      applicationCode: form.applicationCode,
      description: form.summary
    })
  }));
  return Object.freeze({ kind: 'feishu', instanceId: result.instanceId, status: result.status, message: '飞书审批已提交' });
}

export async function getOnboardingStatus(instanceId, fetchImpl = globalThis.fetch) {
  const normalized = String(instanceId || '');
  if (!SAFE_INSTANCE_ID.test(normalized)) throw new Error('审批实例标识非法');
  const result = await readResult(await fetchImpl(`/api/v1/approvals/instances/${encodeURIComponent(normalized)}`, {
    method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }
  }));
  return Object.freeze({ instanceId: normalized, status: String(result.status || 'PENDING').toUpperCase() });
}
