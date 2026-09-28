import assert from 'node:assert/strict';
import { runWithConcurrency } from '../src/integration/concurrency-pool.js';

let active = 0;
let maximumActive = 0;
const started = [];
const completed = [];

const result = await runWithConcurrency(['a', 'b', 'c', 'd', 'e'], 2, async item => {
  started.push(item);
  active += 1;
  maximumActive = Math.max(maximumActive, active);
  await new Promise(resolve => setTimeout(resolve, item === 'a' ? 20 : 5));
  active -= 1;
  completed.push(item);
  return item.toUpperCase();
});

assert.equal(maximumActive, 2, '附件上传最多只能同时执行两个请求');
assert.deepEqual(started.slice(0, 2), ['a', 'b']);
assert.deepEqual(result, ['A', 'B', 'C', 'D', 'E'], '并发上传仍需按选择顺序返回结果');
assert.equal(completed.length, 5);

console.log('onboarding upload concurrency is bounded to two requests');
