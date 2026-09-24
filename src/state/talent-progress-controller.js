import { reactive } from 'vue';

export const PROGRESS_DOCUMENT_COLUMNS=Object.freeze(['工作计划书','需求问卷','需求说明','蓝图报告','蓝图评审意见','验收材料','交付物','验收意见']);

const blankFilters=()=>({query:'',progress:'',domain:'',stage:'',status:''});
const normalize=value=>String(value??'').trim().toLocaleLowerCase('zh-CN');

export function createTalentProgressController(fixtures=[]){
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
    explainDocument(project,label){this.announcement=`${project.name}的${label}未返回可访问地址`;},
    explainDetail(project){this.announcement=`${project.name}详情仅在当前页说明，不发起网络请求`;}
  });
}
