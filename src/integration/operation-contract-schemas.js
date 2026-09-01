const text = Object.freeze({ type: 'string', minLength: 1, maxLength: 256 });
const optionalText = Object.freeze({ type: 'string', maxLength: 256 });
const identifier = Object.freeze({ type: 'string', minLength: 1, maxLength: 128 });
const nonNegativeInteger = Object.freeze({ type: 'integer', minimum: 0, maximum: 100000 });

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
    total: nonNegativeInteger
  },
  additionalProperties: false
});

export const SYNTHETIC_REQUEST_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    filters: filterSchema,
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
