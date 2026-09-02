import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDirectory = path.join(root, 'dist', 'assets');
assert.ok(fs.existsSync(assetsDirectory), '必须先执行 pnpm build 再检查浏览器产物');

const javascript = fs.readdirSync(assetsDirectory)
  .filter(file => file.endsWith('.js'))
  .map(file => fs.readFileSync(path.join(assetsDirectory, file), 'utf8'))
  .join('\n');

for (const internalSchemaTerm of ['用户字典', '手机号', '指标应用详情', '后台任务执行记录']) {
  assert.equal(javascript.includes(internalSchemaTerm), false, `浏览器产物不得包含内部结构目录：${internalSchemaTerm}`);
}

assert.match(javascript, /source-contract-incomplete/);
assert.doesNotMatch(javascript, /verifiedSourceTables|missingSourceTables/);

console.log('browser integration bundle contains minimal readiness state only');
