import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/pages/AnnouncementsPage.vue', import.meta.url), 'utf8');

assert.match(appSource, /<announcements-page[^>]*:integration-data="integrationEnvelope\.data"/s, 'App must pass integration data into announcements page');
assert.match(appSource, /<announcements-page[^>]*:integration-state="integrationEnvelope\.state"/s, 'App must pass integration state into announcements page');
assert.match(source, /integrationData:\s*\{\s*type:\s*Object,\s*default:\s*null\s*\}/, 'announcements page must declare integrationData prop');
assert.match(source, /integrationState:\s*\{\s*type:\s*String,\s*default:\s*"loading"\s*\}/, 'announcements page must declare a real-loading integration state');
assert.match(source, /mapRemoteAnnouncement/, 'announcements page must use the verified ANN read-model projection');
assert.match(source, /\['ANN-001'\]/, 'announcements page must consume ANN-001 statistics/facets');
assert.match(source, /\['ANN-002'\]/, 'announcements page must consume ANN-002 list');
assert.match(source, /const currentAnnouncements = computed\(\(\) => remoteAnnouncements\.value\)/, 'announcements must come only from real ANN-002 data');
assert.doesNotMatch(source, /ANNOUNCEMENT_FIXTURES/, 'business announcement fixtures must not enter the page');
assert.match(source, /const unreadStat = computed\(\(\) =>\s*remoteStats\.value\.unread/s, 'unread statistics must come from ANN-001, not local read mutations');
assert.match(source, /const weekNewStat = computed\(\(\) =>\s*remoteStats\.value\.weekNew/s, 'week-new statistics must come from ANN-001');
assert.match(source, /remoteState\.value === "error" \|\| remoteState\.value === "authentication-required"/, 'remote error/auth must show a true failure boundary');
assert.match(source, /remoteState\.value === "empty"/, 'remote empty must show a true empty boundary');
assert.match(source, /function markAllRead\(\)[\s\S]*真实已读写入暂未开放/, 'mark-all-read must not fake server write success');
assert.doesNotMatch(source, /controller\.markRead\(item\.id\)/, 'detail click must not fake local read success');

console.log('P1 announcements remote-only ANN projection contract passed');
