import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8');
const source=readFileSync(new URL('../src/pages/NoticeDetailPage.vue',import.meta.url),'utf8');
assert.match(app,/<notice-detail-page[^>]*:integration-data="integrationEnvelope\.data"[^>]*:integration-state="integrationEnvelope\.state"[^>]*:operation-executor="executeReadOperation"/s);
assert.match(source,/integrationState:\s*\{\s*type:\s*String,\s*default:\s*['"]mock['"]/);
assert.match(source,/\['ANN-003'\]/);assert.match(source,/\['ANN-005'\]/);
assert.match(source,/operationExecutor\('COM-008'/);
assert.match(source,/mode:'DOWNLOAD'/);assert.match(source,/disposition:'ATTACHMENT'/);assert.match(source,/fileNameOverride/);
assert.match(source,/contentText/);assert.doesNotMatch(source,/v-html\s*=|innerHTML/,'remote announcement must prefer inert text');
assert.match(source,/safeApprovedRoute/);assert.match(source,/sameOriginDownloadUrl/);
assert.match(source,/authentication-required/);assert.match(source,/permission-denied/);
console.log('P1 announcement detail remote-only projection contract passed');
