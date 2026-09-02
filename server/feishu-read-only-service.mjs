import { FeishuProxyError } from './feishu-open-api-client.mjs';
import { getOperation } from '../src/integration/operation-registry.js';

const READ_PLANS = Object.freeze({
  'APP-001': Object.freeze({ kind: 'app-facets' }),
  'ANN-001': Object.freeze({ kind: 'announcement-facets' }),
  'COM-003': Object.freeze({ kind: 'contact-organizations' }),
  'COM-004': Object.freeze({ kind: 'contact-users' }),
  'ANN-002': Object.freeze({ kind: 'announcement-list' }),
  'APP-002': Object.freeze({ kind: 'app-list' }),
  'TAL-001': Object.freeze({ kind: 'talent-people' }),
  'TAL-002': Object.freeze({ kind: 'talent-projects' }),
  'TAL-003': Object.freeze({ kind: 'talent-progress' }),
  'TAL-005': Object.freeze({ kind: 'talent-facets' }),
  'PTS-004': Object.freeze({ kind: 'public-read' }),
  'TRN-001': Object.freeze({ kind: 'public-read' }),
  'TRN-002': Object.freeze({ kind: 'public-read' }),
  'TRN-003': Object.freeze({ kind: 'public-read' }),
  'CER-001': Object.freeze({ kind: 'public-read' }),
  'CER-002': Object.freeze({ kind: 'public-read' }),
  'OPS-003': Object.freeze({ kind: 'public-read' }),
  'MAT-001': Object.freeze({ kind: 'public-read' }),
  'MAT-002': Object.freeze({ tableName: '素材中心', labelField: '素材名称', typeField: '素材文件' })
});

function valueToText(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join('、');
  if (typeof value === 'object') return value.text || value.name || value.value || '';
  return String(value);
}

function valueToNumber(value) {
  const normalized = Number(String(valueToText(value)).replaceAll(',', '').trim());
  return Number.isFinite(normalized) ? normalized : 0;
}

function valueToList(value) {
  if (Array.isArray(value)) return value.flatMap(valueToList).filter(Boolean);
  return valueToText(value).split(/[、,，;；|/]/).map(item => item.trim()).filter(Boolean);
}

function valueToBoolean(value) {
  const text = valueToText(value).trim().toLocaleLowerCase('zh-CN');
  return ['是', 'true', '1', 'yes', '置顶'].includes(text);
}

function valueToJsonObject(value) {
  const text = valueToText(value).trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function createLookup(records, idFields, labelField, { fallbackToKey = true } = {}) {
  const lookup = new Map();
  for (const record of records) {
    const fields = record?.fields || {};
    const label = valueToText(fields[labelField]);
    for (const field of idFields) {
      const key = valueToText(fields[field]);
      if (key && (label || fallbackToKey)) lookup.set(key, label || key);
    }
  }
  return lookup;
}

const APP_ICON_BY_TYPE = Object.freeze({
  RPA: 'app-rpa', EAD: 'ead-logo', AI: 'app-ai', DATASET: 'app-dataset',
  '数据集': 'app-dataset', '指标': 'app-metric', '海能work应用': 'app-work',
  REPORT: 'app-report', '可视化报表': 'app-report', '报表': 'app-report',
  DASHBOARD: 'app-cockpit', '驾驶舱': 'app-cockpit', '大屏': 'app-screen'
});

const APP_ROUTE_BY_TYPE = Object.freeze({
  RPA: '/apps/rpa-001', EAD: '/apps/ead-001', AI: '/apps/ai-001', DATASET: '/apps/dataset-001',
  '数据集': '/apps/dataset-001', '指标': '/apps/metric-001', '海能work应用': '/apps/haineng-work-001',
  REPORT: '/apps/report-001', '可视化报表': '/apps/report-001', '报表': '/apps/report-001',
  DASHBOARD: '/apps/dashboard-001', '驾驶舱': '/apps/dashboard-001', '大屏': '/apps/dashboard-001'
});

function resolveAppPresentation(typeCode, typeName) {
  const value = `${typeCode} ${typeName}`;
  if (/RPA/i.test(value)) return { iconName: 'app-rpa', detailPath: '/apps/rpa-001' };
  if (/EAD/i.test(value)) return { iconName: 'ead-logo', detailPath: '/apps/ead-001' };
  if (/(?:AI|智能体)/i.test(value)) return { iconName: 'app-ai', detailPath: '/apps/ai-001' };
  if (/数据集/i.test(value)) return { iconName: 'app-dataset', detailPath: '/apps/dataset-001' };
  if (/指标/i.test(value)) return { iconName: 'app-metric', detailPath: '/apps/metric-001' };
  if (/(?:海能\s*work|协同办公)/i.test(value)) return { iconName: 'app-work', detailPath: '/apps/haineng-work-001' };
  if (/(?:驾驶舱|大屏)/i.test(value)) return { iconName: 'app-cockpit', detailPath: '/apps/dashboard-001' };
  if (/(?:报表|REPORT)/i.test(value)) return { iconName: 'app-report', detailPath: '/apps/report-001' };
  return {
    iconName: APP_ICON_BY_TYPE[typeCode] || APP_ICON_BY_TYPE[typeName] || 'tool-logo',
    detailPath: APP_ROUTE_BY_TYPE[typeCode] || APP_ROUTE_BY_TYPE[typeName] || '/apps/tool-001'
  };
}

function safeRecord(record, plan) {
  const fields = record?.fields && typeof record.fields === 'object' ? record.fields : {};
  return {
    id: String(record?.record_id || fields['主键'] || ''),
    label: valueToText(fields[plan.labelField]),
    type: valueToText(fields[plan.typeField]),
    count: 0
  };
}

export function createFeishuReadOnlyService(options) {
  const { client, identifierContract } = options || {};
  if (!client || !identifierContract?.byName) throw new Error('只读服务缺少飞书客户端或标识契约');
  const traceIdFactory = options.traceIdFactory || (() => `trace-${globalThis.crypto?.randomUUID?.() || Date.now()}`);
  const now = options.now || (() => new Date());
  const appProjectionCacheMs = options.appProjectionCacheMs ?? 30_000;
  let appProjectionCache = null;
  let appProjectionExpiresAt = 0;
  let appProjectionPending = null;
  let announcementProjectionCache = null;
  let announcementProjectionExpiresAt = 0;
  let announcementProjectionPending = null;
  let talentProjectionCache = null;
  let talentProjectionExpiresAt = 0;
  let talentProjectionPending = null;
  let contactProjectionCache = null;
  let contactProjectionExpiresAt = 0;
  let contactProjectionPending = null;

  function resolveTable(tableName) {
    const table = identifierContract.byName.get(tableName);
    if (!table) throw new FeishuProxyError('IDENTIFIER_CONTRACT_MISSING', `飞书表标识契约缺失：${tableName}`, 503);
    return table;
  }

  async function readAll(tableName) {
    const table = resolveTable(tableName);
    const items = [];
    let pageToken = '';
    for (let page = 1; page <= 100; page += 1) {
      let result;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          result = await client.listRecords(table.tableId, {
            viewId: table.views[0]?.viewId,
            pageSize: 100,
            pageToken,
            fieldNames: table.fields.map(field => field.name)
          });
          break;
        } catch (error) {
          if (![429, 502].includes(error?.status) || attempt === 2) throw error;
          await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt));
        }
      }
      items.push(...result.items);
      if (!result.hasMore || !result.nextPageToken) return items;
      pageToken = result.nextPageToken;
    }
    throw new FeishuProxyError('REMOTE_PAGINATION_LIMIT', `飞书表记录超过受控读取上限：${tableName}`, 503);
  }

  async function readAppProjection() {
    const [typeRows, userRows, departmentRows, domainRows, sceneRows] = await Promise.all([
      readAll('应用类型配置'), readAll('用户字典'), readAll('部门字典'),
      readAll('业务域字典'), readAll('场景字典')
    ]);
    const appRows = await readAll('应用索引');
    const typeLookup = createLookup(typeRows, ['类型ID', '类型编码', '类型名称'], '类型名称');
    const userLookup = createLookup(userRows, ['用户ID', '工号', '姓名'], '姓名');
    const departmentLookup = createLookup(departmentRows, ['部门ID', '部门名称'], '部门名称');
    const domainLookup = createLookup(domainRows, ['业务域ID', '业务域名称'], '业务域名称');
    const sceneLookup = createLookup(sceneRows, ['场景ID', '场景名称'], '场景名称');
    const items = appRows.map(record => {
      const fields = record?.fields || {};
      const typeCode = valueToText(fields['应用类型']);
      const typeName = typeLookup.get(typeCode) || typeCode || '其他应用';
      const subtype = valueToText(fields['子类型']);
      const domainId = valueToText(fields['所属业务域ID']);
      const sceneIds = valueToList(fields['所属场景ID']);
      const ownerId = valueToText(fields['负责人ID']);
      const developerId = valueToText(fields['开发者ID']);
      const responsibleOrgId = valueToText(fields['所属部门ID']);
      const developerOrgId = valueToText(fields['开发部门ID']);
      const presentation = resolveAppPresentation(typeCode, typeName);
      return {
        id: String(record?.record_id || valueToText(fields['主键']) || valueToText(fields['应用ID'])),
        appId: valueToText(fields['应用ID']) || String(record?.record_id || ''),
        name: valueToText(fields['应用名称']),
        typeCode,
        typeName,
        categoryCode: subtype || typeCode,
        categoryName: subtype || typeName,
        domainId,
        domainName: domainLookup.get(domainId) || domainId,
        sceneIds,
        sceneNames: sceneIds.map(id => sceneLookup.get(id) || id),
        keywords: valueToList(fields['应用关键字']),
        summary: valueToText(fields['应用简介']),
        status: valueToText(fields['状态']),
        usageCount: valueToNumber(fields['使用次数']),
        favoriteCount: valueToNumber(fields['收藏数']),
        ownerId,
        ownerName: userLookup.get(ownerId) || ownerId,
        developerId,
        developerName: userLookup.get(developerId) || developerId,
        responsibleOrgId,
        responsibleOrgName: departmentLookup.get(responsibleOrgId) || responsibleOrgId,
        developerOrgId,
        developerOrgName: departmentLookup.get(developerOrgId) || developerOrgId,
        updatedAt: valueToText(fields['最近更新日期']),
        iconName: presentation.iconName,
        detailPath: presentation.detailPath
      };
    }).filter(item => item.id && item.name);
    return { items, typeRows, typeLookup, domainLookup, sceneLookup };
  }

  async function getAppProjection() {
    const timestamp = Date.now();
    if (appProjectionCache && timestamp < appProjectionExpiresAt) return appProjectionCache;
    if (appProjectionPending) return appProjectionPending;
    appProjectionPending = readAppProjection().then(result => {
      appProjectionCache = result;
      appProjectionExpiresAt = Date.now() + appProjectionCacheMs;
      return result;
    }).finally(() => { appProjectionPending = null; });
    return appProjectionPending;
  }

  async function readAnnouncementProjection() {
    const rows = await readAll('公告通知');
    const items = rows.map(record => {
      const fields = record?.fields || {};
      const recordId = String(record?.record_id || '');
      const announcementId = valueToText(fields['公告ID']) || recordId;
      return {
        id: recordId || announcementId,
        announcementId,
        title: valueToText(fields['公告标题']),
        category: valueToText(fields['分类']),
        summary: valueToText(fields['公告正文']).slice(0, 2048),
        status: valueToText(fields['状态']),
        pinned: valueToBoolean(fields['是否置顶']),
        publishedAt: valueToText(fields['发布时间'])
      };
    }).filter(item => item.id && item.title);
    return { items };
  }

  async function getAnnouncementProjection() {
    const timestamp = Date.now();
    if (announcementProjectionCache && timestamp < announcementProjectionExpiresAt) return announcementProjectionCache;
    if (announcementProjectionPending) return announcementProjectionPending;
    announcementProjectionPending = readAnnouncementProjection().then(result => {
      announcementProjectionCache = result;
      announcementProjectionExpiresAt = Date.now() + appProjectionCacheMs;
      return result;
    }).finally(() => { announcementProjectionPending = null; });
    return announcementProjectionPending;
  }

  async function readTalentProjection() {
    const [personRows, projectRows, progressRows, userRows, departmentRows] = await Promise.all([
      readAll('人才库'), readAll('人才项目'), readAll('项目进度'), readAll('用户字典'), readAll('部门字典')
    ]);
    const userLookup = createLookup(userRows, ['用户ID', '工号', '姓名'], '姓名');
    const employeeLookup = createLookup(userRows, ['用户ID', '姓名'], '工号', { fallbackToKey: false });
    const userDepartmentLookup = createLookup(userRows, ['用户ID', '工号', '姓名'], '所属部门ID');
    const departmentLookup = createLookup(departmentRows, ['部门ID', '部门名称'], '部门名称');
    const projectLookup = createLookup(projectRows, ['主键'], '项目名称');
    const people = personRows.map(record => {
      const fields = record?.fields || {};
      const userId = valueToText(fields['用户ID']);
      const departmentId = userDepartmentLookup.get(userId) || '';
      const talentId = valueToText(fields['主键']) || String(record?.record_id || '');
      return {
        id: String(record?.record_id || talentId), talentId, userId,
        name: userLookup.get(userId) || userId, employeeNo: employeeLookup.get(userId) || '',
        type: valueToText(fields['人才类型']), level: valueToText(fields['人才等级']),
        specialties: valueToList(fields['擅长领域']), status: valueToText(fields['状态']),
        departmentId, departmentName: departmentLookup.get(departmentId) || departmentId
      };
    }).filter(item => item.id && item.userId);
    const projects = projectRows.map(record => {
      const fields = record?.fields || {};
      const ownerId = valueToText(fields['负责人ID']);
      const projectId = valueToText(fields['主键']) || String(record?.record_id || '');
      return {
        id: String(record?.record_id || projectId), projectId, name: valueToText(fields['项目名称']),
        type: valueToText(fields['项目类型']), ownerId, ownerName: userLookup.get(ownerId) || ownerId,
        status: valueToText(fields['状态']), startDate: valueToText(fields['开始日期']), endDate: valueToText(fields['结束日期'])
      };
    }).filter(item => item.id && item.name);
    const progress = progressRows.map(record => {
      const fields = record?.fields || {};
      const projectId = valueToText(fields['项目ID']);
      const progressId = valueToText(fields['主键']) || String(record?.record_id || '');
      return {
        id: String(record?.record_id || progressId), progressId, projectId,
        projectName: projectLookup.get(projectId) || projectId, phaseName: valueToText(fields['阶段名称']),
        status: valueToText(fields['状态']), updatedAt: valueToText(fields['更新时间'])
      };
    }).filter(item => item.id && item.projectId);
    return { people, projects, progress };
  }

  async function getTalentProjection() {
    const timestamp = Date.now();
    if (talentProjectionCache && timestamp < talentProjectionExpiresAt) return talentProjectionCache;
    if (talentProjectionPending) return talentProjectionPending;
    talentProjectionPending = readTalentProjection().then(result => {
      talentProjectionCache = result;
      talentProjectionExpiresAt = Date.now() + appProjectionCacheMs;
      return result;
    }).finally(() => { talentProjectionPending = null; });
    return talentProjectionPending;
  }

  async function readContactPage(readPage) {
    const items = [];
    let pageToken = '';
    for (let page = 1; page <= 100; page += 1) {
      const result = await readPage(pageToken);
      items.push(...result.items);
      if (!result.hasMore || !result.nextPageToken) break;
      pageToken = result.nextPageToken;
      if (page === 100) throw new FeishuProxyError('CONTACT_PAGINATION_LIMIT', '通讯录分页超过安全上限', 502);
    }
    return items;
  }

  async function readContactProjection() {
    if (!client.listDepartmentChildren || !client.listUsersByDepartment) {
      throw new FeishuProxyError('CONTACT_CLIENT_UNAVAILABLE', '飞书通讯录客户端未配置', 503);
    }
    const departments = [];
    const queue = [{ id: '0', depth: 0 }];
    const seenDepartments = new Set(['0']);
    while (queue.length) {
      const parent = queue.shift();
      const children = await readContactPage(pageToken => client.listDepartmentChildren(parent.id, {
        pageSize: 50, pageToken, userIdType: 'user_id', departmentIdType: 'open_department_id'
      }));
      for (const item of children) {
        const id = valueToText(item.open_department_id || item.department_id);
        if (!id || seenDepartments.has(id)) continue;
        seenDepartments.add(id);
        const department = {
          id, code: valueToText(item.department_id), name: valueToText(item.name), parentId: valueToText(item.parent_department_id) || parent.id,
          depth: parent.depth + 1, memberCount: valueToNumber(item.member_count),
          enabled: item.status?.is_deleted !== true
        };
        departments.push(department);
        queue.push({ id, depth: department.depth });
      }
    }
    const departmentNameById = new Map(departments.map(item => [item.id, item.name]));
    const usersById = new Map();
    for (const departmentId of ['0', ...departments.map(item => item.id)]) {
      const users = await readContactPage(pageToken => client.listUsersByDepartment(departmentId, {
        pageSize: 50, pageToken, userIdType: 'user_id', departmentIdType: 'open_department_id'
      }));
      for (const item of users) {
        const userId = valueToText(item.user_id || item.open_id);
        if (!userId) continue;
        const departmentIds = Array.isArray(item.department_ids) ? item.department_ids.map(valueToText).filter(Boolean) : [];
        const primaryDepartmentId = departmentIds[0] || departmentId;
        usersById.set(userId, {
          userId, employeeNo: valueToText(item.employee_no), displayName: valueToText(item.name),
          avatarUrl: valueToText(item.avatar?.avatar_72 || item.avatar?.avatar_240), orgId: primaryDepartmentId,
          orgName: departmentNameById.get(primaryDepartmentId) || '', departmentId: primaryDepartmentId,
          departmentName: departmentNameById.get(primaryDepartmentId) || '', officeId: '', officeName: '',
          title: valueToText(item.job_title), mobileMasked: '', emailMasked: '',
          enabled: item.status?.is_resigned !== true && item.status?.is_exited !== true && item.status?.is_frozen !== true
        });
      }
    }
    return { departments, users: [...usersById.values()] };
  }

  async function getContactProjection() {
    const timestamp = Date.now();
    if (contactProjectionCache && timestamp < contactProjectionExpiresAt) return contactProjectionCache;
    if (contactProjectionPending) return contactProjectionPending;
    contactProjectionPending = readContactProjection().then(result => {
      contactProjectionCache = result;
      contactProjectionExpiresAt = Date.now() + appProjectionCacheMs;
      return result;
    }).finally(() => { contactProjectionPending = null; });
    return contactProjectionPending;
  }

  function buildOrganizationTree(departments, rootId = '0', maxDepth = 20) {
    const byParent = new Map();
    const byId = new Map(departments.map(item => [item.id, item]));
    for (const item of departments) {
      if (!byParent.has(item.parentId)) byParent.set(item.parentId, []);
      byParent.get(item.parentId).push(item);
    }
    const resolvePath = item => {
      const path = [];
      const seen = new Set();
      let current = item;
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        path.unshift(current);
        current = byId.get(current.parentId);
      }
      return path;
    };
    const visit = (parentId, depth) => (byParent.get(parentId) || [])
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
      .map((item, index) => {
        const path = resolvePath(item);
        const children = depth < maxDepth ? visit(item.id, depth + 1) : [];
        return {
          orgId: item.id, orgCode: item.code, orgName: item.name, orgType: 'DEPARTMENT', parentId: item.parentId,
          pathIds: path.map(node => node.id), pathNames: path.map(node => node.name), level: item.depth,
          sortOrder: index, enabled: item.enabled, hasChildren: children.length > 0,
          userCount: item.memberCount, children
        };
      });
    return visit(rootId, 1);
  }

  async function executeContact(operationId, input) {
    const projection = await getContactProjection();
    if (operationId === 'COM-003') {
      const allowedKeys = ['rootId', 'keyword', 'orgType', 'enabled', 'includeUsers', 'maxDepth'];
      if (Object.keys(input).some(key => !allowedKeys.includes(key))) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
      const maxDepth = input.maxDepth == null ? 20 : Number(input.maxDepth);
      if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 20) throw new FeishuProxyError('INVALID_MAX_DEPTH', '组织树深度必须是 1 至 20', 400);
      const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
      const filtered = projection.departments.filter(item =>
        (input.enabled == null || item.enabled === input.enabled) && (!keyword || item.name.toLocaleLowerCase('zh-CN').includes(keyword))
      );
      if (input.orgType && input.orgType !== 'DEPARTMENT') {
        return { items: [], includeUsers: Boolean(input.includeUsers), userCount: 0, total: 0, source: 'FEISHU_CONTACT_V3' };
      }
      return {
        items: buildOrganizationTree(filtered, valueToText(input.rootId) || '0', maxDepth),
        includeUsers: Boolean(input.includeUsers),
        userCount: input.includeUsers ? projection.users.filter(item => item.enabled).length : 0,
        total: filtered.length, source: 'FEISHU_CONTACT_V3'
      };
    }
    const allowedKeys = ['keyword', 'employeeNo', 'orgId', 'departmentId', 'enabled', 'page', 'pageSize', 'sort'];
    if (Object.keys(input).some(key => !allowedKeys.includes(key))) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
    const pageSize = input.pageSize == null ? 10 : Number(input.pageSize);
    const page = input.page == null ? 1 : Number(input.page);
    if (![10, 20, 50, 100].includes(pageSize)) throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是 10、20、50 或 100', 400);
    if (!Number.isInteger(page) || page < 1 || page > 100) throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    const keyword = valueToText(input.keyword).toLocaleLowerCase('zh-CN');
    let rows = projection.users.filter(item =>
      (!keyword || [item.displayName, item.employeeNo, item.departmentName, item.title].join(' ').toLocaleLowerCase('zh-CN').includes(keyword)) &&
      (!input.employeeNo || item.employeeNo === input.employeeNo) &&
      (!input.orgId || item.orgId === input.orgId) && (!input.departmentId || item.departmentId === input.departmentId) &&
      (input.enabled == null || item.enabled === input.enabled)
    );
    rows = [...rows].sort((left, right) => left.displayName.localeCompare(right.displayName, 'zh-CN'));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    return {
      items: rows.slice((safePage - 1) * pageSize, safePage * pageSize), total, page: safePage, pageSize,
      totalPages, hasPrevious: safePage > 1, hasNext: safePage < totalPages, hasMore: safePage < totalPages,
      sort: 'name,asc',
      filtersApplied: {
        keyword: valueToText(input.keyword), employeeNo: valueToText(input.employeeNo), orgId: valueToText(input.orgId),
        departmentId: valueToText(input.departmentId), enabled: input.enabled == null ? true : input.enabled
      },
      source: 'FEISHU_CONTACT_V3'
    };
  }

  function createFacet(values, sortOrder = 0) {
    const counts = new Map();
    for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
    return [...counts.entries()].map(([name, count], index) => ({
      code: name, name, count, sortOrder: sortOrder + index, enabled: true
    }));
  }

  async function executeApp(operationId, input) {
    const allowedKeys = operationId === 'APP-002' ? ['page', 'pageSize', 'query', 'filters', 'sort'] : ['page', 'pageSize'];
    const extraInputKeys = Object.keys(input).filter(key => !allowedKeys.includes(key));
    if (extraInputKeys.length) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
    const projection = await getAppProjection();
    if (operationId === 'APP-001') {
      const { items } = projection;
      return {
        total: items.length,
        types: createFacet(items.map(item => item.typeName)),
        categories: createFacet(items.map(item => item.categoryName)),
        tags: createFacet(items.flatMap(item => item.keywords)),
        domains: createFacet(items.map(item => item.domainName)),
        scenes: createFacet(items.flatMap(item => item.sceneNames)),
        facetsVersion: 'feishu-app-facets.v1'
      };
    }
    const pageSize = input.pageSize == null ? 10 : input.pageSize;
    const page = input.page == null ? 1 : input.page;
    if (!Number.isInteger(pageSize) || ![10, 20, 50, 100].includes(pageSize)) {
      throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是 10、20、50 或 100', 400);
    }
    if (!Number.isInteger(page) || page < 1 || page > 100) {
      throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    }
    if (input.filters != null && (typeof input.filters !== 'object' || Array.isArray(input.filters))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '筛选条件必须是对象', 400);
    }
    const filters = input.filters || {};
    const allowedFilterKeys = ['type', 'category', 'domain', 'scene', 'status', 'owner'];
    if (Object.keys(filters).some(key => !allowedFilterKeys.includes(key))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的筛选字段', 400);
    }
    const query = valueToText(input.query).toLocaleLowerCase('zh-CN');
    let rows = projection.items.filter(item =>
      (!query || [item.name, item.summary, item.ownerName, item.responsibleOrgName, ...item.keywords].join(' ').toLocaleLowerCase('zh-CN').includes(query)) &&
      (!filters.type || item.typeCode === filters.type || item.typeName === filters.type) &&
      (!filters.category || item.categoryCode === filters.category || item.categoryName === filters.category) &&
      (!filters.domain || item.domainId === filters.domain || item.domainName === filters.domain) &&
      (!filters.scene || item.sceneIds.includes(filters.scene) || item.sceneNames.includes(filters.scene)) &&
      (!filters.status || item.status === filters.status) &&
      (!filters.owner || item.ownerId === filters.owner || item.ownerName === filters.owner)
    );
    const sort = input.sort || 'default';
    if (!['default', 'usage-desc', 'favorites-desc', 'name'].includes(sort)) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '排序方式不受支持', 400);
    }
    if (sort === 'usage-desc') rows = [...rows].sort((a, b) => b.usageCount - a.usageCount || a.appId.localeCompare(b.appId));
    if (sort === 'favorites-desc') rows = [...rows].sort((a, b) => b.favoriteCount - a.favoriteCount || a.appId.localeCompare(b.appId));
    if (sort === 'name') rows = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages,
      hasPrevious: safePage > 1, hasNext: safePage < totalPages, hasMore: safePage < totalPages,
      sort, filtersApplied: filters, facetsVersion: 'feishu-app-facets.v1'
    };
  }

  async function executeAnnouncement(operationId, input) {
    const allowedKeys = operationId === 'ANN-002' ? ['page', 'pageSize', 'query', 'filters', 'sort'] : ['page', 'pageSize'];
    if (Object.keys(input).some(key => !allowedKeys.includes(key))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
    }
    const projection = await getAnnouncementProjection();
    if (operationId === 'ANN-001') {
      const cutoff = now().getTime() - 7 * 24 * 60 * 60 * 1000;
      return {
        total: projection.items.length,
        weekNew: projection.items.filter(item => {
          const timestamp = Date.parse(item.publishedAt);
          return Number.isFinite(timestamp) && timestamp >= cutoff;
        }).length,
        categories: createFacet(projection.items.map(item => item.category)),
        statuses: createFacet(projection.items.map(item => item.status)),
        readStateAvailable: false,
        facetsVersion: 'feishu-announcement-facets.v1'
      };
    }
    const pageSize = input.pageSize == null ? 10 : input.pageSize;
    const page = input.page == null ? 1 : input.page;
    if (!Number.isInteger(pageSize) || ![10, 20, 50, 100].includes(pageSize)) {
      throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是 10、20、50 或 100', 400);
    }
    if (!Number.isInteger(page) || page < 1 || page > 100) {
      throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    }
    if (input.filters != null && (typeof input.filters !== 'object' || Array.isArray(input.filters))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '筛选条件必须是对象', 400);
    }
    const filters = input.filters || {};
    const allowedFilterKeys = ['category', 'status', 'startDate', 'endDate'];
    if (Object.keys(filters).some(key => !allowedFilterKeys.includes(key))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的筛选字段', 400);
    }
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw new FeishuProxyError('INVALID_DATE_RANGE', '开始日期不能晚于结束日期', 400);
    }
    const query = valueToText(input.query).toLocaleLowerCase('zh-CN');
    let rows = projection.items.filter(item => {
      const publishedDate = item.publishedAt.slice(0, 10);
      return (!query || [item.title, item.summary, item.category].join(' ').toLocaleLowerCase('zh-CN').includes(query))
        && (!filters.category || item.category === filters.category)
        && (!filters.status || item.status === filters.status)
        && (!filters.startDate || publishedDate >= filters.startDate)
        && (!filters.endDate || publishedDate <= filters.endDate);
    });
    const sort = input.sort || 'published-desc';
    if (!['default', 'published-desc', 'published-asc'].includes(sort)) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '排序方式不受支持', 400);
    }
    rows = [...rows].sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
      const compared = left.publishedAt.localeCompare(right.publishedAt, 'zh-CN');
      return sort === 'published-asc' ? compared : -compared;
    });
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages,
      hasPrevious: safePage > 1, hasNext: safePage < totalPages, hasMore: safePage < totalPages,
      sort, filtersApplied: filters, facetsVersion: 'feishu-announcement-facets.v1'
    };
  }

  async function executeTalent(operationId, input) {
    const allowedKeys = operationId === 'TAL-005' ? ['page', 'pageSize'] : ['page', 'pageSize', 'query', 'filters', 'sort'];
    if (Object.keys(input).some(key => !allowedKeys.includes(key))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
    }
    const projection = await getTalentProjection();
    if (operationId === 'TAL-005') {
      return {
        types: createFacet(projection.people.map(item => item.type)),
        levels: createFacet(projection.people.map(item => item.level)),
        specialties: createFacet(projection.people.flatMap(item => item.specialties)),
        statuses: createFacet(projection.people.map(item => item.status)),
        departments: createFacet(projection.people.map(item => item.departmentName)),
        facetsVersion: 'feishu-talent.v1'
      };
    }
    const pageSize = input.pageSize == null ? 10 : input.pageSize;
    const page = input.page == null ? 1 : input.page;
    if (!Number.isInteger(pageSize) || ![10, 20, 50, 100].includes(pageSize)) {
      throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是 10、20、50 或 100', 400);
    }
    if (!Number.isInteger(page) || page < 1 || page > 100) {
      throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    }
    if (input.filters != null && (typeof input.filters !== 'object' || Array.isArray(input.filters))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '筛选条件必须是对象', 400);
    }
    const filters = input.filters || {};
    const allowedFilters = operationId === 'TAL-001'
      ? ['type', 'level', 'specialty', 'status', 'department']
      : operationId === 'TAL-002' ? ['type', 'status', 'owner'] : ['project', 'status', 'phase'];
    if (Object.keys(filters).some(key => !allowedFilters.includes(key))) {
      throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的筛选字段', 400);
    }
    const source = operationId === 'TAL-001' ? projection.people : operationId === 'TAL-002' ? projection.projects : projection.progress;
    const query = valueToText(input.query).toLocaleLowerCase('zh-CN');
    let rows = source.filter(item => {
      const searchable = Object.values(item).flatMap(value => Array.isArray(value) ? value : [value]).join(' ').toLocaleLowerCase('zh-CN');
      if (query && !searchable.includes(query)) return false;
      if (operationId === 'TAL-001') return (!filters.type || item.type === filters.type)
        && (!filters.level || item.level === filters.level)
        && (!filters.specialty || item.specialties.includes(filters.specialty))
        && (!filters.status || item.status === filters.status)
        && (!filters.department || item.departmentId === filters.department || item.departmentName === filters.department);
      if (operationId === 'TAL-002') return (!filters.type || item.type === filters.type)
        && (!filters.status || item.status === filters.status)
        && (!filters.owner || item.ownerId === filters.owner || item.ownerName === filters.owner);
      return (!filters.project || item.projectId === filters.project || item.projectName === filters.project)
        && (!filters.status || item.status === filters.status)
        && (!filters.phase || item.phaseName === filters.phase);
    });
    const sort = input.sort || 'default';
    if (!['default', 'name'].includes(sort)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '排序方式不受支持', 400);
    if (sort === 'name') rows = [...rows].sort((left, right) => String(left.name || left.projectName).localeCompare(String(right.name || right.projectName), 'zh-CN'));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages,
      hasPrevious: safePage > 1, hasNext: safePage < totalPages, hasMore: safePage < totalPages,
      filtersApplied: filters, facetsVersion: 'feishu-talent.v1'
    };
  }

  function assertAllowedInput(input, allowedKeys) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求参数必须是对象', 400);
    if (Object.keys(input).some(key => !allowedKeys.includes(key))) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
  }

  function publicPage(input, defaultPageSize = 10) {
    const page = input.page == null ? 1 : Number(input.page);
    const pageSize = input.pageSize == null ? defaultPageSize : Number(input.pageSize);
    if (!Number.isInteger(page) || page < 1 || page > 100) throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    if (![10, 20, 50, 100].includes(pageSize)) throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是 10、20、50 或 100', 400);
    return { page, pageSize };
  }

  function paginatePublic(items, page, pageSize) {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    return {
      items: items.slice((safePage - 1) * pageSize, safePage * pageSize), total, page: safePage, pageSize,
      totalPages, hasPrevious: safePage > 1, hasNext: safePage < totalPages, hasMore: safePage < totalPages
    };
  }

  function courseFromRecord(record) {
    const fields = record?.fields || {};
    return {
      courseId: valueToText(fields['课程ID']) || String(record?.record_id || ''),
      title: valueToText(fields['培训标题']), categoryCode: valueToText(fields['分类']), categoryName: valueToText(fields['分类']),
      lecturerName: valueToText(fields['讲师姓名']), startAt: valueToText(fields['开始时间']), deliveryMode: valueToText(fields['格式']),
      summary: valueToText(fields['培训简介']), statusCode: valueToText(fields['状态']), statusName: valueToText(fields['状态']),
      registeredCount: valueToNumber(fields['已报名人数']), detailPath: `/training/${encodeURIComponent(valueToText(fields['课程ID']) || String(record?.record_id || ''))}`
    };
  }

  function certificationFromRecord(record) {
    const fields = record?.fields || {};
    const certificationId = valueToText(fields['认证编码']) || String(record?.record_id || '');
    const enabled = valueToBoolean(fields['启用']);
    return {
      certificationId, code: certificationId, name: valueToText(fields['认证名称']),
      directionCode: valueToText(fields['认证类型']), directionName: valueToText(fields['认证类型']), sceneCodes: [],
      level: '', provider: valueToText(fields['主办单位']), coverUrl: '', summary: valueToText(fields['认证说明']),
      registrationStartAt: '', registrationEndAt: '', examAt: '', statusCode: enabled ? 'ENABLED' : 'DISABLED',
      statusName: enabled ? '启用' : '停用', certifiedCount: 0, detailPath: `/certifications/${encodeURIComponent(certificationId)}`
    };
  }

  async function executePublicRead(operationId, input) {
    if (operationId === 'PTS-004') {
      assertAllowedInput(input, ['sourceCode', 'enabled', 'page', 'pageSize']);
      const { page, pageSize } = publicPage(input, 50);
      let rows = (await readAll('积分规则')).map(record => {
        const fields = record?.fields || {};
        return {
          ruleId: valueToText(fields['规则ID']) || String(record?.record_id || ''), ruleCode: valueToText(fields['规则编码']),
          ruleName: valueToText(fields['规则名称']), sourceCode: valueToText(fields['来源编码']), sourceName: valueToText(fields['来源编码']),
          triggerEvent: valueToText(fields['触发事件']), points: valueToNumber(fields['积分值']), direction: valueToText(fields['方向']),
          frequencyType: valueToText(fields['频率类型']), frequencyLimit: valueToNumber(fields['频率上限']), cycleLimit: valueToNumber(fields['周期上限']),
          validFrom: valueToText(fields['有效期开始']), validTo: valueToText(fields['有效期结束']), enabled: valueToBoolean(fields['启用']),
          description: '', conditions: valueToJsonObject(fields['条件JSON']), version: valueToNumber(fields['当前版本'])
        };
      }).filter(item => item.ruleId);
      if (input.sourceCode) rows = rows.filter(item => item.sourceCode === input.sourceCode);
      if (input.enabled !== undefined) rows = rows.filter(item => item.enabled === input.enabled);
      return paginatePublic(rows, page, pageSize);
    }

    if (operationId.startsWith('TRN-')) {
      const rows = (await readAll('培训课程')).map(courseFromRecord).filter(item => item.courseId && item.title);
      if (operationId === 'TRN-001') {
        assertAllowedInput(input, ['month', 'categoryCode', 'limit']);
        const limit = input.limit == null ? 6 : Number(input.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'limit 必须是 1 至 20 的整数', 400);
        const filtered = input.categoryCode ? rows.filter(item => item.categoryCode === input.categoryCode) : rows;
        const counts = new Map();
        for (const item of filtered) counts.set(item.categoryCode, (counts.get(item.categoryCode) || 0) + 1);
        return {
          stats: { courseCount: filtered.length, learnerCount: 0, monthNewCount: 0, registeredCount: filtered.reduce((sum, item) => sum + item.registeredCount, 0), completedCount: filtered.filter(item => /完成|结束/.test(item.statusCode)).length },
          featuredCourses: filtered.slice(0, limit), categories: [...counts].map(([code, count]) => ({ code, name: code, count, iconUrl: '' })),
          upcomingCourses: filtered.slice(0, limit)
        };
      }
      if (operationId === 'TRN-002') {
        assertAllowedInput(input, ['query', 'keyword', 'categoryCode', 'deliveryMode', 'lecturerId', 'registrationStatus', 'liveStatus', 'startAt', 'endAt', 'page', 'pageSize', 'sort']);
        const { page, pageSize } = publicPage(input);
        const keyword = valueToText(input.query || input.keyword).toLocaleLowerCase('zh-CN');
        const filtered = rows.filter(item => (!keyword || `${item.title} ${item.summary} ${item.lecturerName}`.toLocaleLowerCase('zh-CN').includes(keyword))
          && (!input.categoryCode || item.categoryCode === input.categoryCode)
          && (!input.deliveryMode || item.deliveryMode === input.deliveryMode));
        return paginatePublic(filtered, page, pageSize);
      }
      assertAllowedInput(input, ['courseId']);
      const courseId = valueToText(input.courseId);
      if (!courseId) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '课程详情必须提供 courseId', 400);
      const course = rows.find(item => item.courseId === courseId);
      if (!course) throw new FeishuProxyError('RESOURCE_NOT_FOUND', '课程不存在或不可见', 404);
      return { ...course, descriptionHtml: course.summary, agenda: [], materials: [], relatedApps: [], registrationStartAt: '', registrationEndAt: '', attendanceRule: '', pointRule: { enabled: false, points: 0, trigger: '' }, permissions: { canRegister: false, canCancel: false, canEnterLive: false, canDownload: false } };
    }

    if (operationId.startsWith('CER-')) {
      const rows = (await readAll('认证项目')).map(certificationFromRecord).filter(item => item.certificationId && item.name);
      if (operationId === 'CER-001') {
        assertAllowedInput(input, ['newsLimit', 'projectLimit']);
        const projectLimit = input.projectLimit == null ? 12 : Number(input.projectLimit);
        if (!Number.isInteger(projectLimit) || projectLimit < 1 || projectLimit > 50) throw new FeishuProxyError('INVALID_OPERATION_INPUT', 'projectLimit 必须是 1 至 50 的整数', 400);
        const counts = new Map();
        for (const item of rows) counts.set(item.directionCode, (counts.get(item.directionCode) || 0) + 1);
        return {
          hero: { title: '数字化认证', subtitle: '', imageUrl: '', primaryAction: '', secondaryAction: '' },
          stats: { projectCount: rows.length, certifiedCount: 0, lecturerCount: 0 },
          directions: [...counts].map(([code, count]) => ({ code, name: code, iconUrl: '', count })), sceneTags: [], news: [],
          projects: rows.slice(0, projectLimit), contact: { email: '', phone: '', serviceHours: '' }
        };
      }
      assertAllowedInput(input, ['query', 'keyword', 'directionCode', 'sceneCode', 'level', 'status', 'page', 'pageSize']);
      const { page, pageSize } = publicPage(input);
      const keyword = valueToText(input.query || input.keyword).toLocaleLowerCase('zh-CN');
      const filtered = rows.filter(item => (!keyword || `${item.name} ${item.summary}`.toLocaleLowerCase('zh-CN').includes(keyword))
        && (!input.directionCode || item.directionCode === input.directionCode)
        && (!input.status || item.statusCode === input.status));
      return paginatePublic(filtered, page, pageSize);
    }

    if (operationId === 'OPS-003') {
      assertAllowedInput(input, ['domain', 'enabled', 'page', 'pageSize']);
      const { page, pageSize } = publicPage(input);
      let rows = (await readAll('统计指标定义')).map(record => {
        const fields = record?.fields || {};
        return {
          metricCode: valueToText(fields['指标编码']) || String(record?.record_id || ''), metricName: valueToText(fields['指标名称']),
          description: valueToText(fields['指标说明']), domain: valueToText(fields['指标域']), aggregation: valueToText(fields['聚合方式']),
          expression: valueToText(fields['计算表达式']), unit: valueToText(fields['单位']), dimensions: valueToList(fields['支持维度']),
          definitionVersion: valueToText(fields['口径版本']), enabled: valueToBoolean(fields['启用']), effectiveAt: valueToText(fields['生效时间'])
        };
      }).filter(item => item.metricCode);
      if (input.domain) rows = rows.filter(item => item.domain === input.domain);
      if (input.enabled !== undefined) rows = rows.filter(item => item.enabled === input.enabled);
      return paginatePublic(rows, page, pageSize);
    }

    assertAllowedInput(input, ['query', 'keyword', 'materialType', 'appTypeCode', 'domainId', 'categoryId']);
    const [categoryRows, materialRows] = await Promise.all([readAll('素材分类'), readAll('素材中心')]);
    const keyword = valueToText(input.query || input.keyword).toLocaleLowerCase('zh-CN');
    const visibleMaterials = materialRows.map(record => record?.fields || {}).filter(fields => (!keyword || `${valueToText(fields['素材名称'])} ${valueToText(fields['素材摘要'])}`.toLocaleLowerCase('zh-CN').includes(keyword))
      && (!input.materialType || valueToText(fields['素材类型']) === input.materialType)
      && (!input.categoryId || valueToText(fields['分类ID']) === input.categoryId));
    const typeCounts = new Map();
    for (const fields of visibleMaterials) {
      const type = valueToText(fields['素材类型']);
      if (type) typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }
    const categoryCounts = new Map();
    for (const fields of visibleMaterials) {
      const categoryId = valueToText(fields['分类ID']);
      if (categoryId) categoryCounts.set(categoryId, (categoryCounts.get(categoryId) || 0) + 1);
    }
    return {
      materialTypes: [...typeCounts].map(([code, count]) => ({ code, name: code, count })),
      categories: categoryRows.map(record => {
        const fields = record?.fields || {};
        const categoryId = valueToText(fields['分类编码']) || String(record?.record_id || '');
        return { categoryId, categoryCode: categoryId, categoryName: valueToText(fields['分类名称']), parentId: valueToText(fields['父级ID']), sortOrder: valueToNumber(fields['排序']), count: categoryCounts.get(categoryId) || 0 };
      }).filter(item => item.categoryId),
      appTypes: [], domains: [], total: visibleMaterials.length
    };
  }

  async function execute(operationId, input = {}) {
    const operation = getOperation(operationId);
    if (!operation) throw new FeishuProxyError('UNKNOWN_OPERATION', '接口不在受控操作清单中', 404);
    if (operation.access === 'write') {
      throw new FeishuProxyError('WRITE_OPERATION_DISABLED', '当前仅允许飞书只读联调', 403);
    }
    const plan = READ_PLANS[operationId];
    if (!plan) throw new FeishuProxyError('READ_OPERATION_NOT_ENABLED', '该只读接口尚未完成字段合同核验', 503);
    if (plan.kind === 'app-facets' || plan.kind === 'app-list' || plan.kind?.startsWith('announcement') || plan.kind?.startsWith('talent') || plan.kind?.startsWith('contact') || plan.kind === 'public-read') {
      const data = plan.kind.startsWith('announcement')
        ? await executeAnnouncement(operationId, input)
        : plan.kind.startsWith('talent') ? await executeTalent(operationId, input)
        : plan.kind.startsWith('contact') ? await executeContact(operationId, input)
        : plan.kind === 'public-read' ? await executePublicRead(operationId, input)
        : await executeApp(operationId, input);
      return {
        code: 'OK', data, traceId: traceIdFactory(), schemaVersion: plan.kind === 'public-read' ? 'feishu-public-read.v1' : 'feishu-read-only.v1',
        sourceUpdatedAt: now().toISOString(), isComplete: true, dataStale: false
      };
    }
    const extraInputKeys = Object.keys(input).filter(key => !['page', 'pageSize'].includes(key));
    if (extraInputKeys.length) throw new FeishuProxyError('INVALID_OPERATION_INPUT', '请求包含未允许的输入字段', 400);
    const table = identifierContract.byName.get(plan.tableName);
    if (!table) throw new FeishuProxyError('IDENTIFIER_CONTRACT_MISSING', '飞书表标识契约缺失', 503);
    const pageSize = input.pageSize == null ? 10 : input.pageSize;
    if (!Number.isInteger(pageSize)) throw new FeishuProxyError('INVALID_PAGE_SIZE', '页容量必须是整数', 400);
    const page = input.page == null ? 1 : input.page;
    if (!Number.isInteger(page) || page < 1 || page > 100) {
      throw new FeishuProxyError('INVALID_PAGE', '页码必须是 1 至 100 的整数', 400);
    }
    let pageToken = '';
    let result;
    for (let currentPage = 1; currentPage <= page; currentPage += 1) {
      result = await client.listRecords(table.tableId, {
        viewId: table.views[0]?.viewId,
        pageSize,
        pageToken,
        fieldNames: table.fields.map(field => field.name)
      });
      if (currentPage === page) break;
      if (!result.hasMore || !result.nextPageToken) {
        result = { items: [], total: result.total, hasMore: false, nextPageToken: '' };
        break;
      }
      pageToken = result.nextPageToken;
    }
    const items = result.items.map(record => safeRecord(record, plan)).filter(record => record.id);
    return {
      code: 'OK',
      data: { items, total: result.total, page, pageSize, hasMore: result.hasMore },
      traceId: traceIdFactory(),
      schemaVersion: 'feishu-read-only.v1',
      sourceUpdatedAt: now().toISOString(),
      isComplete: !result.hasMore,
      dataStale: false
    };
  }

  return Object.freeze({ execute });
}
