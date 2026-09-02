import { reactive } from 'vue';

const normalize=value=>String(value??'').trim().toLocaleLowerCase('zh-CN');
const baseAnnouncements=[
  {id:'notice-001',type:'平台公告',title:'供应商风险预警应用已发布上线',copy:'为科学识别供应商风险、提升供应链韧性，供应商风险预警应用现已正式上线，支持多维度风险预警与评估分析。',date:'2025-05-08',time:'05-08 09:32',read:false,tone:'red',hasDetail:true},
  {id:'notice-002',type:'应用上线',title:'合同执行分析看板V2.0版本发布',copy:'合同执行分析看板V2.0版本已发布，新增合同履约进度、逾期预警与履约评分等功能，助力精细化管理。',date:'2025-05-07',time:'05-07 16:18',read:false,tone:'green',hasDetail:false},
  {id:'notice-003',type:'活动通知',title:'“物资采购效率交流会”报名开启',copy:'定于2025年5月13日举办“物资采购效率交流会”，分享最佳实践与数字化转型经验，欢迎各单位报名参加。',date:'2025-05-06',time:'05-06 17:42',read:false,tone:'orange',hasDetail:false},
  {id:'notice-004',type:'系统通知',title:'平台将于5月10日22:00-23:00进行系统维护',copy:'为提升平台稳定性与性能，平台将于5月10日22:00-23:00进行系统维护，期间部分功能受影响。',date:'2025-05-04',time:'05-04 14:21',read:true,tone:'purple',hasDetail:false},
  {id:'notice-005',type:'应用上线',title:'电子发票录入校验应用上线',copy:'电子发票录入校验应用已上线，支持发票自动识别、查重校验与异常提醒，提升录入效率与准确性。',date:'2025-05-03',time:'05-03 10:05',read:true,tone:'blue',hasDetail:false},
  {id:'notice-006',type:'活动通知',title:'AI社区 · 大模型在采购场景的应用训练营报名中',copy:'5月16日15:00线上开讲，聚焦大模型在采购需求分析、供应商评估等场景的创新实践，欢迎报名参与。',date:'2025-05-02',time:'05-02 09:15',read:true,tone:'orange',hasDetail:false}
];
const generatedAnnouncements=Array.from({length:122},(_,index)=>{
  const number=index+7;
  const types=['平台公告','应用上线','活动通知','系统通知'];
  const tones=['red','green','orange','purple'];
  const day=30-(index%30);
  const month=index<24?'04':index<54?'03':index<84?'02':'01';
  return {id:`notice-${String(number).padStart(3,'0')}`,type:types[index%4],title:`数智展厅演示公告 ${String(number).padStart(3,'0')}`,copy:`固定种子 817 的第 ${number} 条本地公告，用于验证筛选、分页和已读状态。`,date:`2025-${month}-${String(day).padStart(2,'0')}`,time:`${month}-${String(day).padStart(2,'0')} 09:00`,read:number>21,tone:tones[index%4],hasDetail:false};
});

export const ANNOUNCEMENT_FIXTURES=Object.freeze([...baseAnnouncements,...generatedAnnouncements].map(Object.freeze));

export function createAnnouncementController(fixtures){
  const originals=fixtures.map(item=>({...item}));
  let baseline=originals.map(item=>({...item}));
  return reactive({
    fixtures:originals.map(item=>({...item})),
    statusMode:'read',
    draft:{type:'',startDate:'',endDate:'',status:'all'},
    filters:{type:'',startDate:'',endDate:'',status:'all'},
    page:1,
    pageSize:10,
    validationError:'',
    announcement:'',
    get results(){
      return this.fixtures.filter(item=>(!this.filters.type||item.type===this.filters.type)&&(!this.filters.startDate||item.date>=this.filters.startDate)&&(!this.filters.endDate||item.date<=this.filters.endDate)&&(this.filters.status==='all'||(this.statusMode==='publication'?item.status===this.filters.status:(this.filters.status==='read')===item.read)));
    },
    get totalPages(){return Math.max(1,Math.ceil(this.results.length/this.pageSize));},
    get pagedResults(){const start=(this.page-1)*this.pageSize;return this.results.slice(start,start+this.pageSize);},
    get unreadCount(){return this.fixtures.filter(item=>item.read===false).length;},
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
    markRead(id){const row=this.fixtures.find(item=>item.id===id);if(row&&row.read!==null)row.read=true;this.announcement='公告已标记为已读';},
    markAllRead(){this.fixtures.forEach(item=>{if(item.read!==null)item.read=true;});this.announcement='全部公告已标记为已读';},
    explain(item){this.markRead(item.id);this.announcement=`${item.title}：当前演示未提供独立详情页`;},
    setPage(value){this.page=Math.min(this.totalPages,Math.max(1,Number(value)||1));this.announcement=`已切换到第 ${this.page} 页`;},
    setPageSize(value){this.pageSize=[10,20,50].includes(Number(value))?Number(value):10;this.page=1;this.announcement=`每页显示 ${this.pageSize} 条公告`;},
    replaceFixtures(items,{statusMode='read'}={}){baseline=items.map(item=>({...item}));this.fixtures=baseline.map(item=>({...item}));this.statusMode=statusMode;this.resetFilters();this.announcement=`已加载 ${this.fixtures.length} 条公告`;},
    resetFilters(){Object.assign(this.draft,{type:'',startDate:'',endDate:'',status:'all'});Object.assign(this.filters,this.draft);this.page=1;this.validationError='';this.announcement=`已清空筛选，共 ${this.results.length} 条公告`;},
    resetData(){this.fixtures=baseline.map(item=>({...item}));this.resetFilters();this.pageSize=10;this.announcement='已恢复公告数据';}
  });
}

export function createNoticeDetailController(){
  return reactive({
    announcement:'',
    mockDownload(name){this.announcement=`${name}：演示环境不提供真实下载`;},
    explain(label){this.announcement=`${label}：当前演示未提供独立详情页`;},
    associatedRoute(id){return id==='supplier-risk'?'/apps/report-001':null;}
  });
}
