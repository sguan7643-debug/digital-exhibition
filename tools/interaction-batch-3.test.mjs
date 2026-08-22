import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HOT_APP_FIXTURES, createProfileController, createWorkbenchController } from '../src/state/workbench-profile-controllers.js';

const workbench=createWorkbenchController(HOT_APP_FIXTURES);
assert.equal(workbench.results.length,4);
workbench.setQuery('增值税');
assert.deepEqual(workbench.results.map(item=>item.id),['hot-rpa']);
workbench.setScene('财务管理');
assert.deepEqual(workbench.results.map(item=>item.id),['hot-rpa']);
workbench.setQuery('不存在');
assert.equal(workbench.results.length,0);
workbench.reset();
assert.equal(workbench.results.length,4);
assert.equal(workbench.announcement,'已恢复全部热门应用');

const profile=createProfileController();
profile.markRead('profile-message-001');
assert.equal(profile.isRead('profile-message-001'),true);
profile.explain('我的申请');
assert.equal(profile.announcement,'我的申请：本演示未提供独立页面');

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const shell=read('src/components/ExhibitionShell.vue');
const page=read('src/pages/WorkbenchPage.vue');
const profilePage=read('src/pages/ProfilePage.vue');
for(const contract of ['xlt:workbench-filter','submitSceneSearch']) assert.ok(shell.includes(contract),`PP01 壳层筛选未接线：${contract}`);
for(const contract of ['createWorkbenchController','filteredHotApps','receiveWorkbenchFilter','暂无符合条件的热门应用']) assert.ok(page.includes(contract),`PP01 未接线：${contract}`);
assert.match(page,/\/apps\?category=/,'应用概览必须带分类进入应用中心');
for(const contract of ['createProfileController','profile.markRead','profile.explain','aria-live="polite"']) assert.ok(profilePage.includes(contract),`PP04 未接线：${contract}`);
assert.doesNotMatch(profilePage,/href="\/apps\/onboarding\/status">全部待办/,'无冻结待办目标不得伪装成可导航页面');

console.log('第三批 interaction：工作台组合筛选与个人中心本地反馈通过');
