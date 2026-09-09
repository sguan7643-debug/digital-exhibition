import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reactive } from 'vue';
import { createDetailController } from '../src/state/detail-controller.js';

const favorites=reactive(new Set());
const detail=createDetailController('/apps/haineng-work-001',favorites,{name:'海能work应用'});
detail.apply('申请使用');
assert.equal(detail.announcement,'海能work应用：申请使用已在本地演示中登记');
assert.doesNotMatch(detail.announcement,/唤起|打开海能/);
detail.toggleFavorite();
assert.equal(favorites.has('/apps/haineng-work-001'),true);
detail.mockDownload('海能work应用使用说明.pdf');
assert.match(detail.announcement,/演示环境不提供真实下载/);
detail.commentDraft='统一门户很方便';
assert.equal(detail.submitComment(),true);
assert.equal(detail.comments[0].text,'统一门户很方便');
assert.match(detail.comments[0].id,/comment-1$/);

const source=readFileSync(new URL('../src/pages/HainengWorkDetailPage.vue',import.meta.url),'utf8');
for(const contract of ['createDetailController','aria-pressed','detail.mockDownload','detail.submitComment','detail.comments','href="/apps?category=海能work应用"'])assert.ok(source.includes(contract),`PP09 未接线：${contract}`);
assert.match(source,/createDetailController\(\s*["']\/apps\/haineng-work-001["']\s*,\s*routeSession/,'PP09 必须绑定海能 Work 详情路由状态');
assert.doesNotMatch(source,/href="#main-content"/,'海能 Work 详情不得用假锚点冒充文档或外链');
assert.doesNotMatch(source,/window\.open|location\.(?:assign|replace)/,'海能 Work 详情不得唤起真实外部应用');

console.log('第七批 interaction：海能 Work 详情收藏、申请、本地文档和评论行为通过');
