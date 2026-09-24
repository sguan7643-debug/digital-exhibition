import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1));
const sourceRoot = join(root, 'src');
const files = [];

function collect(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) collect(path);
    else if (/\.(?:js|vue)$/.test(name)) files.push(path);
  }
}

collect(sourceRoot);

const forbidden = [
  /\b(?:APP|PEOPLE|MESSAGE|FAVORITE|ANNOUNCEMENT|HOT_APP|PROJECT|PROGRESS)_FIXTURES\b/,
  /\bmockLoader\b/,
  /integrationState\s*[!=]==?\s*["']mock["']/,
  /integrationMode\s*[!=]==?\s*["']mock["']/,
  /requestedMode\s*===?\s*["']mock["']/,
  /\bfallback(?:Overview|Courses|Notices|Usage|Rows|Departments|Users)\b/
];

const violations = [];
for (const file of files) {
  if (file.endsWith(join('fixtures', 'pages.js'))) continue;
  const source = readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) violations.push(`${relative(root, file)}: ${pattern}`);
  }
}

assert.equal(existsSync(join(sourceRoot, 'fixtures', 'mock-data.js')), false, '业务模拟数据文件必须删除');
assert.deepEqual(violations, [], `仍存在模拟业务数据入口：\n${violations.join('\n')}`);
console.log('no-mock-business-data: passed');
