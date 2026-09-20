import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcRoot = fileURLToPath(new URL('../src/', import.meta.url));
const component = readFileSync(new URL('../src/components/AppIcon.vue', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

function vueFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return vueFiles(path);
    return entry.name.endsWith('.vue') ? [path] : [];
  });
}

const iconAssetPattern = /(?:nav-|catalogue-|category-|app-|(?:^|[-/])logo|stat-|points-|usage-|favorite-(?:heart|title|stat|card)|hot-|msg-(?:row|stat)|overview-|profile-(?:stat|quick)|cert-(?:tool|booking))/i;
const offenders = [];
for (const file of vueFiles(srcRoot)) {
  const source = readFileSync(file, 'utf8');
  const approvedNavigationAsset = (tag) => file.endsWith('ExhibitionShell.vue') && /:src="icon"/.test(tag);
  const unsupportedDynamicImages = (source.match(/<img\b[^>]*\s:src=[^>]*>/g) ?? [])
    .filter((tag) => !approvedNavigationAsset(tag));
  assert.deepEqual(unsupportedDynamicImages, [],
    `${file} 不得用未声明用途的动态截图资产充当图标`);
  const tags = source.match(/<img\b[^>]*>/g) ?? [];
  for (const tag of tags) {
    if (approvedNavigationAsset(tag)) continue;
    if (iconAssetPattern.test(tag)) offenders.push(`${file}: ${tag}`);
  }
}

assert.deepEqual(offenders, [],
  `图标型 PNG 不得继续作为截图图片渲染，必须使用统一矢量图标组件：\n${offenders.join('\n')}`);
assert.match(component, /from '@lucide\/vue'/,
  '统一 AppIcon 必须使用清晰矢量图标库，不得手绘或使用截图');
assert.match(component, /<component\s+:is="resolvedIcon"/,
  '统一 AppIcon 必须按语义名称渲染矢量组件');
assert.match(main, /\.component\('AppIcon', AppIcon\)/,
  'AppIcon 必须全局注册，保证所有页面使用同一图标合同');

console.log('全项目矢量图标合同测试通过');
