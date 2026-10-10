const text = value => String(value ?? '').trim();

function isOpaquePersonReference(value) {
  const candidate = text(value);
  return /^(?:ou|on|oc|cli)[_-][A-Za-z0-9_-]+$/i.test(candidate);
}

function isOpaqueOrganizationReference(value) {
  return /^od[-_][A-Za-z0-9_-]+$/i.test(text(value));
}

function referenceId(detail, idField, nameField, kind) {
  const explicitId = text(detail?.[idField]);
  if (explicitId) return explicitId;
  const currentName = text(detail?.[nameField]);
  const opaque = kind === 'organization'
    ? isOpaqueOrganizationReference(currentName)
    : isOpaquePersonReference(currentName);
  return opaque ? currentName : '';
}

function needsResolution(detail, idField, nameField, kind) {
  const currentName = text(detail?.[nameField]);
  const id = referenceId(detail, idField, nameField, kind);
  if (!id) return false;
  if (!currentName || currentName === id) return true;
  return kind === 'organization'
    ? isOpaqueOrganizationReference(currentName)
    : isOpaquePersonReference(currentName);
}

function flattenOrganizations(items, names = new Map()) {
  for (const item of Array.isArray(items) ? items : []) {
    const id = text(item?.orgId || item?.departmentId);
    const name = text(item?.orgName || item?.departmentName);
    if (id && name) names.set(id, name);
    flattenOrganizations(item?.children, names);
  }
  return names;
}

function exactPerson(items, identifier) {
  const expected = text(identifier);
  if (!expected) return null;
  return (Array.isArray(items) ? items : []).find(item =>
    [item?.userId, item?.employeeNo].some(value => text(value) === expected)
  ) || null;
}

async function resolvePersonName(execute, identifier) {
  const id = text(identifier);
  if (!id) return '';
  const preferredKey = /^(?:ou|on|oc)[_-]/i.test(id) ? 'userId' : 'employeeNo';
  const fallbackKey = preferredKey === 'userId' ? 'employeeNo' : 'userId';
  for (const key of [preferredKey, fallbackKey]) {
    const response = await execute('COM-004', { [key]: id, enabled: true, page: 1, pageSize: 10, sort: 'name,asc' });
    const match = exactPerson(response?.data?.items, id);
    const name = text(match?.displayName);
    if (name) return name;
  }
  return '';
}

export function projectAppDetailDirectoryNames(detail = {}, names = {}) {
  const projected = { ...detail };
  for (const [nameField, idField, kind] of [
    ['ownerName', 'ownerId', 'person'],
    ['developerName', 'developerId', 'person'],
    ['responsibleOrgName', 'responsibleOrgId', 'organization'],
    ['developerOrgName', 'developerOrgId', 'organization'],
  ]) {
    const currentName = text(detail?.[nameField]);
    const resolvedName = text(names?.[nameField]);
    projected[nameField] = needsResolution(detail, idField, nameField, kind)
      ? resolvedName
      : currentName || resolvedName;
  }
  return projected;
}

export async function resolveAppDetailDirectoryNames(detail = {}, execute) {
  if (typeof execute !== 'function') return {};
  const result = {};
  const personFields = [
    ['ownerName', 'ownerId'],
    ['developerName', 'developerId'],
  ];
  const organizationFields = [
    ['responsibleOrgName', 'responsibleOrgId'],
    ['developerOrgName', 'developerOrgId'],
  ];

  const personIds = new Map();
  for (const [nameField, idField] of personFields) {
    if (!needsResolution(detail, idField, nameField, 'person')) continue;
    const id = referenceId(detail, idField, nameField, 'person');
    if (id) personIds.set(nameField, id);
  }
  const uniquePersonIds = [...new Set(personIds.values())];
  const personEntries = await Promise.all(uniquePersonIds.map(async id => {
    try {
      return [id, await resolvePersonName(execute, id)];
    } catch {
      return [id, ''];
    }
  }));
  const personNames = new Map(personEntries);
  for (const [nameField, id] of personIds) result[nameField] = personNames.get(id) || '';

  const organizationIds = new Map();
  for (const [nameField, idField] of organizationFields) {
    if (!needsResolution(detail, idField, nameField, 'organization')) continue;
    const id = referenceId(detail, idField, nameField, 'organization');
    if (id) organizationIds.set(nameField, id);
  }
  if (organizationIds.size) {
    try {
      const response = await execute('COM-003', { includeUsers: false, maxDepth: 20 });
      const organizationNames = flattenOrganizations(response?.data?.items);
      for (const [nameField, id] of organizationIds) result[nameField] = organizationNames.get(id) || '';
    } catch {
      for (const [nameField] of organizationIds) result[nameField] = '';
    }
  }

  return result;
}
