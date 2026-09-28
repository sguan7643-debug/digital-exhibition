import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const source=read('src/pages/HainengWorkDetailPage.vue');
const remote=read('src/components/RemoteAppDetailPage.vue');
assert.match(source,/RemoteAppDetailPage/,'海能 Work 详情必须复用统一远端详情组件');
assert.match(source,/useAppDetailProjection/,'海能 Work 详情必须使用飞书远端投影');
assert.match(source,/icon="work"/,'海能 Work 详情必须关联正确线稿图标');
assert.match(remote,/data-authoritative-detail="true"/,'详情必须标记权威远端数据');
assert.doesNotMatch(source,/本地演示|mockDownload|createDetailController|window\.open|location\.(?:assign|replace)/,
  '海能 Work 详情不得保留伪交互或绕过受控启动流程');
console.log('第七批 interaction：海能 Work 详情远端权威数据合同通过');
