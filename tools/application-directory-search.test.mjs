import assert from 'node:assert/strict';
import { buildApplicationDirectorySearchInput } from '../src/integration/application-directory-search.js';

assert.deepEqual(
  buildApplicationDirectorySearchInput({
    query: '供应商',
    category: '可视化',
    domain: '经营管理',
    sort: 'usage-desc',
  }),
  {
    page: 1,
    pageSize: 100,
    query: '供应商',
    filters: { type: 'T007', domain: '经营管理' },
    sort: 'usage-desc',
  },
  '远程查询必须把页面的可视化分类转换为应用索引支持的 T007，并保留关键词、主题域和排序',
);

assert.deepEqual(
  buildApplicationDirectorySearchInput({ category: '', domain: '', sort: 'default' }),
  { page: 1, pageSize: 100, query: '', filters: {}, sort: 'default' },
  '空条件查询必须显式重新读取完整应用索引，而非只在空的浏览器列表中筛选',
);

console.log('应用中心远程查询输入映射通过');
