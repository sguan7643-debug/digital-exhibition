import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pagesSource = read('src/fixtures/pages.js');
const shellSource = read('src/components/ExhibitionShell.vue');
const workbenchSource = read('src/pages/WorkbenchPage.vue');
const appsSource = read('src/pages/AppsPage.vue');
const reportSource = read('src/pages/ReportDetailPage.vue');
const captureSource = read('tools/visual-update-0831-edge.mjs');

const expected = [
  {
    route: '/workbench',
    file: '47025c81-207e-4bca-8a57-4f7e1b0c9a0d.png',
    width: 1672,
    height: 941,
    sha: '650057191C8AF87F6CA8864EA3DC35A8863B3AC28B9683514BD2EFC8D8C25E1A'
  },
  {
    route: '/apps',
    file: 'dc8f8714-569f-4e80-9e47-aa21900d03f7.png',
    width: 1672,
    height: 941,
    sha: '6479C8AFB3EB22872C5CA17D58A29DC8504E8CF05E3284D5E49708B7894FF522'
  },
  {
    route: '/apps/report-001',
    file: 'ef637f71-a1cb-4aee-b899-d73af0b9edd1.png',
    width: 1054,
    height: 1492,
    sha: '0750EA98D775041275D2A2308F5B33A01EEA9BB3EA37ACFADEDAA71755820887'
  }
];

for (const page of expected) {
  assert.ok(pagesSource.includes(`route: '${page.route}'`), `${page.route} route 缺失`);
  assert.ok(pagesSource.includes(`reference: '${page.file}'`), `${page.route} 未绑定 2026-08-31 新参考文件`);
  assert.ok(pagesSource.includes(`width: ${page.width}, height: ${page.height}`), `${page.route} 原生尺寸未更新`);
  assert.ok(pagesSource.includes(`sha256: '${page.sha}'`), `${page.route} 新参考 SHA 未更新`);
}

assert.match(shellSource, /shellVariant/, '共享壳层缺少页面级 variant');
assert.match(shellSource, /ui-update-workbench/, '工作台壳层 variant 缺失');
assert.match(shellSource, /ui-update-apps/, '应用中心壳层 variant 缺失');
assert.match(shellSource, /ui-update-report/, '报表详情壳层 variant 缺失');

assert.match(workbenchSource, /data-visual-baseline="ui-update-0831-workbench"/, '工作台新结构合同缺失');
assert.match(workbenchSource, /应用类型概览/);
assert.match(workbenchSource, /热门应用推荐/);
assert.match(workbenchSource, /培训课堂/);
assert.match(workbenchSource, /公告通知/);
assert.match(workbenchSource, /我的使用统计/);

assert.match(appsSource, /data-visual-baseline="ui-update-0831-apps"/, '应用中心新结构合同缺失');
assert.match(appsSource, /app\.id !== 'app-report-001'/, '新应用中心必须稳定展示 7 个基线应用');
assert.match(appsSource, /应用上线申请/);
assert.match(appsSource, /:page-sizes="\[12\]"/);

assert.match(reportSource, /data-visual-baseline="ui-update-0831-report"/, '报表详情新结构合同缺失');
assert.match(reportSource, /经营分析可视化报表/);
assert.match(reportSource, /浏览量统计/);
assert.match(reportSource, /演示截图/);
assert.match(reportSource, /应用评论/);

for (const source of [workbenchSource, appsSource, reportSource]) {
  assert.doesNotMatch(source, /页面UI更新.*\.png|47025c81|dc8f8714|ef637f71/, '禁止把权威整页 PNG 直接用作页面资产');
}

assert.match(captureSource, /document\.activeElement\?\.blur\(\)/, '视觉截图前必须清除键盘焦点，焦点证据单独记录');
assert.doesNotMatch(shellSource, /content:\s*['"]•['"]/, '侧栏图标不得使用字符圆点近似替代');

console.log('2026-08-31 三页新 UI 基线、路由、结构与禁止整页截图合同通过');
