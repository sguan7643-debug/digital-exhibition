/** Application-wide request activity signal for the controlled integration layer. */
let activeCount = 0;
let sequence = 0;
const activeLabels = new Map();
const subscribers = new Set();

function snapshot() {
  return Object.freeze({
    activeCount,
    labels: Object.freeze([...activeLabels.values()]),
    isLoading: activeCount > 0,
  });
}

function notify() {
  const value = snapshot();
  subscribers.forEach((subscriber) => {
    try { subscriber(value); } catch { /* view updates must not break requests */ }
  });
  return value;
}

export function getRequestActivity() { return snapshot(); }

export function subscribeRequestActivity(subscriber) {
  if (typeof subscriber !== 'function') return () => {};
  subscribers.add(subscriber);
  subscriber(snapshot());
  return () => subscribers.delete(subscriber);
}

export function beginRequest(label = '正在请求') {
  const token = ++sequence;
  activeCount += 1;
  activeLabels.set(token, String(label || '正在请求'));
  notify();
  return token;
}

export function endRequest(token) {
  if (!activeLabels.has(token)) return;
  activeLabels.delete(token);
  activeCount = Math.max(0, activeCount - 1);
  notify();
}

export async function trackRequest(task, label = '正在请求') {
  const token = beginRequest(label);
  try { return await task(); } finally { endRequest(token); }
}
