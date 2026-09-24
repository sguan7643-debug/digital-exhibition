import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const html = await readFile(resolve(root, 'dist', 'index.html'), 'utf8');

assert.match(
  html,
  /(?:src|href)="\/test2\/assets\//,
  '测试环境构建必须从 /test2/assets/ 加载入口资源'
);
assert.doesNotMatch(
  html,
  /(?:src|href)="\/assets\//,
  '测试环境构建不能从站点根目录 /assets/ 加载入口资源'
);

const assetFiles = await readdir(resolve(root, 'dist', 'assets'));
const scriptNames = assetFiles.filter(name => name.endsWith('.js'));
const scripts = (await Promise.all(
  scriptNames.map(name => readFile(resolve(root, 'dist', 'assets', name), 'utf8'))
)).join('\n');

assert.match(scripts, /['"]\/test2\/['"]/, '构建产物必须注入 /test2/ 资源基路径');
assert.match(
  scripts,
  /publicAssetPath\(['"]assets\/nav-workbench\.png['"]\)/,
  '动态导航图标必须通过构建资源基路径生成地址'
);
assert.doesNotMatch(
  scripts,
  /['"]\/assets\/nav-(?:workbench|apps|materials|certification|training|talent|operations)\.png['"]/,
  '动态导航图标不能继续请求站点根目录 /assets/'
);

console.log('Vite test build entry and dynamic navigation assets are rooted under /test2/');
