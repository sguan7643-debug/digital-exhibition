import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/AppsPage.vue', import.meta.url), 'utf8');

assert.doesNotMatch(
  source,
  /class="app-type-overview"/,
  '应用中心默认首屏不得插入权威参考中不存在的应用类型统计区'
);
assert.match(
  source,
  /<header>[\s\S]*?<\/header>\s*<form class="apps-filter"/,
  '应用中心标题之后必须直接进入筛选区'
);
assert.match(source, /props\.integrationData\?\.\['APP-001'\]/,
  '移除额外统计区不得删除应用筛选元数据适配');
assert.match(source, /props\.integrationData\?\.\['APP-002'\]\?\.items/,
  '移除额外统计区不得删除真实应用列表适配');
assert.match(source, /<PaginationControl[\s\S]*?:page-size="controller\.pageSize"/,
  '应用结果仍须保留共享分页和完整数据访问能力');

console.log('应用中心权威首屏结构与集成保留合同通过');
