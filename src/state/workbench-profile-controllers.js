import { reactive } from 'vue';

const normalize = value => String(value ?? '').trim().toLocaleLowerCase('zh-CN');

export function createWorkbenchController(rows = []) {
  return reactive({
    fixtures: [...rows], query: '', scene: '', announcement: '',
    get results(){ const query = normalize(this.query); return this.fixtures.filter(item => (!this.scene || item.scene === this.scene) && (!query || normalize(`${item.name} ${item.type} ${item.description}`).includes(query))); },
    setQuery(value){ this.query = value; this.announcement = `工作台筛选完成，共 ${this.results.length} 个应用`; },
    setScene(value){ this.scene = value; this.announcement = `工作台筛选完成，共 ${this.results.length} 个应用`; },
    reset(){ this.query = ''; this.scene = ''; this.announcement = '已清空筛选条件'; }
  });
}

export function createProfileController(){
  return reactive({
    readIds: [], announcement: '',
    markRead(id){ if (!this.readIds.includes(id)) this.readIds.push(id); this.announcement = '最近消息已标记为已读'; },
    isRead(id){ return this.readIds.includes(id); },
    explain(label){ this.announcement = `${label}：暂无可用目标页面`; }
  });
}
