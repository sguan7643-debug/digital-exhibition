import { FeishuProxyError } from './feishu-open-api-client.mjs';

const IDENTIFIER_PATTERN = /^ONB[A-Za-z0-9_-]{1,125}$/;

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

export function createOnboardingUniqueIdentifierClient({
  baseUrl = process.env.FEISHU_APPROVAL_BACKEND_URL || 'http://10.151.23.119:28080',
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('上线申请唯一标识客户端缺少 fetch');
  const base = normalizedBaseUrl(baseUrl);
  const endpoint = new URL('/api/onboarding/unique-identifier', base).toString();

  async function getUniqueIdentifier() {
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(Math.max(1_000, Number(timeoutMs) || 10_000))
      });
    } catch (error) {
      throw failure('ONBOARDING_UNIQUE_IDENTIFIER_UNAVAILABLE', `获取唯一标识失败：${String(error?.message || '网络不可用')}`);
    }
    let payload;
    try { payload = await response.json(); }
    catch { throw failure('ONBOARDING_UNIQUE_IDENTIFIER_INVALID', '唯一标识接口返回格式异常'); }
    if (!response.ok || (payload?.code && String(payload.code) !== '00000')) {
      throw failure('ONBOARDING_UNIQUE_IDENTIFIER_UNAVAILABLE', String(payload?.message || `唯一标识接口请求失败（HTTP ${response.status}）`), response.status >= 400 && response.status < 600 ? response.status : 503);
    }
    const identifier = String(payload?.data?.uniqueIdentifier || payload?.uniqueIdentifier || '').trim();
    if (!IDENTIFIER_PATTERN.test(identifier)) {
      throw failure('ONBOARDING_UNIQUE_IDENTIFIER_INVALID', '唯一标识接口未返回有效的 ONB 标识', 502);
    }
    return identifier;
  }

  return Object.freeze({ endpoint, getUniqueIdentifier });
}
