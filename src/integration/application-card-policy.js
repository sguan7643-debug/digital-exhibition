export function resolveApplicationCardAction(app = {}, capabilities = {}) {
  if (app.accessGranted === true && app.launchable === true) {
    return Object.freeze({ kind: 'launch', label: '立即使用', disabled: false, reason: '' });
  }
  if (capabilities.requestEnabled === true) {
    return Object.freeze({ kind: 'request', label: '申请使用', disabled: false, reason: '' });
  }
  return Object.freeze({
    kind: 'unavailable',
    label: '暂不可用',
    disabled: true,
    reason: String(app.accessReason || app.launchReason || '当前没有可用的访问或申请通道')
  });
}

