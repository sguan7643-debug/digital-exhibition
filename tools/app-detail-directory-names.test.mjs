import assert from 'node:assert/strict';
import {
  projectAppDetailDirectoryNames,
  resolveAppDetailDirectoryNames,
} from '../src/integration/app-detail-directory-names.js';

const calls = [];
const execute = async (operationId, input) => {
  calls.push([operationId, input]);
  if (operationId === 'COM-003') {
    return { data: { items: [{
      orgId: 'od-root', orgName: '集团总部', children: [
        { orgId: 'od-b9312400969e4ceef3bf4e69971eb54d', orgName: '董事长办公室', children: [] },
        { orgId: 'od-0501f663a772c39b552501d91acab25d', orgName: '信息化部门', children: [] },
      ],
    }] } };
  }
  const id = input.employeeNo || input.userId;
  const names = { '4gg8ad25': '宋全跃', '3d8egf55': '关胜' };
  return { data: { items: names[id] ? [{ userId: `ou-${id}`, employeeNo: id, displayName: names[id] }] : [] } };
};

const detail = {
  appId: 'APP0076',
  ownerId: '4gg8ad25', ownerName: '4gg8ad25',
  developerId: '3d8egf55', developerName: '3d8egf55',
  responsibleOrgId: 'od-b9312400969e4ceef3bf4e69971eb54d', responsibleOrgName: 'od-b9312400969e4ceef3bf4e69971eb54d',
  developerOrgId: 'od-0501f663a772c39b552501d91acab25d', developerOrgName: 'od-0501f663a772c39b552501d91acab25d',
};

assert.deepEqual(projectAppDetailDirectoryNames(detail, {}), {
  ...detail,
  ownerName: '', developerName: '', responsibleOrgName: '', developerOrgName: '',
}, 'unresolved identifiers must not be rendered as user-facing names');

const names = await resolveAppDetailDirectoryNames(detail, execute);
assert.deepEqual(names, {
  ownerName: '宋全跃', developerName: '关胜',
  responsibleOrgName: '董事长办公室', developerOrgName: '信息化部门',
});
assert.deepEqual(projectAppDetailDirectoryNames(detail, names), {
  ...detail,
  ownerName: '宋全跃', developerName: '关胜',
  responsibleOrgName: '董事长办公室', developerOrgName: '信息化部门',
});
assert.equal(calls.filter(([operationId]) => operationId === 'COM-003').length, 1, 'department tree should be loaded once');
assert.equal(calls.filter(([operationId]) => operationId === 'COM-004').length, 2, 'each unique account should be resolved once');

const alreadyNamed = {
  appId: 'APP0077', ownerId: 'ou-owner', ownerName: '张三丰',
  developerId: 'ou-developer', developerName: '李四强',
  responsibleOrgId: 'od-owner', responsibleOrgName: '物资采购中心',
  developerOrgId: 'od-developer', developerOrgName: '数字智能部',
};
assert.deepEqual(await resolveAppDetailDirectoryNames(alreadyNamed, execute), {}, 'real names should not trigger redundant directory requests');
assert.deepEqual(projectAppDetailDirectoryNames(alreadyNamed, {}), alreadyNamed, 'real names must be preserved');

console.log('应用详情人员与部门名称解析通过');
