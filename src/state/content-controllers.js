import { reactive } from 'vue';

const normalize = value => String(value ?? '').trim().toLocaleLowerCase('zh-CN');

export function createMessagesController(rows = []) {
  return reactive({
    fixtures: rows.map(item => ({ ...item })),
    filters: { type: '', query: '', status: 'all' },
    queryDraft: '', sort: 'newest', page: 1, pageSize: 10, announcement: '',
    get totalCount(){ return this.fixtures.length; },
    get unreadCount(){ return this.fixtures.filter(item => !item.read).length; },
    get readCount(){ return this.fixtures.filter(item => item.read).length; },
    get todayCount(){ return this.fixtures.filter(item => item.today).length; },
    get results(){
      const query = normalize(this.filters.query);
      const filtered = this.fixtures.filter(item =>
        (!this.filters.type || item.type === this.filters.type)
        && (this.filters.status === 'all' || (this.filters.status === 'read') === item.read)
        && (!query || normalize(`${item.title} ${item.copy}`).includes(query))
      );
      return this.sort === 'newest' ? filtered : [...filtered].reverse();
    },
    get totalPages(){ return Math.max(1, Math.ceil(this.results.length / this.pageSize)); },
    get pagedResults(){ const start = (this.page - 1) * this.pageSize; return this.results.slice(start, start + this.pageSize); },
    replaceRows(nextRows){ this.fixtures = nextRows.map(item => ({ ...item })); this.page = 1; },
    setFilter(key, value){ this.filters[key] = value; this.page = 1; this.announcement = `查询完成，共 ${this.results.length} 条消息`; },
    setStatus(value){ this.filters.status = value; this.page = 1; this.announcement = `已切换消息状态，共 ${this.results.length} 条`; },
    markRead(id){ const row = this.fixtures.find(item => item.id === id); if (row) row.read = true; this.announcement = '已标记为已读'; },
    actionFor(item){ return item.route ? { kind: 'route', route: item.route } : { kind: 'feedback', message: '该消息没有可用的目标路径' }; },
    activate(item){ this.markRead(item.id); return this.actionFor(item); },
    markAllRead(){ this.fixtures.forEach(item => { item.read = true; }); this.announcement = '全部消息已标记为已读'; },
    toggleSort(){ this.sort = this.sort === 'newest' ? 'oldest' : 'newest'; },
    setPage(value){ this.page = Math.min(this.totalPages, Math.max(1, Number(value) || 1)); },
    setPageSize(value){ this.pageSize = [10, 20, 50].includes(Number(value)) ? Number(value) : 10; this.page = 1; },
    refresh(){ Object.assign(this.filters, { type: '', query: '', status: 'all' }); this.queryDraft = ''; this.page = 1; this.announcement = '已清空筛选条件'; }
  });
}

export function createFavoritesController(rows = []) {
  const asNumber = value => Number(String(value ?? 0).replaceAll(',', ''));
  return reactive({
    fixtures: [...rows], removed: [], filters: { query: '', type: '', domain: '', tag: '' },
    queryDraft: '', sort: 'default', view: 'grid', page: 1, pageSize: 10, announcement: '',
    get activeCount(){ return this.fixtures.filter(item => !this.removed.includes(item.id)).length; },
    get results(){
      const query = normalize(this.filters.query);
      const filtered = this.fixtures.filter(item => !this.removed.includes(item.id)
        && (!query || normalize(`${item.name} ${item.description} ${item.owner} ${item.developer}`).includes(query))
        && (!this.filters.type || item.type === this.filters.type)
        && (!this.filters.domain || item.domain === this.filters.domain)
        && (!this.filters.tag || item.tag === this.filters.tag));
      if (this.sort === 'usage-desc') return [...filtered].sort((a, b) => asNumber(b.usage) - asNumber(a.usage));
      if (this.sort === 'favorites-desc') return [...filtered].sort((a, b) => asNumber(b.favorites) - asNumber(a.favorites));
      if (this.sort === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
      return filtered;
    },
    get totalPages(){ return Math.max(1, Math.ceil(this.results.length / this.pageSize)); },
    get pagedResults(){ const start = (this.page - 1) * this.pageSize; return this.results.slice(start, start + this.pageSize); },
    replaceRows(nextRows){ this.fixtures = [...nextRows]; this.removed = []; this.page = 1; },
    setFilter(key, value){ this.filters[key] = value; this.page = 1; this.announcement = `筛选完成，共 ${this.results.length} 个收藏`; },
    setSort(value){ this.sort = value; this.page = 1; },
    setView(value){ this.view = value === 'list' ? 'list' : 'grid'; },
    resetFilters(){ Object.assign(this.filters, { query: '', type: '', domain: '', tag: '' }); this.queryDraft = ''; this.sort = 'default'; this.page = 1; },
    cancel(id){ if (!this.removed.includes(id)) this.removed.push(id); this.page = Math.min(this.page, this.totalPages); },
    setPage(value){ this.page = Math.min(this.totalPages, Math.max(1, Number(value) || 1)); },
    setPageSize(value){ this.pageSize = [10, 20, 50].includes(Number(value)) ? Number(value) : 10; this.page = 1; },
    resetData(){ this.removed = []; this.resetFilters(); }
  });
}
