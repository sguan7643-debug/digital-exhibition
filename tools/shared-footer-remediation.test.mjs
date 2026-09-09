import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shell = readFileSync(new URL('../src/components/ExhibitionShell.vue', import.meta.url), 'utf8');
const main = shell.match(/<main id="main-content"[\s\S]*?<\/main>/)?.[0] ?? '';

assert.match(
  main,
  /<slot\s*\/>[\s\S]*?<footer class="platform-footer"/,
  '全站页脚必须位于页面内容之后，并处于共享主内容流中',
);
assert.match(
  main,
  /data-page-end="true"/,
  '共享页脚必须提供稳定的页面结束标记，供完整截图与自动化校验使用',
);
assert.match(
  main,
  /role="contentinfo" aria-label="版权信息"/,
  '全站页脚必须暴露清晰的版权信息语义',
);
assert.match(
  main,
  /Copyright © 2026 中国海油 · 数智产品展厅 版权所有/,
  '全站页脚版权文案必须完整且统一',
);
assert.match(
  shell,
  /\.platform-footer\{[^}]*margin-top:12px[^}]*padding:16px 24px 18px[^}]*border-top:1px solid #dce4ec[^}]*font-size:12px/,
  '页脚应使用克制的分隔、间距与字号，并保持在正常内容流中',
);
assert.doesNotMatch(
  shell,
  /\.platform-footer\{[^}]*(?:position:\s*(?:fixed|sticky|absolute)|bottom:)/,
  '全站页脚不得固定、吸附或覆盖业务内容',
);
assert.match(
  shell,
  /@media\(max-width:760px\)[\s\S]*?\.platform-footer\{[^}]*padding:14px 12px 16px[^}]*font-size:11px/,
  '窄屏页脚必须收敛间距和字号',
);
assert.match(
  shell,
  /main :deep\(\.profile-page>\.copyright\)\{display:none\}/,
  '共享页脚启用后必须屏蔽个人中心旧版权条，避免重复和年份冲突',
);

console.log('全站共享页脚：内容流位置、版权文案、页面结束标记、响应式与非覆盖合同通过');
