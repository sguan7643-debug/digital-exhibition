import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const deployRoot = resolve(root, 'deploy');
const packageName = 'digital-exhibition-test-package';
const output = resolve(deployRoot, packageName);
const zipPath = resolve(deployRoot, `${packageName}.zip`);

function assertInside(parent, child) {
  const relation = relative(parent, child);
  if (!relation || relation.startsWith('..') || relation.includes(`..${sep}`)) throw new Error(`拒绝操作非部署目录：${child}`);
}

async function copy(source, target) {
  await cp(resolve(root, source), resolve(output, target), { recursive: true, force: true });
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

assertInside(deployRoot, output);
await mkdir(deployRoot, { recursive: true });
await rm(output, { recursive: true, force: true });
await rm(zipPath, { force: true });

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
await copy('src/integration/operation-registry.js', 'src/integration/operation-registry.js');
await copy('src/integration/operation-contract-schemas.js', 'src/integration/operation-contract-schemas.js');
await copy('serverConfig.json', 'serverConfig.json');
await copy('.env.test.example', '.env.example');
await copy('nginx-test.conf', 'nginx-test.conf');
await copy('README-TEST-DEPLOY.md', 'README.md');

const runtimePackage = {
  name: 'digital-exhibition-test-package',
  private: true,
  version: '1.0.0',
  type: 'module',
  engines: { node: '>=20.6' },
  scripts: { start: 'node --env-file=.env server/test-deployment-server.mjs' },
  dependencies: { undici: '^6.21.1' }
};
await writeFile(join(output, 'package.json'), `${JSON.stringify(runtimePackage, null, 2)}\n`, 'utf8');

const packagedFiles = await filesUnder(output);
if (packagedFiles.some(path => basename(path).toLowerCase() === '.env.local')) throw new Error('部署包禁止包含 .env.local');
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

try {
  const tar = process.platform === 'win32' ? 'tar.exe' : 'tar';
  execFileSync(tar, ['-a', '-c', '-f', zipPath, packageName], { cwd: deployRoot, stdio: 'inherit' });
} catch {
  process.stdout.write('ZIP_CREATE_SKIPPED: directory package is ready\n');
}

process.stdout.write(`TEST_PACKAGE_READY=${output}\n`);
if (await stat(zipPath).then(() => true, () => false)) process.stdout.write(`TEST_PACKAGE_ZIP=${zipPath}\n`);
