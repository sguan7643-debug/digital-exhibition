const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

function assertLocalTarget(input) {
  const raw = input instanceof Request ? input.url : String(input);
  const target = new URL(raw, window.location.href);
  const current = new URL(window.location.href);
  const sameOrigin = target.origin === (window.location.origin || current.origin)
    || ((target.protocol === 'ws:' || target.protocol === 'wss:')
      && target.hostname === current.hostname
      && target.port === current.port
      && ((target.protocol === 'ws:' && current.protocol === 'http:')
        || (target.protocol === 'wss:' && current.protocol === 'https:')));
  if (!sameOrigin && !LOOPBACK_HOSTS.has(target.hostname)) {
    throw new TypeError(`R3 本地样机已阻止外部网络请求：${target.origin}`);
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
