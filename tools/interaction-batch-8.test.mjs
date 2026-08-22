import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reactive } from 'vue';
import { createDetailController } from '../src/state/detail-controller.js';

const favorites=reactive(new Set(['/apps/report-001']));
const detail=createDetailController('/apps/report-001',favorites,{name:'经营分析可视化报表'});
assert.equal(detail.favorite,true);
detail.toggleFavorite();
assert.equal(detail.favorite,false);
detail.apply('申请复用');
assert.equal(detail.announcement,'经营分析可视化报表：申请复用已在本地演示中登记');
detail.mockDownload('经营指标口径说明.xlsx');
assert.match(detail.announcement,/零请求|不提供真实下载/);
detail.commentDraft='指标摘要清晰';
assert.equal(detail.submitComment(),true);

const source=readFileSync(new URL('../src/pages/ReportDetailPage.vue',import.meta.url),'utf8');
for(const contract of ['createDetailController','routeSession.favorites','aria-pressed','detail.mockDownload','detail.submitComment','detail.comments','figcaption','href="/training"'])assert.ok(source.includes(contract),`PP10 未接线：${contract}`);
assert.doesNotMatch(source,/href="#main-content"/,'报表预览与下载不得使用假锚点');
assert.doesNotMatch(source,/window\.open|location\.(?:assign|replace)/,'报表详情不得打开真实业务系统');

console.log('第八批 interaction：可视化报表详情收藏、申请、预览摘要、附件和评论行为通过');
