import { reactive } from 'vue';

const normalize = value => String(value ?? '').trim().toLocaleLowerCase('zh-CN');

export const MESSAGE_FIXTURES = Object.freeze([
  { id:'message-001', type:'公告通知', title:'【新应用上线】供应商风险预警应用已发布上线', copy:'供应商风险预警应用正式发布上线，支持多维风险监测与预警。', time:'05-08 09:32', read:false, action:'查看详情' },
  { id:'message-002', type:'新应用上线', title:'【新应用上线】采购合同执行分析看板V2.0版本发布', copy:'采购合同执行分析看板V2.0版本已发布，优化采购合同可视化分析能力。', time:'05-07 16:18', read:false, action:'查看详情' },
  { id:'message-003', type:'申请进度', title:'应用上架申请已通过审批', copy:'库存周转分析报表已通过平台审核。', time:'05-07 11:05', read:false, action:'进入相关页面' },
  { id:'message-004', type:'培训课堂', title:'您已成功参加“数说心智·数智应用案例分享”', copy:'课程已加入您的学习计划。', time:'05-05 17:42', read:true, action:'进入课堂' },
  { id:'message-005', type:'导出完成', title:'数据导出任务已完成', copy:'本地演示不提供真实文件下载。', time:'05-05 15:33', read:true, action:'下载文件' },
  { id:'message-006', type:'平台通知', title:'平台将于5月10日22:00~23:00进行系统维护', copy:'维护期间部分演示功能受影响。', time:'05-04 14:21', read:true, action:'查看详情' }
].concat(Array.from({length:122},(_,index)=>{const number=index+7;const types=['公告通知','新应用上线','申请进度','培训课堂','平台通知'];return {id:`message-${String(number).padStart(3,'0')}`,type:types[index%types.length],title:`演示消息 ${String(number).padStart(3,'0')}`,copy:`固定种子817的第 ${number} 条本地消息。`,time:`04-${String(30-(index%28)).padStart(2,'0')} 09:00`,read:number>18,action:'查看'};})).map(Object.freeze));

export const FAVORITE_FIXTURES = Object.freeze([
  ['favorite-001','采购合同执行看板','供应报表','采购管理','可视化展示合同执行全流程进度、金额及风险预警','1,876','824','张伟','李明','/apps/report-001'],
  ['favorite-002','供应商管理中心','数据集','供应商管理','统一管理供应商基础信息、资质文件、绩效评分及分级','2,345','1,128','王芳','孙浩','/apps/dataset-001'],
  ['favorite-003','合同风险智能识别','RPA机器人','合同管理','基于RPA+AI能力，自动识别合同条款风险','1,542','812','刘洋','周凯','/apps/rpa-001'],
  ['favorite-004','电子发票管理系统','EAD应用','财务管理','支持电子发票开具、查验、归档与统计','2,891','1,456','李敏','陈晨','/apps/ead-001'],
  ['favorite-005','库存周转分析报表','供应报表','库存管理','分析库存周转率、呆滞料占比及趋势','1,876','678','赵磊','陈晨','/apps/report-001'],
  ['favorite-006','增值税发票查验机器人','RPA机器人','财务管理','自动批量查验增值税发票真伪与合规性','1,542','743','李敏','周凯','/apps/rpa-001'],
  ['favorite-007','智能采购助手','AI智能体','采购管理','基于大模型提供采购政策解读、流程指引与供应商推荐','986','543','王芳','孙浩','/apps/ai-001'],
  ['favorite-008','采购价格行情查询','其他应用','采购管理','提供主材市场价格查询与趋势分析','1,203','678','刘洋','李明','/apps/tool-001']
].concat(Array.from({length:20},(_,index)=>{const number=index+9;const types=['供应报表','数据集','RPA机器人','AI智能体'];const domains=['采购管理','供应商管理','财务管理','库存管理'];return [`favorite-${String(number).padStart(3,'0')}`,`演示收藏应用${String(number).padStart(2,'0')}`,types[index%4],domains[index%4],`固定种子817的收藏应用 ${number}`,String(900+number),String(300+number),'演示负责人','演示开发者',['/apps/report-001','/apps/dataset-001','/apps/rpa-001','/apps/ai-001'][index%4]];})).map(([id,name,type,domain,description,usage,favorites,owner,developer,route], index) => Object.freeze({ id,name,type,domain,tag:domain,description,usage,favorites,owner,developer,route,image:`favorite-card-${index%8+1}.png` })));

export function createMessagesController(fixtures) {
  const originals = fixtures.map(item => ({ ...item }));
  return reactive({
    fixtures: originals.map(item => ({ ...item })),
    filters: { type:'', query:'', status:'all' },
    sort: 'newest',
    page: 1,
    pageSize: 10,
    announcement: '',
    get results() {
      const query = normalize(this.filters.query);
      const rows = this.fixtures.filter(item =>
        (!this.filters.type || item.type === this.filters.type) &&
        (this.filters.status === 'all' || (this.filters.status === 'read') === item.read) &&
        (!query || normalize(`${item.title} ${item.copy}`).includes(query))
      );
      return this.sort === 'newest' ? rows : [...rows].reverse();
    },
    get totalPages(){return Math.max(1,Math.ceil(this.results.length/this.pageSize));},
    get pagedResults(){const start=(this.page-1)*this.pageSize;return this.results.slice(start,start+this.pageSize);},
    setFilter(key,value) { this.filters[key]=value; this.page=1; this.announcement=`查询完成，共 ${this.results.length} 条消息`; },
    setStatus(value) { this.filters.status=value; this.page=1; this.announcement=`已切换消息状态，共 ${this.results.length} 条`; },
    markRead(id) { const row=this.fixtures.find(item=>item.id===id); if(row) row.read=true; this.announcement='已标记为已读'; },
    markAllRead() { this.fixtures.forEach(item=>{item.read=true;}); this.announcement='全部消息已标记为已读'; },
    toggleSort() { this.sort=this.sort==='newest'?'oldest':'newest'; this.announcement=this.sort==='newest'?'最新消息优先':'最早消息优先'; },
    setPage(value){this.page=Math.min(this.totalPages,Math.max(1,Number(value)||1));this.announcement=`已切换到第 ${this.page} 页`;},
    refresh() { this.fixtures=originals.map(item=>({...item})); Object.assign(this.filters,{type:'',query:'',status:'all'}); this.sort='newest';this.page=1; this.announcement='演示消息已刷新'; }
  });
}

export function createFavoritesController(fixtures) {
  return reactive({
    fixtures:[...fixtures], removed:[], filters:{query:'',type:'',domain:'',tag:''},page:1,pageSize:12,announcement:'',
    get results(){ const q=normalize(this.filters.query); return this.fixtures.filter(item=>!this.removed.includes(item.id)&&(!q||normalize(`${item.name} ${item.description}`).includes(q))&&(!this.filters.type||item.type===this.filters.type)&&(!this.filters.domain||item.domain===this.filters.domain)&&(!this.filters.tag||item.tag===this.filters.tag)); },
    get totalPages(){return Math.max(1,Math.ceil(this.results.length/this.pageSize));},
    get pagedResults(){const start=(this.page-1)*this.pageSize;return this.results.slice(start,start+this.pageSize);},
    setFilter(key,value){this.filters[key]=value;this.page=1;this.announcement=`筛选完成，共 ${this.results.length} 个收藏`;},
    resetFilters(){Object.assign(this.filters,{query:'',type:'',domain:'',tag:''});this.page=1;this.announcement=`已清空筛选，共 ${this.results.length} 个收藏`;},
    cancel(id){if(!this.removed.includes(id))this.removed.push(id);this.announcement='已取消收藏';},
    setPage(value){this.page=Math.min(this.totalPages,Math.max(1,Number(value)||1));this.announcement=`已切换到第 ${this.page} 页`;},
    resetData(){this.removed=[];this.resetFilters();this.announcement='已恢复演示收藏数据';}
  });
}
