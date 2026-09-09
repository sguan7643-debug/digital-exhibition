<script setup>
import { computed } from "vue";
// Reference SHA-256: A93E46949EBAF8861FFC6314A7AB2B05D6D7C99E60CC6B39FF8C925BF56A74E9
const props = defineProps({ integrationData: { type: Object, default: null } });
const overview = computed(() => props.integrationData?.['PTS-001']);
const grouped = computed(() => props.integrationData?.['PTS-003']);
const format = (value) => Number(value || 0).toLocaleString("zh-CN");
const stats = computed(() =>
  overview.value
    ? [
        ["points-current.png", "当前积分", format(overview.value.account.balance)],
        ["points-month.png", "本月新增积分", format(overview.value.month.earned)],
        ["points-use.png", "本月应用使用积分", format(overview.value.month.appUsePoints)],
        ["points-total.png", "累计获得", format(overview.value.account.totalEarned)],
      ]
    : [
        ["points-current.png", "当前积分", "2,850"],
        ["points-month.png", "本月新增积分", "320"],
        ["points-use.png", "本月应用使用积分", "40"],
        ["points-total.png", "累计获得", "6,420"],
      ],
);
const sources = computed(() => {
  const rows = grouped.value?.groups?.length
    ? grouped.value.groups.map((item) => ({
        name: item.label,
        points: item.income,
        percentage: item.percentage,
      }))
    : (overview.value?.sources || []).map((item) => ({
        name: item.sourceName,
        points: item.points,
        percentage: item.percentage,
      }));
  return rows.length
    ? rows.slice(0, 3)
    : [
        { name: "应用建设", points: 1320, percentage: 46.3 },
        { name: "培训学习", points: 780, percentage: 27.4 },
        { name: "应用使用", points: 420, percentage: 14.7 },
      ];
});
const dynamics = computed(
  () =>
    overview.value?.recentLedgers
      ?.map((item) => [
        item.sourceName || item.pointTypeName,
        item.remark || item.serialNo,
        `${item.changePoints >= 0 ? "+" : ""}${item.changePoints}`,
        item.occurredAt?.replace("T", " ").slice(5, 16) || "",
      ])
      .slice(0, 6) || [
      ["应用正式上架", "项目经理「合同执行分析看板」", "+30", "05-06 14:20"],
      ["发布有效应用评论", "评论「采购数字化实践分享」", "+2", "05-06 10:05"],
      ["应用使用申请审批通过", "应用「库存周转分析报表」", "+3", "05-05 16:45"],
      ["首次收藏应用", "收藏应用「供应商绩效分析」", "+2", "05-04 11:30"],
      ["首次点击课程学习链接", "课程「物资供应链风险管理」", "+3", "05-03 09:15"],
      ["每日首次进入数智展厅", "产生有效页面访问行为", "+2", "05-02 15:40"],
    ],
);
</script>
<template><article class="points-page" aria-labelledby="points-title"><header><h1 id="points-title">积分中心</h1><p>查看当前积分余额、积分来源与计分规则</p></header><section class="point-stats"><article v-for="stat in stats" :key="stat[1]"><AppIcon :name="stat[0]" :size="72"/><div><small>{{ stat[1] }}</small><strong>{{ stat[2] }}</strong></div></article></section><div class="point-layout"><section class="source-panel"><h2>积分获取来源</h2><div><article v-for="(item,index) in sources" :key="item.name"><span class="source-icon" aria-hidden="true"><AppIcon :name="['usage-visits','points-month','points-use'][index]" :size="52"/></span><h3>{{ item.name }}</h3><strong>{{ format(item.points) }}</strong><progress :value="item.percentage" max="100">{{ item.percentage }}%</progress><p>占比 {{ item.percentage }}%</p></article></div><p class="point-tip">积分来源包括基础活跃、应用互动、应用使用、应用建设和培训学习，具体计分值及频次限制详见积分规则。</p><footer><a href="/points/details">积分明细　查看积分获得与变动的详细记录</a><a href="#rule">积分规则　查看积分行为、积分值及频次限制</a></footer></section><section class="dynamic-panel"><h2>最近积分动态 <a href="/points/details">查看更多</a></h2><ul><li v-for="item in dynamics" :key="`${item[0]}-${item[3]}`"><AppIcon name="usage-visits" :size="40"/><div><strong>{{ item[0] }}</strong><p>{{ item[1] }}</p></div><b>{{ item[2] }} <small>积分</small></b><time>{{ item[3] }}</time></li></ul></section></div><section id="rule" class="rule-panel"><AppIcon name="points-current" :size="70"/><div><h2>积分规则说明</h2><ul><li>积分来源包括基础活跃、应用互动、应用使用、应用建设和培训学习。</li><li>积分按首次、每日、每月或连续周期等规则发放，重复操作不重复累计。</li><li>实际使用、团队推广及版本更新积分需在相关数据可准确获取后启用。</li></ul></div></section></article></template>
<style scoped>.points-page{min-height:100%;overflow:visible;padding:28px 22px;color:#17304f}.points-page h1{margin:0;font-size:25px}.points-page>header p{margin-top:8px;color:#60748d;font-size:14px;line-height:1.6}.point-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:18px 0 12px}.point-stats article{height:115px;display:flex;align-items:center;gap:20px;padding:20px;background:#fff;border:1px solid #dce5ef;border-radius:6px}.point-stats small{display:block;font-size:14px}.point-stats strong{display:block;margin-top:8px;font-size:25px}.point-layout{display:grid;grid-template-columns:1fr 1fr;gap:14px}.source-panel,.dynamic-panel,.rule-panel{background:#fff;border:1px solid #dce5ef;border-radius:6px}.source-panel,.dynamic-panel{padding:18px}.points-page h2{margin:0;color:#0060a6;font-size:18px;line-height:1.45}.source-panel>div{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}.source-panel article{display:grid;grid-template-rows:64px auto auto auto auto;align-items:center;justify-items:center;padding:17px;border:1px solid #dce5ef;border-radius:6px;text-align:center}.source-icon{width:64px;height:64px;display:grid;place-items:center;align-self:center;justify-self:center}.source-icon img{width:52px;height:52px;object-fit:contain}.source-panel h3{margin:10px 0 7px;font-size:14px;line-height:1.4}.source-panel strong{font-size:23px;line-height:1.2}.source-panel progress{width:80%;height:7px;margin-top:13px}.source-panel article p{font-size:13px;line-height:1.55}.point-tip{margin-top:10px;padding:10px;color:#6a7d94;background:#edf5ff;font-size:13px;line-height:1.65}.source-panel footer{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.source-panel footer a{padding:16px;border:1px solid #dce5ef;border-radius:6px;color:#16304f;font-size:13px;line-height:1.6}.dynamic-panel h2 a{float:right;color:#0060a6;font-size:13px;font-weight:400}.dynamic-panel ul{list-style:none;margin:12px 0 0;padding:0}.dynamic-panel li{min-height:66px;display:grid;grid-template-columns:40px minmax(0,1fr) 108px 118px;align-items:center;gap:12px;border-bottom:1px solid #e1e8ef;font-size:14px}.dynamic-panel li div{min-width:0}.dynamic-panel li p{margin:3px 0 0;color:#64788f;font-size:13px;line-height:1.5}.dynamic-panel li>b{display:flex;align-items:baseline;justify-content:flex-end;gap:4px;color:#0060a6;font-size:18px;white-space:nowrap}.dynamic-panel li>b small{font-size:13px}.dynamic-panel li time{white-space:nowrap;text-align:right}.rule-panel{display:flex;align-items:center;gap:24px;margin-top:14px;padding:20px}.rule-panel li{margin:7px 0;font-size:13px;line-height:1.6}a:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:1100px){.point-layout{grid-template-columns:1fr}.point-stats{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.source-panel>div,.point-stats{grid-template-columns:1fr}.dynamic-panel li{grid-template-columns:40px minmax(0,1fr) 86px}.dynamic-panel li time{grid-column:2/-1;text-align:left}}
.points-page h1{font-size:27px}.points-page>header p{font-size:15px;line-height:1.65}.point-stats small{font-size:15px}.point-stats strong{font-size:27px}.source-panel,.dynamic-panel{padding:22px}.points-page h2{font-size:21px}.source-panel>div{gap:14px;margin-top:22px}.source-panel article{grid-template-rows:68px auto auto auto auto;padding:20px 17px}.source-icon{width:68px;height:68px}.source-icon img{width:54px;height:54px}.source-panel h3{margin:12px 0 8px;font-size:16px;line-height:1.45}.source-panel strong{font-size:27px}.source-panel progress{height:8px;margin-top:15px}.source-panel article p{margin:9px 0 0;font-size:14px;line-height:1.6}.point-tip{margin-top:14px;padding:13px 15px;font-size:15px;line-height:1.75}.source-panel footer{gap:14px;margin-top:14px}.source-panel footer a{min-height:58px;display:flex;align-items:center;padding:14px 16px;font-size:14px;line-height:1.65}.dynamic-panel h2 a{font-size:14px}.dynamic-panel ul{margin-top:14px}.dynamic-panel li{min-height:72px;gap:13px;font-size:15px}.dynamic-panel li p{font-size:14px;line-height:1.55}.dynamic-panel li>b{font-size:19px}.dynamic-panel li>b small,.dynamic-panel li time{font-size:14px}.rule-panel{padding:22px}.rule-panel li{margin:8px 0;font-size:14px;line-height:1.7}
.point-stats{grid-template-columns:repeat(4,minmax(0,1fr))}
.point-stats article,.source-panel,.dynamic-panel,.rule-panel,.source-panel article{min-width:0}
.point-layout{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.source-panel>div{grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr))}
.source-panel progress{max-width:100%}
.source-panel footer{grid-template-columns:repeat(2,minmax(0,1fr))}
.source-panel footer a{min-width:0}
@media(max-width:1100px){.point-layout{grid-template-columns:1fr}.point-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.source-panel>div{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.source-panel>div{grid-template-columns:1fr}}
</style>
