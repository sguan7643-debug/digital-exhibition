import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServerRealDataPackage } from './create-server-real-data-package.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const result = await createServerRealDataPackage();
const sidecar = (await readFile(result.zipShaPath, 'utf8')).trim().split(/\s+/)[0];
const actual = createHash('sha256').update(await readFile(result.zipPath)).digest('hex');

assert.equal(result.zipDigest, actual);
assert.equal(sidecar, actual);
assert.ok((await stat(result.zipPath)).size > 0);

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

const relativeFiles = (await walk(result.output)).map(file => path.relative(result.output, file).replaceAll('\\', '/'));
assert.ok(relativeFiles.includes('server/test-deployment-server.mjs'));
assert.ok(relativeFiles.includes('server/clear-read-cache-operations.mjs'));
assert.ok(relativeFiles.includes('server/formal-dictionary-baseline.mjs'));
assert.ok(relativeFiles.includes('server/runtime-metadata.mjs'));
assert.ok(relativeFiles.includes('server/runtime-audit.sh'));
assert.ok(relativeFiles.includes('server/install-live-recovery.sh'));
assert.ok(relativeFiles.includes('release-metadata.json'));
assert.ok(relativeFiles.includes('SHA256SUMS.txt'));
assert.ok(relativeFiles.includes('digital-exhibition-test.service'));
assert.ok(relativeFiles.includes('.env.example'));
assert.equal(relativeFiles.some(file => file === '.env' || file.startsWith('dist/') || file.includes('/dist/')), false);
assert.equal(relativeFiles.some(file => file === 'runtime-cache' || file.startsWith('runtime-cache/')), false);
for (const file of relativeFiles) {
  assert.equal((await lstat(path.join(result.output, file))).isSymbolicLink(), false, `部署包不得包含符号链接: ${file}`);
}

const manifestLines = (await readFile(path.join(result.output, 'SHA256SUMS.txt'), 'utf8')).trim().split('\n');
const declared = new Set();
for (const line of manifestLines) {
  const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
  assert.ok(match, `非法的 SHA256SUMS 行: ${line}`);
  const [, expected, relativeFile] = match;
  declared.add(relativeFile);
  const digest = createHash('sha256').update(await readFile(path.join(result.output, relativeFile))).digest('hex');
  assert.equal(digest, expected, `包内文件摘要不匹配: ${relativeFile}`);
}
assert.deepEqual(declared, new Set(relativeFiles.filter(file => file !== 'SHA256SUMS.txt')), '包内不得有未声明文件');

const forbiddenContent = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /authorization\s*[:=]\s*['"]bearer\s+[A-Za-z0-9._~-]{16,}/i,
  /cookie\s*[:=]\s*['"][^'"\r\n;]{1,128}=[^'"\r\n;]{16,}/i,
  /(?:app[_-]?secret|base[_-]?token)\s*[:=]\s*['"][A-Za-z0-9._~-]{16,}/i
];
for (const relativeFile of relativeFiles) {
  const content = (await readFile(path.join(result.output, relativeFile))).toString('utf8');
  assert.equal(forbiddenContent.some(pattern => pattern.test(content)), false, `部署包疑似包含敏感值: ${relativeFile}`);
}

const readme = await readFile(path.join(result.output, 'README.md'), 'utf8');
assert.match(readme, /\u7eaf\u540e\u7aef/);
assert.match(readme, /不要求 formal-dictionary-baseline\.json/);
assert.match(readme, /install-live-recovery\.sh/);
const releaseMetadata = JSON.parse(await readFile(path.join(result.output, 'release-metadata.json'), 'utf8'));
assert.match(releaseMetadata.release, /^DEH-SERVER-LIVE-RECOVERY-20261012-R2-/);
assert.match(releaseMetadata.gitCommit, /^(?:unknown|[a-f0-9]{40})$/);
assert.equal(typeof releaseMetadata.gitDirty, 'boolean');
assert.equal(releaseMetadata.cacheSchemaVersion, 'feishu-read-cache.v1');
console.log(`server real-data package passed (${result.fileCount} files, sha256=${actual})`);
