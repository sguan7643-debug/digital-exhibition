import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const applyPage = await readFile(new URL('../src/pages/OnboardingApplyPage.vue', import.meta.url), 'utf8');
const contracts = await readFile(new URL('../src/integration/operation-contract-schemas.js', import.meta.url), 'utf8');

const selfContactCalls = [...applyPage.matchAll(/operationExecutor\((?:"|')COM-004(?:"|'),\s*\{([^}]*includeContact:\s*true[^}]*)\}/g)]
  .map(match => match[1]);

assert.ok(selfContactCalls.length >= 2, '申请页必须保留当前用户和接入人的联系方式读取');
assert.ok(
  selfContactCalls.every(input => !/\benabled\s*:/.test(input)),
  'COM-004 includeContact=true 的受限请求不得发送后端未允许的 enabled 字段'
);

assert.match(
  contracts,
  /mobile:\s*nullableText,\s*email:\s*nullableText,\s*mobileMasked:\s*nullableText,\s*emailMasked:\s*nullableText/,
  '联系人字段必须接受后端正式合同返回的 null'
);

console.log('onboarding live contract compatibility passed');
