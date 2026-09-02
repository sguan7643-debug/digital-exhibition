import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeishuIdentifierContract } from '../server/feishu-identifier-contract.mjs';
import { createFeishuReadOnlyService } from '../server/feishu-read-only-service.mjs';
import { createPublicReadOperationContracts, validateContractSchema } from '../src/integration/operation-contract-schemas.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = loadFeishuIdentifierContract(path.join(root, 'server', 'contracts', 'feishu-base-identifiers.json'));
const rows = {
  积分规则: [{ record_id: 'rec-rule', fields: { 规则ID: 'RULE-001', 规则编码: 'APP_USE', 规则名称: '应用使用积分', 来源编码: 'APP', 触发事件: 'APP_USED', 方向: 'INCOME', 积分值: 5, 频率类型: 'DAILY', 频率上限: 1, 周期上限: 30, 条件JSON: '{"min":1}', 有效期开始: 1704067200000, 启用: true, 当前版本: 3 } }],
  培训课程: [
    { record_id: 'rec-course-1', fields: { 课程ID: 'COURSE-001', 培训标题: '供应链风险管理', 分类: '采购', 讲师姓名: '李老师', 开始时间: 1798761600000, 格式: '直播', 培训简介: '风险识别与处置', 状态: '报名中', 已报名人数: 12 } },
    { record_id: 'rec-course-2', fields: { 课程ID: 'COURSE-002', 培训标题: '数据分析基础', 分类: '数据', 讲师姓名: '王老师', 开始时间: 1798848000000, 格式: '录播', 培训简介: '数据分析方法', 状态: '已发布', 已报名人数: 8 } }
  ],
  认证项目: [{ record_id: 'rec-cert', fields: { 认证编码: 'CERT-RPA-01', 认证名称: 'RPA 能力认证', 认证类型: 'RPA', 认证说明: '自动化能力认证', 适用人群: '开发人员', 主办单位: '数字化中心', 有效月数: 24, 考试规则: '线上考试', 通过规则: '80分', 启用: true } }],
  统计指标定义: [{ record_id: 'rec-metric', fields: { 指标编码: 'VISIT_COUNT', 指标名称: '访问量', 指标说明: '页面访问总次数', 指标域: '运营', 聚合方式: 'SUM', 计算表达式: 'count(*)', 单位: '次', 支持维度: 'DAY,APP', 口径版本: 'v1', 启用: true } }],
  素材分类: [{ record_id: 'rec-category', fields: { 分类编码: 'DOC', 分类名称: '文档', 父级ID: '', 启用: true, 排序: 1 } }],
  素材中心: [{ record_id: 'rec-material', fields: { 素材ID: 'MAT-001', 素材名称: '操作手册', 素材类型: '文档', 分类ID: 'DOC', 分类名称: '文档', 状态: 'ONLINE' } }]
};
const client = {
  async listRecords(tableId) {
    const table = contract.tables.find(item => item.tableId === tableId);
    const items = rows[table.name] || [];
    return { items, total: items.length, hasMore: false, nextPageToken: '' };
  }
};
const service = createFeishuReadOnlyService({ client, identifierContract: contract, now: () => new Date('2026-09-02T01:00:00.000Z'), traceIdFactory: () => 'trace-public-batch' });
const publicContracts = createPublicReadOperationContracts();
assert.deepEqual(Object.keys(publicContracts).sort(), ['CER-001', 'CER-002', 'MAT-001', 'OPS-003', 'PTS-004', 'TRN-001', 'TRN-002', 'TRN-003']);
assert.ok(Object.values(publicContracts).every(item => item.contractStatus === 'server-projection-verified'));

const rules = await service.execute('PTS-004', { page: 1, pageSize: 50, enabled: true });
assert.equal(rules.data.items[0].ruleId, 'RULE-001');
assert.equal(rules.data.items[0].points, 5);
assert.equal(rules.data.items[0].conditions.min, 1);

const overview = await service.execute('TRN-001', { limit: 6 });
assert.equal(overview.data.stats.courseCount, 2);
assert.equal(overview.data.categories[0].count, 1);
assert.equal(overview.data.featuredCourses[0].courseId, 'COURSE-001');

const courses = await service.execute('TRN-002', { page: 1, pageSize: 10, query: '数据' });
assert.equal(courses.data.total, 1);
assert.equal(courses.data.items[0].courseId, 'COURSE-002');

const course = await service.execute('TRN-003', { courseId: 'COURSE-001' });
assert.equal(course.data.courseId, 'COURSE-001');
assert.equal(course.data.descriptionHtml, '风险识别与处置');
assert.deepEqual(course.data.agenda, []);

const certificationOverview = await service.execute('CER-001', { newsLimit: 5, projectLimit: 12 });
assert.equal(certificationOverview.data.stats.projectCount, 1);
assert.equal(certificationOverview.data.directions[0].code, 'RPA');
assert.equal(certificationOverview.data.projects[0].certificationId, 'CERT-RPA-01');

const certifications = await service.execute('CER-002', { page: 1, pageSize: 10, directionCode: 'RPA' });
assert.equal(certifications.data.total, 1);
assert.equal(certifications.data.items[0].provider, '数字化中心');

const metrics = await service.execute('OPS-003', { page: 1, pageSize: 10, enabled: true });
assert.equal(metrics.data.items[0].metricCode, 'VISIT_COUNT');
assert.deepEqual(metrics.data.items[0].dimensions, ['DAY', 'APP']);

const materialFacets = await service.execute('MAT-001', {});
assert.equal(materialFacets.data.total, 1);
assert.equal(materialFacets.data.materialTypes[0].name, '文档');
assert.equal(materialFacets.data.categories[0].categoryCode, 'DOC');

for (const response of [rules, overview, courses, course, certificationOverview, certifications, metrics, materialFacets]) {
  assert.equal(response.code, 'OK');
  assert.equal(response.schemaVersion, 'feishu-public-read.v1');
  assert.equal(response.isComplete, true);
  assert.equal(response.dataStale, false);
}
for (const [operationId, response] of Object.entries({ 'PTS-004': rules, 'TRN-001': overview, 'TRN-002': courses, 'TRN-003': course, 'CER-001': certificationOverview, 'CER-002': certifications, 'OPS-003': metrics, 'MAT-001': materialFacets })) {
  validateContractSchema(response, publicContracts[operationId].successSchema, operationId);
}

await assert.rejects(() => service.execute('TRN-003', {}), error => error.code === 'INVALID_OPERATION_INPUT');
await assert.rejects(() => service.execute('CER-002', { pageSize: 12 }), error => error.code === 'INVALID_PAGE_SIZE');
console.log('8 public Feishu read operations have exact projections, pagination and input guards');
