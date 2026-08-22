import { reactive } from 'vue';

const normalize = value => String(value ?? '').trim().toLocaleLowerCase('zh-CN');

export function createShellController() {
  return reactive({
    expanded: true,
    announcement: '',
    toggle() {
      this.expanded = !this.expanded;
      this.announcement = this.expanded ? '左侧导航已展开' : '左侧导航已收起';
    }
  });
}

export function createAppsController(fixtures) {
  return reactive({
    fixtures: [...fixtures],
    filters: { category:'', query:'', tag:'', type:'', domain:'', scene:'' },
    sort: 'default',
    view: 'grid',
    page: 1,
    announcement: '',
    get results() {
      const query = normalize(this.filters.query);
      const rows = this.fixtures.filter(app =>
        (!this.filters.category || app.category === this.filters.category) &&
        (!this.filters.tag || app.tag === this.filters.tag) &&
        (!this.filters.type || app.category === this.filters.type) &&
        (!this.filters.domain || app.domain === this.filters.domain) &&
        (!this.filters.scene || app.scene === this.filters.scene) &&
        (!query || normalize([app.name, app.description, app.owner, app.department].join(' ')).includes(query))
      );
      if (this.sort === 'usage-desc') return [...rows].sort((a,b) => b.usage - a.usage || a.id.localeCompare(b.id));
      if (this.sort === 'favorites-desc') return [...rows].sort((a,b) => b.favorites - a.favorites || a.id.localeCompare(b.id));
      if (this.sort === 'name') return [...rows].sort((a,b) => a.name.localeCompare(b.name, 'zh-CN'));
      return rows;
    },
    setFilter(key, value) {
      if (!(key in this.filters)) throw new TypeError(`Unknown application filter: ${key}`);
      this.filters[key] = value;
      this.page = 1;
      this.announcement = `筛选完成，共 ${this.results.length} 个应用`;
    },
    setSort(value) { this.sort = value; this.page = 1; this.announcement = '应用排序已更新'; },
    setView(value) { this.view = value; this.announcement = `已切换为${value === 'list' ? '列表' : '卡片'}视图`; },
    reset() {
      Object.assign(this.filters, { category:'', query:'', tag:'', type:'', domain:'', scene:'' });
      this.sort = 'default'; this.view = 'grid'; this.page = 1;
      this.announcement = `已重置筛选，共 ${this.results.length} 个应用`;
    }
  });
}

export function createTalentController(fixtures) {
  return reactive({
    fixtures: [...fixtures],
    filters: { query:'', department:'', domain:'', office:'', inPool:'' },
    selectedId: null,
    page: 1,
    pageSize: 10,
    announcement: '',
    get results() {
      const query = normalize(this.filters.query);
      return this.fixtures.filter(person =>
        (!this.filters.department || person.department === this.filters.department) &&
        (!this.filters.domain || person.domain === this.filters.domain) &&
        (!this.filters.office || person.office === this.filters.office) &&
        (!this.filters.inPool || person.inPool === this.filters.inPool) &&
        (!query || normalize([person.name, person.id, person.tags, person.direction].join(' ')).includes(query))
      );
    },
    get selected() { return this.fixtures.find(person => person.id === this.selectedId) || null; },
    get drawerOpen() { return Boolean(this.selected); },
    get totalPages() { return Math.max(1, Math.ceil(this.results.length / this.pageSize)); },
    get pagedResults() { const start=(this.page-1)*this.pageSize; return this.results.slice(start,start+this.pageSize); },
    setFilter(key, value) {
      if (!(key in this.filters)) throw new TypeError(`Unknown talent filter: ${key}`);
      this.filters[key] = value; this.page = 1;
      this.announcement = `查询完成，共 ${this.results.length} 位人才`;
    },
    open(id) {
      if (!this.fixtures.some(person => person.id === id)) return;
      this.selectedId = id;
      this.announcement = `已打开${this.selected.name}的人才详情`;
    },
    close() { this.selectedId = null; this.announcement = '人才详情已关闭'; },
    setPage(value) {
      const next=Math.min(this.totalPages,Math.max(1,Number(value)||1));
      this.page=next;
      if(this.selectedId && !this.pagedResults.some(person=>person.id===this.selectedId)) this.selectedId=null;
      this.announcement=`已切换到第 ${this.page} 页`;
    },
    reset() {
      Object.assign(this.filters, { query:'', department:'', domain:'', office:'', inPool:'' });
      this.selectedId = null; this.page = 1;
      this.announcement = `已重置筛选，共 ${this.results.length} 位人才`;
    }
  });
}

export function createSixStateController(initial = 'normal', schedule = (callback, delay) => setTimeout(callback, delay)) {
  return reactive({
    state: initial,
    announcement: '',
    retry() {
      if (this.state !== 'error') return;
      this.state = 'loading';
      this.announcement = '正在重新加载';
      schedule(() => { this.state = 'normal'; this.announcement = '内容加载完成'; }, 800);
    }
  });
}
