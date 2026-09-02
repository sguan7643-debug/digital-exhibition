const fields = value => Object.freeze(value.split('|'));
const table = value => Object.freeze({ fields: fields(value) });

export const FEISHU_SCHEMA_SOURCE = Object.freeze({
  label: '授权飞书整库只读导出',
  verifiedAt: '2026-09-02',
  tableCount: 36,
  containsRecordValues: false,
  containsCredentials: false,
  containsTableIds: false,
  containsViewIds: false,
  containsFieldIds: false,
  mappingScope: 'table-and-field-names-only'
});

export const FEISHU_BASE_TABLES = Object.freeze({
  '用户字典': table('用户ID|姓名|工号|所属部门ID|岗位|邮箱|手机号'),
  '部门字典': table('部门ID|部门名称'),
  '业务域字典': table('业务域ID|业务域名称'),
  '场景字典': table('场景ID|场景名称'),
  '应用类型配置': table('类型ID|类型名称|类型编码|类型图标|排序|状态|是否系统内置|类型描述|创建时间|更新时间'),
  '应用索引': table('应用ID|应用名称|应用类型|子类型|应用简介|应用关键字|应用URL地址|状态|访问次数|使用次数|收藏数|发布时间|创建日期|最近更新日期|负责人ID|所属部门ID|开发者ID|开发部门ID|运营人员ID|所属业务域ID|所属场景ID|适用对象'),
  '可视化驾驶舱详情': table('主键|应用ID|应用编码|版本号|集成数据|数据更新频率|权限控制要求|核心功能|应用描述'),
  '可视化报表详情': table('主键|应用ID|应用编码|版本号|集成数据|数据更新频率|权限控制要求|核心功能|应用描述'),
  '海能work应用详情': table('主键|应用ID|应用编码|版本号|应用图片或视频|使用指南|使用功能|使用说明文档链接|应用描述'),
  '工具应用详情': table('主键|应用ID|应用编码|版本号|使用说明|核心功能|应用描述'),
  'RPA应用详情': table('主键|应用ID|应用编码|版本号|RPA所属平台|操作流程步骤|应用描述'),
  'EAD应用详情': table('主键|应用ID|应用编码|版本号|应用内容|使用流程步骤|应用描述'),
  'AI应用详情': table('主键|应用ID|应用编码|版本号|所属数据源|应用描述|核心功能'),
  '数据集应用详情': table('主键|应用ID|应用编码|版本号|数据来源|更新频率|数据字段列表|应用描述'),
  '指标应用详情': table('主键|应用ID|应用编码|版本号|主要领域|指标应用场景|指标级别|业务解释部门|成果来源系统|指标定义|业务获取逻辑|业务计算公式|计算单位|采集方式|维度|统计粒度|关键值|权限控制要求|使用说明|列20'),
  '附件资料': table('主键|应用ID|文件名称|附件文件|文件大小|上传时间|上传人ID'),
  '演示截图录屏': table('主键|应用ID|媒体类型|文件|说明文字'),
  '应用评论': table('主键|应用ID|评论人ID|评论内容|评论时间'),
  '相关培训': table('主键|应用ID|培训标题|培训分类|讲师姓名|时长(分钟)|培训链接|排序'),
  '应用素材关联': table('主键|应用ID|素材ID'),
  '素材中心': table('素材ID|素材名称|素材文件|下载次数'),
  '公告通知': table('公告ID|公告标题|分类|公告正文|发布部门ID|发布人ID|状态|是否置顶|发布时间'),
  '消息通知': table('消息ID|接收人ID|消息标题|消息内容|分类|已读状态|消息时间'),
  '培训课程': table('课程ID|培训标题|分类|讲师姓名|开始时间|格式|培训简介|状态|已报名人数'),
  '应用收藏': table('主键|应用ID|用户ID|收藏时间'),
  '使用申请': table('主键|应用ID|申请人ID|申请理由|状态|申请时间'),
  '用户权限': table('主键|应用ID|用户ID|授权时间|授权人ID|状态'),
  '用户累计统计': table('主键|用户ID|累计访问应用次数|累计使用应用次数|累计收藏次数|累计评论次数|累计培训报名次数'),
  '用户月度统计': table('主键|用户ID|年月|当月访问次数|当月使用次数|当月收藏次数|当月评论次数|当月培训报名次数'),
  '上架申请': table('申请单号|关联应用ID|应用类型ID|申请人ID|表单数据|状态|当前审批节点|提交时间|退回原因'),
  '积分余额': table('主键|用户ID|当前总积分|基础活跃累计|应用互动累计|应用使用累计|应用建设累计|团队推广累计|持续建设累计|培训学习累计|本月积分|上月积分|最后更新时间'),
  '积分月度汇总': table('主键|用户ID|年月|月度总积分|基础活跃月度合计|应用互动月度合计|应用使用月度合计|应用建设月度合计|培训学习月度合计'),
  '数字化认证': table('主键|用户ID|认证类型|状态|认证时间|过期时间'),
  '人才库': table('主键|用户ID|人才类型|人才等级|擅长领域|状态'),
  '人才项目': table('主键|项目名称|项目类型|负责人ID|状态|开始日期|结束日期'),
  '项目进度': table('主键|项目ID|阶段名称|状态|更新时间')
});

const defaults = Object.freeze({
  COM: ['用户字典', '部门字典', '业务域字典', '场景字典'],
  WB: ['应用索引', '公告通知', '消息通知', '用户累计统计', '用户月度统计'],
  MSG: ['消息通知'],
  ANN: ['公告通知'],
  FAV: ['应用收藏', '应用索引'],
  APP: ['应用类型配置', '应用索引', '用户权限', '使用申请', '应用评论', '相关培训', '应用素材关联', '素材中心'],
  PTS: ['积分余额', '积分月度汇总'],
  TRN: ['培训课程'],
  CER: ['数字化认证'],
  OPS: [],
  OAN: ['公告通知'],
  OAP: ['应用类型配置', '应用索引', '上架申请'],
  ADM: ['应用类型配置', '业务域字典', '用户权限'],
  TAL: ['人才库', '人才项目', '项目进度'],
  MAT: ['素材中心', '应用素材关联'],
  INT: [],
  ARC: []
});

const applicationDetailTables = Object.freeze([
  '可视化驾驶舱详情', '可视化报表详情', '海能work应用详情', '工具应用详情',
  'RPA应用详情', 'EAD应用详情', 'AI应用详情', '数据集应用详情', '指标应用详情'
]);

// Operations that aggregate several Base tables must list every actual source
// instead of inheriting only the broad domain defaults above.
const verifiedByOperation = Object.freeze({
  'APP-001': ['应用类型配置', '业务域字典', '场景字典', '应用索引'],
  'APP-002': ['应用索引', '用户字典', '部门字典', '业务域字典', '场景字典'],
  'APP-003': [
    '应用索引', ...applicationDetailTables, '附件资料', '演示截图录屏', '应用评论',
    '相关培训', '应用素材关联', '素材中心', '应用收藏', '用户权限', '用户字典', '部门字典'
  ],
  'APP-004': ['应用索引', '用户权限'],
  'APP-005': ['应用索引', '使用申请', '消息通知'],
  'APP-006': ['应用索引'],
  'APP-007': ['应用评论', '用户字典'],
  'APP-008': ['应用评论'],
  'APP-009': ['相关培训', '应用素材关联', '素材中心'],
  'APP-010': ['应用索引', '使用申请', '上架申请'],
  'FAV-001': ['应用收藏'],
  'FAV-002': ['应用收藏', '应用索引'],
  'FAV-003': ['应用收藏', '应用索引'],
  'FAV-004': ['应用收藏', '应用索引'],
  'PTS-001': ['积分余额', '积分月度汇总'],
  'PTS-002': ['积分余额'],
  'PTS-003': ['积分余额', '积分月度汇总'],
  'PTS-004': [],
  'PTS-005': ['积分余额'],
  'TRN-001': ['培训课程'],
  'TRN-002': ['培训课程'],
  'TRN-003': ['培训课程'],
  'TRN-004': ['培训课程'],
  'TRN-005': ['培训课程'],
  'TRN-006': ['培训课程'],
  'CER-001': ['数字化认证'],
  'CER-002': ['数字化认证'],
  'CER-003': ['数字化认证'],
  'CER-004': ['数字化认证'],
  'OAP-001': ['应用索引', '用户累计统计', '用户月度统计'],
  'OAP-002': ['应用索引', '应用类型配置', '用户字典', '部门字典'],
  'OAP-003': ['应用索引', ...applicationDetailTables, '附件资料', '演示截图录屏'],
  'OAP-004': ['应用索引', ...applicationDetailTables],
  'OAP-005': ['应用索引', ...applicationDetailTables],
  'OAP-006': ['应用类型配置', '应用索引', ...applicationDetailTables],
  'OAP-007': ['应用索引'],
  'OAP-008': ['应用索引'],
  'OAP-009': ['应用索引'],
  'OAP-010': ['上架申请', '应用索引'],
  'OAP-011': ['应用类型配置', '应用索引'],
  'OAP-012': ['用户权限', '应用索引']
});

const missingByPrefix = Object.freeze({
  OPS: ['用户行为流水', '统计指标定义', '日统计汇总'],
  INT: ['多维表连接配置', '字段字典', '后台任务执行记录', '完整性差异记录'],
  ARC: ['归档任务', '恢复任务', '归档执行记录']
});

const missingByOperation = Object.freeze({
  'COM-006': ['文件上传会话'], 'COM-007': ['文件上传会话'], 'COM-008': ['文件访问授权'],
  'COM-009': ['导出任务'], 'COM-010': ['导出任务'], 'COM-011': ['用户行为流水'],
  'ANN-004': ['公告已读明细'], 'ANN-005': ['公告关联对象'],
  'APP-006': ['应用复用申请'],
  'PTS-002': ['积分流水'], 'PTS-003': ['积分流水'], 'PTS-004': ['积分规则'], 'PTS-005': ['积分流水'],
  'TRN-004': ['培训报名'], 'TRN-005': ['培训报名'],
  'CER-001': ['认证项目'], 'CER-002': ['认证项目'], 'CER-003': ['认证项目', '考试场次', '考试预约'], 'CER-004': ['考试预约'],
  'OAN-001': ['公告已读明细'], 'OAN-002': ['公告已读明细'], 'OAN-003': ['公告关联对象'],
  'OAN-004': ['公告关联对象'], 'OAN-005': ['公告关联对象'], 'OAN-006': ['公告关联对象'],
  'OAN-007': ['公告关联对象'], 'OAN-008': ['公告关联对象'],
  'OAP-007': ['外部成果提交记录'], 'OAP-008': ['外部成果提交记录'],
  'ADM-003': ['后台操作日志'], 'ADM-004': ['接口调用日志'], 'ADM-005': ['异常处理记录'],
  'ADM-006': ['接口调用日志', '后台任务执行记录'],
  'MAT-001': ['素材分类']
});

export const FEISHU_SCHEMA_WARNINGS = Object.freeze([
  Object.freeze({ table: '指标应用详情', field: '列20', code: 'AUTO_GENERATED_HEADER', message: '字段名未业务化，联调前需在飞书确认真实含义并改名' })
]);

export function getFeishuOperationSourceContract(operationId) {
  const prefix = String(operationId).split('-')[0];
  const verifiedTables = Object.freeze([...new Set(verifiedByOperation[operationId] || defaults[prefix] || [])]);
  const missingTables = Object.freeze([...new Set([
    ...(missingByPrefix[prefix] || []),
    ...(missingByOperation[operationId] || [])
  ])].filter(tableName => !verifiedTables.includes(tableName)));
  const schemaCoverage = missingTables.length ? 'partial' : 'verified';
  return Object.freeze({
    operationId,
    verifiedTables,
    missingTables,
    schemaCoverage,
    identifierCoverage: 'missing-table-view-field-ids',
    apiReady: false,
    remoteEnabled: false,
    disabledReason: missingTables.length
      ? `飞书整库仍缺少：${missingTables.join('、')}；并缺少同源安全代理、服务端鉴权和 table_id/view_id/field_id 映射`
      : '真实表名与字段名已核验，但缺少同源安全代理、服务端鉴权和 table_id/view_id/field_id 映射'
  });
}
