import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shell = readFileSync(new URL('../src/components/ExhibitionShell.vue', import.meta.url), 'utf8');

assert.match(shell, /<img class="nav-glyph" :src="icon"/,
  '顶部七项导航必须使用最新版同源图标资源');
for (const asset of ['workbench', 'apps', 'materials', 'certification', 'training', 'talent', 'operations']) {
  assert.match(shell, new RegExp(`/assets/nav-${asset}\\.png`),
    `顶部导航缺少最新版 ASCII 同源图标：${asset}`);
}
assert.doesNotMatch(shell, /\/assets\/nav-[^'"/]*[\u3400-\u9fff]/u,
  '顶部导航不得使用可能被静态服务器错误解码的 Unicode 资源名');
assert.match(shell, /<TypeLineIcon name="message"/,
  '消息入口必须使用透明的本地手绘矢量铃铛');
assert.match(shell, /<TypeLineIcon name="favorite"/,
  '收藏入口必须使用透明的本地手绘矢量星标');
assert.doesNotMatch(shell, /top-message\.png|top-favorite(?:-active)?\.png/,
  '顶部快捷入口禁止继续使用带底色的截图素材');
assert.match(shell, /\.nav-glyph\{[^}]*object-fit:contain/,
  '最新版导航图标必须保持完整比例');

console.log('深色头部图标透明底与完整线条合同测试通过');
