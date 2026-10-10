import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TextDecoder } from 'node:util';
import { inflateRawSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const crc32Table = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) === 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  return value >>> 0;
});

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function crc32(content) {
  let value = 0xffffffff;
  for (const byte of content) value = crc32Table[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function readZipCentralDirectory(archive) {
  const endSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const minimumEndOffset = Math.max(0, archive.length - 65_557);
  let endOffset = -1;
  for (let offset = archive.length - 22; offset >= minimumEndOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) === endSignature) {
      endOffset = offset;
      break;
    }
  }
  assert.notEqual(endOffset, -1, 'ZIP 必须包含有效的中央目录结束记录');
  assert.equal(archive.readUInt16LE(endOffset + 4), 0, 'ZIP 不得跨磁盘');
  assert.equal(archive.readUInt16LE(endOffset + 6), 0, 'ZIP 中央目录不得跨磁盘');

  const entryCount = archive.readUInt16LE(endOffset + 10);
  const centralSize = archive.readUInt32LE(endOffset + 12);
  const centralOffset = archive.readUInt32LE(endOffset + 16);
  const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
  const entries = [];
  let cursor = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(archive.readUInt32LE(cursor), centralSignature, `第 ${index + 1} 个中央目录条目签名无效`);
    const flags = archive.readUInt16LE(cursor + 8);
    const compressionMethod = archive.readUInt16LE(cursor + 10);
    const checksum = archive.readUInt32LE(cursor + 16);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const uncompressedSize = archive.readUInt32LE(cursor + 24);
    const fileNameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localHeaderOffset = archive.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + fileNameLength;
    const name = utf8Decoder.decode(archive.subarray(nameStart, nameEnd));
    entries.push({ checksum, compressedSize, compressionMethod, flags, localHeaderOffset, name, uncompressedSize });
    cursor = nameEnd + extraLength + commentLength;
  }

  assert.equal(cursor, centralOffset + centralSize, '中央目录长度必须与结束记录一致');
  return entries;
}

function readZipEntryContent(archive, entry) {
  const offset = entry.localHeaderOffset;
  assert.equal(archive.readUInt32LE(offset), 0x04034b50, `本地文件头无效：${entry.name}`);
  assert.equal(archive.readUInt16LE(offset + 6) & 0x0800, 0x0800, `本地文件头未声明 UTF-8：${entry.name}`);
  assert.equal(archive.readUInt16LE(offset + 8), entry.compressionMethod, `压缩方法不一致：${entry.name}`);
  assert.equal(archive.readUInt32LE(offset + 14), entry.checksum, `CRC 字段不一致：${entry.name}`);
  assert.equal(archive.readUInt32LE(offset + 18), entry.compressedSize, `压缩大小字段不一致：${entry.name}`);
  assert.equal(archive.readUInt32LE(offset + 22), entry.uncompressedSize, `原始大小字段不一致：${entry.name}`);

  const fileNameLength = archive.readUInt16LE(offset + 26);
  const extraLength = archive.readUInt16LE(offset + 28);
  const nameStart = offset + 30;
  const nameEnd = nameStart + fileNameLength;
  const localName = new TextDecoder('utf-8', { fatal: true }).decode(archive.subarray(nameStart, nameEnd));
  assert.equal(localName, entry.name, `本地文件头路径不一致：${entry.name}`);

  const dataStart = nameEnd + extraLength;
  const compressed = archive.subarray(dataStart, dataStart + entry.compressedSize);
  assert.equal(entry.compressionMethod, 8, `仅允许 DEFLATE：${entry.name}`);
  const content = inflateRawSync(compressed);
  assert.equal(content.length, entry.uncompressedSize, `解压大小不一致：${entry.name}`);
  assert.equal(crc32(content), entry.checksum, `CRC 校验失败：${entry.name}`);
  return content;
}

const [unit, envExample, packageJson, serverSource, cacheSource, deploymentReadme, packageBuilder] = await Promise.all([
  readFile(join(root, 'deploy', 'digital-exhibition-test.service'), 'utf8'),
  readFile(join(root, 'deploy', 'digital-exhibition-test.env.example'), 'utf8'),
  readFile(join(root, 'package.json'), 'utf8'),
  readFile(join(root, 'server', 'feishu-read-only-service.mjs'), 'utf8'),
  readFile(join(root, 'server', 'feishu-persistent-read-cache.mjs'), 'utf8'),
  readFile(join(root, 'README-TEST-DEPLOY.md'), 'utf8'),
  readFile(join(root, 'tools', 'create-test-deployment-package.mjs'), 'utf8')
]);

assert.match(unit, /^CPUQuota=150%$/m);
assert.match(unit, /^User=seaoil-deh$/m);
assert.match(unit, /^Group=seaoil-deh$/m);
assert.match(unit, /^MemoryMax=2G$/m);
assert.match(unit, /^MemoryHigh=1800M$/m);
assert.match(unit, /^UMask=0077$/m);
assert.match(unit, /^ExecStart=\/usr\/bin\/env node --max-old-space-size=1536 server\/test-deployment-server\.mjs$/m);
assert.match(packageJson, /--max-old-space-size=1536/);
assert.match(envExample, /^FEISHU_RUNTIME_CACHE_DIR=\/home\/seaoil\/pre-demo\/runtime-cache\/$/m);
assert.match(envExample, /^FEISHU_RUNTIME_CACHE_OWNER=seaoil-deh$/m);
assert.match(envExample, /^FEISHU_RUNTIME_CACHE_MAX_BYTES=3221225472$/m);
assert.match(envExample, /^FEISHU_SYNC_MAX_CONCURRENCY=3$/m);
assert.match(envExample, /^FEISHU_SYNC_TASK_TIMEOUT_MS=25000$/m);
assert.match(serverSource, /Math\.min\(3,/);
assert.match(serverSource, /Math\.min\(25_000,/);
assert.match(cacheSource, /mode: 0o700/);
assert.match(cacheSource, /chmod\(directory, 0o700\)/);
assert.match(cacheSource, /open\(temporary, 'wx', 0o600\)/);
assert.match(cacheSource, /chmod\(filePath, 0o600\)/);
assert.match(cacheSource, /Math\.floor\(maxDiskBytes \/ 2\)/);
assert.match(cacheSource, /CAPACITY_PRUNE_RATIO = 0\.8/);
assert.match(cacheSource, /CAPACITY_STOP_RATIO = 0\.95/);
assert.match(cacheSource, /CACHE_INTEGRITY_FAILED/);
assert.match(cacheSource, /CACHE_RUNTIME_USER_MISMATCH/);
assert.match(deploymentReadme, /sha256sum -c digital-exhibition-test-package\.zip\.sha256/);
assert.match(deploymentReadme, /sha256sum -c SHA256SUMS\.txt/);
assert.match(deploymentReadme, /install -d -m 755 \/home\/seaoil\/pre-demo\/releases/);
assert.match(deploymentReadme, /useradd --system/);
assert.match(deploymentReadme, /install -d -o seaoil-deh -g seaoil-deh -m 700 "\$STAGE"/);
assert.match(deploymentReadme, /cp -a "\$BASE\/test\/\.local\/\."/);
assert.match(deploymentReadme, /bundled runtime dependency ok/);
assert.match(deploymentReadme, /FEISHU_SYNC_TASK_TIMEOUT_MS=25000/);
assert.doesNotMatch(deploymentReadme, /npm (?:ci|install)/);
assert.match(packageBuilder, /copy\('node_modules\/undici', 'node_modules\/undici'\)/);
assert.match(packageBuilder, /dereference: true/);
assert.match(packageBuilder, /bundledDependencies: \['undici'\]/);
assert.doesNotMatch(packageBuilder, /execFileSync\([^)]*tar|tar\.exe/);
assert.match(packageBuilder, /createUtf8ZipFromDirectory/);
assert.match(deploymentReadme, /## 回滚命令/);
assert.match(deploymentReadme, /if \[ -f "\$BASE\/test\/digital-exhibition-test\.service" \]/);
assert.doesNotMatch(serverSource, /正式飞书数据仍在同步|正式飞书数据正在首次同步/);

const stagingDirectory = join(root, 'deploy', 'digital-exhibition-test-package');
assert.equal((await stat(stagingDirectory)).isDirectory(), true, '测试需要现有 staging 目录');
const sourceServerDirectory = join(root, 'server');
for (const sourcePath of await filesUnder(sourceServerDirectory)) {
  const relativePath = relative(sourceServerDirectory, sourcePath);
  const stagedPath = join(stagingDirectory, 'server', relativePath);
  assert.deepEqual(
    await readFile(stagedPath),
    await readFile(sourcePath),
    `部署 staging 必须与当前后端源码一致：server/${relativePath.replaceAll('\\', '/')}`
  );
}
const stagedServerEntry = await import(`${pathToFileURL(join(stagingDirectory, 'server', 'test-deployment-server.mjs')).href}?staging-import=${Date.now()}`);
assert.equal(typeof stagedServerEntry.createTestDeploymentServer, 'function', '部署 staging 的完整服务入口必须可导入');
const stagingFiles = await filesUnder(stagingDirectory);
const archiveRoot = basename(stagingDirectory);
const expectedPaths = stagingFiles
  .map(path => `${archiveRoot}/${relative(stagingDirectory, path).replaceAll('\\', '/')}`)
  .sort();
const expectedChineseNavPaths = expectedPaths.filter(path => /\/dist\/assets\/nav-[^/]*[^\x00-\x7F][^/]*\.png$/u.test(path));
assert.equal(expectedChineseNavPaths.length, 10, 'staging 中必须包含 10 个中文 nav PNG');

const packageModuleUrl = `${pathToFileURL(join(root, 'tools', 'create-test-deployment-package.mjs')).href}?contract-test=${Date.now()}`;
const { createUtf8ZipFromDirectory, writeSha256Sidecar } = await import(packageModuleUrl);
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'deh-utf8-zip-'));
try {
  const temporaryZip = join(temporaryDirectory, 'deployment.zip');
  const temporarySidecar = `${temporaryZip}.sha256`;
  await createUtf8ZipFromDirectory(stagingDirectory, temporaryZip, { archiveRoot });
  const zipBytes = await readFile(temporaryZip);
  const centralEntries = readZipCentralDirectory(zipBytes);
  const actualPaths = centralEntries.map(entry => entry.name).sort();

  assert.deepEqual(actualPaths, expectedPaths, 'ZIP 中央目录路径必须与 staging 文件一一对应');
  assert.equal(centralEntries.every(entry => (entry.flags & 0x0800) !== 0), true, '每个 ZIP 条目必须声明 UTF-8 文件名');
  for (const navPath of expectedChineseNavPaths) {
    assert.equal(actualPaths.includes(navPath), true, `ZIP 中央目录缺少中文资源：${navPath}`);
  }
  for (const entry of centralEntries) {
    const stagingPath = join(stagingDirectory, entry.name.slice(`${archiveRoot}/`.length));
    assert.deepEqual(readZipEntryContent(zipBytes, entry), await readFile(stagingPath), `ZIP 内容与 staging 不一致：${entry.name}`);
  }

  const digest = await writeSha256Sidecar(temporaryZip, temporarySidecar);
  const expectedDigest = createHash('sha256').update(zipBytes).digest('hex');
  assert.equal(digest, expectedDigest);
  assert.equal(await readFile(temporarySidecar, 'utf8'), `${expectedDigest}  ${basename(temporaryZip)}\n`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

const deliveredZipPath = join(root, 'deploy', 'digital-exhibition-test-package.zip');
const deliveredZip = await readFile(deliveredZipPath);
const deliveredEntries = readZipCentralDirectory(deliveredZip);
const deliveredPaths = deliveredEntries.map(entry => entry.name).sort();
assert.deepEqual(deliveredPaths, expectedPaths, '最终交付 ZIP 路径必须与 staging 文件一一对应');
assert.equal(deliveredEntries.every(entry => (entry.flags & 0x0800) !== 0), true, '最终交付 ZIP 的全部路径必须声明 UTF-8');
for (const navPath of expectedChineseNavPaths) {
  assert.equal(deliveredPaths.includes(navPath), true, `最终交付 ZIP 缺少中文资源：${navPath}`);
}
for (const entry of deliveredEntries) {
  const stagingPath = join(stagingDirectory, entry.name.slice(`${archiveRoot}/`.length));
  assert.deepEqual(readZipEntryContent(deliveredZip, entry), await readFile(stagingPath), `最终交付 ZIP 内容不一致：${entry.name}`);
}
const deliveredDigest = createHash('sha256').update(deliveredZip).digest('hex');
assert.equal(
  await readFile(`${deliveredZipPath}.sha256`, 'utf8'),
  `${deliveredDigest}  ${basename(deliveredZipPath)}\n`,
  '最终交付 ZIP 的 SHA-256 旁车必须与实际归档一致'
);

console.log('server cache deployment resource, permission, checksum, and rollback contract passed');
