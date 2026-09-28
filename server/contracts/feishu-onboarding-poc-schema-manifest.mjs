import { createHash } from 'node:crypto';

const TYPE = Object.freeze({ TEXT: 1, NUMBER: 2, SELECT: 3, MULTI_SELECT: 4, DATE_TIME: 5, CHECKBOX: 7, ATTACHMENT: 17 });
const text = (field_name, primary = false) => ({ field_name, type: TYPE.TEXT, ...(primary ? { primary: true } : {}) });
const number = field_name => ({ field_name, type: TYPE.NUMBER });
const dateTime = field_name => ({ field_name, type: TYPE.DATE_TIME, property: { date_formatter: 'yyyy-MM-dd HH:mm' } });
const checkbox = field_name => ({ field_name, type: TYPE.CHECKBOX });
const attachment = field_name => ({ field_name, type: TYPE.ATTACHMENT });
const select = (field_name, options) => ({ field_name, type: TYPE.SELECT, property: { options: options.map((name, color) => ({ name, color: color % 12 })) } });
const multiSelect = (field_name, options) => ({ field_name, type: TYPE.MULTI_SELECT, property: { options: options.map((name, color) => ({ name, color: color % 12 })) } });
const table = (table_name, fields) => ({ table_name, default_view_name: '全部记录', create_if_missing: true, fields });

export const ONBOARDING_POC_MANIFEST_VERSION = 'DEH-ONBOARDING-POC-20260926.v1';
export const ONBOARDING_POC_SCHEMA_TABLES = new Set(['上架申请', '文件上传会话', '附件资料', '应用索引', '海能work应用详情']);
export const ONBOARDING_POC_RECORD_TABLES = new Set(['应用类型配置', '业务域字典', '用户字典', '部门字典', ...ONBOARDING_POC_SCHEMA_TABLES]);

export const ONBOARDING_POC_MANIFEST = Object.freeze({
  version: ONBOARDING_POC_MANIFEST_VERSION,
  tables: Object.freeze([
    table('上架申请', [
      text('申请单号', true), text('关联应用ID'), text('应用类型ID'), text('申请人ID'), text('应用名称'), text('应用编码'), text('所属业务域ID'), text('摘要'), text('状态'), text('当前审批节点'), text('提交时间'), dateTime('完成时间'), text('退回原因'), select('审批来源', ['飞书审批', 'EAD审批']), text('审批实例ID'), text('授权用户'), text('授权部门'), text('表单AttemptID'), dateTime('最近同步时间'), attachment('应用图标'), attachment('申请附件'), text('追踪ID'), text('运行标识')
    ]),
    table('文件上传会话', [
      text('上传ID', true), text('文件ID'), text('文件名'), number('大小字节'), text('MIME类型'), text('SHA256'), text('业务类型'), text('业务ID'), text('用途'), checkbox('分片上传'), number('分片数'), select('状态', ['INITIALIZED', 'UPLOADING', 'UPLOADED', 'SCANNING', 'READY', 'FAILED', 'EXPIRED', 'COMPLETED']), dateTime('过期时间'), text('飞书文件令牌'), text('租户编码'), text('追踪ID'), text('运行标识')
    ]),
    table('附件资料', [
      text('主键', true), text('应用ID'), text('文件名称'), attachment('附件'), text('文件大小'), text('MIME类型'), text('SHA256'), text('上传时间'), text('上传人ID'), select('用途', ['APPLICATION_ICON', 'APPLICATION_ATTACHMENT']), text('上传ID'), text('审批实例ID'), text('追踪ID'), text('运行标识')
    ]),
    table('应用索引', [
      text('应用ID', true), text('应用名称'), text('应用编码'), text('应用简称'), text('应用类型'), text('分类编码'), text('分类名称'), text('摘要'), text('应用简介'), text('应用URL地址'), text('移动端地址'), text('状态'), text('所属业务域ID'), text('适用用户AD账号'), text('适用部门ID'), text('适用角色'), text('权限范围'), text('适用对象'), text('申请人AD账号'), text('发布时间'), text('创建日期'), text('最近更新日期'), attachment('应用图标'), multiSelect('标签', ['新上线']), text('访问方式'), text('打开方式'), text('SSO模式'), text('追踪ID'), text('运行标识')
    ]),
    table('海能work应用详情', [
      text('主键', true), text('应用ID'), text('应用编码'), text('版本号'), text('应用图片或视频'), text('使用指南'), text('使用功能'), text('使用说明文档链接'), text('应用描述'), attachment('应用图标'), attachment('申请附件'), text('审批实例ID'), dateTime('最近同步时间'), text('追踪ID'), text('运行标识')
    ])
  ])
});

export const ONBOARDING_POC_MANIFEST_SHA256 = createHash('sha256').update(JSON.stringify(ONBOARDING_POC_MANIFEST)).digest('hex');

for (const schema of ONBOARDING_POC_MANIFEST.tables) {
  if (!ONBOARDING_POC_SCHEMA_TABLES.has(schema.table_name)) throw new Error(`POC manifest 越界表：${schema.table_name}`);
  if (schema.fields.filter(field => field.primary).length !== 1) throw new Error(`${schema.table_name} 必须且只能有一个主键`);
  if (new Set(schema.fields.map(field => field.field_name)).size !== schema.fields.length) throw new Error(`${schema.table_name} 存在重复字段`);
}
