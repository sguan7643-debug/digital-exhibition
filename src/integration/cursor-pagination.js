export function createCursorPagination({ pageSize = 10 } = {}) {
  let state = { page: 1, pageSize, pageTokens: [null], nextPageToken: null, hasMore: false, filterSignature: '' };
  const reset = () => { state = { ...state, page: 1, pageTokens: [null], nextPageToken: null, hasMore: false }; };
  return Object.freeze({
    snapshot: () => ({ ...state, pageTokens: [...state.pageTokens] }),
    currentToken: () => state.pageTokens[state.page - 1] || null,
    acceptPage: ({ nextPageToken = null, hasMore = false } = {}) => { state = { ...state, nextPageToken, hasMore: Boolean(hasMore) }; },
    next: () => {
      if (!state.hasMore || !state.nextPageToken) return false;
      const tokens = [...state.pageTokens]; tokens[state.page] = state.nextPageToken;
      state = { ...state, page: state.page + 1, pageTokens: tokens, nextPageToken: null, hasMore: false };
      return true;
    },
    previous: () => { if (state.page <= 1) return false; state = { ...state, page: state.page - 1, nextPageToken: null, hasMore: true }; return true; },
    setFilterSignature: signature => { if (signature !== state.filterSignature) { state = { ...state, filterSignature: signature }; reset(); } },
    setPageSize: value => { const next = Number(value); if (!Number.isInteger(next) || next <= 0) throw new Error('pageSize 必须为正整数'); if (next !== state.pageSize) { state = { ...state, pageSize: next }; reset(); } },
    reset
  });
}
