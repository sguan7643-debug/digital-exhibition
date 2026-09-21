const TYPE_CODE_BY_CATEGORY = Object.freeze({
  可视化: 'T007',
  报表: 'T006',
  RPA: 'T003',
  数据集: 'T008',
  指标: 'T009',
  AI: 'T001',
  海能work应用: 'T005',
  EAD: 'T002',
  其他工具: 'T004',
});

export function buildApplicationDirectorySearchInput({
  query = '',
  category = '',
  domain = '',
  sort = 'default',
} = {}) {
  const type = TYPE_CODE_BY_CATEGORY[String(category).trim()];
  return {
    page: 1,
    pageSize: 100,
    query: String(query).trim(),
    filters: {
      ...(type ? { type } : {}),
      ...(String(domain).trim() ? { domain: String(domain).trim() } : {}),
    },
    sort: ['default', 'usage-desc', 'favorites-desc', 'name'].includes(sort)
      ? sort
      : 'default',
  };
}
