const extendedStates = new Set([
  'normal','loading','empty','error','disabled','permission-denied','timeout','rate-limited',
  'partial','data-stale','schema-drift','conflict','partial-write'
]);

export function createDataState({ data = null, mode = 'mock', state } = {}) {
  return Object.freeze({ state: state || (Array.isArray(data) && data.length === 0 ? 'empty' : 'normal'), data, mode, error: null, traceId: null, announcement: '' });
}
export function reduceDataState(previous, event) {
  if (event.type === 'load') return Object.freeze({ ...previous, state: 'loading', error: null, announcement: '正在更新数据' });
  if (event.type === 'success') {
    const empty = Array.isArray(event.data) && event.data.length === 0;
    return Object.freeze({ ...previous, state: empty ? 'empty' : 'normal', data: event.data, error: null, traceId: event.traceId || null, announcement: empty ? '没有符合条件的数据' : '数据已更新' });
  }
  if (event.type === 'disable') return Object.freeze({ ...previous, state: 'disabled', error: event.reason || null, announcement: '真实数据接入未启用' });
  if (event.type === 'fail') {
    const state = extendedStates.has(event.code) ? event.code : 'error';
    const purge = state === 'permission-denied' || state === 'schema-drift';
    return Object.freeze({ ...previous, state, data: purge ? null : previous.data, error: event.error || event.code, traceId: event.traceId || null, announcement: '数据更新失败' });
  }
  return previous;
}
