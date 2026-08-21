import assert from 'node:assert/strict';

const calls = [];
globalThis.Request = class Request { constructor(url) { this.url = url; } };
globalThis.XMLHttpRequest = class XMLHttpRequest {
  open(method, url) { calls.push(['xhr', method, url]); }
};
class WebSocket { constructor(url, protocols) { calls.push(['ws', url, protocols]); } }
globalThis.window = {
  location: { href: 'http://127.0.0.1:4173/workbench' },
  fetch(input) { calls.push(['fetch', input]); return Promise.resolve({ ok: true }); },
  WebSocket
};
globalThis.navigator = {
  sendBeacon(url) { calls.push(['beacon', url]); return true; }
};

const { installLocalOnlyNetworkGuard } = await import('../src/runtime/network-guard.js');
installLocalOnlyNetworkGuard();

await window.fetch('/local-fixture.json');
await window.fetch('http://localhost:4173/asset.png');
assert.throws(() => window.fetch('https://outside.invalid/business'), /已阻止外部网络请求/);

const xhr = new XMLHttpRequest();
xhr.open('GET', '/fixture.json');
assert.throws(() => xhr.open('POST', 'https://outside.invalid/api'), /已阻止外部网络请求/);

new window.WebSocket('ws://127.0.0.1:4173/local');
assert.throws(() => new window.WebSocket('wss://outside.invalid/socket'), /已阻止外部网络请求/);
assert.equal(navigator.sendBeacon('/local-log', 'fixed'), true);
assert.throws(() => navigator.sendBeacon('https://outside.invalid/log'), /已阻止外部网络请求/);

assert.deepEqual(calls.map(call => call[0]), ['fetch', 'fetch', 'xhr', 'ws', 'beacon']);
console.log('本地请求放行与 HTTP/XHR/WebSocket/Beacon 外网阻断测试通过');
