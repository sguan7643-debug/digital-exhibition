import { createHash } from 'node:crypto';

function text(value) {
  return value == null ? '' : String(value);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value)
    .filter(key => value[key] !== undefined)
    .sort()
    .map(key => [key, stableValue(value[key])]));
}

function sortedUnique(values) {
  return [...new Set((Array.isArray(values) ? values : String(values || '').split(','))
    .map(value => text(value).trim())
    .filter(Boolean))].sort();
}

export function fingerprintReadIsolation(value) {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex').slice(0, 32);
}

export function normalizeReadIdentity(requestContext = {}) {
  const identity = requestContext?.identity || {};
  return Object.freeze({
    tenant: text(identity.tenantKey || identity.tenantId || 'default-tenant'),
    identity: Object.freeze({
      userId: text(identity.userId),
      openId: text(identity.openId),
      adAccount: text(identity.adAccount)
    }),
    permissions: Object.freeze(sortedUnique(identity.permissions)),
    dataScope: Object.freeze(sortedUnique(identity.dataScope || identity.departmentId || ''))
  });
}

export function normalizeReadInput(operationId, input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  if (operationId === 'COM-005') {
    return stableValue({
      ...source,
      dictTypes: sortedUnique(source.dictTypes),
      parentValues: stableValue(source.parentValues || {}),
      includeDisabled: source.includeDisabled === true
    });
  }
  if (operationId === 'APP-002') {
    return stableValue({
      ...source,
      page: source.page == null ? 1 : source.page,
      pageSize: source.pageSize == null ? 10 : source.pageSize,
      query: source.query == null ? '' : text(source.query).toLocaleLowerCase('zh-CN'),
      filters: source.filters || {},
      sort: source.sort || 'default'
    });
  }
  if (operationId === 'WB-002') {
    return stableValue({
      ...source,
      keyword: source.keyword == null ? '' : text(source.keyword).trim().toLocaleLowerCase('zh-CN'),
      scene: source.scene == null ? '' : source.scene,
      typeCode: source.typeCode == null ? '' : source.typeCode,
      page: source.page == null ? 1 : source.page,
      pageSize: source.pageSize == null ? 10 : source.pageSize,
      sort: source.sort || 'RELEVANCE'
    });
  }
  if (operationId === 'WB-001') {
    return stableValue({
      ...source,
      statDate: source.statDate == null ? '' : source.statDate,
      scene: source.scene == null ? '' : source.scene,
      keyword: source.keyword == null ? '' : source.keyword,
      hotLimit: source.hotLimit == null ? 4 : source.hotLimit,
      courseLimit: source.courseLimit == null ? 3 : source.courseLimit,
      noticeLimit: source.noticeLimit == null ? 4 : source.noticeLimit
    });
  }
  if (operationId === 'WB-003') {
    return stableValue({
      ...source,
      recentMessageLimit: source.recentMessageLimit == null ? 5 : source.recentMessageLimit,
      todoLimit: source.todoLimit == null ? 5 : source.todoLimit
    });
  }
  return stableValue(source);
}

export function createReadIsolationDescriptor(operationId, input = {}, requestContext = {}) {
  const scope = normalizeReadIdentity(requestContext);
  return Object.freeze({
    tenant: scope.tenant,
    identity: scope.identity,
    permissions: scope.permissions,
    dataScope: scope.dataScope,
    operation: String(operationId || ''),
    parameters: normalizeReadInput(operationId, input)
  });
}

export function createReadIsolationKey(operationId, input = {}, requestContext = {}) {
  return `read-v2\u0000${fingerprintReadIsolation(createReadIsolationDescriptor(operationId, input, requestContext))}`;
}
