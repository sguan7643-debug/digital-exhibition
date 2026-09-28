import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const source=read('src/pages/DashboardDetailPage.vue');
const state=read('src/components/AppDetailStateBoundary.vue');
assert.match(source,/RemoteAppDetailPage/,'驾驶舱详情必须复用统一远端详情组件');
assert.match(source,/icon="visual"/,'驾驶舱详情必须关联可视化线稿图标');
assert.match(state,/正在加载应用详情/,'驾驶舱详情必须具备加载状态');
assert.match(state,/需要完成飞书授权/,'驾驶舱详情必须具备授权状态');
assert.match(state,/应用详情暂不可用/,'驾驶舱详情必须具备错误状态');
assert.doesNotMatch(source,/本地演示|mockDownload|createDetailController|window\.open|location\.(?:assign|replace)/,
  '驾驶舱详情不得保留本地伪交互或直接外跳');
console.log('第九批 interaction：驾驶舱远端详情与六态边界合同通过');
