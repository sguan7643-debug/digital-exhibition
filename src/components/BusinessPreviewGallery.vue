<script setup>
import { computed } from 'vue';

const props = defineProps({ variant: { type: String, default: 'report' } });
const periods = ['3月','4月','5月','6月','7月','8月'];
const cards = computed(() => props.variant === 'dashboard' ? [
  { title:'经营目标达成', period:'2026年8月', label:'年度目标完成率', value:'78.6%', change:'同比 +4.2%', bars:[48,61,57,69,74,82], targets:[52,57,62,67,72,77] },
  { title:'产量与成本趋势', period:'近6个月', label:'油气当量产量', value:'3,286 万吨', change:'计划达成 101.4%', bars:[54,58,66,63,72,79], targets:[51,56,61,66,71,76] },
  { title:'区域运营对比', period:'截至 08-31', label:'重点单位达标数', value:'18 / 22', change:'较上月 +2 家', bars:[72,52,80,66,61,76], targets:[58,60,62,64,66,68] }
] : [
  { title:'收入与利润总览', period:'2026年8月', label:'累计营业收入', value:'1,286.4 亿元', change:'同比 +8.6%', bars:[42,55,51,64,71,78], targets:[45,50,55,60,65,70] },
  { title:'月度经营趋势', period:'2026年1—8月', label:'利润总额', value:'186.7 亿元', change:'预算达成 103.2%', bars:[44,48,53,59,56,68], targets:[43,47,51,55,59,63] },
  { title:'业务结构分析', period:'截至 08-31', label:'核心业务贡献率', value:'72.8%', change:'同比 +3.1%', bars:[64,71,56,78,68,83], targets:[58,62,66,70,74,78] }
]);
</script>

<template>
  <div class="business-previews" :data-variant="variant">
    <article v-for="(card,index) in cards" :key="card.title" class="business-preview">
      <header><div><strong>{{ card.title }}</strong><small>只读演示数据</small></div><time>{{ card.period }}</time></header>
      <div class="preview-kpi"><span>{{ card.label }}</span><b>{{ card.value }}</b><mark>{{ card.change }}</mark></div>
      <svg viewBox="0 0 360 122" aria-hidden="true" focusable="false">
        <g class="grid-lines"><path d="M28 20H342M28 48H342M28 76H342M28 104H342" /></g>
        <g v-if="index !== 1" class="bars">
          <rect v-for="(height,barIndex) in card.bars" :key="barIndex" :x="45+barIndex*48" :y="106-height" width="24" :height="height" rx="2" />
        </g>
        <g v-else class="trend-line">
          <polyline points="45,82 93,70 141,74 189,48 237,56 285,31" />
          <circle v-for="point in [[45,82],[93,70],[141,74],[189,48],[237,56],[285,31]]" :key="point.join('-')" :cx="point[0]" :cy="point[1]" r="4" />
        </g>
        <g class="axis-labels"><text x="43" y="119">3月</text><text x="139" y="119">5月</text><text x="235" y="119">7月</text><text x="306" y="119">8月</text></g>
      </svg>
      <table class="sr-only">
        <caption>{{ card.title }}趋势数据</caption>
        <thead><tr><th scope="col">周期</th><th scope="col">实际值</th><th scope="col">目标值</th></tr></thead>
        <tbody><tr v-for="(period,periodIndex) in periods" :key="period"><th scope="row">{{ period }}</th><td>{{ card.bars[periodIndex] }}</td><td>{{ card.targets[periodIndex] }}</td></tr></tbody>
      </table>
      <footer><span><i></i>实际值</span><span><i></i>目标区间</span><b>数据更新时间 09-01 08:00</b></footer>
    </article>
  </div>
</template>

<style scoped>
.business-previews{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.business-preview{min-width:0;min-height:262px;padding:16px;color:#203c5c;background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid #d7e3ee;border-radius:7px;box-shadow:0 2px 7px rgba(30,65,100,.06)}.business-preview header{display:flex;justify-content:space-between;gap:12px}.business-preview header div{display:grid;gap:3px}.business-preview header strong{color:#163454;font-size:15px}.business-preview header small,.business-preview time{color:#75889c;font-size:11px}.preview-kpi{display:grid;grid-template-columns:1fr auto;align-items:end;gap:2px 8px;margin:15px 0 4px}.preview-kpi span{grid-column:1/-1;color:#627991;font-size:12px}.preview-kpi b{color:#0f2d52;font-size:23px;line-height:1.25}.preview-kpi mark{padding:3px 6px;color:#16805d;background:#e9f7f1;border-radius:3px;font-size:11px}svg{width:100%;height:auto;display:block;overflow:visible}.grid-lines path{fill:none;stroke:#e6edf4;stroke-width:1}.bars rect{fill:#287bd1}.bars rect:nth-child(even){fill:#8eb9e8}.trend-line polyline{fill:none;stroke:#0060a6;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.trend-line circle{fill:#fff;stroke:#0060a6;stroke-width:2}.axis-labels{fill:#7d8fa1;font-size:9px}.business-preview footer{display:flex;align-items:center;gap:12px;color:#75889b;font-size:10px}.business-preview footer span{display:flex;align-items:center;gap:4px}.business-preview footer i{width:9px;height:4px;display:inline-block;background:#287bd1;border-radius:2px}.business-preview footer span:nth-child(2) i{background:#8eb9e8}.business-preview footer b{margin-left:auto;color:#61758b;font-weight:400}@media(max-width:760px){.business-previews{grid-template-columns:1fr}.business-preview{min-height:230px}}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
</style>
