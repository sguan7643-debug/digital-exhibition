import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const remoteDetail=read('src/components/RemoteAppDetailPage.vue');
const liveSections=read('src/components/AppDetailLiveSections.vue');
const stateBoundary=read('src/components/AppDetailStateBoundary.vue');
const projection=read('src/state/use-app-detail-projection.js');

for(const [file,icon] of [
  ['ToolDetailPage.vue','tools'],
  ['HainengWorkDetailPage.vue','work'],
  ['ReportDetailPage.vue','report'],
  ['DashboardDetailPage.vue','visual'],
]){
  const source=read(`src/pages/${file}`);
  assert.match(source,/RemoteAppDetailPage/,`${file} 必须复用统一远端详情组件`);
  assert.match(source,/useAppDetailProjection/,`${file} 必须使用远端应用投影`);
  assert.match(source,new RegExp(`icon="${icon}"`),`${file} 必须传递正确类型图标`);
  assert.doesNotMatch(source,/本地演示|不提供真实下载|申请使用已在本地演示中登记/,
    `${file} 不得保留本地伪交互文案`);
}

assert.match(remoteDetail,/data-detail-return/,'统一详情页返回入口必须标记真实来源优先行为');
assert.match(remoteDetail,/aria-labelledby="remote-app-title"/,'统一详情必须具备可访问标题关联');
assert.match(remoteDetail,/AppDetailRemoteFacts/,'统一详情必须展示飞书基础信息');
assert.match(remoteDetail,/AppDetailAuthoritativeBody/,'统一详情必须展示飞书权威业务信息');
for(const state of ['loading','auth','error']){
  assert.ok(stateBoundary.includes(state),`统一详情缺少 ${state} 状态`);
}
assert.match(stateBoundary,/当前没有可展示的真实应用详情/,'统一详情缺少真实空状态');
assert.match(projection,/\['authentication-required', 'permission-denied'\][\s\S]*return 'auth'/,
  '授权和权限异常必须映射为统一鉴权状态');
assert.match(liveSections,/props\.operationExecutor\('COM-008'/,'附件下载必须调用真实受控操作接口');
assert.match(liveSections,/props\.operationExecutor\('MAT-003'/,'素材下载必须调用真实受控操作接口');
for(const operation of ['APP-005','APP-006','APP-008','FAV-003','FAV-004']){
  assert.ok(liveSections.includes(`'${operation}'`),`详情联调区缺少 ${operation} 受控操作`);
}
assert.match(liveSections,/v-if="testWritesEnabled"/,'写操作只能在 TEST_ 隔离通道开启时展示');

console.log('真实详情组件：远端投影、六态、同源下载与 TEST_ 隔离写入合同通过');
