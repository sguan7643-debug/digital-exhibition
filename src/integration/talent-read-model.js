export function mapRemoteTalentPerson(item) {
  const specialties = Array.isArray(item.specialties) ? item.specialties : [];
  return Object.freeze({
    id: item.talentId || item.id, userId: item.userId, name: item.name, employeeNo: item.employeeNo,
    type: item.type, level: item.level, specialties, status: item.status,
    department: item.departmentName, departmentId: item.departmentId,
    age: '—', inPool: item.status === '在库' ? '是' : item.status === '不在库' ? '否' : item.status || '—',
    domain: specialties.join('、') || '—', office: '—', tags: specialties.join(' ') || '—',
    direction: '—', start: '—', end: '—'
  });
}

export function mapRemoteTalentProject(item) {
  return Object.freeze({
    id: item.projectId || item.id, name: item.name, type: item.type, manager: item.ownerName,
    managerId: item.ownerId, progress: item.status, status: item.status,
    start: item.startDate, end: item.endDate
  });
}

export function mapRemoteTalentProgress(item) {
  return Object.freeze([
    item.projectId, item.projectName, item.phaseName, item.status, item.updatedAt
  ]);
}
