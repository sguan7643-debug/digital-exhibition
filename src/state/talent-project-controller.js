import { reactive } from 'vue';

const baseProjects=[
  ['PRJ20250608001','海上平台数字化人才培养项目','人力资源部','李四','针对海上平台数字化转型，培养复合人才','2025-06-08','进行中','数字化转型','人工智能','王五','12','中等'],
  ['PRJ20250607002','数据分析人才提升计划','数字化中心','张三','提升公司数据分析能力，培养数字人才','2025-06-07','已完成','数据管理','大数据','赵六','8','中型'],
  ['PRJ20250606003','AI应用开发人才储备项目','技术研发部','李四','储备AI应用开发人才，支撑公司创新','2025-06-06','进行中','技术创新','人工智能','孙七','15','大型'],
  ['PRJ20250605004','管理人才梯队建设项目','人力资源部','张三','建立管理人才梯队，提升管理能力','2025-06-05','已完成','组织发展','管理科学','周八','10','中型'],
  ['PRJ20250604005','专业技术人才培养计划','技术研发部','李四','培养专业技术人才，提升技术能力','2025-06-04','进行中','技术创新','云计算','吴九','20','大型']
].map(([id,name,department,owner,description,date,progress,domain,technology,manager,members,difficulty])=>({id,name,department,owner,description,date,progress,domain,technology,manager,members,scale:difficulty,difficulty}));
const generated=Array.from({length:10},(_,index)=>{const number=index+6;const progress=['待启动','进行中','已完成'][index%3];return {id:`PRJ202505${String(30-index).padStart(2,'0')}${String(number).padStart(3,'0')}`,name:`固定种子817人才培养项目${String(number).padStart(2,'0')}`,department:['人力资源部','数字化中心','技术研发部'][index%3],owner:['张三','李四','王五'][index%3],description:`第 ${number} 个确定性人才项目`,date:`2025-05-${String(30-index).padStart(2,'0')}`,progress,domain:['数字化转型','数据管理','技术创新'][index%3],technology:['人工智能','大数据','云计算'][index%3],manager:['赵六','孙七','周八'][index%3],members:String(6+index),scale:['小型','中型','大型'][index%3],difficulty:['简单','中等','复杂'][index%3]};});
export const PROJECT_FIXTURES=Object.freeze([...baseProjects,...generated].map(Object.freeze));

const emptyDraft=()=>({id:'',name:'',department:'',owner:'',description:'',date:'',progress:'',domain:'',technology:'',manager:'',members:'',scale:'',difficulty:''});
const required=['name','department','owner','description','date','progress','domain','technology','manager','members','scale','difficulty'];
const normalize=value=>String(value??'').trim().toLocaleLowerCase('zh-CN');

export function createTalentProjectController(fixtures){
  const originals=fixtures.map(item=>({...item}));
  return reactive({
    fixtures:originals.map(item=>({...item})),filters:{query:'',progress:'',domain:'',manager:'',status:''},page:1,pageSize:10,drawerOpen:false,mode:'create',selectedId:null,draft:emptyDraft(),errors:{},firstError:'',announcement:'',
    get results(){const q=normalize(this.filters.query);return this.fixtures.filter(item=>(!q||normalize(`${item.id} ${item.name} ${item.description}`).includes(q))&&(!this.filters.progress||item.progress===this.filters.progress)&&(!this.filters.domain||item.domain===this.filters.domain)&&(!this.filters.manager||item.manager===this.filters.manager)&&(!this.filters.status||item.progress===this.filters.status));},
    get totalPages(){return Math.max(1,Math.ceil(this.results.length/this.pageSize));},
    get pagedResults(){const start=(this.page-1)*this.pageSize;return this.results.slice(start,start+this.pageSize);},
    setFilter(key,value){this.filters[key]=String(value??'');this.page=1;this.announcement=`查询完成，共 ${this.results.length} 个项目`;},
    resetFilters(){Object.assign(this.filters,{query:'',progress:'',domain:'',manager:'',status:''});this.page=1;this.announcement=`已重置筛选，共 ${this.results.length} 个项目`;},
    setPage(value){this.page=Math.min(this.totalPages,Math.max(1,Number(value)||1));this.announcement=`已切换到第 ${this.page} 页`;},
    setPageSize(value){this.pageSize=[10,20,50].includes(Number(value))?Number(value):10;this.page=1;this.announcement=`已切换为每页 ${this.pageSize} 条`;},
    openCreate(){this.mode='create';this.selectedId=null;this.draft=emptyDraft();this.errors={};this.firstError='';this.drawerOpen=true;this.announcement='已打开新增任务抽屉';},
    openEdit(id){const item=this.fixtures.find(project=>project.id===id);if(!item)return;this.mode='edit';this.selectedId=id;this.draft={...item};this.errors={};this.firstError='';this.drawerOpen=true;this.announcement=`已打开${item.name}编辑抽屉`;},
    setDraft(key,value){this.draft[key]=String(value??'');if(this.errors[key])delete this.errors[key];},
    resetDraft(){if(this.mode==='edit')this.openEdit(this.selectedId);else this.openCreate();this.announcement='已重置任务表单';},
    validate(){const errors={};for(const key of required)if(!String(this.draft[key]??'').trim())errors[key]='此项为必填项';this.errors=errors;this.firstError=required.find(key=>errors[key])||'';return !this.firstError;},
    save(){if(!this.validate()){this.announcement='请完成必填字段';return false;}if(this.mode==='edit'){const index=this.fixtures.findIndex(item=>item.id===this.selectedId);if(index>=0)this.fixtures[index]={...this.draft,id:this.selectedId};}else{const id=`PRJ20260819${String(this.fixtures.length+1).padStart(3,'0')}`;this.fixtures.unshift({...this.draft,id});this.page=1;}this.drawerOpen=false;this.announcement=this.mode==='edit'?'任务已保存':'任务已新增';return true;},
    close(){this.drawerOpen=false;this.errors={};this.firstError='';this.announcement='任务抽屉已关闭';},
    restore(){this.fixtures=originals.map(item=>({...item}));this.resetFilters();this.close();}
  });
}
