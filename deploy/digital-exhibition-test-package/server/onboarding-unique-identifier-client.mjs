import { createHash } from 'node:crypto';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

/** 后台返回无前缀 UUID；也可兼容带 ONB 前缀的历史值。 */
const IDENTIFIER_PATTERN = /^(?:ONB)?[A-Za-z0-9_-]{8,128}$/;

function normalizedBaseUrl(value) {
  let parsed;
  try { parsed = new URL(String(value || '')); }
  catch { throw new Error('上线申请唯一标识服务地址无效'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('上线申请唯一标识服务地址无效');
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed;
}

function failure(code, message, status = 503) {
  return new FeishuProxyError(code, message, status);
}

function stableFallbackIdentifier(fallbackKey) {
  const key = String(fallbackKey || '').trim();
  if (!key) throw failure('ONBOARDING_UNIQUE_IDENTIFIER_UNAVAILABLE', '唯一标识服务不可用且申请缺少稳定标识键');
  // 与后台一致：无 ONB 前缀的 32 位十六进制。
  return createHash('sha256').update(key).digest('hex').slice(0, 32);
}

export function createOnboardingUniqueIdentifierClient({
  baseUrl = process.env.FEISHU_APPROVAL_BACKEND_URL || 'http://10.151.23.119:28080',
  fetchImpl = globalThis.fetch,
  timeoutMs = 3_000
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('上线申请唯一标识客户端缺少 fetch');
  const base = normalizedBaseUrl(baseUrl);
  const endpoint = new URL('/api/onboarding/unique-identifier', base).toString();

  async function getUniqueIdentifier({ fallbackKey = '' } = {}) {
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(Math.max(1_000, Number(timeoutMs) || 3_000))
      });
    } catch (error) {
      return stableFallbackIdentifier(fallbackKey);
    }
    let payload;
    try { payload = await response.json(); }
    catch { throw failure('ONBOARDING_UNIQUE_IDENTIFIER_INVALID', '唯一标识接口返回格式异常'); }
    if (!response.ok || (payload?.code && String(payload.code) !== '00000')) {
      if (response.status >= 500) return stableFallbackIdentifier(fallbackKey);
      throw failure('ONBOARDING_UNIQUE_IDENTIFIER_UNAVAILABLE', String(payload?.message || `唯一标识接口请求失败（HTTP ${response.status}）`), response.status >= 400 && response.status < 600 ? response.status : 503);
    }
    const identifier = String(payload?.data?.uniqueIdentifier || payload?.uniqueIdentifier || '').trim();
    if (!IDENTIFIER_PATTERN.test(identifier)) {
      throw failure('ONBOARDING_UNIQUE_IDENTIFIER_INVALID', '唯一标识接口未返回有效标识', 502);
    }
    return identifier;
  }

  return Object.freeze({ endpoint, getUniqueIdentifier });
}
