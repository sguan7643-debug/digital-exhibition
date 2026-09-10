const LABELS = Object.freeze({
  'APP-005': 'APP_USE', 'APP-006': 'APP_REUSE', 'APP-008': 'APP_COMMENT',
  'FAV-003': 'APP_FAVORITE', 'TRN-004': 'TRAINING_REGISTER'
});

export function resolveLiveApplicationId(integrationData = {}) {
  return String(integrationData?.['APP-003']?.appId || '');
}

export function buildApplicationWriteInput(operationId, resourceId, values = {}, options = {}) {
  const id = String(resourceId || '');
  if (!id) throw new Error('缺少真实资源标识');
  const label = LABELS[operationId];
  if (!label) throw new Error(`未支持的应用操作：${operationId}`);
  const now = options.now?.() || new Date().toISOString();
  const suffix = String(options.randomId?.() || globalThis.crypto.randomUUID()).replace(/[^A-Za-z0-9_-]/g, '');
  const common = { businessKey: `TEST_${label}_${suffix}`, idempotencyKey: `TEST_IDEM_${label}_${suffix}` };
  if (operationId === 'APP-005') return { ...common, fields: { 应用ID: id, 申请理由: String(values.reason || 'TEST_申请使用'), 状态: '待处理', 申请时间: now } };
  if (operationId === 'APP-006') return { ...common, fields: { 应用ID: id, 申请类型: '复用', 申请原因: String(values.reason || 'TEST_申请复用'), 本地状态: '待处理', 提交时间: now } };
  if (operationId === 'APP-008') {
    const comment = String(values.comment || '').trim();
    if (!comment) throw new Error('请输入评论内容');
    return { ...common, fields: { 应用ID: id, 评论内容: comment, 评论时间: now } };
  }
  if (operationId === 'FAV-003') return { ...common, fields: { 应用ID: id, 收藏时间: now } };
  return { ...common, fields: { 课程ID: id, 状态: '已报名', 报名时间: now } };
}

export async function launchApplication(operationExecutor, appId, options = {}) {
  if (typeof operationExecutor !== 'function') throw new Error('真实应用启动接口未启用');
  const response = await operationExecutor('APP-004', {
    appId: String(appId || ''), launchMode: 'NEW_TAB', sourcePage: options.sourcePage || globalThis.location?.pathname || '/apps',
    requestedAt: options.now?.() || new Date().toISOString()
  });
  if (!response?.data?.allowed || !response.data.launchUrl) return { launched: false, message: response?.data?.reasonMessage || '当前应用未获使用权限' };
  (options.open || ((url) => globalThis.open(url, '_blank', 'noopener,noreferrer')))(response.data.launchUrl);
  return { launched: true, message: '已通过权限校验并打开应用' };
}

export function resolveDownloadFileId(material = {}) {
  return String(material.primaryFile?.fileId || material.primaryFile?.fileToken || '');
}
