import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shell = readFileSync(new URL('../src/components/ExhibitionShell.vue', import.meta.url), 'utf8');

assert.match(shell, /from '@lucide\/vue'/,
  '顶部导航必须使用清晰的本地矢量图标组件');
assert.match(shell, /<component :is="icon" class="nav-glyph"/,
  '十个导航目的地必须渲染矢量组件');
assert.doesNotMatch(shell, /<img class="nav-glyph"/,
  '顶部导航禁止继续使用模糊的截图裁切 PNG');
assert.match(shell, /<Bell class="action-icon"/,
  '消息入口必须使用透明矢量铃铛');
assert.match(shell, /<Star class="action-icon"/,
  '收藏入口必须使用透明矢量星标');
assert.doesNotMatch(shell, /top-message\.png|top-favorite(?:-active)?\.png/,
  '顶部快捷入口禁止继续使用带底色的截图素材');
assert.match(shell, /\.nav-glyph\{[^}]*color:currentColor/,
  '矢量导航图标必须继承导航文字颜色');
assert.doesNotMatch(shell, /\.nav-glyph\{[^}]*filter:|\.nav-glyph\{[^}]*mix-blend-mode:/,
  '矢量图标不应再依赖位图反色或混合模式');

console.log('深色头部图标透明底与完整线条合同测试通过');
