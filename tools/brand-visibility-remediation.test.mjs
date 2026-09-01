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
for (const relativePath of runtimeFiles) {
  const source = readFileSync(`${root}${relativePath}`, 'utf8');
  assert.doesNotMatch(source, forbiddenBrand, `${relativePath} 仍包含需要隐藏的海油品牌 Logo 或文字`);
}

console.log(`brand visibility remediation passed (${runtimeFiles.length} runtime files)`);
