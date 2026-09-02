const definition = (operationId, tableName, keyField, mode, allowedFields, cleanup = 'DELETE_TEST_RECORD') => Object.freeze({
  operationId, tableName, keyField, mode, allowedFields: Object.freeze(allowedFields), cleanup,
  requiresTestPrefix: true, requiresIdempotencyKey: true, requiresVersion: ['UPDATE', 'DELETE', 'UPDATE_MANY', 'COMMAND'].includes(mode)
});

export const FEISHU_WRITE_OPERATION_MANIFEST = Object.freeze([
  definition('COM-006', '文件上传会话', '上传ID', 'CREATE', ['文件ID', '文件名', '大小字节', 'MIME类型', 'SHA256', '业务类型', '业务ID', '用途', '分片上传', '分片数', '状态', '过期时间', '飞书文件令牌']),
  definition('COM-007', '文件上传会话', '上传ID', 'UPDATE', ['文件ID', '状态', '飞书文件令牌', '大小字节', 'SHA256']),
  definition('COM-011', '用户行为流水', '事件ID', 'CREATE', ['事件类型', '用户ID', '匿名ID', '会话ID', '页面路径', '来源路径', '资源类型', '资源ID', '搜索词哈希', '场景', '停留毫秒', '脱敏元数据', '发生时间', '请求ID', '路由月份']),
  definition('MSG-003', '消息通知', '消息ID', 'UPDATE', ['已读状态']),
  definition('MSG-004', '消息通知', '消息ID', 'UPDATE', ['已读状态']),
  definition('MSG-005', '消息通知', '消息ID', 'UPDATE_MANY', ['接收人ID', '已读状态']),
  definition('ANN-004', '公告已读明细', '已读编码', 'UPSERT', ['公告ID', '用户ID', '首次阅读时间', '最后阅读时间', '阅读次数']),
  definition('FAV-003', '应用收藏', '主键', 'CREATE', ['应用ID', '用户ID', '收藏时间']),
  definition('FAV-004', '应用收藏', '主键', 'DELETE', []),
  definition('APP-005', '使用申请', '主键', 'CREATE', ['应用ID', '申请人ID', '申请理由', '状态', '申请时间']),
  definition('APP-006', '应用复用申请', '申请编号', 'CREATE', ['应用ID', '申请类型', '申请人ID', '申请部门ID', '目标部门ID', '申请原因', '业务场景', '复用范围', '预计用户数', '集成要求', '数据要求', '期望上线日期', '本地状态', '外部管理', '外部引用编号', '提交时间', '完成时间', '幂等键']),
  definition('APP-008', '应用评论', '主键', 'CREATE', ['应用ID', '评论人ID', '评论内容', '评论时间']),
  definition('TRN-004', '培训报名', '报名编号', 'CREATE', ['课程ID', '用户ID', '状态', '报名时间', '排队序号', '幂等键']),
  definition('TRN-005', '培训报名', '报名编号', 'UPDATE', ['状态', '取消时间', '取消原因']),
  definition('CER-004', '考试预约', '预约编号', 'CREATE', ['认证项目ID', '考试场次ID', '用户ID', '状态', '预约时间', '幂等键']),
  definition('OAP-010', '用户权限', '主键', 'UPSERT', ['应用ID', '用户ID', '授权时间', '授权人ID', '状态']),
  definition('ADM-001', '应用类型配置', '类型ID', 'UPSERT', ['类型名称', '类型编码', '类型图标', '排序', '状态', '是否系统内置', '类型描述']),
  definition('ADM-002', '业务域字典', '业务域ID', 'UPSERT', ['业务域名称']),
  definition('ADM-005', '异常处理记录', '异常ID', 'COMMAND', ['状态', '处理人ID', '解决时间', '最后重试状态', '发生次数']),
  definition('TAL-004', '人才库', '主键', 'UPSERT', ['用户ID', '人才类型', '人才等级', '擅长领域', '状态', '姓名', '工号', '年龄', '所属部门ID', '所属部门名称', '责任科室ID', '责任科室名称', '能力标签', '培养方向', '轮岗计划开始时间', '轮岗计划结束时间', '岗位', '办公地点', '业务领域', '技术方向', '入库日期', '退出日期', '联系方式脱敏值', '头像', '个人简介', '负责人ID', '附件']),
  definition('INT-002', '后台任务执行记录', '执行ID', 'CREATE', ['任务ID', '触发类型', '触发人ID', '开始时间', '状态', '进度', '总数', '成功数', '失败数', '跳过数']),
  definition('COM-009', '导出任务', '导出任务ID', 'CREATE', ['导出类型', '格式', '筛选快照', '列快照', '排序表达式', '状态', '进度', '总行数', '已处理行数', '创建用户ID', '过期时间']),
  definition('PTS-005', '导出任务', '导出任务ID', 'CREATE', ['导出类型', '格式', '筛选快照', '列快照', '排序表达式', '状态', '进度', '创建用户ID', '过期时间']),
  definition('OPS-002', '导出任务', '导出任务ID', 'CREATE', ['导出类型', '格式', '筛选快照', '列快照', '排序表达式', '状态', '进度', '创建用户ID', '过期时间']),
  definition('OPS-004', '后台任务执行记录', '执行ID', 'CREATE', ['任务ID', '触发类型', '触发人ID', '开始时间', '状态', '进度', '总数']),
  definition('OAN-004', '公告通知', '公告ID', 'CREATE', ['公告标题', '分类', '公告正文', '发布部门ID', '发布人ID', '状态', '是否置顶', '公告摘要', '有效期开始', '有效期结束', '发布模式', '范围类型']),
  definition('OAN-005', '公告通知', '公告ID', 'UPDATE', ['公告标题', '分类', '公告正文', '发布部门ID', '发布人ID', '状态', '是否置顶', '公告摘要', '有效期开始', '有效期结束', '发布模式', '范围类型']),
  definition('OAN-006', '公告通知', '公告ID', 'COMMAND', ['状态', '发布时间', '发布模式']),
  definition('OAN-007', '公告通知', '公告ID', 'COMMAND', ['状态', '是否置顶', '置顶结束时间', '下线时间', '下线原因', '已删除']),
  definition('OAP-004', '应用索引', '应用ID', 'CREATE', ['应用名称', '应用类型', '子类型', '应用简介', '应用关键字', '应用URL地址', '状态', '负责人ID', '所属部门ID', '开发者ID', '开发部门ID', '运营人员ID', '所属业务域ID', '所属场景ID', '适用对象', '应用编码', '应用简称', '分类编码', '分类名称', '标签', '应用Logo', '应用封面', '访问方式', '打开方式', 'SSO模式', '排序', '当前结构版本']),
  definition('OAP-005', '应用索引', '应用ID', 'UPDATE', ['应用名称', '应用类型', '子类型', '应用简介', '应用关键字', '应用URL地址', '状态', '负责人ID', '所属部门ID', '开发者ID', '开发部门ID', '运营人员ID', '所属业务域ID', '所属场景ID', '适用对象', '应用编码', '应用简称', '分类编码', '分类名称', '标签', '应用Logo', '应用封面', '访问方式', '打开方式', 'SSO模式', '排序', '当前结构版本']),
  definition('OAP-007', '外部成果提交记录', '提交编号', 'CREATE', ['上架申请ID', '应用ID', '渠道', '表单版本', '本地状态', '外部提交状态', '外部引用编号', '外部提交时间', '尝试次数', '最后尝试时间', '失败编码', '失败信息', '脱敏请求快照', '幂等键']),
  definition('OAP-009', '应用索引', '应用ID', 'COMMAND', ['状态', '发布时间', '推荐应用', '推荐开始时间', '推荐结束时间', '热门应用', '热门开始时间', '热门结束时间']),
  definition('OAP-012', '应用类型配置', '类型ID', 'UPSERT', ['类型名称', '类型编码', '类型图标', '排序', '状态', '是否系统内置', '类型描述']),
  definition('ARC-001', '归档任务', '归档任务ID', 'CREATE', ['归档批次号', '数据分类', '资源类型', '范围开始时间', '范围结束时间', '筛选快照', '归档目标', '保留策略编码', '校验方式', '校验后删除', '仅预演', '状态', '阶段', '预估行数']),
  definition('ARC-003', '恢复任务', '恢复任务ID', 'COMMAND', ['归档任务ID', '恢复范围', '目标环境', '冲突策略', '状态', '总数', '已恢复数', '跳过数', '失败数', '开始时间', '结束时间', '错误编码', '错误信息'])
]);

if (FEISHU_WRITE_OPERATION_MANIFEST.length !== 36) throw new Error(`写接口清单必须为 36 个，当前 ${FEISHU_WRITE_OPERATION_MANIFEST.length}`);
if (new Set(FEISHU_WRITE_OPERATION_MANIFEST.map(item => item.operationId)).size !== 36) throw new Error('写接口清单存在重复 operationId');
export const FEISHU_WRITE_OPERATION_BY_ID = new Map(FEISHU_WRITE_OPERATION_MANIFEST.map(item => [item.operationId, item]));
