import assert from 'node:assert/strict';
import { createFeishuOnboardingReferenceResolver } from '../server/feishu-onboarding-reference-resolver.mjs';

const calls = [];
const resolver = createFeishuOnboardingReferenceResolver({
  readService: {
    async execute(operationId, input) {
      calls.push([operationId, input]);
      return { data: { itemsByType: {
        APPLICATION_TYPE: [{ value: 'T010', label: '自定义应用' }],
        BUSINESS_DOMAIN: [{ value: 'BD010', label: '自定义业务域' }]
      } } };
    }
  },
  client: {
    async getContactUser(userId) {
      calls.push(['user', userId]);
      return { userId, displayName: '宋全跃' };
    }
  }
});

const resolved = await resolver.resolve({ type: 'T010', domain: 'BD010', users: '4gg8ad25' }, { identity: { userId: 'owner' } });
assert.deepEqual(resolved, {
  applicationTypeName: '自定义应用',
  businessDomainName: '自定义业务域',
  authorizedUserName: '宋全跃'
});
assert.equal(calls.filter(item => item[0] === 'COM-005').length, 1);
assert.deepEqual(calls.find(item => item[0] === 'user'), ['user', '4gg8ad25']);

const fallback = await resolver.resolve({ type: 'T005', domain: 'BD005', users: '', authorizedUserName: '' });
assert.equal(fallback.applicationTypeName, '海能Work应用');
assert.equal(fallback.businessDomainName, '数字化办公');

console.log('onboarding status reference codes resolve to Chinese labels and Feishu user names');
