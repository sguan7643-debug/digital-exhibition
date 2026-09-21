import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const profile = readFileSync(new URL('../src/pages/ProfilePage.vue', import.meta.url), 'utf8');
const live = readFileSync(new URL('../src/components/ProfileLiveSections.vue', import.meta.url), 'utf8');

assert.match(app, /<profile-page[^>]*:integration-data="integrationEnvelope\.data"[^>]*:integration-state="integrationEnvelope\.state"[^>]*:operation-executor="executeReadOperation"/s);
assert.match(app, /<profile-live-sections[^>]*:integration-data="integrationEnvelope\.data"[^>]*:integration-state="integrationEnvelope\.state"/s);
assert.match(profile, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*['"]mock['"]/);
assert.match(profile, /const remoteMode\s*=\s*computed\(\(\)\s*=>\s*props\.integrationState\s*!==\s*['"]mock['"]\)/);
assert.match(profile, /\['WB-003'\]/);
assert.match(profile, /\['WB-004'\]/);
assert.match(profile, /safeLocalPath/);
assert.match(profile, /authentication-required/);
assert.match(profile, /验证账号标识/,'个人中心必须向已授权用户展示可用于只读验证的 user_id');
assert.match(profile, /copyVerificationUserId/,'个人中心必须提供 user_id 复制动作');
assert.match(profile, /navigator\.clipboard\.writeText/,'复制动作必须使用浏览器剪贴板，不得发送身份到第三方');
assert.match(profile, /\/api\/v1\/auth\/feishu\/session/, '个人中心必须独立读取已授权会话的安全身份标识');
assert.match(profile, /sessionIdentity/, '个人聚合读取失败时仍必须保留会话身份标识');
assert.match(profile, /v-if="remoteMode&&sessionChecked"/, '空态页面也必须展示已授权身份的验证标识');
assert.doesNotMatch(profile, /remoteMode\.value\s*\?[^:]+:\s*stats/, 'remote states must not fall back to mock stats');
assert.match(live, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*['"]mock['"]/);
assert.match(live, /authentication-required|permission-denied/);

console.log('DEH profile governed remote projection contract passed.');
