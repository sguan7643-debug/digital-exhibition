<script setup>
import { computed } from "vue";
// Reference SHA-256: A93E46949EBAF8861FFC6314A7AB2B05D6D7C99E60CC6B39FF8C925BF56A74E9
const props = defineProps({
  integrationData: { type: Object, default: null },
  integrationState: { type: String, default: "loading" },
});
const overview = computed(() => props.integrationData?.['PTS-001']);
const grouped = computed(() => props.integrationData?.['PTS-003']);
const rules = computed(() => {
  const items = props.integrationData?.['PTS-004']?.items;
  return Array.isArray(items) ? items.map((rule) => ({
    name: rule.ruleName || rule.sourceName || rule.ruleId || "—",
    points: rule.points,
    frequency: rule.frequencyType || "—",
    description: rule.description || "—",
  })) : [];
});
const format = (value) => {
  const number = Number(value);
  return value !== null && value !== undefined && Number.isFinite(number) ? number.toLocaleString("zh-CN") : "—";
};
const stats = computed(() => [
  ["points-current.png", "当前积分", format(overview.value?.account?.balance)],
  ["points-month.png", "本月新增积分", format(overview.value?.month?.earned)],
  ["points-use.png", "本月应用使用积分", format(overview.value?.month?.appUsePoints)],
  ["points-total.png", "累计获得", format(overview.value?.account?.totalEarned)],
]);
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
  return rows.slice(0, 3);
});
const dynamics = computed(
  () =>
    (overview.value?.recentLedgers || [])
      ?.map((item) => [
        item.sourceName || item.pointTypeName || "—",
        item.remark || item.serialNo || "—",
        item.changePoints === null || item.changePoints === undefined ? "—" : `${item.changePoints >= 0 ? "+" : ""}${item.changePoints}`,
        item.occurredAt?.replace("T", " ").slice(0, 16) || "—",
      ])
      .slice(0, 6),
);
const pageState = computed(() => {
  if (props.integrationState === "loading") return "loading";
  if (["authentication-required", "permission-denied"].includes(props.integrationState)) return "permission-denied";
  if (["error", "timeout", "rate-limited", "schema-drift", "security-error"].includes(props.integrationState)) return "error";
  if (props.integrationState === "disabled") return "disabled";
  return overview.value || grouped.value || props.integrationData?.['PTS-004'] ? "normal" : "empty";
});
</script>
<template><article class="points-page" aria-labelledby="points-title"><header><h1 id="points-title">积分中心</h1><p>查看当前积分余额、积分来源与计分规则</p></header><section v-if="pageState === 'loading'" class="points-state" role="status">正在加载积分数据…</section><section v-else-if="pageState === 'permission-denied'" class="points-state" role="alert">需要完成授权或获得积分数据权限后才能查看。</section><section v-else-if="pageState === 'error'" class="points-state" role="alert">积分数据暂时不可用，请稍后重试。</section><section v-else-if="pageState === 'disabled'" class="points-state" role="status">积分真实读取尚未启用。</section><section v-else-if="pageState === 'empty'" class="points-state" role="status">当前没有可展示的积分数据。</section><template v-else><section class="point-stats"><article v-for="stat in stats" :key="stat[1]"><AppIcon :name="stat[0]" :size="72"/><div><small>{{ stat[1] }}</small><strong>{{ stat[2] }}</strong></div></article></section><div class="point-layout"><section class="source-panel"><h2>积分获取来源</h2><div v-if="sources.length"><article v-for="(item,index) in sources" :key="item.name"><span class="source-icon" aria-hidden="true"><AppIcon :name="['usage-visits','points-month','points-use'][index]" :size="52"/></span><h3>{{ item.name || '—' }}</h3><strong>{{ format(item.points) }}</strong><progress v-if="item.percentage != null" :value="item.percentage" max="100">{{ item.percentage }}%</progress><p>占比 {{ item.percentage == null ? '—' : `${item.percentage}%` }}</p></article></div><p v-else class="section-empty">暂无积分来源数据</p><p class="point-tip">积分取值与频次以当前积分规则数据为准。</p><footer><a href="/points/details">积分明细　查看积分获得与变动的详细记录</a><a href="#rule">积分规则　查看积分行为、积分值及频次限制</a></footer></section><section class="dynamic-panel"><h2>最近积分动态 <a href="/points/details">查看更多</a></h2><ul v-if="dynamics.length"><li v-for="item in dynamics" :key="`${item[0]}-${item[3]}`"><AppIcon name="usage-visits" :size="40"/><div><strong>{{ item[0] }}</strong><p>{{ item[1] }}</p></div><b>{{ item[2] }} <small>积分</small></b><time>{{ item[3] }}</time></li></ul><p v-else class="section-empty">暂无积分动态</p></section></div><section id="rule" class="rule-panel"><AppIcon name="points-current" :size="70"/><div><h2>积分规则说明</h2><ul v-if="rules.length"><li v-for="rule in rules" :key="rule.name"><strong>{{ rule.name }}</strong>：每次 {{ format(rule.points) }} 分，{{ rule.frequency }}。{{ rule.description }}</li></ul><p v-else class="section-empty">暂无积分规则</p></div></section></template></article></template>
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
.points-state,.section-empty{display:grid;place-items:center;color:#60748d;text-align:center}.points-state{min-height:320px;margin-top:18px;padding:28px;background:#fff;border:1px solid #dce5ef;border-radius:6px}.points-state[role=alert]{color:#8f2d24}.section-empty{min-height:120px}.rule-panel .section-empty{min-height:56px;justify-items:start}
</style>
