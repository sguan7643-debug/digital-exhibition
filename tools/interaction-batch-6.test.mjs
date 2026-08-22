import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reactive } from 'vue';
import { createDetailController } from '../src/state/detail-controller.js';

const favorites=reactive(new Set());
const detail=createDetailController('/apps/tool-001',favorites);
assert.equal(detail.favorite,false);
detail.toggleFavorite();
assert.equal(detail.favorite,true);
assert.equal(favorites.has('/apps/tool-001'),true);
detail.apply('申请使用');
assert.equal(detail.announcement,'智能数据处理工具：申请使用已在本地演示中登记');
detail.mockDownload('用户操作手册.pdf');
assert.match(detail.announcement,/演示环境不提供真实下载/);
detail.watchTraining('Excel批量处理操作教程');
assert.match(detail.announcement,/演示环境不播放直播或远程视频/);
assert.equal(detail.submitComment(),false);
detail.commentDraft='工具很实用';
assert.equal(detail.submitComment(),true);
assert.deepEqual(detail.comments,['工具很实用']);
assert.equal(detail.commentDraft,'');

const source=readFileSync(new URL('../src/pages/ToolDetailPage.vue',import.meta.url),'utf8');
for(const contract of ['createDetailController','routeSession.favorites','aria-pressed','mockDownload','watchTraining','submitComment','detail.comments'])assert.ok(source.includes(contract),`PP08 未接线：${contract}`);
assert.doesNotMatch(source,/href="#main-content">下载/,'下载不得用假锚点冒充');

console.log('第六批 interaction：工具详情收藏、申请、本地附件、培训和评论行为通过');
