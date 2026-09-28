import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const source=read('src/pages/ReportDetailPage.vue');
const body=read('src/components/AppDetailAuthoritativeBody.vue');
assert.match(source,/RemoteAppDetailPage/,'报表详情必须复用统一远端详情组件');
assert.match(source,/icon="report"/,'报表详情必须关联报表线稿图标');
for(const section of ['指标','预览','附件','使用指南','相关培训'])assert.ok(body.includes(section),`报表远端详情缺少 ${section} 区域`);
assert.doesNotMatch(source,/本地演示|mockDownload|createDetailController|IndicatorBuildDialog/,
  '报表详情不得保留未接入的本地写入或伪下载交互');
console.log('第八批 interaction：可视化报表远端详情与权威内容合同通过');
