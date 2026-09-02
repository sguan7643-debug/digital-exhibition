const text = Object.freeze({ type: 'string', minLength: 1, maxLength: 256 });
const optionalText = Object.freeze({ type: 'string', maxLength: 256 });
const identifier = Object.freeze({ type: 'string', minLength: 1, maxLength: 128 });
const nonNegativeInteger = Object.freeze({ type: 'integer', minimum: 0, maximum: 100000 });
const countInteger = Object.freeze({ type: 'integer', minimum: 0, maximum: 1000000000 });
const booleanValue = Object.freeze({ type: 'boolean' });
const stringList = Object.freeze({ type: 'array', items: optionalText, maxItems: 100 });

const filterSchema = Object.freeze({
  type: 'object',
  properties: {
    category: optionalText,
    status: optionalText,
    keyword: optionalText,
    owner: optionalText
  },
  additionalProperties: false
});

const recordSchema = Object.freeze({
  type: 'object',
  required: ['id'],
  properties: {
    id: identifier,
    label: optionalText,
    type: optionalText,
    count: nonNegativeInteger
  },
  additionalProperties: false
});

const dataSchema = Object.freeze({
  type: 'object',
  required: ['items'],
  properties: {
    items: Object.freeze({ type: 'array', items: recordSchema, maxItems: 100 }),
    total: nonNegativeInteger,
    page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    pageSize: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    hasMore: Object.freeze({ type: 'boolean' })
  },
  additionalProperties: false
});

export const SYNTHETIC_REQUEST_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    filters: filterSchema,
    page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    pageSize: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    query: optionalText,
    idempotencyKey: identifier,
    ifMatch: identifier,
    isolatedTestRecordId: identifier,
    auditContractId: identifier,
    requestHash: identifier
  },
  additionalProperties: false
});

export const SYNTHETIC_SUCCESS_SCHEMA = Object.freeze({
  type: 'object',
  required: ['code', 'data'],
  properties: {
    code: Object.freeze({ enum: ['OK'] }),
    data: dataSchema,
    traceId: identifier,
    schemaVersion: optionalText,
    sourceUpdatedAt: optionalText,
    dataStale: Object.freeze({ type: 'boolean' }),
    isComplete: Object.freeze({ type: 'boolean' }),
    unavailableReasonCode: optionalText
  },
  additionalProperties: false
});

export const SYNTHETIC_ERROR_SCHEMA = Object.freeze({
  type: 'object',
  required: ['code'],
  properties: {
    code: identifier,
    message: optionalText,
    traceId: identifier,
    retryAfterSeconds: Object.freeze({ type: 'integer', minimum: 1, maximum: 86400 })
  },
  additionalProperties: false
});

export function createSyntheticOperationContracts(operationIds = []) {
  return Object.freeze(Object.fromEntries(operationIds.map(operationId => [operationId, Object.freeze({
    operationId,
    requestSchema: SYNTHETIC_REQUEST_SCHEMA,
    successSchema: SYNTHETIC_SUCCESS_SCHEMA,
    errorSchema: SYNTHETIC_ERROR_SCHEMA,
    contractStatus: 'synthetic-default-off'
  })])));
}

const appFilterSchema = Object.freeze({
  type: 'object',
  properties: {
    type: optionalText, category: optionalText, domain: optionalText,
    scene: optionalText, status: optionalText, owner: optionalText
  },
  additionalProperties: false
});

const appListRequestSchema = Object.freeze({
  type: 'object',
  properties: {
    filters: appFilterSchema,
    page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    pageSize: Object.freeze({ enum: [10, 20, 50, 100] }),
    query: optionalText,
    sort: Object.freeze({ enum: ['default', 'usage-desc', 'favorites-desc', 'name'] })
  },
  additionalProperties: false
});

const emptyRequestSchema = Object.freeze({ type: 'object', properties: {}, additionalProperties: false });
const facetRequestSchema = Object.freeze({
  type: 'object',
  properties: {
    page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    pageSize: Object.freeze({ enum: [10, 20, 50, 100] })
  },
  additionalProperties: false
});
const facetItemSchema = Object.freeze({
  type: 'object', required: ['code', 'name', 'count', 'sortOrder', 'enabled'],
  properties: { code: optionalText, name: optionalText, count: countInteger, sortOrder: countInteger, enabled: booleanValue },
  additionalProperties: false
});
const facetListSchema = Object.freeze({ type: 'array', items: facetItemSchema, maxItems: 100 });
const appItemSchema = Object.freeze({
  type: 'object',
  required: [
    'id', 'appId', 'name', 'typeCode', 'typeName', 'categoryCode', 'categoryName', 'domainId', 'domainName',
    'sceneIds', 'sceneNames', 'keywords', 'summary', 'status', 'usageCount', 'favoriteCount', 'ownerId', 'ownerName',
    'developerId', 'developerName', 'responsibleOrgId', 'responsibleOrgName', 'developerOrgId', 'developerOrgName',
    'updatedAt', 'iconName', 'detailPath'
  ],
  properties: {
    id: identifier, appId: identifier, name: text, typeCode: optionalText, typeName: optionalText,
    categoryCode: optionalText, categoryName: optionalText, domainId: optionalText, domainName: optionalText,
    sceneIds: stringList, sceneNames: stringList, keywords: stringList,
    summary: Object.freeze({ type: 'string', maxLength: 2048 }), status: optionalText,
    usageCount: countInteger, favoriteCount: countInteger,
    ownerId: optionalText, ownerName: optionalText, developerId: optionalText, developerName: optionalText,
    responsibleOrgId: optionalText, responsibleOrgName: optionalText, developerOrgId: optionalText, developerOrgName: optionalText,
    updatedAt: optionalText, iconName: optionalText, detailPath: optionalText
  },
  additionalProperties: false
});

function envelopeSchema(data) {
  return Object.freeze({
    type: 'object', required: ['code', 'data'],
    properties: {
      code: Object.freeze({ enum: ['OK'] }), data, traceId: identifier, schemaVersion: optionalText,
      sourceUpdatedAt: optionalText, dataStale: booleanValue, isComplete: booleanValue,
      unavailableReasonCode: optionalText
    },
    additionalProperties: false
  });
}

const appFacetsDataSchema = Object.freeze({
  type: 'object', required: ['total', 'types', 'categories', 'tags', 'domains', 'scenes', 'facetsVersion'],
  properties: {
    total: countInteger, types: facetListSchema, categories: facetListSchema, tags: facetListSchema,
    domains: facetListSchema, scenes: facetListSchema, facetsVersion: optionalText
  },
  additionalProperties: false
});
const appListDataSchema = Object.freeze({
  type: 'object',
  required: ['items', 'total', 'page', 'pageSize', 'totalPages', 'hasPrevious', 'hasNext', 'hasMore', 'sort', 'filtersApplied', 'facetsVersion'],
  properties: {
    items: Object.freeze({ type: 'array', items: appItemSchema, maxItems: 100 }), total: countInteger,
    page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    pageSize: Object.freeze({ enum: [10, 20, 50, 100] }), totalPages: countInteger,
    hasPrevious: booleanValue, hasNext: booleanValue, hasMore: booleanValue,
    sort: Object.freeze({ enum: ['default', 'usage-desc', 'favorites-desc', 'name'] }),
    filtersApplied: appFilterSchema, facetsVersion: optionalText
  },
  additionalProperties: false
});

const announcementFilterSchema = Object.freeze({
  type: 'object',
  properties: { category: optionalText, status: optionalText, startDate: optionalText, endDate: optionalText },
  additionalProperties: false
});
const announcementListRequestSchema = Object.freeze({
  type: 'object',
  properties: {
    filters: announcementFilterSchema,
    page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    pageSize: Object.freeze({ enum: [10, 20, 50, 100] }),
    query: optionalText,
    sort: Object.freeze({ enum: ['default', 'published-desc', 'published-asc'] })
  },
  additionalProperties: false
});
const announcementItemSchema = Object.freeze({
  type: 'object',
  required: ['id', 'announcementId', 'title', 'category', 'summary', 'status', 'pinned', 'publishedAt'],
  properties: {
    id: identifier, announcementId: identifier, title: text, category: optionalText,
    summary: Object.freeze({ type: 'string', maxLength: 2048 }), status: optionalText,
    pinned: booleanValue, publishedAt: optionalText
  },
  additionalProperties: false
});
const announcementFacetsDataSchema = Object.freeze({
  type: 'object',
  required: ['total', 'weekNew', 'categories', 'statuses', 'readStateAvailable', 'facetsVersion'],
  properties: {
    total: countInteger, weekNew: countInteger, categories: facetListSchema, statuses: facetListSchema,
    readStateAvailable: booleanValue, facetsVersion: optionalText
  },
  additionalProperties: false
});
const announcementListDataSchema = Object.freeze({
  type: 'object',
  required: ['items', 'total', 'page', 'pageSize', 'totalPages', 'hasPrevious', 'hasNext', 'hasMore', 'sort', 'filtersApplied', 'facetsVersion'],
  properties: {
    items: Object.freeze({ type: 'array', items: announcementItemSchema, maxItems: 100 }), total: countInteger,
    page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    pageSize: Object.freeze({ enum: [10, 20, 50, 100] }), totalPages: countInteger,
    hasPrevious: booleanValue, hasNext: booleanValue, hasMore: booleanValue,
    sort: Object.freeze({ enum: ['default', 'published-desc', 'published-asc'] }),
    filtersApplied: announcementFilterSchema, facetsVersion: optionalText
  },
  additionalProperties: false
});

const talentFilterSchema = Object.freeze({
  type: 'object',
  properties: {
    type: optionalText, level: optionalText, specialty: optionalText, status: optionalText,
    department: optionalText, owner: optionalText, project: optionalText, phase: optionalText
  },
  additionalProperties: false
});
const talentListRequestSchema = Object.freeze({
  type: 'object',
  properties: {
    filters: talentFilterSchema,
    page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    pageSize: Object.freeze({ enum: [10, 20, 50, 100] }),
    query: optionalText,
    sort: Object.freeze({ enum: ['default', 'name'] })
  },
  additionalProperties: false
});
const talentPersonSchema = Object.freeze({
  type: 'object',
  required: ['id', 'talentId', 'userId', 'name', 'employeeNo', 'type', 'level', 'specialties', 'status', 'departmentId', 'departmentName'],
  properties: {
    id: identifier, talentId: identifier, userId: identifier, name: text, employeeNo: optionalText,
    type: optionalText, level: optionalText, specialties: stringList, status: optionalText,
    departmentId: optionalText, departmentName: optionalText
  },
  additionalProperties: false
});
const talentProjectSchema = Object.freeze({
  type: 'object',
  required: ['id', 'projectId', 'name', 'type', 'ownerId', 'ownerName', 'status', 'startDate', 'endDate'],
  properties: {
    id: identifier, projectId: identifier, name: text, type: optionalText, ownerId: optionalText,
    ownerName: optionalText, status: optionalText, startDate: optionalText, endDate: optionalText
  },
  additionalProperties: false
});
const talentProgressSchema = Object.freeze({
  type: 'object',
  required: ['id', 'progressId', 'projectId', 'projectName', 'phaseName', 'status', 'updatedAt'],
  properties: {
    id: identifier, progressId: identifier, projectId: identifier, projectName: optionalText,
    phaseName: optionalText, status: optionalText, updatedAt: optionalText
  },
  additionalProperties: false
});
function talentListDataSchema(itemSchema) {
  return Object.freeze({
    type: 'object',
    required: ['items', 'total', 'page', 'pageSize', 'totalPages', 'hasPrevious', 'hasNext', 'hasMore', 'filtersApplied', 'facetsVersion'],
    properties: {
      items: Object.freeze({ type: 'array', items: itemSchema, maxItems: 100 }), total: countInteger,
      page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
      pageSize: Object.freeze({ enum: [10, 20, 50, 100] }), totalPages: countInteger,
      hasPrevious: booleanValue, hasNext: booleanValue, hasMore: booleanValue,
      filtersApplied: talentFilterSchema, facetsVersion: optionalText
    },
    additionalProperties: false
  });
}
const talentFacetsDataSchema = Object.freeze({
  type: 'object',
  required: ['types', 'levels', 'specialties', 'statuses', 'departments', 'facetsVersion'],
  properties: {
    types: facetListSchema, levels: facetListSchema, specialties: facetListSchema,
    statuses: facetListSchema, departments: facetListSchema, facetsVersion: optionalText
  },
  additionalProperties: false
});

const organizationRequestSchema = Object.freeze({
  type: 'object',
  properties: {
    rootId: optionalText, keyword: optionalText, orgType: optionalText, enabled: booleanValue,
    includeUsers: booleanValue, maxDepth: Object.freeze({ type: 'integer', minimum: 1, maximum: 20 })
  },
  additionalProperties: false
});
const organizationNodeSchema = Object.freeze({
  type: 'object',
  required: [
    'orgId', 'orgCode', 'orgName', 'orgType', 'parentId', 'pathIds', 'pathNames', 'level',
    'sortOrder', 'enabled', 'hasChildren', 'userCount', 'children'
  ],
  properties: {
    orgId: identifier, orgCode: optionalText, orgName: text, orgType: optionalText, parentId: optionalText,
    pathIds: stringList, pathNames: stringList, level: countInteger, sortOrder: countInteger,
    enabled: booleanValue, hasChildren: booleanValue, userCount: countInteger,
    children: Object.freeze({ type: 'array', items: Object.freeze({ type: 'object' }), maxItems: 100 })
  },
  additionalProperties: false
});
const organizationDataSchema = Object.freeze({
  type: 'object',
  required: ['items', 'includeUsers', 'userCount', 'total', 'source'],
  properties: {
    items: Object.freeze({ type: 'array', items: organizationNodeSchema, maxItems: 100 }),
    includeUsers: booleanValue, userCount: countInteger, total: countInteger, source: optionalText
  },
  additionalProperties: false
});
const contactUserRequestSchema = Object.freeze({
  type: 'object',
  properties: {
    keyword: optionalText, employeeNo: optionalText, orgId: optionalText, departmentId: optionalText,
    enabled: booleanValue, page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    pageSize: Object.freeze({ enum: [10, 20, 50, 100] }), sort: Object.freeze({ enum: ['name,asc'] })
  },
  additionalProperties: false
});
const contactUserItemSchema = Object.freeze({
  type: 'object',
  required: [
    'userId', 'employeeNo', 'displayName', 'avatarUrl', 'orgId', 'orgName', 'departmentId',
    'departmentName', 'officeId', 'officeName', 'title', 'mobileMasked', 'emailMasked', 'enabled'
  ],
  properties: {
    userId: identifier, employeeNo: optionalText, displayName: text, avatarUrl: optionalText,
    orgId: optionalText, orgName: optionalText, departmentId: optionalText, departmentName: optionalText,
    officeId: optionalText, officeName: optionalText, title: optionalText, mobileMasked: optionalText,
    emailMasked: optionalText, enabled: booleanValue
  },
  additionalProperties: false
});
const contactFiltersSchema = Object.freeze({
  type: 'object',
  properties: {
    keyword: optionalText, employeeNo: optionalText, orgId: optionalText, departmentId: optionalText, enabled: booleanValue
  },
  additionalProperties: false
});
const contactUserDataSchema = Object.freeze({
  type: 'object',
  required: [
    'items', 'total', 'page', 'pageSize', 'totalPages', 'hasPrevious', 'hasNext', 'hasMore',
    'sort', 'filtersApplied', 'source'
  ],
  properties: {
    items: Object.freeze({ type: 'array', items: contactUserItemSchema, maxItems: 100 }), total: countInteger,
    page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }), pageSize: Object.freeze({ enum: [10, 20, 50, 100] }),
    totalPages: countInteger, hasPrevious: booleanValue, hasNext: booleanValue, hasMore: booleanValue,
    sort: Object.freeze({ enum: ['name,asc'] }), filtersApplied: contactFiltersSchema, source: optionalText
  },
  additionalProperties: false
});

export function createAppReadOperationContracts() {
  return Object.freeze({
    'APP-001': Object.freeze({
      operationId: 'APP-001', requestSchema: facetRequestSchema,
      successSchema: envelopeSchema(appFacetsDataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA,
      contractStatus: 'server-projection-verified'
    }),
    'APP-002': Object.freeze({
      operationId: 'APP-002', requestSchema: appListRequestSchema,
      successSchema: envelopeSchema(appListDataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA,
      contractStatus: 'server-projection-verified'
    })
  });
}

export function createAnnouncementReadOperationContracts() {
  return Object.freeze({
    'ANN-001': Object.freeze({
      operationId: 'ANN-001', requestSchema: facetRequestSchema,
      successSchema: envelopeSchema(announcementFacetsDataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA,
      contractStatus: 'server-projection-verified'
    }),
    'ANN-002': Object.freeze({
      operationId: 'ANN-002', requestSchema: announcementListRequestSchema,
      successSchema: envelopeSchema(announcementListDataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA,
      contractStatus: 'server-projection-verified'
    })
  });
}

export function createTalentReadOperationContracts() {
  const listContract = (operationId, itemSchema) => Object.freeze({
    operationId, requestSchema: talentListRequestSchema,
    successSchema: envelopeSchema(talentListDataSchema(itemSchema)), errorSchema: SYNTHETIC_ERROR_SCHEMA,
    contractStatus: 'server-projection-verified'
  });
  return Object.freeze({
    'TAL-001': listContract('TAL-001', talentPersonSchema),
    'TAL-002': listContract('TAL-002', talentProjectSchema),
    'TAL-003': listContract('TAL-003', talentProgressSchema),
    'TAL-005': Object.freeze({
      operationId: 'TAL-005', requestSchema: facetRequestSchema,
      successSchema: envelopeSchema(talentFacetsDataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA,
      contractStatus: 'server-projection-verified'
    })
  });
}

export function createContactReadOperationContracts() {
  return Object.freeze({
    'COM-003': Object.freeze({
      operationId: 'COM-003', requestSchema: organizationRequestSchema,
      successSchema: envelopeSchema(organizationDataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA,
      contractStatus: 'official-contact-v3-verified'
    }),
    'COM-004': Object.freeze({
      operationId: 'COM-004', requestSchema: contactUserRequestSchema,
      successSchema: envelopeSchema(contactUserDataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA,
      contractStatus: 'official-contact-v3-verified'
    })
  });
}

export function createVerifiedReadOperationContracts() {
  return Object.freeze({
    ...createAppReadOperationContracts(),
    ...createAnnouncementReadOperationContracts(),
    ...createTalentReadOperationContracts(),
    ...createContactReadOperationContracts()
  });
}

function typeMatches(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'null') return value === null;
  return typeof value === type && (type !== 'object' || value !== null && !Array.isArray(value));
}

export function validateContractSchema(value, schema, path = 'payload') {
  if (!schema || typeof schema !== 'object') throw new Error(`${path} 缺少受控 schema`);
  if (schema.anyOf) {
    const errors = [];
    for (const candidate of schema.anyOf) {
      try { return validateContractSchema(value, candidate, path); } catch (error) { errors.push(error); }
    }
    throw new Error(`${path} 不符合任一允许结构`);
  }
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path} 不在允许枚举内`);
  if (schema.type && !typeMatches(value, schema.type)) throw new Error(`${path} 类型不符合合同，期望 ${schema.type}`);
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) throw new Error(`${path} 长度不足`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) throw new Error(`${path} 长度超出合同`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) throw new Error(`${path} 小于最小值`);
    if (schema.maximum !== undefined && value > schema.maximum) throw new Error(`${path} 大于最大值`);
  }
  if (Array.isArray(value)) {
    if (schema.maxItems !== undefined && value.length > schema.maxItems) throw new Error(`${path} 数量超出合同`);
    value.forEach((item, index) => validateContractSchema(item, schema.items, `${path}[${index}]`));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) throw new Error(`${path}.${key} 为必填字段`);
    const properties = schema.properties || {};
    for (const [key, child] of Object.entries(value)) {
      if (!Object.hasOwn(properties, key)) {
        if (schema.additionalProperties === false) throw new Error(`${path}.${key} 未在合同 schema 中声明`);
        if (schema.additionalProperties && typeof schema.additionalProperties === 'object') validateContractSchema(child, schema.additionalProperties, `${path}.${key}`);
        continue;
      }
      validateContractSchema(child, properties[key], `${path}.${key}`);
    }
  }
  return value;
}
