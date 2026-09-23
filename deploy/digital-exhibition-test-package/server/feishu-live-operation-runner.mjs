function errorDetails(error) {
  return {
    errorCode: error?.code || 'UNEXPECTED',
    errorMessage: String(error?.message || error).slice(0, 240),
    httpStatus: Number(error?.status || error?.httpStatus || 0) || undefined,
    upstreamCode: Number.isInteger(error?.upstreamCode) ? error.upstreamCode : undefined,
    traceId: error?.traceId || error?.details?.traceId || ''
  };
}

export function validateOperationRegistry(registry) {
  if (!Array.isArray(registry) || registry.length === 0) throw new Error('运行清单不能为空');
  const ids = registry.map(item => item?.id || item?.operationId);
  if (ids.some(id => !id)) throw new Error('运行清单存在缺少 ID 的 operation');
  if (new Set(ids).size !== ids.length) throw new Error('运行清单存在重复 operation ID');
  return ids;
}

export async function runOperationRegistry({ registry, execute, inputFor = () => ({}) }) {
  if (typeof execute !== 'function') throw new Error('缺少 operation 执行器');
  const ids = validateOperationRegistry(registry);
  const results = [];
  for (const operation of registry) {
    const operationId = operation.id || operation.operationId;
    const startedAt = new Date().toISOString();
    let input = null;
    try {
      input = await inputFor(operation);
      const response = await execute(operationId, input, operation);
      results.push({ operationId, status: 'passed', request: { input }, response, startedAt, finishedAt: new Date().toISOString() });
    } catch (error) {
      const details = errorDetails(error);
      const status = ['SOURCE_UNAVAILABLE', 'OPERATION_NOT_CONFIGURED', 'REMOTE_DISABLED', 'COMMAND_NOT_IMPLEMENTED', 'REQUIRED_INPUT_UNAVAILABLE', 'PERMISSION_DENIED', 'FILE_ACCESS_SERVICE_UNAVAILABLE'].includes(details.errorCode)
        ? 'blocked'
        : 'failed';
      results.push({
        operationId,
        status,
        request: { input },
        ...(Array.isArray(error?.requiredInput) ? { requiredInput: error.requiredInput } : {}),
        ...details,
        startedAt,
        finishedAt: new Date().toISOString()
      });
    }
  }
  const resultIds = results.map(item => item.operationId);
  return {
    results,
    complete: results.length === ids.length && ids.every((id, index) => resultIds[index] === id),
    passed: results.length === ids.length && results.every(item => item.status === 'passed')
  };
}
