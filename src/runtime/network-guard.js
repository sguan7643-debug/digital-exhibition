const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const ALLOWED_EXTERNAL_ORIGINS = new Set([
  'http://127.0.0.1:28080',
  'http://localhost:28080',
  'http://10.151.23.119:28080'
]);
const ALLOWED_EXTERNAL_PATH_PREFIXES = [
  '/api/processInstanceStart',
  '/api/onboarding/unique-identifier',
  '/api/onboarding/application-no',
  '/api/feishu/bitable/records'
];

function assertLocalTarget(input) {
  const raw = input instanceof Request ? input.url : String(input);
  const target = new URL(raw, window.location.href);
  if (LOOPBACK_HOSTS.has(target.hostname)) {
    return target;
  }
  const allowedOrigin = ALLOWED_EXTERNAL_ORIGINS.has(target.origin);
  const allowedPath = ALLOWED_EXTERNAL_PATH_PREFIXES.some((prefix) => target.pathname === prefix
    || target.pathname.startsWith(`${prefix}/`));
  if (!allowedOrigin || !allowedPath) {
    throw new TypeError(`R3 本地样机已阻止外部网络请求：${target.origin}${target.pathname}`);
  }
  return target;
}

export function installLocalOnlyNetworkGuard() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    assertLocalTarget(input);
    return nativeFetch(input, init);
  };

  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function guardedOpen(method, url, ...rest) {
    assertLocalTarget(url);
    return nativeOpen.call(this, method, url, ...rest);
  };

  const NativeWebSocket = window.WebSocket;
  window.WebSocket = class LocalOnlyWebSocket extends NativeWebSocket {
    constructor(url, protocols) {
      assertLocalTarget(url);
      super(url, protocols);
    }
  };

  if (typeof navigator.sendBeacon === 'function') {
    const nativeSendBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => {
      assertLocalTarget(url);
      return nativeSendBeacon(url, data);
    };
  }
}
