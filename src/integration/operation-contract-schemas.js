const text = Object.freeze({ type: 'string', minLength: 1, maxLength: 256 });
const optionalText = Object.freeze({ type: 'string', maxLength: 256 });
const identifier = Object.freeze({ type: 'string', minLength: 1, maxLength: 128 });
const nonNegativeInteger = Object.freeze({ type: 'integer', minimum: 0, maximum: 100000 });
const countInteger = Object.freeze({ type: 'integer', minimum: 0, maximum: 1000000000 });
const signedInteger = Object.freeze({ type: 'integer', minimum: -1000000000, maximum: 1000000000 });
const booleanValue = Object.freeze({ type: 'boolean' });
const stringList = Object.freeze({ type: 'array', items: optionalText, maxItems: 100 });
const nullableText = Object.freeze({ anyOf: [optionalText, Object.freeze({ type: 'null' })] });
const nullableInteger = Object.freeze({ anyOf: [Object.freeze({ type: 'integer', minimum: 1, maximum: 5 }), Object.freeze({ type: 'null' })] });
const nullableBoolean = Object.freeze({ anyOf: [booleanValue, Object.freeze({ type: 'null' })] });

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

export function createVerifiedWriteOperationContracts(operationIds = []) {
  const writeRequestSchema = Object.freeze({
    type: 'object', required: ['businessKey', 'idempotencyKey', 'fields'],
    properties: {
      businessKey: identifier,
      idempotencyKey: identifier,
      ifMatch: Object.freeze({ type: 'integer', minimum: 1, maximum: 1000000000 }),
      fields: Object.freeze({ type: 'object', additionalProperties: true })
    },
    additionalProperties: false
  });
  const writeDataSchema = Object.freeze({
    type: 'object',
    required: ['operationId', 'tableName', 'businessKey', 'recordId', 'version', 'replayed', 'deleted', 'alreadyAbsent'],
    properties: {
      operationId: identifier, tableName: text, businessKey: identifier, recordId: optionalText,
      version: nonNegativeInteger, replayed: booleanValue, deleted: booleanValue, alreadyAbsent: booleanValue
    },
    additionalProperties: false
  });
  return Object.freeze(Object.fromEntries(operationIds.map(operationId => [operationId, Object.freeze({
    operationId,
    requestSchema: writeRequestSchema,
    successSchema: envelopeSchema(writeDataSchema),
    errorSchema: SYNTHETIC_ERROR_SCHEMA,
    contractStatus: 'test-write-server-projection-verified'
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
const appDetailCountItemSchema = Object.freeze({
  type: 'object', required: ['tableName', 'category', 'count'],
  properties: { tableName: optionalText, category: optionalText, count: countInteger },
  additionalProperties: false
});
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
    versionName: optionalText, updatedAt: optionalText, iconName: optionalText, detailPath: optionalText
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
  type: 'object', required: ['total', 'types', 'categories', 'tags', 'domains', 'scenes', 'typeDetailCounts', 'facetsVersion'],
  properties: {
    total: countInteger, types: facetListSchema, categories: facetListSchema, tags: facetListSchema,
    domains: facetListSchema, scenes: facetListSchema,
    typeDetailCounts: Object.freeze({ type: 'array', items: appDetailCountItemSchema, maxItems: 9 }),
    facetsVersion: optionalText
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

const currentUserSchema = Object.freeze({
  type: 'object',
  required: ['userId', 'employeeNo', 'displayName', 'avatarFileId', 'avatarUrl', 'mobileMasked', 'emailMasked', 'tenantId', 'tenantName', 'orgId', 'orgName', 'departmentId', 'departmentName', 'roles', 'permissions', 'availableOrgIds', 'unreadMessageCount', 'favoriteCount', 'pointBalance', 'lastLoginAt', 'locale', 'timezone'],
  properties: {
    userId: identifier, employeeNo: optionalText, displayName: optionalText, avatarFileId: nullableText, avatarUrl: nullableText,
    mobileMasked: nullableText, emailMasked: nullableText, tenantId: optionalText, tenantName: optionalText,
    orgId: optionalText, orgName: optionalText, departmentId: optionalText, departmentName: optionalText,
    roles: Object.freeze({ type: 'array', maxItems: 100, items: Object.freeze({
      type: 'object', required: ['roleId', 'roleCode', 'roleName'], properties: { roleId: identifier, roleCode: identifier, roleName: optionalText }, additionalProperties: false
    }) }), permissions: stringList, availableOrgIds: stringList, unreadMessageCount: countInteger,
    favoriteCount: countInteger, pointBalance: signedInteger, lastLoginAt: optionalText, locale: optionalText, timezone: optionalText
  },
  additionalProperties: false
});

const menuSchema = Object.freeze({
  type: 'object', required: ['menuId', 'parentId', 'code', 'name', 'path', 'iconFileId', 'iconUrl', 'sortOrder', 'visible', 'enabled', 'children'],
  properties: {
    menuId: identifier, parentId: optionalText, code: identifier, name: optionalText, path: optionalText, iconFileId: optionalText,
    iconUrl: optionalText, sortOrder: countInteger, visible: booleanValue, enabled: booleanValue,
    children: Object.freeze({ type: 'array', items: Object.freeze({ type: 'object' }), maxItems: 100 })
  }, additionalProperties: false
});
const navigationDataSchema = Object.freeze({
  type: 'object', required: ['menus', 'actions', 'defaultPath'], properties: {
    menus: Object.freeze({ type: 'array', items: menuSchema, maxItems: 100 }),
    actions: Object.freeze({ type: 'array', maxItems: 500, items: Object.freeze({
      type: 'object', required: ['permissionCode', 'resourceType', 'resourceId', 'allowed', 'reason'],
      properties: { permissionCode: identifier, resourceType: optionalText, resourceId: nullableText, allowed: booleanValue, reason: nullableText }, additionalProperties: false
    }) }), defaultPath: optionalText
  }, additionalProperties: false
});

const dictionaryItemSchema = Object.freeze({
  type: 'object',
  required: ['dictType', 'value', 'label', 'description', 'colorToken', 'iconFileId', 'sortOrder', 'enabled', 'parentValue', 'extra'],
  properties: {
    dictType: identifier, value: identifier, label: text, description: nullableText, colorToken: nullableText,
    iconFileId: nullableText, sortOrder: countInteger, enabled: booleanValue, parentValue: nullableText,
    extra: Object.freeze({ anyOf: [Object.freeze({ type: 'object' }), Object.freeze({ type: 'null' })] })
  }, additionalProperties: false
});
const appCommentUserSchema = Object.freeze({
  type: 'object', required: ['userId', 'displayName', 'avatarUrl', 'departmentName'],
  properties: { userId: optionalText, displayName: optionalText, avatarUrl: optionalText, departmentName: optionalText }, additionalProperties: false
});
const appCommentReplySchema = Object.freeze({
  type: 'object', required: ['replyId', 'content', 'repliedBy', 'repliedAt'],
  properties: { replyId: identifier, content: optionalText, repliedBy: optionalText, repliedAt: optionalText }, additionalProperties: false
});
const appCommentSchema = Object.freeze({
  type: 'object',
  required: ['commentId', 'appId', 'user', 'content', 'rating', 'likeCount', 'isLiked', 'status', 'createdAt', 'updatedAt', 'reply'],
  properties: {
    commentId: identifier, appId: identifier, user: appCommentUserSchema, content: Object.freeze({ type: 'string', maxLength: 500 }),
    rating: nullableInteger, likeCount: countInteger, isLiked: booleanValue, status: Object.freeze({ enum: ['PUBLISHED', 'PENDING', 'BLOCKED'] }),
    createdAt: optionalText, updatedAt: optionalText, reply: Object.freeze({ anyOf: [appCommentReplySchema, Object.freeze({ type: 'null' })] })
  }, additionalProperties: false
});

export function createDictionaryCommentReadOperationContracts() {
  return Object.freeze({
    'COM-005': Object.freeze({
      operationId: 'COM-005',
      requestSchema: Object.freeze({
        type: 'object', required: ['dictTypes'], properties: {
          dictTypes: Object.freeze({ type: 'array', items: identifier, maxItems: 50 }),
          parentValues: Object.freeze({ type: 'object', additionalProperties: optionalText }), includeDisabled: booleanValue
        }, additionalProperties: false
      }),
      successSchema: envelopeSchema(Object.freeze({
        type: 'object', required: ['itemsByType', 'version', 'updatedAt'],
        properties: {
          itemsByType: Object.freeze({ type: 'object', additionalProperties: Object.freeze({ type: 'array', items: dictionaryItemSchema, maxItems: 100 }) }),
          version: optionalText, updatedAt: optionalText
        }, additionalProperties: false
      })), errorSchema: SYNTHETIC_ERROR_SCHEMA, contractStatus: 'server-projection-verified'
    }),
    'APP-007': Object.freeze({
      operationId: 'APP-007',
      requestSchema: Object.freeze({
        type: 'object', required: ['appId'], properties: {
          appId: identifier, rating: Object.freeze({ type: 'integer', minimum: 1, maximum: 5 }), hasReply: booleanValue,
          page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }), pageSize: Object.freeze({ enum: [10, 20, 50, 100] }),
          sort: Object.freeze({ enum: ['createdAt,desc', 'createdAt,asc'] })
        }, additionalProperties: false
      }),
      successSchema: envelopeSchema(Object.freeze({
        type: 'object', required: ['items', 'total', 'page', 'pageSize', 'totalPages', 'hasPrevious', 'hasNext', 'hasMore', 'sort', 'filtersApplied'],
        properties: {
          items: Object.freeze({ type: 'array', items: appCommentSchema, maxItems: 100 }), total: countInteger,
          page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }), pageSize: Object.freeze({ enum: [10, 20, 50, 100] }),
          totalPages: countInteger, hasPrevious: booleanValue, hasNext: booleanValue, hasMore: booleanValue,
          sort: optionalText, filtersApplied: Object.freeze({
            type: 'object', required: ['appId', 'rating', 'hasReply'],
            properties: { appId: identifier, rating: nullableInteger, hasReply: nullableBoolean }, additionalProperties: false
          })
        }, additionalProperties: false
      })), errorSchema: SYNTHETIC_ERROR_SCHEMA, contractStatus: 'server-projection-verified'
    })
  });
}

const numberValue = Object.freeze({ type: 'number', minimum: 0, maximum: 1000000000 });
const messageItemSchema = Object.freeze({
  type: 'object', required: ['messageId', 'typeCode', 'typeName', 'title', 'summary', 'occurredAt', 'isRead', 'readAt', 'isToday', 'priority', 'senderId', 'senderName', 'targetType', 'targetId', 'targetPath', 'actionLabel', 'downloadFileId', 'expiresAt'],
  properties: {
    messageId: identifier, typeCode: optionalText, typeName: optionalText, title: optionalText, summary: Object.freeze({ type: 'string', maxLength: 2048 }),
    occurredAt: optionalText, isRead: booleanValue, readAt: nullableText, isToday: booleanValue,
    priority: Object.freeze({ enum: ['NORMAL', 'HIGH', 'URGENT'] }), senderId: nullableText, senderName: nullableText,
    targetType: Object.freeze({ enum: ['ANNOUNCEMENT', 'APP', 'APPLICATION', 'COURSE', 'EXPORT', 'URL', 'NONE'] }),
    targetId: nullableText, targetPath: nullableText, actionLabel: optionalText, downloadFileId: nullableText, expiresAt: nullableText
  }, additionalProperties: false
});
const ledgerItemSchema = Object.freeze({
  type: 'object', required: ['ledgerId', 'serialNo', 'pointTypeCode', 'pointTypeName', 'sourceCode', 'sourceName', 'businessType', 'businessId', 'businessName', 'changePoints', 'balanceAfter', 'statusCode', 'statusName', 'occurredAt', 'effectiveAt', 'expiresAt', 'remark', 'ruleId', 'ruleName', 'idempotencyKey'],
  properties: {
    ledgerId: identifier, serialNo: optionalText, pointTypeCode: optionalText, pointTypeName: optionalText, sourceCode: optionalText, sourceName: optionalText,
    businessType: optionalText, businessId: nullableText, businessName: nullableText, changePoints: signedInteger, balanceAfter: signedInteger,
    statusCode: optionalText, statusName: optionalText, occurredAt: optionalText, effectiveAt: nullableText, expiresAt: nullableText,
    remark: Object.freeze({ type: 'string', maxLength: 2048 }), ruleId: nullableText, ruleName: nullableText, idempotencyKey: nullableText
  }, additionalProperties: false
});
const personalPaginationProperties = Object.freeze({
  total: countInteger, page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }), pageSize: Object.freeze({ enum: [10, 20, 50, 100] }),
  totalPages: countInteger, hasPrevious: booleanValue, hasNext: booleanValue, hasMore: booleanValue
});

export function createPersonalReadOperationContracts() {
  const contract = (operationId, requestSchema, dataSchema) => Object.freeze({
    operationId, requestSchema, successSchema: envelopeSchema(dataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA, contractStatus: 'authenticated-server-projection-verified'
  });
  const messageFilters = Object.freeze({
    type: 'object', required: ['keyword', 'typeCode', 'readStatus', 'startAt', 'endAt'],
    properties: { keyword: optionalText, typeCode: optionalText, readStatus: Object.freeze({ enum: ['ALL', 'READ', 'UNREAD'] }), startAt: optionalText, endAt: optionalText }, additionalProperties: false
  });
  const messageList = Object.freeze({
    type: 'object', required: ['items', ...Object.keys(personalPaginationProperties), 'sort', 'filtersApplied'],
    properties: { items: Object.freeze({ type: 'array', items: messageItemSchema, maxItems: 100 }), ...personalPaginationProperties, sort: Object.freeze({ enum: ['occurredAt,desc', 'occurredAt,asc'] }), filtersApplied: messageFilters }, additionalProperties: false
  });
  const favoriteList = Object.freeze({
    type: 'object', required: ['items', ...Object.keys(personalPaginationProperties), 'sort', 'filtersApplied'],
    properties: {
      items: Object.freeze({ type: 'array', maxItems: 100, items: Object.freeze({
        type: 'object', required: ['favoriteId', 'resourceType', 'resourceId', 'favoritedAt', 'lastUsedAt', 'resource'],
        properties: { favoriteId: identifier, favoriteVersion: countInteger, resourceType: Object.freeze({ enum: ['APP'] }), resourceId: identifier, favoritedAt: optionalText, lastUsedAt: nullableText, resource: appItemSchema }, additionalProperties: false
      }) }), ...personalPaginationProperties, sort: Object.freeze({ enum: ['favoritedAt,desc', 'favoritedAt,asc'] }),
      filtersApplied: Object.freeze({
        type: 'object', required: ['resourceType', 'keyword', 'typeCode', 'domainId', 'tagCode', 'recentlyUsed'],
        properties: { resourceType: Object.freeze({ enum: ['APP'] }), keyword: optionalText, typeCode: optionalText, domainId: optionalText, tagCode: optionalText, recentlyUsed: booleanValue }, additionalProperties: false
      })
    }, additionalProperties: false
  });
  const ledgerRequest = Object.freeze({
    type: 'object', properties: {
      pointTypeCode: optionalText, sourceCode: optionalText, direction: Object.freeze({ enum: ['ALL', 'INCOME', 'EXPENSE'] }), statusCode: optionalText,
      keyword: optionalText, startAt: optionalText, endAt: optionalText, page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
      pageSize: Object.freeze({ enum: [10, 20, 50, 100] }), sort: Object.freeze({ enum: ['occurredAt,desc', 'occurredAt,asc'] })
    }, additionalProperties: false
  });
  return Object.freeze({
    'MSG-001': contract('MSG-001', Object.freeze({ type: 'object', properties: { timezone: optionalText }, additionalProperties: false }), Object.freeze({
      type: 'object', required: ['totalCount', 'unreadCount', 'readCount', 'todayCount', 'byType', 'generatedAt'],
      properties: {
        totalCount: countInteger, unreadCount: countInteger, readCount: countInteger, todayCount: countInteger,
        byType: Object.freeze({ type: 'array', maxItems: 100, items: Object.freeze({ type: 'object', required: ['typeCode', 'typeName', 'total', 'unread'], properties: { typeCode: optionalText, typeName: optionalText, total: countInteger, unread: countInteger }, additionalProperties: false }) }), generatedAt: optionalText
      }, additionalProperties: false
    })),
    'MSG-002': contract('MSG-002', Object.freeze({ type: 'object', properties: { keyword: optionalText, typeCode: optionalText, readStatus: Object.freeze({ enum: ['ALL', 'READ', 'UNREAD'] }), startAt: optionalText, endAt: optionalText, page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }), pageSize: Object.freeze({ enum: [10, 20, 50, 100] }), sort: Object.freeze({ enum: ['occurredAt,desc', 'occurredAt,asc'] }) }, additionalProperties: false }), messageList),
    'FAV-001': contract('FAV-001', Object.freeze({ type: 'object', properties: { resourceType: Object.freeze({ enum: ['APP'] }) }, additionalProperties: false }), Object.freeze({
      type: 'object', required: ['totalCount', 'weekAddedCount', 'recentUsedCount', 'byType', 'byDomain'],
      properties: {
        totalCount: countInteger, weekAddedCount: countInteger, recentUsedCount: countInteger,
        byType: Object.freeze({ type: 'array', maxItems: 100, items: Object.freeze({ type: 'object', required: ['typeCode', 'typeName', 'count'], properties: { typeCode: optionalText, typeName: optionalText, count: countInteger }, additionalProperties: false }) }),
        byDomain: Object.freeze({ type: 'array', maxItems: 100, items: Object.freeze({ type: 'object', required: ['domainId', 'domainName', 'count'], properties: { domainId: optionalText, domainName: optionalText, count: countInteger }, additionalProperties: false }) })
      }, additionalProperties: false
    })),
    'FAV-002': contract('FAV-002', Object.freeze({ type: 'object', properties: { resourceType: Object.freeze({ enum: ['APP'] }), keyword: optionalText, typeCode: optionalText, domainId: optionalText, tagCode: optionalText, recentlyUsed: booleanValue, page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }), pageSize: Object.freeze({ enum: [10, 20, 50, 100] }), sort: Object.freeze({ enum: ['favoritedAt,desc', 'favoritedAt,asc'] }) }, additionalProperties: false }), favoriteList),
    'PTS-001': contract('PTS-001', Object.freeze({ type: 'object', properties: { month: optionalText }, additionalProperties: false }), Object.freeze({
      type: 'object', required: ['account', 'month', 'sources', 'recentLedgers', 'rulesVersion'], properties: {
        account: Object.freeze({ type: 'object', required: ['accountId', 'userId', 'balance', 'totalEarned', 'totalSpent', 'totalExpired', 'availableBalance', 'pendingBalance', 'updatedAt'], properties: { accountId: identifier, userId: identifier, balance: signedInteger, totalEarned: countInteger, totalSpent: countInteger, totalExpired: countInteger, availableBalance: signedInteger, pendingBalance: signedInteger, updatedAt: optionalText }, additionalProperties: false }),
        month: Object.freeze({ type: 'object', required: ['month', 'earned', 'spent', 'appUsePoints'], properties: { month: optionalText, earned: countInteger, spent: countInteger, appUsePoints: countInteger }, additionalProperties: false }),
        sources: Object.freeze({ type: 'array', maxItems: 100, items: Object.freeze({ type: 'object', required: ['sourceCode', 'sourceName', 'points', 'percentage', 'colorToken', 'iconUrl'], properties: { sourceCode: optionalText, sourceName: optionalText, points: countInteger, percentage: numberValue, colorToken: optionalText, iconUrl: optionalText }, additionalProperties: false }) }),
        recentLedgers: Object.freeze({ type: 'array', items: ledgerItemSchema, maxItems: 10 }), rulesVersion: countInteger
      }, additionalProperties: false
    })),
    'PTS-002': contract('PTS-002', ledgerRequest, Object.freeze({
      type: 'object', required: ['items', ...Object.keys(personalPaginationProperties), 'sort', 'filtersApplied', 'summary'], properties: {
        items: Object.freeze({ type: 'array', items: ledgerItemSchema, maxItems: 100 }), ...personalPaginationProperties,
        sort: Object.freeze({ enum: ['occurredAt,desc', 'occurredAt,asc'] }), filtersApplied: Object.freeze({ type: 'object' }),
        summary: Object.freeze({ type: 'object', required: ['income', 'expense', 'netChange'], properties: { income: countInteger, expense: countInteger, netChange: signedInteger }, additionalProperties: false })
      }, additionalProperties: false
    })),
    'PTS-003': contract('PTS-003', Object.freeze({ type: 'object', properties: { startAt: optionalText, endAt: optionalText, groupBy: Object.freeze({ enum: ['TYPE', 'SOURCE', 'DAY', 'MONTH'] }) }, additionalProperties: false }), Object.freeze({
      type: 'object', required: ['totalIncome', 'totalExpense', 'groups', 'period'], properties: {
        totalIncome: countInteger, totalExpense: countInteger,
        groups: Object.freeze({ type: 'array', maxItems: 100, items: Object.freeze({ type: 'object', required: ['key', 'label', 'income', 'expense', 'netChange', 'count', 'percentage'], properties: { key: optionalText, label: optionalText, income: countInteger, expense: countInteger, netChange: signedInteger, count: countInteger, percentage: numberValue }, additionalProperties: false }) }),
        period: Object.freeze({ type: 'object', required: ['startAt', 'endAt'], properties: { startAt: optionalText, endAt: optionalText }, additionalProperties: false })
      }, additionalProperties: false
    }))
  });
}

export function createWorkbenchSearchOperationContract() {
  const searchFacetSchema = Object.freeze({ type: 'object', required: ['value', 'label', 'count'], properties: { value: optionalText, label: optionalText, count: countInteger }, additionalProperties: false });
  return Object.freeze({
    'WB-002': Object.freeze({
      operationId: 'WB-002',
      requestSchema: Object.freeze({ type: 'object', properties: {
        keyword: optionalText, scene: optionalText, typeCode: optionalText,
        page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }), pageSize: Object.freeze({ enum: [10, 20, 50, 100] }),
        sort: Object.freeze({ enum: ['RELEVANCE', 'USAGE_DESC', 'NAME_ASC'] })
      }, additionalProperties: false }),
      successSchema: envelopeSchema(Object.freeze({
        type: 'object', required: ['items', ...Object.keys(personalPaginationProperties), 'sort', 'filtersApplied', 'facets', 'normalizedKeyword'],
        properties: {
          items: Object.freeze({ type: 'array', items: appItemSchema, maxItems: 100 }), ...personalPaginationProperties,
          sort: Object.freeze({ enum: ['RELEVANCE', 'USAGE_DESC', 'NAME_ASC'] }),
          filtersApplied: Object.freeze({ type: 'object', required: ['keyword', 'scene', 'typeCode'], properties: { keyword: optionalText, scene: optionalText, typeCode: optionalText }, additionalProperties: false }),
          facets: Object.freeze({ type: 'object', required: ['scenes', 'types'], properties: { scenes: Object.freeze({ type: 'array', items: searchFacetSchema, maxItems: 100 }), types: Object.freeze({ type: 'array', items: searchFacetSchema, maxItems: 100 }) }, additionalProperties: false }),
          normalizedKeyword: optionalText
        }, additionalProperties: false
      })), errorSchema: SYNTHETIC_ERROR_SCHEMA, contractStatus: 'server-projection-verified'
    })
  });
}

export function createWorkbenchPersonalOperationContracts() {
  const todoSummarySchema = Object.freeze({
    type: 'object', required: ['todoId', 'businessType', 'businessId', 'title', 'submittedAt', 'statusCode', 'statusName', 'detailPath'],
    properties: { todoId: identifier, businessType: identifier, businessId: identifier, title: optionalText, submittedAt: optionalText, statusCode: optionalText, statusName: optionalText, detailPath: optionalText }, additionalProperties: false
  });
  const todoDetailSchema = Object.freeze({
    type: 'object', required: ['todoId', 'businessType', 'businessId', 'title', 'applicantId', 'applicantName', 'submittedAt', 'statusCode', 'statusName', 'currentNode', 'currentAssigneeNames', 'completedAt', 'resultMessage', 'detailPath'],
    properties: { ...todoSummarySchema.properties, applicantId: optionalText, applicantName: optionalText, currentNode: optionalText, currentAssigneeNames: stringList, completedAt: nullableText, resultMessage: nullableText }, additionalProperties: false
  });
  const contract = (operationId, requestSchema, dataSchema) => Object.freeze({ operationId, requestSchema, successSchema: envelopeSchema(dataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA, contractStatus: 'authenticated-server-projection-verified' });
  return Object.freeze({
    'WB-001': contract('WB-001', Object.freeze({ type: 'object', properties: { statDate: optionalText, scene: optionalText, keyword: optionalText, hotLimit: Object.freeze({ type: 'integer', minimum: 1, maximum: 20 }), courseLimit: Object.freeze({ type: 'integer', minimum: 1, maximum: 20 }), noticeLimit: Object.freeze({ type: 'integer', minimum: 1, maximum: 20 }) }, additionalProperties: false }), Object.freeze({
      type: 'object', required: ['greeting', 'profile', 'dataAsOf', 'lastUpdatedAt', 'hero', 'appTypeOverview', 'hotApps', 'courses', 'announcements', 'usage'], properties: {
        greeting: Object.freeze({ type: 'object', required: ['period', 'name', 'text'], properties: { period: optionalText, name: optionalText, text: optionalText }, additionalProperties: false }),
        profile: Object.freeze({ type: 'object', required: ['userId', 'displayName', 'avatarUrl', 'departmentName'], properties: { userId: identifier, displayName: optionalText, avatarUrl: nullableText, departmentName: optionalText }, additionalProperties: false }),
        dataAsOf: optionalText, lastUpdatedAt: optionalText,
        hero: Object.freeze({ type: 'object', required: ['title', 'subtitle', 'imageUrl'], properties: { title: optionalText, subtitle: optionalText, imageUrl: optionalText }, additionalProperties: false }),
        appTypeOverview: Object.freeze({ type: 'array', maxItems: 100, items: Object.freeze({ type: 'object', required: ['typeCode', 'typeName', 'iconUrl', 'count', 'detailQuery'], properties: { typeCode: optionalText, typeName: optionalText, iconUrl: optionalText, count: countInteger, detailQuery: Object.freeze({ type: 'object', required: ['typeCode'], properties: { typeCode: optionalText }, additionalProperties: false }) }, additionalProperties: false }) }),
        hotApps: Object.freeze({ type: 'array', items: appItemSchema, maxItems: 20 }), courses: Object.freeze({ type: 'array', items: courseSummarySchema, maxItems: 20 }),
        announcements: Object.freeze({ type: 'array', maxItems: 20, items: Object.freeze({ type: 'object', required: ['announcementId', 'typeName', 'title', 'publishedAt', 'isRead', 'detailPath'], properties: { announcementId: identifier, typeName: optionalText, title: optionalText, publishedAt: optionalText, isRead: booleanValue, detailPath: optionalText }, additionalProperties: false }) }),
        usage: Object.freeze({ type: 'object', required: ['appVisitCount', 'appUseCount', 'favoriteAppCount', 'visitChange', 'useChange', 'favoriteChange', 'comparisonPeriod'], properties: { appVisitCount: countInteger, appUseCount: countInteger, favoriteAppCount: countInteger, visitChange: signedInteger, useChange: signedInteger, favoriteChange: signedInteger, comparisonPeriod: optionalText }, additionalProperties: false })
      }, additionalProperties: false
    })),
    'WB-003': contract('WB-003', Object.freeze({ type: 'object', properties: { recentMessageLimit: Object.freeze({ type: 'integer', minimum: 1, maximum: 20 }), todoLimit: Object.freeze({ type: 'integer', minimum: 1, maximum: 20 }) }, additionalProperties: false }), Object.freeze({
      type: 'object', required: ['user', 'stats', 'quickEntries', 'recentMessages', 'todos'], properties: {
        user: currentUserSchema,
        stats: Object.freeze({ type: 'object', required: ['pointBalance', 'favoriteCount', 'appVisitCount', 'appUseCount', 'pointMonthIncrease'], properties: { pointBalance: signedInteger, favoriteCount: countInteger, appVisitCount: countInteger, appUseCount: countInteger, pointMonthIncrease: signedInteger }, additionalProperties: false }),
        quickEntries: Object.freeze({ type: 'array', maxItems: 20, items: Object.freeze({ type: 'object', required: ['code', 'name', 'description', 'path', 'iconUrl', 'permissionCode', 'enabled'], properties: { code: identifier, name: optionalText, description: optionalText, path: optionalText, iconUrl: optionalText, permissionCode: identifier, enabled: booleanValue }, additionalProperties: false }) }),
        recentMessages: Object.freeze({ type: 'array', maxItems: 20, items: Object.freeze({ type: 'object', required: ['messageId', 'typeName', 'title', 'occurredAt', 'isRead', 'targetType', 'targetId', 'targetPath'], properties: { messageId: identifier, typeName: optionalText, title: optionalText, occurredAt: optionalText, isRead: booleanValue, targetType: optionalText, targetId: nullableText, targetPath: nullableText }, additionalProperties: false }) }),
        todos: Object.freeze({ type: 'array', items: todoSummarySchema, maxItems: 20 })
      }, additionalProperties: false
    })),
    'WB-004': contract('WB-004', Object.freeze({ type: 'object', properties: { keyword: optionalText, businessType: optionalText, status: optionalText, startAt: optionalText, endAt: optionalText, page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }), pageSize: Object.freeze({ enum: [10, 20, 50, 100] }), sort: Object.freeze({ enum: ['submittedAt,desc', 'submittedAt,asc'] }) }, additionalProperties: false }), Object.freeze({
      type: 'object', required: ['items', ...Object.keys(personalPaginationProperties), 'sort', 'filtersApplied'], properties: {
        items: Object.freeze({ type: 'array', items: todoDetailSchema, maxItems: 100 }), ...personalPaginationProperties, sort: Object.freeze({ enum: ['submittedAt,desc', 'submittedAt,asc'] }), filtersApplied: Object.freeze({ type: 'object' })
      }, additionalProperties: false
    }))
  });
}

export function createIdentityReadOperationContracts() {
  return Object.freeze({
    'COM-001': Object.freeze({
      operationId: 'COM-001', requestSchema: emptyRequestSchema,
      successSchema: envelopeSchema(currentUserSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA,
      contractStatus: 'official-oauth-v3-verified'
    }),
    'COM-002': Object.freeze({
      operationId: 'COM-002', requestSchema: Object.freeze({ type: 'object', properties: { platform: Object.freeze({ enum: ['WEB'] }) }, additionalProperties: false }),
      successSchema: envelopeSchema(navigationDataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA,
      contractStatus: 'authenticated-permission-projection-verified'
    })
  });
}

const openObject = Object.freeze({ type: 'object' });
const openObjectList = Object.freeze({ type: 'array', items: openObject, maxItems: 100 });
const detailedPageSchema = Object.freeze({
  type: 'object',
  required: ['items', 'total', 'page', 'pageSize', 'totalPages', 'hasPrevious', 'hasNext', 'hasMore', 'sort', 'filtersApplied'],
  properties: {
    items: openObjectList, total: countInteger, page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    pageSize: Object.freeze({ enum: [10, 20, 50, 100] }), totalPages: countInteger,
    hasPrevious: booleanValue, hasNext: booleanValue, hasMore: booleanValue, sort: optionalText, filtersApplied: openObject
  },
  additionalProperties: false
});
const appDetailSchema = Object.freeze({
  type: 'object',
  required: ['appId', 'appCode', 'name', 'shortName', 'logoFileId', 'logoUrl', 'coverFileId', 'coverUrl', 'typeCode', 'typeName', 'summary', 'description', 'versionName', 'accessMode', 'externalSystemCode', 'externalUrl', 'openMode', 'applicableUsers', 'businessScope', 'features', 'metrics', 'fieldDefinitions', 'processSteps', 'previews', 'videos', 'attachments', 'guides', 'trainings', 'relatedApps', 'relatedMaterials', 'latestNotice', 'typeExtension', 'dataSourceSummary', 'createdAt', 'updatedAt', 'version'],
  properties: {
    appId: identifier, appCode: optionalText, name: text, shortName: optionalText, logoFileId: optionalText, logoUrl: optionalText,
    coverFileId: optionalText, coverUrl: optionalText, typeCode: optionalText, typeName: optionalText,
    summary: Object.freeze({ type: 'string', maxLength: 2048 }), description: Object.freeze({ type: 'string', maxLength: 10000 }),
    versionName: optionalText, accessMode: optionalText, externalSystemCode: optionalText, externalUrl: optionalText,
    openMode: optionalText, applicableUsers: optionalText, businessScope: optionalText,
    ownerId: optionalText, ownerName: optionalText, developerId: optionalText, developerName: optionalText,
    responsibleOrgId: optionalText, responsibleOrgName: optionalText, developerOrgId: optionalText, developerOrgName: optionalText,
    features: openObjectList, metrics: openObjectList, fieldDefinitions: openObjectList, processSteps: openObjectList,
    previews: openObjectList, videos: openObjectList, attachments: openObjectList, guides: openObjectList,
    trainings: openObjectList, relatedApps: openObjectList, relatedMaterials: openObjectList,
    latestNotice: Object.freeze({ anyOf: [openObject, Object.freeze({ type: 'null' })] }), typeExtension: openObject,
    dataSourceSummary: optionalText, createdAt: optionalText, updatedAt: optionalText, version: countInteger
  },
  additionalProperties: false
});
const announcementDetailSchema = Object.freeze({
  type: 'object',
  required: ['announcementId', 'title', 'typeCode', 'typeName', 'summary', 'contentHtml', 'contentText', 'publisherId', 'publisherName', 'publisherOrgId', 'publisherOrgName', 'publishAt', 'validFrom', 'validTo', 'status', 'scopeType', 'scopeUserIds', 'scopeOrgIds', 'isTop', 'topUntil', 'viewCount', 'readCount', 'isRead', 'attachments', 'relatedApps', 'createdAt', 'updatedAt', 'version', 'previous', 'next', 'associatedActivities'],
  properties: {
    announcementId: identifier, title: text, typeCode: optionalText, typeName: optionalText,
    summary: Object.freeze({ type: 'string', maxLength: 2048 }), contentHtml: Object.freeze({ type: 'string', maxLength: 20000 }),
    contentText: Object.freeze({ type: 'string', maxLength: 20000 }), publisherId: optionalText, publisherName: optionalText,
    publisherOrgId: optionalText, publisherOrgName: optionalText, publishAt: optionalText, validFrom: optionalText, validTo: optionalText,
    status: optionalText, scopeType: optionalText, scopeUserIds: stringList, scopeOrgIds: stringList,
    isTop: booleanValue, topUntil: optionalText, viewCount: countInteger, readCount: countInteger, isRead: booleanValue,
    attachments: openObjectList, relatedApps: openObjectList, createdAt: optionalText, updatedAt: optionalText, version: countInteger,
    previous: Object.freeze({ anyOf: [openObject, Object.freeze({ type: 'null' })] }), next: Object.freeze({ anyOf: [openObject, Object.freeze({ type: 'null' })] }),
    associatedActivities: openObjectList
  },
  additionalProperties: false
});

export function createFirstBatchDetailOperationContracts() {
  const contract = (operationId, requestSchema, dataSchema) => Object.freeze({
    operationId, requestSchema, successSchema: envelopeSchema(dataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA,
    contractStatus: 'server-projection-verified'
  });
  return Object.freeze({
    'APP-003': contract('APP-003', Object.freeze({ type: 'object', required: ['appId'], properties: { appId: identifier, include: optionalText }, additionalProperties: false }), appDetailSchema),
    'APP-009': contract('APP-009', Object.freeze({ type: 'object', required: ['appId'], properties: { appId: identifier, relationType: optionalText, page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }), pageSize: Object.freeze({ enum: [10, 20, 50, 100] }), sort: optionalText }, additionalProperties: false }), detailedPageSchema),
    'ANN-003': contract('ANN-003', Object.freeze({ type: 'object', required: ['announcementId'], properties: { announcementId: identifier, markRead: booleanValue }, additionalProperties: false }), announcementDetailSchema),
    'ANN-005': contract('ANN-005', Object.freeze({ type: 'object', required: ['announcementId'], properties: { announcementId: identifier, relationType: optionalText, page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }), pageSize: Object.freeze({ enum: [10, 20, 50, 100] }) }, additionalProperties: false }), detailedPageSchema),
    'MAT-002': contract('MAT-002', publicListRequestSchema, detailedPageSchema)
  });
}
const publicListRequestSchema = Object.freeze({
  type: 'object',
  properties: {
    page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
    pageSize: Object.freeze({ enum: [10, 20, 50, 100] }), query: optionalText, keyword: optionalText,
    sourceCode: optionalText, enabled: booleanValue, categoryCode: optionalText, deliveryMode: optionalText,
    lecturerId: optionalText, registrationStatus: optionalText, liveStatus: optionalText, startAt: optionalText,
    endAt: optionalText, sort: optionalText, directionCode: optionalText, sceneCode: optionalText,
    level: optionalText, status: optionalText, domain: optionalText, materialType: optionalText,
    appTypeCode: optionalText, domainId: optionalText, categoryId: optionalText, relatedAppId: optionalText
  },
  additionalProperties: false
});
const publicPaginationSchema = Object.freeze({
  total: countInteger, page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }),
  pageSize: Object.freeze({ enum: [10, 20, 50, 100] }), totalPages: countInteger,
  hasPrevious: booleanValue, hasNext: booleanValue, hasMore: booleanValue
});
const publicItemList = itemSchema => Object.freeze({
  type: 'object', required: ['items', ...Object.keys(publicPaginationSchema)],
  properties: { items: Object.freeze({ type: 'array', items: itemSchema, maxItems: 100 }), ...publicPaginationSchema },
  additionalProperties: false
});
const pointRuleSchema = Object.freeze({
  type: 'object', required: ['ruleId', 'ruleCode', 'ruleName', 'sourceCode', 'sourceName', 'triggerEvent', 'points', 'direction', 'frequencyType', 'frequencyLimit', 'cycleLimit', 'validFrom', 'validTo', 'enabled', 'description', 'conditions', 'version'],
  properties: {
    ruleId: identifier, ruleCode: optionalText, ruleName: optionalText, sourceCode: optionalText, sourceName: optionalText,
    triggerEvent: optionalText, points: countInteger, direction: optionalText, frequencyType: optionalText,
    frequencyLimit: countInteger, cycleLimit: countInteger, validFrom: optionalText, validTo: optionalText,
    enabled: booleanValue, description: optionalText, conditions: openObject, version: countInteger
  }, additionalProperties: false
});
const courseSummarySchema = Object.freeze({
  type: 'object', required: ['courseId', 'title', 'categoryCode', 'categoryName', 'lecturerName', 'startAt', 'deliveryMode', 'summary', 'statusCode', 'statusName', 'registeredCount', 'detailPath'],
  properties: {
    courseId: identifier, title: text, categoryCode: optionalText, categoryName: optionalText, lecturerName: optionalText,
    startAt: optionalText, deliveryMode: optionalText, summary: optionalText, statusCode: optionalText,
    statusName: optionalText, registeredCount: countInteger, detailPath: optionalText
  }, additionalProperties: false
});
const namedCountSchema = Object.freeze({
  type: 'object', required: ['code', 'name', 'count', 'iconUrl'],
  properties: { code: optionalText, name: optionalText, count: countInteger, iconUrl: optionalText }, additionalProperties: false
});
const namedCountListSchema = Object.freeze({ type: 'array', items: namedCountSchema, maxItems: 100 });
const certificationSchema = Object.freeze({
  type: 'object', required: ['certificationId', 'code', 'name', 'directionCode', 'directionName', 'sceneCodes', 'level', 'provider', 'coverUrl', 'summary', 'registrationStartAt', 'registrationEndAt', 'examAt', 'statusCode', 'statusName', 'certifiedCount', 'detailPath'],
  properties: {
    certificationId: identifier, code: identifier, name: text, directionCode: optionalText, directionName: optionalText,
    sceneCodes: stringList, level: optionalText, provider: optionalText, coverUrl: optionalText, summary: optionalText,
    registrationStartAt: optionalText, registrationEndAt: optionalText, examAt: optionalText, statusCode: optionalText,
    statusName: optionalText, certifiedCount: countInteger, detailPath: optionalText
  }, additionalProperties: false
});
const metricSchema = Object.freeze({
  type: 'object', required: ['metricCode', 'metricName', 'description', 'domain', 'aggregation', 'expression', 'unit', 'dimensions', 'definitionVersion', 'enabled', 'effectiveAt'],
  properties: {
    metricCode: identifier, metricName: optionalText, description: optionalText, domain: optionalText,
    aggregation: optionalText, expression: optionalText, unit: optionalText, dimensions: stringList,
    definitionVersion: optionalText, enabled: booleanValue, effectiveAt: optionalText
  }, additionalProperties: false
});
const materialFacetItemSchema = Object.freeze({
  type: 'object', required: ['code', 'name', 'count'],
  properties: { code: identifier, name: optionalText, count: countInteger }, additionalProperties: false
});
const materialCategorySchema = Object.freeze({
  type: 'object', required: ['categoryId', 'categoryCode', 'categoryName', 'parentId', 'sortOrder', 'count'],
  properties: { categoryId: identifier, categoryCode: identifier, categoryName: optionalText, parentId: optionalText, sortOrder: countInteger, count: countInteger }, additionalProperties: false
});

const applicationStepSchema = Object.freeze({
  type: 'object', required: ['stepCode', 'stepName', 'statusCode', 'statusName', 'startedAt', 'completedAt'],
  properties: { stepCode: identifier, stepName: text, statusCode: identifier, statusName: optionalText, startedAt: nullableText, completedAt: nullableText },
  additionalProperties: false
});
const applicationProgressSchema = Object.freeze({
  type: 'object',
  required: ['applicationId', 'applicationNo', 'businessType', 'resourceId', 'resourceName', 'applicantId', 'applicantName', 'submissionChannel', 'submittedAt', 'localStatusCode', 'localStatusName', 'externalSubmissionStatus', 'externalReferenceNo', 'externalSubmittedAt', 'failureCode', 'failureMessage', 'steps', 'canWithdraw', 'canResubmit', 'updatedAt'],
  properties: {
    applicationId: identifier, applicationNo: identifier, businessType: Object.freeze({ enum: ['APP_ONBOARDING', 'APP_USE', 'APP_REUSE'] }),
    resourceId: optionalText, resourceName: optionalText, applicantId: identifier, applicantName: optionalText,
    submissionChannel: Object.freeze({ enum: ['INTERNAL', 'EAD', 'HAINENG_WORK'] }), submittedAt: optionalText,
    localStatusCode: identifier, localStatusName: optionalText,
    externalSubmissionStatus: Object.freeze({ enum: ['NOT_SUBMITTED', 'SUBMITTING', 'SUBMITTED', 'FAILED', 'UNKNOWN'] }),
    externalReferenceNo: nullableText, externalSubmittedAt: nullableText, failureCode: nullableText, failureMessage: nullableText,
    steps: Object.freeze({ type: 'array', items: applicationStepSchema, maxItems: 20 }), canWithdraw: booleanValue, canResubmit: booleanValue, updatedAt: optionalText
  }, additionalProperties: false
});
const trainingLaunchSchema = Object.freeze({
  type: 'object', required: ['allowed', 'reasonCode', 'launchUrl', 'expiresAt', 'liveStatus', 'attendanceToken'],
  properties: { allowed: booleanValue, reasonCode: nullableText, launchUrl: nullableText, expiresAt: nullableText, liveStatus: optionalText, attendanceToken: nullableText },
  additionalProperties: false
});
const examSessionSchema = Object.freeze({
  type: 'object', required: ['sessionId', 'startAt', 'endAt', 'remaining'],
  properties: { sessionId: identifier, startAt: optionalText, endAt: optionalText, remaining: countInteger }, additionalProperties: false
});
const examSiteSchema = Object.freeze({
  type: 'object', required: ['siteId', 'name', 'address', 'capacity', 'remaining', 'examSessions'],
  properties: { siteId: identifier, name: optionalText, address: optionalText, capacity: countInteger, remaining: countInteger, examSessions: Object.freeze({ type: 'array', items: examSessionSchema, maxItems: 100 }) }, additionalProperties: false
});
const certificationDetailSchema = Object.freeze({
  type: 'object', required: [...certificationSchema.required, 'descriptionHtml', 'requirements', 'syllabus', 'trainingCourseIds', 'examSites', 'attachments', 'myStatus'],
  properties: {
    ...certificationSchema.properties, descriptionHtml: optionalText, requirements: stringList, syllabus: stringList, trainingCourseIds: stringList,
    examSites: Object.freeze({ type: 'array', items: examSiteSchema, maxItems: 100 }), attachments: openObjectList,
    myStatus: Object.freeze({ type: 'object', required: ['registered', 'bookingId', 'result', 'certificateNo'], properties: { registered: booleanValue, bookingId: nullableText, result: nullableText, certificateNo: nullableText }, additionalProperties: false })
  }, additionalProperties: false
});
const exportTaskSchema = Object.freeze({
  type: 'object', required: ['exportId', 'exportType', 'status', 'progress', 'totalRows', 'processedRows', 'file', 'failureCode', 'failureMessage', 'createdAt', 'finishedAt', 'expiresAt'],
  properties: {
    exportId: identifier, exportType: optionalText, status: optionalText, progress: countInteger, totalRows: countInteger, processedRows: countInteger,
    file: Object.freeze({ anyOf: [openObject, Object.freeze({ type: 'null' })] }), failureCode: nullableText, failureMessage: nullableText,
    createdAt: optionalText, finishedAt: nullableText, expiresAt: nullableText
  }, additionalProperties: false
});

export function createIdentityDetailOperationContracts() {
  const contract = (operationId, requestSchema, dataSchema) => Object.freeze({
    operationId, requestSchema, successSchema: envelopeSchema(dataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA,
    contractStatus: 'server-projection-verified'
  });
  return Object.freeze({
    'APP-010': contract('APP-010', Object.freeze({ type: 'object', required: ['applicationId'], properties: { applicationId: identifier, includeHistory: booleanValue }, additionalProperties: false }), applicationProgressSchema),
    'TRN-006': contract('TRN-006', Object.freeze({ type: 'object', required: ['courseId', 'sourcePage'], properties: { courseId: identifier, sourcePage: identifier, deviceId: optionalText }, additionalProperties: false }), trainingLaunchSchema),
    'CER-003': contract('CER-003', Object.freeze({ type: 'object', required: ['certificationId'], properties: { certificationId: identifier }, additionalProperties: false }), certificationDetailSchema),
    'COM-010': contract('COM-010', Object.freeze({ type: 'object', required: ['exportId'], properties: { exportId: identifier }, additionalProperties: false }), exportTaskSchema)
  });
}

const adminConnectionSchema = Object.freeze({
  type: 'object', required: ['connectionCode', 'domainCode', 'appTokenMasked', 'tableIdMasked', 'defaultViewIdMasked', 'primaryFieldIdMasked', 'fieldSchemaVersion', 'readEnabled', 'writeEnabled', 'enabled', 'lastVerifiedAt', 'lastVerifiedStatus'],
  properties: { connectionCode: identifier, domainCode: optionalText, appTokenMasked: optionalText, tableIdMasked: optionalText, defaultViewIdMasked: optionalText, primaryFieldIdMasked: optionalText, fieldSchemaVersion: optionalText, readEnabled: booleanValue, writeEnabled: booleanValue, enabled: booleanValue, lastVerifiedAt: optionalText, lastVerifiedStatus: optionalText }, additionalProperties: false
});
const auditLogSchema = Object.freeze({
  type: 'object', required: ['auditId', 'requestId', 'operatorId', 'operatorName', 'operatorOrgId', 'operatorOrgName', 'moduleCode', 'actionCode', 'actionName', 'resourceType', 'resourceId', 'resourceName', 'httpMethod', 'path', 'ip', 'userAgent', 'resultCode', 'resultMessage', 'changedFields', 'beforeSnapshotMasked', 'afterSnapshotMasked', 'occurredAt', 'durationMs'],
  properties: { auditId: identifier, requestId: optionalText, operatorId: optionalText, operatorName: optionalText, operatorOrgId: optionalText, operatorOrgName: optionalText, moduleCode: optionalText, actionCode: optionalText, actionName: optionalText, resourceType: optionalText, resourceId: optionalText, resourceName: optionalText, httpMethod: optionalText, path: optionalText, ip: optionalText, userAgent: optionalText, resultCode: optionalText, resultMessage: optionalText, changedFields: stringList, beforeSnapshotMasked: nullableText, afterSnapshotMasked: nullableText, occurredAt: optionalText, durationMs: countInteger }, additionalProperties: false
});
const integrationLogSchema = Object.freeze({
  type: 'object', required: ['logId', 'requestId', 'integrationCode', 'integrationName', 'direction', 'operationCode', 'httpMethod', 'endpointMasked', 'businessType', 'businessId', 'status', 'httpStatus', 'errorCode', 'errorMessageMasked', 'requestSize', 'responseSize', 'startedAt', 'finishedAt', 'durationMs', 'retryCount', 'nextRetryAt', 'taskExecutionId'],
  properties: { logId: identifier, requestId: optionalText, integrationCode: optionalText, integrationName: optionalText, direction: optionalText, operationCode: optionalText, httpMethod: optionalText, endpointMasked: optionalText, businessType: optionalText, businessId: optionalText, status: optionalText, httpStatus: countInteger, errorCode: nullableText, errorMessageMasked: nullableText, requestSize: countInteger, responseSize: countInteger, startedAt: optionalText, finishedAt: optionalText, durationMs: countInteger, retryCount: countInteger, nextRetryAt: nullableText, taskExecutionId: nullableText }, additionalProperties: false
});
const adminViewPageSchema = Object.freeze({
  type: 'object', required: ['view', 'items', ...Object.keys(publicPaginationSchema)],
  properties: { view: Object.freeze({ enum: ['JOBS', 'EXECUTIONS'] }), items: Object.freeze({ type: 'array', items: openObject, maxItems: 100 }), ...publicPaginationSchema }, additionalProperties: false
});
const archiveDetailSchema = Object.freeze({
  type: 'object', required: ['archiveTaskId', 'status', 'stage', 'sourceCount', 'archivedCount', 'deletedCount', 'failedCount', 'sourceChecksum', 'archiveChecksum', 'archiveLocationMasked', 'verifiedAt', 'deletedAt', 'failureCode', 'failureMessage', 'executions'],
  properties: { archiveTaskId: identifier, status: optionalText, stage: optionalText, sourceCount: countInteger, archivedCount: countInteger, deletedCount: countInteger, failedCount: countInteger, sourceChecksum: optionalText, archiveChecksum: optionalText, archiveLocationMasked: optionalText, verifiedAt: nullableText, deletedAt: nullableText, failureCode: nullableText, failureMessage: nullableText, executions: openObjectList }, additionalProperties: false
});
const announcementPreviewRequestSchema = Object.freeze({
  type: 'object',
  properties: {
    announcementId: identifier,
    title: Object.freeze({ type: 'string', maxLength: 256 }),
    typeCode: optionalText,
    summary: Object.freeze({ type: 'string', maxLength: 2048 }),
    contentHtml: Object.freeze({ type: 'string', maxLength: 100000 }),
    contentText: Object.freeze({ type: 'string', maxLength: 100000 }),
    publishMode: optionalText,
    publishAt: optionalText,
    validFrom: optionalText,
    validTo: optionalText,
    scopeType: optionalText,
    scopeOrgIds: stringList,
    scopeUserIds: stringList,
    scopeRoleCodes: stringList,
    isTop: booleanValue,
    topUntil: optionalText,
    attachmentFileIds: stringList,
    relatedAppIds: stringList,
    status: optionalText,
    previewMode: Object.freeze({ enum: ['DESKTOP', 'MOBILE'] })
  },
  additionalProperties: false
});
const announcementPreviewWarningSchema = Object.freeze({
  type: 'object', required: ['code', 'message'],
  properties: { code: identifier, message: optionalText }, additionalProperties: false
});
const announcementPreviewSchema = Object.freeze({
  type: 'object', required: ['previewId', 'previewUrl', 'expiresAt', 'sanitizedContentHtml', 'warnings'],
  properties: {
    previewId: identifier,
    previewUrl: Object.freeze({ type: 'string', minLength: 1, maxLength: 2048 }),
    expiresAt: optionalText,
    sanitizedContentHtml: Object.freeze({ type: 'string', maxLength: 100000 }),
    warnings: Object.freeze({ type: 'array', items: announcementPreviewWarningSchema, maxItems: 20 })
  },
  additionalProperties: false
});

export function createAdminReadOperationContracts() {
  const contract = (operationId, requestSchema, dataSchema) => Object.freeze({ operationId, requestSchema, successSchema: envelopeSchema(dataSchema), errorSchema: SYNTHETIC_ERROR_SCHEMA, contractStatus: 'server-projection-verified' });
  const pageRequest = Object.freeze({ type: 'object', properties: { page: Object.freeze({ type: 'integer', minimum: 1, maximum: 100 }), pageSize: Object.freeze({ enum: [10, 20, 50, 100] }) }, additionalProperties: true });
  return Object.freeze({
    'INT-001': contract('INT-001', pageRequest, publicItemList(adminConnectionSchema)),
    'ADM-003': contract('ADM-003', pageRequest, publicItemList(auditLogSchema)),
    'ADM-004': contract('ADM-004', pageRequest, publicItemList(integrationLogSchema)),
    'INT-004': contract('INT-004', pageRequest, adminViewPageSchema),
    'ARC-002': contract('ARC-002', Object.freeze({ type: 'object', required: ['archiveTaskId'], properties: { archiveTaskId: identifier }, additionalProperties: false }), archiveDetailSchema),
    'OPS-001': contract('OPS-001', pageRequest, openObject),
    'OAN-001': contract('OAN-001', pageRequest, openObject),
    'OAN-002': contract('OAN-002', pageRequest, publicItemList(openObject)),
    'OAP-001': contract('OAP-001', pageRequest, openObject),
    'OAP-002': contract('OAP-002', pageRequest, publicItemList(openObject)),
    'OAN-003': contract('OAN-003', pageRequest, openObject),
    'OAN-008': contract('OAN-008', announcementPreviewRequestSchema, announcementPreviewSchema),
    'OAP-003': contract('OAP-003', pageRequest, openObject),
    'OAP-006': contract('OAP-006', pageRequest, openObject),
    'OAP-008': contract('OAP-008', pageRequest, publicItemList(openObject)),
    'OAP-011': contract('OAP-011', pageRequest, openObject),
    'ADM-006': contract('ADM-006', pageRequest, openObject),
    'ADM-007': contract('ADM-007', pageRequest, openObject),
    'INT-003': contract('INT-003', pageRequest, openObject),
    'INT-005': contract('INT-005', pageRequest, openObject)
  });
}

export function createPublicReadOperationContracts() {
  const contract = (operationId, requestSchema, data) => Object.freeze({
    operationId, requestSchema, successSchema: envelopeSchema(data), errorSchema: SYNTHETIC_ERROR_SCHEMA,
    contractStatus: 'server-projection-verified'
  });
  const courseDetailData = Object.freeze({
    ...courseSummarySchema,
    required: [...courseSummarySchema.required, 'descriptionHtml', 'agenda', 'materials', 'relatedApps', 'registrationStartAt', 'registrationEndAt', 'attendanceRule', 'pointRule', 'permissions'],
    properties: {
      ...courseSummarySchema.properties, descriptionHtml: optionalText,
      agenda: Object.freeze({ type: 'array', items: openObject, maxItems: 100 }), materials: Object.freeze({ type: 'array', items: openObject, maxItems: 100 }),
      relatedApps: Object.freeze({ type: 'array', items: openObject, maxItems: 100 }), registrationStartAt: optionalText,
      registrationEndAt: optionalText, attendanceRule: optionalText, pointRule: openObject, permissions: openObject
    }
  });
  return Object.freeze({
    'PTS-004': contract('PTS-004', publicListRequestSchema, publicItemList(pointRuleSchema)),
    'TRN-001': contract('TRN-001', Object.freeze({ type: 'object', properties: { month: optionalText, categoryCode: optionalText, limit: Object.freeze({ type: 'integer', minimum: 1, maximum: 20 }) }, additionalProperties: false }), Object.freeze({
      type: 'object', required: ['stats', 'featuredCourses', 'categories', 'upcomingCourses'],
      properties: { stats: openObject, featuredCourses: Object.freeze({ type: 'array', items: courseSummarySchema, maxItems: 20 }), categories: namedCountListSchema, upcomingCourses: Object.freeze({ type: 'array', items: courseSummarySchema, maxItems: 20 }) }, additionalProperties: false
    })),
    'TRN-002': contract('TRN-002', publicListRequestSchema, publicItemList(courseSummarySchema)),
    'TRN-003': contract('TRN-003', Object.freeze({ type: 'object', required: ['courseId'], properties: { courseId: identifier }, additionalProperties: false }), courseDetailData),
    'CER-001': contract('CER-001', Object.freeze({ type: 'object', properties: { newsLimit: Object.freeze({ type: 'integer', minimum: 1, maximum: 20 }), projectLimit: Object.freeze({ type: 'integer', minimum: 1, maximum: 50 }) }, additionalProperties: false }), Object.freeze({
      type: 'object', required: ['hero', 'stats', 'directions', 'sceneTags', 'news', 'projects', 'contact'],
      properties: { hero: openObject, stats: openObject, directions: namedCountListSchema, sceneTags: namedCountListSchema, news: Object.freeze({ type: 'array', items: openObject, maxItems: 20 }), projects: Object.freeze({ type: 'array', items: certificationSchema, maxItems: 50 }), contact: openObject }, additionalProperties: false
    })),
    'CER-002': contract('CER-002', publicListRequestSchema, publicItemList(certificationSchema)),
    'OPS-003': contract('OPS-003', publicListRequestSchema, publicItemList(metricSchema)),
    'MAT-001': contract('MAT-001', publicListRequestSchema, Object.freeze({
      type: 'object', required: ['materialTypes', 'categories', 'appTypes', 'domains', 'total'],
      properties: { materialTypes: Object.freeze({ type: 'array', items: materialFacetItemSchema, maxItems: 100 }), categories: Object.freeze({ type: 'array', items: materialCategorySchema, maxItems: 100 }), appTypes: Object.freeze({ type: 'array', items: openObject, maxItems: 100 }), domains: Object.freeze({ type: 'array', items: openObject, maxItems: 100 }), total: countInteger }, additionalProperties: false
    }))
  });
}

export function createSecureResourceOperationContracts() {
  const contract = (operationId, requestSchema, data) => Object.freeze({
    operationId, requestSchema, successSchema: envelopeSchema(data), errorSchema: SYNTHETIC_ERROR_SCHEMA,
    contractStatus: 'server-projection-verified'
  });
  const fileAccessData = Object.freeze({
    type: 'object', required: ['fileId', 'url', 'expiresAt', 'fileName', 'mimeType', 'sizeBytes', 'watermarkApplied'],
    properties: { fileId: identifier, url: text, expiresAt: text, fileName: text, mimeType: text, sizeBytes: countInteger, watermarkApplied: booleanValue }, additionalProperties: false
  });
  const appLaunchData = Object.freeze({
    type: 'object', required: ['appId', 'allowed', 'reasonCode', 'reasonMessage', 'launchUrl', 'openMode', 'expiresAt', 'ssoMode', 'auditId'],
    properties: { appId: identifier, allowed: booleanValue, reasonCode: nullableText, reasonMessage: nullableText, launchUrl: nullableText, openMode: Object.freeze({ enum: ['CURRENT_TAB', 'NEW_TAB'] }), expiresAt: nullableText, ssoMode: optionalText, auditId: identifier }, additionalProperties: false
  });
  const materialDownloadData = Object.freeze({
    type: 'object', required: ['downloadId', 'fileId', 'accessUrl', 'expiresAt', 'downloadCount', 'pointAward'],
    properties: { downloadId: identifier, fileId: identifier, accessUrl: text, expiresAt: text, downloadCount: countInteger, pointAward: Object.freeze({ anyOf: [openObject, Object.freeze({ type: 'null' })] }) }, additionalProperties: false
  });
  return Object.freeze({
    'COM-008': contract('COM-008', Object.freeze({ type: 'object', required: ['fileId', 'mode'], properties: { fileId: identifier, mode: Object.freeze({ enum: ['DOWNLOAD', 'PREVIEW'] }), disposition: Object.freeze({ enum: ['INLINE', 'ATTACHMENT'] }), fileNameOverride: optionalText }, additionalProperties: false }), fileAccessData),
    'APP-004': contract('APP-004', Object.freeze({ type: 'object', required: ['appId', 'launchMode', 'sourcePage', 'requestedAt'], properties: { appId: identifier, launchMode: Object.freeze({ enum: ['CURRENT_TAB', 'NEW_TAB'] }), sourcePage: identifier, requestedAt: text }, additionalProperties: false }), appLaunchData),
    'MAT-003': contract('MAT-003', Object.freeze({ type: 'object', required: ['materialId', 'fileId', 'purpose', 'sourcePage', 'clientOccurredAt'], properties: { materialId: identifier, fileId: identifier, purpose: text, sourcePage: identifier, clientOccurredAt: text }, additionalProperties: false }), materialDownloadData)
  });
}

export function createVerifiedReadOperationContracts() {
  return Object.freeze({
    ...createIdentityReadOperationContracts(),
    ...createDictionaryCommentReadOperationContracts(),
    ...createPersonalReadOperationContracts(),
    ...createWorkbenchSearchOperationContract(),
    ...createWorkbenchPersonalOperationContracts(),
    ...createIdentityDetailOperationContracts(),
    ...createAdminReadOperationContracts(),
    ...createAppReadOperationContracts(),
    ...createAnnouncementReadOperationContracts(),
    ...createTalentReadOperationContracts(),
    ...createContactReadOperationContracts(),
    ...createFirstBatchDetailOperationContracts(),
    ...createPublicReadOperationContracts()
    ,...createSecureResourceOperationContracts()
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
