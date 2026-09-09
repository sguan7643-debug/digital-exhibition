import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const shell = read('src/components/ExhibitionShell.vue');
const gallery = read('src/components/BusinessPreviewGallery.vue');

assert.doesNotMatch(shell, /<template v-if="props\.page\.id === '10'">/,
  '报表详情不得绕过统一素材/应用分组侧栏');
assert.doesNotMatch(shell, /\.ui-update-report\{height:auto;min-height:1492px;overflow:visible\}/,
  '报表详情不得让整页滚动并撑大原生画布');
assert.match(shell, /\.exhibition-shell\{height:100vh;overflow:hidden;/,
  '报表详情必须通过统一壳层固定顶栏/左栏并只让主内容纵向滚动');
assert.match(shell, /\.page-frame\{[^}]*grid-template-columns:220px minmax\(0,1fr\)\}/,
  '报表详情必须复用统一的 220px 固定侧栏几何');
assert.match(shell, /main\{[^}]*overflow-y:auto;[^}]*background:#f5f7fa;/,
  '报表详情必须复用统一主内容纵向滚动区域');
assert.doesNotMatch(gallery, /@media\(max-width:1100px\)\{\.business-previews\{grid-template-columns:1fr\}/,
  '桌面报表画布不得把三项演示预览强制堆成单列');
assert.match(gallery, /@media\(max-width:760px\)\{\.business-previews\{grid-template-columns:1fr\}/,
  '仅窄屏才将三项演示预览切为单列');

console.log('报表详情统一固定壳层与演示预览原生尺寸合同通过');
