import { reactive } from 'vue';

const periodFixtures = Object.freeze({
  day: { range: ['2026-08-19', '2026-08-19'], factor: 0.18 },
  week: { range: ['2026-08-13', '2026-08-19'], factor: 1 },
  month: { range: ['2026-08-01', '2026-08-19'], factor: 3.2 },
  quarter: { range: ['2026-07-01', '2026-08-19'], factor: 8.6 }
});
const metricBase = [12856, 28734, 4392, 8, 1643];
const metricLabels = ['累计访问量', '应用累计次数', '活跃用户', '热门应用数', '通过应用人数'];
const trendBase = [1162, 1143, 1081, 1622, 2219, 2439, 3200];

export function createOperationsController() {
  return reactive({
    period: 'week', range: { start: '2026-08-13', end: '2026-08-19' }, announcement: '', revision: 0,
    get factor() { return periodFixtures[this.period]?.factor ?? 1.4; },
    get rangeLabel() { return `${this.range.start} 至 ${this.range.end}`; },
    get stats() { return metricBase.map((value, index) => ({ label: metricLabels[index], value: index === 3 ? Math.max(1, Math.round(value * Math.min(this.factor, 1.5))) : Math.round(value * this.factor).toLocaleString('zh-CN'), change: `${(3.1 + index * 1.7).toFixed(1)}%` })); },
    get trend() { return trendBase.map((value, index) => Math.round(value * this.factor * (1 + this.revision * 0.01 * (index + 1)))); },
    setPeriod(period) { if (!periodFixtures[period]) return; this.period = period; const [start, end] = periodFixtures[period].range; this.range = { start, end }; this.announcement = `已切换到${{day:'日',week:'周',month:'月',quarter:'季度'}[period]}统计，${this.rangeLabel}`; },
    setRange(key, value) { if (!['start', 'end'].includes(key) || !value) return; this.range[key] = value; this.period = 'custom'; this.announcement = `已更新统计区间，${this.rangeLabel}`; },
    refresh() { this.revision += 1; this.announcement = `数据已刷新，统计区间 ${this.rangeLabel}`; }
  });
}
