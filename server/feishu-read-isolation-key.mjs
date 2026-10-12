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

export function normalizeReadPrincipal(requestContext = {}) {
  const identity = requestContext?.identity || {};
  // The browser session starts with the AD account and may acquire Feishu
  // aliases after live authorization.  The AD account is therefore the stable
  // principal for the lifetime of that session; aliases must not split cache
  // entries or task ownership.
  return text(identity.adAccount || identity.userId || identity.openId).trim();
}

export function normalizeReadIdentity(requestContext = {}) {
  const identity = requestContext?.identity || {};
  return Object.freeze({
    tenant: text(identity.tenantKey || identity.tenantId || 'default-tenant'),
    identity: Object.freeze({
      principalId: normalizeReadPrincipal(requestContext)
    }),
    permissions: Object.freeze(sortedUnique(identity.permissions)),
    dataScope: Object.freeze(sortedUnique(identity.dataScope || identity.departmentId || ''))
  });
}

export function normalizeReadInput(operationId, input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  if (operationId === 'COM-001') return Object.freeze({});
  if (operationId === 'COM-003') {
    return stableValue({
      rootId: text(source.rootId).trim(),
      keyword: text(source.keyword).trim().toLocaleLowerCase('zh-CN'),
      orgType: text(source.orgType).trim().toLocaleUpperCase('zh-CN'),
      enabled: source.enabled == null ? undefined : source.enabled === true,
      includeUsers: source.includeUsers === true,
      maxDepth: source.maxDepth == null ? 20 : source.maxDepth
    });
  }
  if (operationId === 'COM-004') {
    if (source.includeContact === true) {
      return stableValue({
        userId: text(source.userId).trim(),
        includeContact: true,
        page: source.page == null ? 1 : source.page,
        pageSize: source.pageSize == null ? 10 : source.pageSize,
        sort: text(source.sort).trim() || 'name,asc'
      });
    }
    return stableValue({
      keyword: text(source.keyword).trim().toLocaleLowerCase('zh-CN'),
      userId: text(source.userId).trim(),
      employeeNo: text(source.employeeNo).trim(),
      orgId: text(source.orgId).trim(),
      departmentId: text(source.departmentId).trim(),
      enabled: source.enabled == null ? undefined : source.enabled === true,
      includeContact: false,
      page: source.page == null ? 1 : source.page,
      pageSize: source.pageSize == null ? 10 : source.pageSize,
      sort: text(source.sort).trim() || 'name,asc'
    });
  }
  if (operationId === 'APP-003') {
    return stableValue({
      appId: text(source.appId).trim(),
      include: sortedUnique(source.include)
    });
  }
  if (operationId === 'MAT-002') {
    return stableValue({
      query: text(source.query || source.keyword).trim().toLocaleLowerCase('zh-CN'),
      materialType: text(source.materialType).trim(),
      categoryId: text(source.categoryId).trim(),
      appTypeCode: text(source.appTypeCode).trim(),
      domainId: text(source.domainId).trim(),
      relatedAppId: text(source.relatedAppId).trim(),
      status: text(source.status).trim(),
      page: source.page == null ? 1 : source.page,
      pageSize: source.pageSize == null ? 10 : source.pageSize,
      sort: text(source.sort).trim() || 'updatedAt,desc'
    });
  }
  if (operationId === 'FAV-002') {
    return stableValue({
      resourceType: text(source.resourceType).trim().toLocaleUpperCase('zh-CN'),
      tagCode: text(source.tagCode).trim(),
      page: source.page == null ? 1 : source.page,
      pageSize: source.pageSize == null ? 10 : source.pageSize,
      sort: text(source.sort).trim() || 'favoritedAt,desc'
    });
  }
  if (operationId === 'ADM-003') {
    return stableValue({
      keyword: text(source.keyword).trim(),
      operatorId: text(source.operatorId).trim(),
      operatorOrgId: text(source.operatorOrgId).trim(),
      moduleCode: text(source.moduleCode).trim(),
      resourceType: text(source.resourceType).trim(),
      resourceId: text(source.resourceId).trim(),
      actionCode: text(source.actionCode).trim(),
      resultCode: text(source.resultCode).trim(),
      requestId: text(source.requestId).trim(),
      ip: text(source.ip).trim(),
      startAt: text(source.startAt).trim(),
      endAt: text(source.endAt).trim(),
      page: source.page == null ? 1 : source.page,
      pageSize: source.pageSize == null ? 10 : source.pageSize,
      sort: text(source.sort).trim()
    });
  }
  if (operationId === 'MAT-001') {
    return stableValue({
      query: text(source.query).trim().toLocaleLowerCase('zh-CN'),
      keyword: text(source.keyword).trim().toLocaleLowerCase('zh-CN'),
      materialType: text(source.materialType).trim(),
      appTypeCode: text(source.appTypeCode).trim(),
      domainId: text(source.domainId).trim(),
      categoryId: text(source.categoryId).trim()
    });
  }
  if (operationId === 'COM-005') {
    return stableValue({
      dictTypes: sortedUnique(source.dictTypes),
      parentValues: stableValue(source.parentValues || {}),
      includeDisabled: source.includeDisabled === true
    });
  }
  if (operationId === 'APP-002') {
    return stableValue({
      page: source.page == null ? 1 : source.page,
      pageSize: source.pageSize == null ? 10 : source.pageSize,
      query: source.query == null ? '' : text(source.query).toLocaleLowerCase('zh-CN'),
      filters: source.filters || {},
      sort: source.sort || 'default'
    });
  }
  if (operationId === 'WB-002') {
    return stableValue({
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
  // v4 invalidates v3 snapshots whose identity aliases and internal task
  // metadata could produce unstable keys for one authenticated principal.
  return `read-v4\u0000${fingerprintReadIsolation(createReadIsolationDescriptor(operationId, input, requestContext))}`;
}
