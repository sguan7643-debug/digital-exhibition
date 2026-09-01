const extendedStates = new Set([
  'normal','loading','empty','error','disabled','permission-denied','timeout','rate-limited',
  'partial','data-stale','schema-drift','conflict','partial-write','cancelled','security-error'
]);

export function createDataState({ data = null, mode = 'mock', state } = {}) {
  return Object.freeze({
    state: state || (Array.isArray(data) && data.length === 0 ? 'empty' : 'normal'),
    data, mode, error: null, traceId: null, traceIds: [], announcement: '', isComplete: true,
    dataStale: false, lastSyncedAt: null, unavailableSections: [], unavailableReasonCode: null,
    retryScope: [], sectionRecords: {}
  });
}
export function reduceDataState(previous, event) {
  if (event.type === 'load') return Object.freeze({ ...previous, state: 'loading', error: null, announcement: '正在更新数据' });
  if (event.type === 'success') {
    const empty = Array.isArray(event.data) && event.data.length === 0;
    const resolvedState = event.state || (empty ? 'empty' : 'normal');
    const announcement = {
      normal: '数据已更新',
      empty: '没有符合条件的数据',
      partial: '部分数据暂不可用，已保留可用内容',
      'data-stale': '正在显示缓存数据'
    }[resolvedState] || '数据已更新';
    return Object.freeze({
      ...previous, state: resolvedState, data: event.data, error: null,
      traceId: event.traceId || null, traceIds: event.traceIds || [], isComplete: event.isComplete ?? true,
      dataStale: event.dataStale ?? false, lastSyncedAt: event.lastSyncedAt || null,
      unavailableSections: event.unavailableSections || [], unavailableReasonCode: event.unavailableReasonCode || null,
      retryScope: event.retryScope || [], sectionRecords: event.sectionRecords || previous.sectionRecords,
      announcement
    });
  }
  if (event.type === 'disable') return Object.freeze({ ...previous, state: 'disabled', error: event.reason || null, announcement: '真实数据接入未启用' });
  if (event.type === 'fail') {
    const state = extendedStates.has(event.code) ? event.code : 'error';
    const purge = state === 'permission-denied' || state === 'schema-drift';
    const announcement = {
      'permission-denied': '无权访问当前数据',
      timeout: '数据请求超时，可稍后重试',
      cancelled: '数据更新已取消'
    }[state] || '数据更新失败';
    return Object.freeze({
      ...previous, state, data: purge ? null : previous.data, error: event.error || event.code,
      traceId: event.traceId || null, traceIds: event.traceIds || previous.traceIds,
      isComplete: event.isComplete ?? false, dataStale: event.dataStale ?? previous.dataStale,
      lastSyncedAt: event.lastSyncedAt || previous.lastSyncedAt,
      unavailableSections: event.unavailableSections || previous.unavailableSections,
      unavailableReasonCode: event.unavailableReasonCode || event.code,
      retryScope: event.retryScope || previous.retryScope,
      sectionRecords: event.sectionRecords || previous.sectionRecords,
      announcement
    });
  }
  return previous;
}
