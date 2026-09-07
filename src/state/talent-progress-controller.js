import { reactive } from 'vue';

export const PROGRESS_DOCUMENT_COLUMNS=Object.freeze(['工作计划书','需求问卷','需求说明','蓝图报告','蓝图评审意见','验收材料','交付物','验收意见']);

const rawRows=[
  ['PRJ20250608001','海上平台数字化人才培养项目','进行中','2025-08-31','中等','85','方案设计','2025-05-30','数字化转型','正常',[1,1,1,1,1,0,0,'85分']],
  ['PRJ20250607002','数据分析人才提升计划','已完成','2025-06-30','中型','95','项目完成','2025-06-30','数据管理','已归档',[1,1,1,1,1,0,0,'--']],
  ['PRJ20250606003','AI应用开发人才储备项目','进行中','2025-09-20','大型','80','开发实施','2025-06-15','技术创新','正常',[1,1,1,1,1,0,0,'80分']],
  ['PRJ20250605004','管理人才梯队建设项目','进行中','2025-10-31','中等','75','需求分析','2025-06-10','组织发展','正常',[1,1,1,1,1,0,0,'--']],
  ['PRJ20250604005','专业技术人才培养计划','进行中','2025-08-15','大型','88','开发实施','2025-06-05','技术创新','正常',[1,1,1,1,1,0,0,'--']],
  ['PRJ20250603006','国际化人才培养项目','暂停中','2025-07-31','大型','70','测试验证','2025-05-20','国际业务','暂停',[1,1,1,1,1,0,0,'--']],
  ['PRJ20250602007','青年人才成长计划','未开始','2025-11-30','中型','--','项目启动','--','组织发展','待启动',[0,0,0,0,0,0,0,'--']],
  ['PRJ20250601008','技能提升培训项目','未开始','2025-09-30','中等','--','项目启动','--','人力资源','待启动',[0,0,0,0,0,0,0,'--']]
];

export const PROGRESS_FIXTURES=Object.freeze(rawRows.map(([id,name,progress,date,scale,score,stage,milestone,domain,status,documentValues])=>Object.freeze({
  id,name,progress,date,scale,score,stage,milestone,domain,status,
  documents:Object.freeze(Object.fromEntries(PROGRESS_DOCUMENT_COLUMNS.map((label,index)=>[label,documentValues[index]])))
})));

const blankFilters=()=>({query:'',progress:'',domain:'',stage:'',status:''});
const normalize=value=>String(value??'').trim().toLocaleLowerCase('zh-CN');

export function createTalentProgressController(fixtures=PROGRESS_FIXTURES){
  return reactive({
    fixtures:[...fixtures],draft:blankFilters(),filters:blankFilters(),page:1,pageSize:10,announcement:'',
    get results(){
      const query=normalize(this.filters.query);
      return this.fixtures.filter(project=>(!query||normalize(`${project.id} ${project.name}`).includes(query))
        &&(!this.filters.progress||project.progress===this.filters.progress)
        &&(!this.filters.domain||project.domain===this.filters.domain)
        &&(!this.filters.stage||project.stage===this.filters.stage)
        &&(!this.filters.status||project.status===this.filters.status));
    },
    get totalPages(){return Math.max(1,Math.ceil(this.results.length/this.pageSize));},
    get pagedResults(){const start=(this.page-1)*this.pageSize;return this.results.slice(start,start+this.pageSize);},
    submit(){Object.assign(this.filters,this.draft);this.page=1;this.announcement=`查询完成，共 ${this.results.length} 个项目`;},
    reset(){Object.assign(this.draft,blankFilters());Object.assign(this.filters,blankFilters());this.page=1;this.announcement=`已重置筛选，共 ${this.results.length} 个项目`;},
    setPage(value){this.page=Math.min(this.totalPages,Math.max(1,Number(value)||1));this.announcement=`已切换到第 ${this.page} 页`;},
    setPageSize(value){this.pageSize=[10,20,50].includes(Number(value))?Number(value):10;this.page=1;this.announcement=`已切换为每页 ${this.pageSize} 条`;},
    explainDocument(project,label){this.announcement=`${project.name}的${label}仅作本地说明，不打开外链`;},
    explainDetail(project){this.announcement=`${project.name}详情仅在当前页说明，不发起网络请求`;}
  });
}
