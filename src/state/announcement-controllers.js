import { reactive } from 'vue';

const normalize=value=>String(value??'').trim().toLocaleLowerCase('zh-CN');
export function createAnnouncementController(fixtures = []){
  const originals=fixtures.map(item=>({...item}));
  return reactive({
    fixtures:originals.map(item=>({...item})),
    draft:{type:'',startDate:'',endDate:'',status:'all'},
    filters:{type:'',startDate:'',endDate:'',status:'all'},
    page:1,
    pageSize:10,
    validationError:'',
    announcement:'',
    replaceFixtures(nextFixtures){
      this.fixtures=Array.isArray(nextFixtures)?nextFixtures.map(item=>({...item})):[];
      this.page=1;
      this.validationError='';
      this.announcement=`已载入 ${this.fixtures.length} 条公告`;
    },
    get results(){
      return this.fixtures.filter(item=>(!this.filters.type||item.type===this.filters.type)&&(!this.filters.startDate||item.date>=this.filters.startDate)&&(!this.filters.endDate||item.date<=this.filters.endDate)&&(this.filters.status==='all'||(this.filters.status==='read')===item.read));
    },
    get totalPages(){return Math.max(1,Math.ceil(this.results.length/this.pageSize));},
    get pagedResults(){const start=(this.page-1)*this.pageSize;return this.results.slice(start,start+this.pageSize);},
    get unreadCount(){return this.fixtures.filter(item=>!item.read).length;},
    get pageNumbers(){
      if(this.totalPages<=7)return Array.from({length:this.totalPages},(_,index)=>index+1);
      const candidates=[1,2,this.page-1,this.page,this.page+1,this.totalPages-1,this.totalPages];
      return [...new Set(candidates.filter(value=>value>=1&&value<=this.totalPages))].sort((a,b)=>a-b);
    },
    setDraft(key,value){this.draft[key]=String(value??'');},
    applyFilters(){
      if(this.draft.startDate&&this.draft.endDate&&this.draft.startDate>this.draft.endDate){this.validationError='开始日期不能晚于结束日期';return false;}
      this.validationError='';Object.assign(this.filters,this.draft);this.page=1;this.announcement=`筛选完成，共 ${this.results.length} 条公告`;return true;
    },
    setFilter(key,value){this.setDraft(key,value);return this.applyFilters();},
    markRead(id){const row=this.fixtures.find(item=>item.id===id);if(row)row.read=true;this.announcement='公告已标记为已读';},
    markAllRead(){this.fixtures.forEach(item=>{item.read=true;});this.announcement='全部公告已标记为已读';},
    explain(item){this.markRead(item.id);this.announcement=`${item.title}：飞书未返回独立详情地址`;},
    setPage(value){this.page=Math.min(this.totalPages,Math.max(1,Number(value)||1));this.announcement=`已切换到第 ${this.page} 页`;},
    setPageSize(value){this.pageSize=[10,20,50].includes(Number(value))?Number(value):10;this.page=1;this.announcement=`每页显示 ${this.pageSize} 条公告`;},
    resetFilters(){Object.assign(this.draft,{type:'',startDate:'',endDate:'',status:'all'});Object.assign(this.filters,this.draft);this.page=1;this.validationError='';this.announcement=`已清空筛选，共 ${this.results.length} 条公告`;},
    resetData(){this.fixtures=originals.map(item=>({...item}));this.resetFilters();this.pageSize=10;this.announcement='已恢复最近一次飞书读取结果';}
  });
}

export function createNoticeDetailController(){
  return reactive({
    announcement:'',
    explain(label){this.announcement=`${label}：飞书未返回独立详情地址`;},
    associatedRoute(id){return id==='supplier-risk'?'/apps/report-001':null;}
  });
}
