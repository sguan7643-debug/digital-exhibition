import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { createUtf8ZipFromDirectory, writeSha256Sidecar } from './create-test-deployment-package.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const deployRoot = resolve(root, 'deploy');
const packageName = 'digital-exhibition-server-real-data-package';
const output = resolve(deployRoot, packageName);
const zipPath = resolve(deployRoot, `${packageName}.zip`);
const zipShaPath = resolve(deployRoot, `${packageName}.zip.sha256`);
const execFileAsync = promisify(execFile);

async function copy(source, target = source) {
  await cp(resolve(root, source), resolve(output, target), { recursive: true, force: true, dereference: true });
}

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(entryPath));
    else if (entry.isFile()) result.push(entryPath);
  }
  return result;
}

const deploymentReadme = `# 数智展厅纯后端部署包

本包只更新 Node 后端，不包含或覆盖前端 dist。部署前必须保留现有 /home/seaoil/pre-demo/test/.env 与 dist。

COM-005 默认直接读取飞书现有字典，并过滤 TEST_、测试初始化和停用项，不要求 formal-dictionary-baseline.json。若以后配置有效 FEISHU_FORMAL_DICTIONARY_BASELINE_PATH，则额外执行批准基线一致性校验。

本次升级在停止服务后执行 server/clear-read-cache-operations.mjs，可精确清除 COM-001、COM-004、APP-001、APP-002、HOM-001、WB-002 的旧快照；不得删除 .env、dist 或整个 runtime-cache 目录。

推荐在解压后的包根目录以 root 执行：

\`bash server/install-live-recovery.sh\`

脚本会在 releases 下构建全新暂存目录，保留 .env、dist 和 .local，删除暂存副本里的旧 server 后再复制新后端，精确清理四类受污染快照，健康检查失败时自动回滚。运行态核查可执行：

\`bash server/runtime-audit.sh [syncId ...]\`
`;

export async function createServerRealDataPackage() {
  await mkdir(deployRoot, { recursive: true });
  await rm(output, { recursive: true, force: true });
  await rm(zipPath, { force: true });
  await rm(zipShaPath, { force: true });
  await mkdir(output, { recursive: true });

  await copy('server');
  await copy('src/integration/operation-registry.js');
  await copy('src/integration/operation-contract-schemas.js');
  await copy('node_modules/undici');
  await copy('serverConfig.json');
  await copy('deploy/digital-exhibition-test.env.example', '.env.example');
  await copy('deploy/digital-exhibition-test.service', 'digital-exhibition-test.service');
  await writeFile(join(output, 'README.md'), deploymentReadme, 'utf8');

  let gitCommit = 'unknown';
  let gitDirty = true;
  try {
    gitCommit = String((await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout).trim() || 'unknown';
    gitDirty = String((await execFileAsync('git', ['status', '--porcelain'], { cwd: root })).stdout).trim().length > 0;
  } catch {}
  const buildTime = new Date().toISOString();
  const release = process.env.DEPLOYED_RELEASE_ID
    || `DEH-SERVER-LIVE-RECOVERY-20261012-R2-${buildTime.replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  await writeFile(join(output, 'release-metadata.json'), `${JSON.stringify({
    release,
    version: '1.0.0',
    gitCommit,
    gitDirty,
    buildTime,
    cacheSchemaVersion: 'feishu-read-cache.v1'
  }, null, 2)}\n`, 'utf8');

  const bundledUndici = JSON.parse(await readFile(resolve(root, 'node_modules', 'undici', 'package.json'), 'utf8'));
  await writeFile(join(output, 'package.json'), `${JSON.stringify({
    name: packageName,
    private: true,
    version: '1.0.0',
    type: 'module',
    engines: { node: '>=20.6' },
    scripts: { start: 'node --max-old-space-size=1536 --env-file=.env server/test-deployment-server.mjs' },
    dependencies: { undici: bundledUndici.version },
    bundledDependencies: ['undici']
  }, null, 2)}\n`, 'utf8');

  const files = await filesUnder(output);
  if (files.some(file => relative(output, file).split(/[\\/]/).includes('dist'))) throw new Error('纯后端包禁止包含 dist');
  if (files.some(file => ['.env', '.env.local'].includes(basename(file).toLowerCase()))) throw new Error('部署包禁止包含真实环境文件');
  if (files.some(file => relative(output, file).split(/[\\/]/).includes('runtime-cache'))) throw new Error('部署包禁止包含运行缓存');
  const actualSecrets = [process.env.FEISHU_APP_SECRET, process.env.FEISHU_BASE_TOKEN].filter(value => String(value || '').length >= 8);
  for (const file of files) {
    const content = await readFile(file);
    for (const secret of actualSecrets) {
      if (content.includes(Buffer.from(secret))) throw new Error(`部署包疑似包含敏感值：${relative(output, file)}`);
    }
  }

  const manifest = [];
  for (const file of files.sort()) {
    const digest = createHash('sha256').update(await readFile(file)).digest('hex');
    manifest.push(`${digest}  ${relative(output, file).replaceAll('\\', '/')}`);
  }
  await writeFile(join(output, 'SHA256SUMS.txt'), `${manifest.join('\n')}\n`, 'utf8');
  await createUtf8ZipFromDirectory(output, zipPath, { archiveRoot: packageName });
  const zipDigest = await writeSha256Sidecar(zipPath, zipShaPath);
  return Object.freeze({ output, zipPath, zipShaPath, zipDigest, fileCount: (await filesUnder(output)).length });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const result = await createServerRealDataPackage();
  process.stdout.write(`SERVER_PACKAGE_READY=${result.output}\n`);
  process.stdout.write(`SERVER_PACKAGE_ZIP=${result.zipPath}\n`);
  process.stdout.write(`SERVER_PACKAGE_SHA256=${result.zipDigest}\n`);
}

