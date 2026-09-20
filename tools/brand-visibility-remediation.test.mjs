import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const runtimeFiles = [
  ...readdirSync(new URL('../src/components/', import.meta.url))
    .filter((name) => name.endsWith('.vue'))
    .map((name) => `src/components/${name}`),
  ...readdirSync(new URL('../src/pages/', import.meta.url))
    .filter((name) => name.endsWith('.vue'))
    .map((name) => `src/pages/${name}`),
  'src/fixtures/page-content.js'
];

const forbiddenBrand = /中国海油|中海油|海油|CNOOC|cnooc-logo/i;
const approvedCopyright = 'Copyright © 2026 中国海油 · 数智产品展厅 版权所有';
for (const relativePath of runtimeFiles) {
  const source = readFileSync(`${root}${relativePath}`, 'utf8');
  const visibleBrandSurface = source.replaceAll(approvedCopyright, '');
  if (relativePath === 'src/components/ExhibitionShell.vue') {
    assert.doesNotMatch(source, /brand-logo|cnooc-brand\.png/, '顶部不再显示企业 Logo');
    assert.ok(source.includes('<span class="brand-title">数智产品展厅</span>'), '保留展厅文字名称');
  }
  assert.doesNotMatch(visibleBrandSurface, forbiddenBrand, `${relativePath} 仍包含需要隐藏的海油品牌 Logo 或文字`);
}

const logo = readFileSync(new URL('../public/assets/cnooc-brand.png', import.meta.url));
assert.equal(logo.subarray(1,4).toString(), 'PNG');
assert.equal(logo.readUInt32BE(16), 436);
assert.equal(logo.readUInt32BE(20), 129);
console.log(`brand visibility remediation passed: text-only header and approved copyright (${runtimeFiles.length} runtime files)`);
