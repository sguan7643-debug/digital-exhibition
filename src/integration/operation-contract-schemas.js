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

export function createVerifiedReadOperationContracts() {
  return Object.freeze({ ...createAppReadOperationContracts(), ...createAnnouncementReadOperationContracts() });
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
