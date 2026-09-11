import assert from 'node:assert/strict';

const calls = [];
globalThis.XMLHttpRequest = class XMLHttpRequest {
  open(method, url) { calls.push(['xhr', method, url]); }
};
class WebSocket { constructor(url) { calls.push(['ws', url]); } }
globalThis.window = {
  location: { href: 'https://exhibition.example/workbench', origin: 'https://exhibition.example' },
  fetch(input) { calls.push(['fetch', input]); return Promise.resolve({ ok: true }); },
  WebSocket
};
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { sendBeacon(url) { calls.push(['beacon', url]); return true; } }
});

const { installLocalOnlyNetworkGuard } = await import('../src/runtime/network-guard.js');
installLocalOnlyNetworkGuard();

await window.fetch('/api/v1/apps');
await window.fetch('https://exhibition.example/api/v1/materials');
assert.throws(() => window.fetch('https://outside.invalid/business'), /已阻止外部网络请求/);
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://exhibition.example/api/v1/profile');
assert.throws(() => xhr.open('GET', 'https://outside.invalid/api'), /已阻止外部网络请求/);
new window.WebSocket('wss://exhibition.example/socket');
assert.throws(() => new window.WebSocket('wss://outside.invalid/socket'), /已阻止外部网络请求/);
assert.equal(navigator.sendBeacon('/api/v1/logs', 'fixed'), true);
assert.throws(() => navigator.sendBeacon('https://outside.invalid/log', 'fixed'), /已阻止外部网络请求/);

console.log('P0 same-origin production requests pass; external requests remain blocked');
