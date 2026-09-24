import { reactive } from 'vue';

const emptyDraft=()=>({id:'',name:'',department:'',owner:'',description:'',date:'',progress:'',domain:'',technology:'',manager:'',members:'',scale:'',difficulty:''});
const required=['name','department','owner','description','date','progress','domain','technology','manager','members','scale','difficulty'];
const normalize=value=>String(value??'').trim().toLocaleLowerCase('zh-CN');

export function createTalentProjectController(fixtures = []){
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
    save(){this.announcement='正式人才写入接口尚未启用';return false;},
    close(){this.drawerOpen=false;this.errors={};this.firstError='';this.announcement='任务抽屉已关闭';},
    restore(){this.fixtures=originals.map(item=>({...item}));this.resetFilters();this.close();}
  });
}
