import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createAnnouncementController,
  createNoticeDetailController
} from '../src/state/announcement-controllers.js';

const ANNOUNCEMENT_FIXTURES = Array.from({ length: 128 }, (_, index) => ({
  id: `announcement-${String(index + 1).padStart(3, '0')}`,
  type: index % 2 ? '活动通知' : '系统公告',
  title: `测试公告 ${index + 1}`,
  date: '2025-05-03',
  read: index >= 18,
}));

const announcements=createAnnouncementController(ANNOUNCEMENT_FIXTURES);
assert.equal(ANNOUNCEMENT_FIXTURES.length,128,'PP05 应提供 128 条确定性公告');
assert.equal(announcements.totalPages,13);
assert.equal(announcements.pagedResults.length,10);
assert.equal(announcements.unreadCount,18);
announcements.setFilter('type','活动通知');
assert.ok(announcements.results.every(item=>item.type==='活动通知'));
announcements.setDraft('startDate','2025-05-09');
announcements.setDraft('endDate','2025-05-01');
assert.equal(announcements.applyFilters(),false,'开始日期晚于结束日期必须拒绝提交');
assert.match(announcements.validationError,/开始日期/);
announcements.setDraft('startDate','2025-05-01');
assert.equal(announcements.applyFilters(),true);
announcements.markAllRead();
assert.equal(announcements.unreadCount,0);
announcements.resetData();
assert.equal(announcements.unreadCount,18,'刷新应恢复固定 mock 已读状态');
announcements.setPageSize(20);
announcements.setPage(99);
assert.equal(announcements.page,7,'越界页码应归一到最后一页');
assert.equal(announcements.pagedResults.length,8);

const detail=createNoticeDetailController();
detail.explain('风险管理交流会');
assert.equal(detail.announcement,'风险管理交流会：飞书未返回独立详情地址');
assert.equal(detail.associatedRoute('supplier-risk'),'/apps/report-001');
assert.equal(detail.associatedRoute('unknown'),null);

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const list=read('src/pages/AnnouncementsPage.vue');
const notice=read('src/pages/NoticeDetailPage.vue');
const app=read('src/App.vue');
for(const contract of ['createAnnouncementController','applyAnnouncementFilters','markAllRead','pagedAnnouncements','PaginationControl','validationError','state === \'empty\''])
  assert.ok(list.includes(contract),`PP05 未接线：${contract}`);
for(const contract of ['createNoticeDetailController','downloadRemoteAttachment','sameOriginDownloadUrl','goBack','aria-live="polite"','state === \'permission-denied\''])
  assert.ok(notice.includes(contract),`PP06 未接线：${contract}`);
assert.ok(app.includes(':state="page.state"'), 'PP05/PP06 必须接收页面级六态');
assert.ok(app.includes('xltSource'), '同壳层详情返回必须记录来源 entry、query、滚动和焦点');

console.log('第四批 interaction：公告筛选分页、已读状态与通知详情本地行为通过');
