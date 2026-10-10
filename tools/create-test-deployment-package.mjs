import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { deflateRaw } from 'node:zlib';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const deployRoot = resolve(root, 'deploy');
const packageName = 'digital-exhibition-test-package';
const output = resolve(deployRoot, packageName);
const zipPath = resolve(deployRoot, `${packageName}.zip`);
const zipShaPath = resolve(deployRoot, `${packageName}.zip.sha256`);
const deflateRawAsync = promisify(deflateRaw);
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_DEFLATE_METHOD = 8;
const ZIP_VERSION = 20;
const ZIP_VERSION_MADE_BY_UNIX = 0x0314;
const ZIP32_MAX = 0xffffffff;

const crc32Table = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) === 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  return value >>> 0;
});

function assertInside(parent, child) {
  const relation = relative(parent, child);
  if (!relation || relation.startsWith('..') || relation.includes(`..${sep}`)) throw new Error(`拒绝操作非部署目录：${child}`);
}

async function copy(source, target) {
  await cp(resolve(root, source), resolve(output, target), { recursive: true, force: true, dereference: true });
}

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

function crc32(content) {
  let value = 0xffffffff;
  for (const byte of content) value = crc32Table[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date) {
  const year = Math.min(2107, Math.max(1980, date.getUTCFullYear()));
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = Math.floor(date.getUTCSeconds() / 2);
  return {
    date: ((year - 1980) << 9) | (month << 5) | day,
    time: (hours << 11) | (minutes << 5) | seconds
  };
}

function assertZip32(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > ZIP32_MAX) {
    throw new Error(`${label} 超出标准 ZIP32 范围，当前部署包不支持 ZIP64`);
  }
}

function normalizeArchiveRoot(value) {
  const normalized = String(value || '').replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized === '.' || normalized === '..' || normalized.includes('/') || normalized.includes('\0')) {
    throw new Error(`无效的 ZIP 根目录名：${value}`);
  }
  return normalized;
}

export async function createUtf8ZipFromDirectory(sourceDirectory, destinationZip, { archiveRoot = basename(sourceDirectory) } = {}) {
  const sourceRoot = resolve(sourceDirectory);
  const sourceInfo = await stat(sourceRoot);
  if (!sourceInfo.isDirectory()) throw new Error(`ZIP 来源必须是目录：${sourceRoot}`);

  const normalizedRoot = normalizeArchiveRoot(archiveRoot);
  const entries = (await filesUnder(sourceRoot))
    .map(path => ({
      path,
      archivePath: `${normalizedRoot}/${relative(sourceRoot, path).replaceAll('\\', '/')}`
    }))
    .sort((left, right) => left.archivePath < right.archivePath ? -1 : left.archivePath > right.archivePath ? 1 : 0);

  if (entries.length > 0xffff) throw new Error('文件数量超出标准 ZIP32 上限，当前部署包不支持 ZIP64');

  const localParts = [];
  const centralParts = [];
  let localSize = 0;

  for (const entry of entries) {
    const [content, fileInfo] = await Promise.all([readFile(entry.path), stat(entry.path)]);
    const compressed = Buffer.from(await deflateRawAsync(content, { level: 9 }));
    const fileName = Buffer.from(entry.archivePath, 'utf8');
    if (fileName.length > 0xffff) throw new Error(`ZIP 路径过长：${entry.archivePath}`);
    assertZip32(content.length, `文件 ${entry.archivePath} 的原始大小`);
    assertZip32(compressed.length, `文件 ${entry.archivePath} 的压缩大小`);
    assertZip32(localSize, `文件 ${entry.archivePath} 的本地头偏移`);

    const checksum = crc32(content);
    const dos = toDosDateTime(fileInfo.mtime);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(ZIP_VERSION, 4);
    localHeader.writeUInt16LE(ZIP_UTF8_FLAG, 6);
    localHeader.writeUInt16LE(ZIP_DEFLATE_METHOD, 8);
    localHeader.writeUInt16LE(dos.time, 10);
    localHeader.writeUInt16LE(dos.date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(ZIP_VERSION_MADE_BY_UNIX, 4);
    centralHeader.writeUInt16LE(ZIP_VERSION, 6);
    centralHeader.writeUInt16LE(ZIP_UTF8_FLAG, 8);
    centralHeader.writeUInt16LE(ZIP_DEFLATE_METHOD, 10);
    centralHeader.writeUInt16LE(dos.time, 12);
    centralHeader.writeUInt16LE(dos.date, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(((fileInfo.mode & 0xffff) << 16) >>> 0, 38);
    centralHeader.writeUInt32LE(localSize, 42);

    localParts.push(localHeader, fileName, compressed);
    centralParts.push(centralHeader, fileName);
    localSize += localHeader.length + fileName.length + compressed.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  assertZip32(localSize, 'ZIP 中央目录偏移');
  assertZip32(centralSize, 'ZIP 中央目录大小');
  assertZip32(localSize + centralSize + 22, 'ZIP 总大小');

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralSize, 12);
  endRecord.writeUInt32LE(localSize, 16);
  endRecord.writeUInt16LE(0, 20);

  const destination = resolve(destinationZip);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.concat([...localParts, ...centralParts, endRecord], localSize + centralSize + endRecord.length));
  return { entryCount: entries.length, paths: entries.map(entry => entry.archivePath) };
}

export async function writeSha256Sidecar(archivePath, sidecarPath = `${archivePath}.sha256`) {
  const archive = await readFile(archivePath);
  const digest = createHash('sha256').update(archive).digest('hex');
  await writeFile(sidecarPath, `${digest}  ${basename(archivePath)}\n`, 'utf8');
  return digest;
}

export async function createTestDeploymentPackage() {
  assertInside(deployRoot, output);
  await mkdir(deployRoot, { recursive: true });
  await rm(output, { recursive: true, force: true });
  await rm(zipPath, { force: true });
  await rm(zipShaPath, { force: true });

  if (!process.argv.includes('--skip-build')) {
    const npmEntry = process.env.npm_execpath;
    if (!npmEntry) throw new Error('无法定位 npm 执行入口');
    execFileSync(process.execPath, [npmEntry, 'run', 'build'], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, VITE_EXHIBITION_APP_BASE: '/test2' }
    });
  }

  if (!(await stat(resolve(root, 'dist'))).isDirectory()) throw new Error('缺少 dist，请先完成前端构建');
  await mkdir(output, { recursive: true });
  await copy('dist', 'dist');
  await copy('server', 'server');
  await copy('node_modules/undici', 'node_modules/undici');
  await copy('src/integration/operation-registry.js', 'src/integration/operation-registry.js');
  await copy('src/integration/operation-contract-schemas.js', 'src/integration/operation-contract-schemas.js');
  await copy('serverConfig.json', 'serverConfig.json');
  await copy('deploy/digital-exhibition-test.env.example', '.env.example');
  await copy('nginx-test.conf', 'nginx-test.conf');
  await copy('deploy/digital-exhibition-test.service', 'digital-exhibition-test.service');
  await copy('README-TEST-DEPLOY.md', 'README.md');

  const bundledUndici = JSON.parse(await readFile(resolve(root, 'node_modules', 'undici', 'package.json'), 'utf8'));
  const runtimePackage = {
    name: 'digital-exhibition-test-package',
    private: true,
    version: '1.0.0',
    type: 'module',
    engines: { node: '>=20.6' },
    scripts: { start: 'node --max-old-space-size=1536 --env-file=.env server/test-deployment-server.mjs' },
    dependencies: { undici: bundledUndici.version },
    bundledDependencies: ['undici']
  };
  await writeFile(join(output, 'package.json'), `${JSON.stringify(runtimePackage, null, 2)}\n`, 'utf8');

  const packagedFiles = await filesUnder(output);
  if (packagedFiles.some(path => ['.env', '.env.local'].includes(basename(path).toLowerCase()))) throw new Error('部署包禁止包含真实环境文件');
  if (packagedFiles.some(path => relative(output, path).split(/[\\/]/).includes('runtime-cache'))) throw new Error('部署包禁止包含运行缓存');
  const actualSecrets = [process.env.FEISHU_APP_SECRET, process.env.FEISHU_BASE_TOKEN].filter(value => String(value || '').length >= 8);
  for (const path of packagedFiles) {
    const content = await readFile(path);
    const text = content.toString('utf8');
    for (const secret of actualSecrets) if (text.includes(secret)) throw new Error(`部署包疑似包含敏感值：${relative(output, path)}`);
  }

  const manifest = [];
  for (const path of packagedFiles.sort()) {
    const digest = createHash('sha256').update(await readFile(path)).digest('hex');
    manifest.push(`${digest}  ${relative(output, path).replaceAll('\\', '/')}`);
  }
  await writeFile(join(output, 'SHA256SUMS.txt'), `${manifest.join('\n')}\n`, 'utf8');

  await createUtf8ZipFromDirectory(output, zipPath, { archiveRoot: packageName });
  const zipDigest = await writeSha256Sidecar(zipPath, zipShaPath);
  process.stdout.write(`TEST_PACKAGE_READY=${output}\n`);
  process.stdout.write(`TEST_PACKAGE_ZIP=${zipPath}\n`);
  process.stdout.write(`TEST_PACKAGE_SHA256=${zipDigest}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await createTestDeploymentPackage();
}
