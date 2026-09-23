import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createFeishuMiddlewareStack } from './feishu-vite-plugin.mjs';

const CONTENT_TYPES = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
});

function normalizeBase(value) {
  const path = `/${String(value || '/').trim().replace(/^\/+|\/+$/g, '')}`;
  return path === '/' ? '/' : path;
}

export function normalizeServerConfig(input = {}, { configDir = process.cwd() } = {}) {
  const rawPort = Number(input.port ?? 4173);
  if (!Number.isInteger(rawPort) || rawPort < 0 || rawPort > 65535) throw new Error('serverConfig.port 必须是 0-65535 的整数');
  const rawStaticDir = String(input.staticDir || './dist');
  const staticDir = isAbsolute(rawStaticDir) ? resolve(rawStaticDir) : resolve(configDir, rawStaticDir);
  return Object.freeze({
    host: String(input.host || '127.0.0.1'),
    port: rawPort,
    appBase: normalizeBase(input.appBase || '/test2'),
    staticDir
  });
}

export async function loadServerConfig(configPath = process.env.SERVER_CONFIG_PATH || resolve(process.cwd(), 'serverConfig.json')) {
  const absolutePath = resolve(configPath);
  const parsed = JSON.parse(await readFile(absolutePath, 'utf8'));
  return normalizeServerConfig(parsed, { configDir: dirname(absolutePath) });
}

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

async function existingFile(path) {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}

function safeFilePath(staticDir, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const target = resolve(staticDir, decoded.replace(/^\/+/, ''));
  const relation = relative(staticDir, target);
  return relation === '' || (!relation.startsWith('..') && !isAbsolute(relation)) ? target : null;
}

function createStaticHandler(config) {
  const indexPath = resolve(config.staticDir, 'index.html');
  return async function serveStatic(request, response) {
    const url = new URL(request.url || '/', 'http://localhost');
    const pathname = url.pathname;
    if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: '该静态资源仅接受 GET 或 HEAD' });
    if (pathname === '/' && config.appBase !== '/') {
      response.statusCode = 302;
      response.setHeader('Location', `${config.appBase}/`);
      response.end();
      return;
    }
    if (pathname === config.appBase && config.appBase !== '/') {
      response.statusCode = 308;
      response.setHeader('Location', `${config.appBase}/`);
      response.end();
      return;
    }
    if (pathname.startsWith('/api/')) return sendJson(response, 404, { code: 'API_ROUTE_NOT_FOUND', message: '接口不存在' });

    const underBase = config.appBase === '/' || pathname === config.appBase || pathname.startsWith(`${config.appBase}/`);
    const assetPath = pathname.startsWith('/assets/') || pathname === '/favicon.ico';
    if (!underBase && !assetPath) return sendJson(response, 404, { code: 'ROUTE_NOT_FOUND', message: '页面不存在' });

    const requestedPath = assetPath ? pathname : pathname.slice(config.appBase === '/' ? 0 : config.appBase.length) || '/';
    const candidate = safeFilePath(config.staticDir, requestedPath);
    const filePath = candidate && await existingFile(candidate) ? candidate : extname(requestedPath) ? null : indexPath;
    if (!filePath || !await existingFile(filePath)) return sendJson(response, 404, { code: 'STATIC_FILE_NOT_FOUND', message: '静态资源不存在' });

    const body = await readFile(filePath);
    response.statusCode = 200;
    response.setHeader('Content-Type', CONTENT_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream');
    response.setHeader('Cache-Control', filePath === indexPath ? 'no-cache' : 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.end(request.method === 'HEAD' ? undefined : body);
  };
}

function runMiddlewareChain(middlewares, request, response, fallback) {
  let index = -1;
  const next = error => {
    if (error) return sendJson(response, 500, { code: 'SERVER_MIDDLEWARE_ERROR', message: '测试服务处理失败' });
    index += 1;
    const middleware = middlewares[index];
    if (!middleware) return Promise.resolve(fallback(request, response));
    try {
      return Promise.resolve(middleware(request, response, next)).catch(next);
    } catch (caught) {
      return next(caught);
    }
  };
  return next();
}

export function createTestDeploymentServer({ config, prewarm = true, feishuOptions = {} } = {}) {
  const normalized = normalizeServerConfig(config || {});
  const stack = createFeishuMiddlewareStack({ ...feishuOptions, prewarm });
  const staticHandler = createStaticHandler(normalized);
  return createServer((request, response) => {
    runMiddlewareChain(stack.middlewares, request, response, staticHandler).catch(() => {
      if (!response.headersSent) sendJson(response, 500, { code: 'TEST_SERVER_ERROR', message: '测试服务暂不可用' });
      else response.destroy();
    });
  });
}

export async function startTestDeploymentServer() {
  const config = await loadServerConfig();
  const server = createTestDeploymentServer({ config });
  await new Promise((resolveListen, reject) => server.listen(config.port, config.host, error => error ? reject(error) : resolveListen()));
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : config.port;
  process.stdout.write(`Digital Exhibition test server ready: http://${config.host}:${actualPort}${config.appBase}/\n`);
  return server;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  startTestDeploymentServer().catch(error => {
    process.stderr.write(`Test server failed to start: ${String(error?.message || error)}\n`);
    process.exitCode = 1;
  });
}
