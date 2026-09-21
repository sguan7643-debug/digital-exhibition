import { isKnownOperationId } from './operation-registry.js';
import { validateSameOriginProxyBase } from './runtime-config.js';
import { validateContractSchema } from './operation-contract-schemas.js';
import { beginRequest, endRequest } from './request-status.js';

const sensitiveKeySegments = Object.freeze([
  'appsecret','apptoken','tenantaccesstoken','useraccesstoken','accesstoken',
  'tableid','viewid','tenantkey','authorization','cookie','secret','token'
]);

const normalizeKey = key => String(key).replace(/[^a-z0-9]/gi, '').toLowerCase();
const isSensitiveKey = key => {
  const normalized = normalizeKey(key);
  return sensitiveKeySegments.some(segment => normalized.includes(segment));
};

function assertSafePayload(value, path = 'payload') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (isSensitiveKey(key)) throw new Error(`浏览器数据包含敏感字段：${path}.${key}`);
    assertSafePayload(child, `${path}.${key}`);
  }
}

function enforceSchema(value, schema, direction) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${direction} 必须为对象`);
  assertSafePayload(value, direction);
  return validateContractSchema(value, schema, direction);
}

function getOperationContract(operationContracts, operationId) {
  const contract = operationContracts?.[operationId];
  if (
    !contract
    || contract.operationId !== operationId
    || !contract.requestSchema
    || !contract.successSchema
    || !contract.errorSchema
  ) {
    throw new Error(`operation ${operationId} 缺少请求/成功/错误 schema 合同`);
  }
  return contract;
}

export function normalizeIntegrationError(error = {}) {
  const status = Number(error.status || error.response?.status || 0);
  const code = String(error.code || error.name || '').toLowerCase();
  if (status === 401) return { state: 'authentication-required', retryable: false };
  if (status === 403) return { state: 'permission-denied', retryable: false };
  if (status === 429) return { state: 'rate-limited', retryable: true };
  if (status === 409) return { state: 'conflict', retryable: false };
  if (/timeout/.test(code)) return { state: 'timeout', retryable: true };
  if (/abort|cancel/.test(code)) return { state: 'cancelled', retryable: false };
  if (/security/.test(code)) return { state: 'security-error', retryable: false };
  if (/schema/.test(code)) return { state: 'schema-drift', retryable: false };
  if (/partial.write/.test(code)) return { state: 'partial-write', retryable: false };
  if (/partial/.test(code)) return { state: 'partial', retryable: true };
  return { state: 'error', retryable: status >= 500 || status === 0 };
}

export class IntegrationRequestError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'IntegrationRequestError';
    Object.assign(this, details);
  }
}

function createSchemaError(message, details = {}) {
  return new IntegrationRequestError(message, { state: 'schema-drift', retryable: false, ...details });
}

function validateErrorEnvelope(body, contract, response, traceId) {
  const normalized = normalizeIntegrationError({ status: response.status, code: body?.code });
  try {
    enforceSchema(body, contract.errorSchema, 'error response');
  } catch {
    throw new IntegrationRequestError('安全代理错误响应不符合合同', {
      ...normalized,
      status: response.status,
      traceId,
      contractError: 'error-envelope-schema'
    });
  }
  return { ...normalized, retryAfterSeconds: body.retryAfterSeconds };
}

let fallbackTraceSequence = 0;

export function createSafeProxyClient(options = {}) {
  const origin = options.origin || globalThis.location?.origin || 'http://localhost';
  const baseUrl = validateSameOriginProxyBase(options.baseUrl, origin);
  const originUrl = new URL(origin);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('缺少安全代理请求实现');
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : null;
  const traceIdFactory = options.traceIdFactory || (() => globalThis.crypto?.randomUUID?.() || `trace-sequence-${++fallbackTraceSequence}`);
  const operationContracts = options.operationContracts || {};

  function execute(operationId, payload = {}, requestOptions = {}) {
    return (async () => {
      if (!isKnownOperationId(operationId)) throw new Error(`未知或无效的 operationId：${operationId}`);
      const contract = getOperationContract(operationContracts, operationId);
      enforceSchema(payload, contract.requestSchema, 'request');
      const operationUrl = new URL(`${baseUrl}/operations/${encodeURIComponent(operationId)}`, originUrl);
      const expectedPrefix = `${baseUrl}/operations/`;
      if (
        operationUrl.origin !== originUrl.origin
        || operationUrl.username
        || operationUrl.password
        || operationUrl.search
        || operationUrl.hash
        || !operationUrl.pathname.startsWith(expectedPrefix)
      ) throw new Error('最终 operation URL 未通过同源安全校验');
      const traceId = traceIdFactory();
      if (requestOptions.signal?.aborted) {
        throw new IntegrationRequestError('请求已由调用方取消', { state: 'cancelled', retryable: false, traceId, cause: requestOptions.signal.reason });
      }
      const controller = new AbortController();
      let callerCancelled = false;
      let timedOut = false;
      const abortedRequestError = status => {
        if (callerCancelled) return new IntegrationRequestError('请求已由调用方取消', {
          state: 'cancelled', retryable: false, status, traceId, cause: controller.signal.reason
        });
        if (timedOut) return new IntegrationRequestError('请求超时', {
          state: 'timeout', retryable: true, status, traceId, cause: controller.signal.reason
        });
        if (controller.signal.aborted) return new IntegrationRequestError('请求已取消', {
          state: 'cancelled', retryable: false, status, traceId, cause: controller.signal.reason
        });
        return null;
      };
      const throwIfAborted = status => {
        const error = abortedRequestError(status);
        if (error) throw error;
      };
      const abortFromCaller = () => {
        callerCancelled = true;
        controller.abort(requestOptions.signal?.reason || new DOMException('请求已取消', 'AbortError'));
      };
      requestOptions.signal?.addEventListener?.('abort', abortFromCaller, { once: true });
      let timer;
      if (timeoutMs) timer = setTimeout(() => {
        timedOut = true;
        controller.abort(new DOMException('请求超时', 'TimeoutError'));
      }, timeoutMs);
      const requestToken = beginRequest(`正在请求 ${operationId}`);
      try {
        const response = await fetchImpl(operationUrl.pathname, {
          method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'X-Trace-Id': traceId },
          body: JSON.stringify({ operationId, input: payload })
        });
        throwIfAborted(response.status);
        const httpNormalized = response.ok ? null : normalizeIntegrationError({ status: response.status });
        let body;
        try {
          body = await response.json();
        } catch {
          throwIfAborted(response.status);
          if (!response.ok) {
            throw new IntegrationRequestError('安全代理错误响应不是有效 JSON', {
              ...httpNormalized, status: response.status, traceId, contractError: 'invalid-error-json'
            });
          }
          throw createSchemaError('安全代理响应不是有效 JSON', { status: response.status, traceId });
        }
        await Promise.resolve();
        throwIfAborted(response.status);
        if (!response.ok) {
          const normalized = validateErrorEnvelope(body, contract, response, traceId);
          throwIfAborted(response.status);
          throw new IntegrationRequestError('安全代理请求失败', { ...normalized, status: response.status, traceId: body.traceId || traceId });
        }
        try {
          enforceSchema(body, contract.successSchema, 'success response');
        } catch (error) {
          if (/敏感字段/.test(error?.message || '')) throw error;
          throw createSchemaError('安全代理成功响应不符合合同', { status: response.status, traceId });
        }
        await Promise.resolve();
        throwIfAborted(response.status);
        return { ...body, traceId: body.traceId || traceId };
      } catch (error) {
        const normalized = error instanceof IntegrationRequestError
          ? { state: error.state, retryable: error.retryable }
          : callerCancelled
          ? { state: 'cancelled', retryable: false }
          : timedOut
            ? { state: 'timeout', retryable: true }
          : normalizeIntegrationError(error);
        throw new IntegrationRequestError(error?.message || '安全代理请求失败', {
          ...normalized,
          status: error?.status,
          traceId: error?.traceId || traceId,
          retryAfterSeconds: error?.retryAfterSeconds,
          contractError: error?.contractError
        });
      } finally {
        endRequest(requestToken);
        if (timer) clearTimeout(timer);
        requestOptions.signal?.removeEventListener?.('abort', abortFromCaller);
      }
    })();
  }

  return Object.freeze({ execute });
}
