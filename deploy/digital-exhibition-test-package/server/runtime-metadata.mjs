import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(moduleDirectory, '..');

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

const releaseMetadata = readJson(resolve(packageRoot, 'release-metadata.json'));
const packageMetadata = readJson(resolve(packageRoot, 'package.json'));

export function getRuntimeMetadata() {
  const cacheDirectory = resolve(
    process.env.FEISHU_RUNTIME_CACHE_DIR
      || dirname(process.env.FEISHU_READ_CACHE_FILE || '/home/seaoil/pre-demo/runtime-cache/feishu-read-cache-v1.json')
  );
  return Object.freeze({
    release: String(process.env.DEPLOYED_RELEASE_ID || releaseMetadata.release || packageMetadata.version || 'development'),
    version: String(releaseMetadata.version || packageMetadata.version || 'development'),
    gitCommit: String(process.env.GIT_COMMIT || releaseMetadata.gitCommit || 'unknown'),
    gitDirty: releaseMetadata.gitDirty === true,
    buildTime: String(releaseMetadata.buildTime || 'unknown'),
    pid: process.pid,
    cacheSchemaVersion: 'feishu-read-cache.v1',
    cacheDirectory,
    cacheFile: resolve(process.env.FEISHU_READ_CACHE_FILE || resolve(cacheDirectory, 'feishu-read-cache-v1.json')),
    taskStore: 'process-memory',
    workingDirectory: process.cwd()
  });
}
