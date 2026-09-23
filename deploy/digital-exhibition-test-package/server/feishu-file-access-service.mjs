import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { FeishuProxyError } from './feishu-open-api-client.mjs';

const ACCESS_PATH = '/api/v1/files/content/';

function identityId(identity) {
  return String(identity?.userId || identity?.openId || '');
}

function safeHeader(value, fallback) {
  const normalized = String(value || fallback || '').replace(/[\r\n"]/g, '').trim();
  return normalized || fallback;
}

export function createFeishuFileAccessService({ client, now = Date.now, ttlMs = 5 * 60_000 } = {}) {
  if (!client?.downloadMedia) throw new Error('文件访问服务缺少飞书媒体客户端');
  const grants = new Map();

  function createGrant({ fileToken, fileName, mimeType, sizeBytes, mode = 'DOWNLOAD', disposition = 'ATTACHMENT', identity }) {
    const userId = identityId(identity);
    if (!userId) throw new FeishuProxyError('USER_AUTH_REQUIRED', '需要先完成飞书用户授权', 401);
    if (!/^[A-Za-z0-9_-]{1,256}$/.test(String(fileToken || ''))) throw new FeishuProxyError('FILE_NOT_AVAILABLE', '文件不存在或不可访问', 404);
    const grantToken = randomBytes(24).toString('base64url');
    const expiresAt = Number(now()) + ttlMs;
    grants.set(grantToken, { fileToken: String(fileToken), fileName: safeHeader(fileName, 'download'), mimeType: safeHeader(mimeType, 'application/octet-stream'), sizeBytes: Number(sizeBytes || 0), mode, disposition, userId, expiresAt });
    return { url: `${ACCESS_PATH}${grantToken}`, expiresAt: new Date(expiresAt).toISOString() };
  }

  async function consume(grantToken, identity) {
    const grant = grants.get(String(grantToken || ''));
    if (!grant || grant.expiresAt <= Number(now())) {
      if (grant) grants.delete(String(grantToken));
      throw new FeishuProxyError('FILE_ACCESS_EXPIRED', '文件访问地址已过期', 410);
    }
    if (!identityId(identity) || identityId(identity) !== grant.userId) throw new FeishuProxyError('FILE_ACCESS_FORBIDDEN', '该文件访问地址不属于当前用户', 403);
    const upstream = await client.downloadMedia(grant.fileToken);
    return { grant, upstream };
  }

  return Object.freeze({ createGrant, consume });
}

export function createFeishuFileNodeMiddleware({ fileAccessService, resolveIdentity } = {}) {
  if (!fileAccessService?.consume || typeof resolveIdentity !== 'function') throw new Error('文件中间件配置不完整');
  return async function feishuFileMiddleware(request, response, next) {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (!pathname.startsWith(ACCESS_PATH)) return next();
    if (request.method !== 'GET') {
      response.statusCode = 405;
      response.setHeader('Cache-Control', 'no-store');
      response.end('Method Not Allowed');
      return;
    }
    try {
      const { grant, upstream } = await fileAccessService.consume(pathname.slice(ACCESS_PATH.length), resolveIdentity(request.headers?.cookie || ''));
      response.statusCode = 200;
      response.setHeader('Cache-Control', 'private, no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Content-Type', upstream.headers.get('content-type') || grant.mimeType);
      response.setHeader('Content-Disposition', `${grant.mode === 'PREVIEW' || grant.disposition === 'INLINE' ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(grant.fileName)}`);
      const length = upstream.headers.get('content-length');
      if (length) response.setHeader('Content-Length', length);
      if (!upstream.body) return response.end();
      Readable.fromWeb(upstream.body).pipe(response);
    } catch (error) {
      response.statusCode = error instanceof FeishuProxyError ? error.status : 500;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify({ code: error instanceof FeishuProxyError ? error.code : 'FILE_PROXY_ERROR', message: error instanceof FeishuProxyError ? error.message : '文件访问失败' }));
    }
  };
}
