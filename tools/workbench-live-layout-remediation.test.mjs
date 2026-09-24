import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/pages/WorkbenchPage.vue', import.meta.url), 'utf8');

assert.doesNotMatch(source, /\['数据更新时间'/, '数据更新时间已在欢迎区展示，不得作为第四个使用统计项溢出卡片');
assert.match(
  source,
  /\.overview-panel\{[^}]*height:auto[^}]*min-height:144px/,
  '应用类型数量超过一行时概览面板必须自动增高'
);
assert.match(
  source,
  /\.overview-list\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)[^}]*grid-auto-rows:minmax\(79px,auto\)/,
  '应用类型概览必须使用稳定的六列自适应网格，禁止第二行溢出'
);

console.log('workbench live-data cards remain inside their panels');
