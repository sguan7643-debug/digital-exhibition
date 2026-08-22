import { reactive } from 'vue';
const normalize=value=>String(value??'').trim().toLocaleLowerCase('zh-CN');
export const HOT_APP_FIXTURES=Object.freeze([
  {id:'hot-supplier',name:'供应商评估看板',type:'帆软报表',scene:'供应链管理',description:'基于多维度指标对供应商进行综合评估与可视化分析。',count:'2,375',image:'/assets/hot-supplier.png',route:'/apps/report-001'},
  {id:'hot-inventory',name:'库存周转分析报表',type:'帆软报表',scene:'供应链管理',description:'分析库存周转效率，优化库存结构，降低库存成本。',count:'1,876',image:'/assets/hot-inventory.png',route:'/apps/report-001'},
  {id:'hot-rpa',name:'增值税发票查验机器人',type:'RPA机器人',scene:'财务管理',description:'自动查验发票真伪与税号，提升发票处理效率与准确性。',count:'1,542',image:'/assets/hot-rpa.png',route:'/apps/rpa-001'},
  {id:'hot-invoice',name:'电子发票录入校验',type:'EAD应用',scene:'财务管理',description:'电子发票信息自动录入与校验，提质增效录入准确率。',count:'1,291',image:'/assets/hot-invoice.png',route:'/apps/ead-001'}
]);
export function createWorkbenchController(fixtures){return reactive({fixtures:[...fixtures],query:'',scene:'',announcement:'',get results(){const q=normalize(this.query);return this.fixtures.filter(item=>(!this.scene||item.scene===this.scene)&&(!q||normalize(`${item.name} ${item.type} ${item.description}`).includes(q)));},setQuery(value){this.query=value;this.announcement=`工作台筛选完成，共 ${this.results.length} 个热门应用`;},setScene(value){this.scene=value;this.announcement=`工作台筛选完成，共 ${this.results.length} 个热门应用`;},reset(){this.query='';this.scene='';this.announcement='已恢复全部热门应用';}});}
export function createProfileController(){return reactive({readIds:[],announcement:'',markRead(id){if(!this.readIds.includes(id))this.readIds.push(id);this.announcement='最近消息已标记为已读';},isRead(id){return this.readIds.includes(id);},explain(label){this.announcement=`${label}：本演示未提供独立页面`;}});}
