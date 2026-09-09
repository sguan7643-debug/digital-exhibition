import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reactive } from 'vue';
import { createDetailController } from '../src/state/detail-controller.js';

const favorites=reactive(new Set());
const detail=createDetailController('/apps/dashboard-001',favorites,{name:'经营管理驾驶舱'});
detail.apply('申请使用');
assert.equal(detail.announcement,'经营管理驾驶舱：申请使用已在本地演示中登记');
detail.toggleFavorite();
assert.equal(detail.favorite,true);
detail.mockDownload('驾驶舱指标体系说明.xlsx');
assert.match(detail.announcement,/不提供真实下载/);
detail.commentDraft='预警摘要易于理解';
assert.equal(detail.submitComment(),true);

const source=readFileSync(new URL('../src/pages/DashboardDetailPage.vue',import.meta.url),'utf8');
for(const contract of ['createDetailController','aria-pressed','detail.mockDownload','detail.submitComment','detail.comments','figcaption','href="/training"','IndicatorBuildDialog','openMetricBuild','submitMetricBuild','个性化指标构建'])assert.ok(source.includes(contract),`PP11 未接线：${contract}`);
assert.match(source,/createDetailController\(\s*["']\/apps\/dashboard-001["']\s*,\s*routeSession/,'PP11 必须绑定驾驶舱详情路由状态');
assert.doesNotMatch(source,/申请复用/,'驾驶舱详情不得保留旧的申请复用操作');
assert.doesNotMatch(source,/href="#main-content"/,'驾驶舱预览和附件不得使用假锚点');
assert.doesNotMatch(source,/window\.open|location\.(?:assign|replace)/,'驾驶舱详情不得进入真实或全屏驾驶舱');

console.log('第九批 interaction：驾驶舱详情收藏、指标构建、预览摘要、附件和评论行为通过');
