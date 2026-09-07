import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const favorites = read('src/pages/FavoritesPage.vue');
const training = read('src/pages/TrainingPage.vue');

assert.match(favorites, /\.favorite-grid\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,
  '收藏页桌面首屏必须按冻结参考显示四列应用卡片');
assert.doesNotMatch(favorites, /\.favorite-grid\{[^}]*repeat\(3,minmax\(0,1fr\)\)/,
  '收藏页不得再由末尾三列规则覆盖冻结参考的四列网格');
assert.match(favorites, /\.favorite-grid>article\{[^}]*height:211px/,
  '收藏页应用卡片必须保持冻结参考的 211px 高度');
assert.doesNotMatch(favorites, /\.favorite-grid>article\{[^}]*min-height:276px/,
  '收藏页不得再由过高的卡片最小高度破坏首屏两行密度');
assert.doesNotMatch(favorites, /\.favorite-grid footer \.detail-action,[^}]*background:#0060a6/,
  '收藏卡片底部操作必须保持冻结参考的轻量文字操作，不得覆盖成整排实心按钮');

assert.match(training, /'training-course-01'/,
  '培训活动必须恢复来自统一图标库的逐卡图标，而不是留下空白标题区');
assert.match(training, /<AppIcon class="course-icon" :name="course\.icon" :size="60"/,
  '培训卡片必须使用清晰本地矢量图标组件');
assert.match(training, /\.training-hero\{min-height:242px/,
  '培训 Hero 必须匹配冻结参考的 242px 主体高度');
assert.match(training, /\.course-grid>article\{min-height:224px/,
  '培训活动卡必须恢复冻结参考的双行首屏密度');
assert.doesNotMatch(training, /\.course-grid>article\{[^}]*min-height:340px/,
  '培训卡不得继续使用使第二行大面积落出首屏的 340px 高度');

console.log('收藏与培训冻结参考结构校准合同通过');
