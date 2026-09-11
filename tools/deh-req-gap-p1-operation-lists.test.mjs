import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const app=read('src/App.vue');const announcements=read('src/pages/AnnouncementAdminPage.vue');const apps=read('src/pages/AppAdminPage.vue');
for(const [tag,name] of [['announcement-admin-page','announcement admin'],['app-admin-page','app admin']]){
  assert.match(app,new RegExp(`<${tag}[^>]*:integration-data="integrationEnvelope\\.data"[^>]*:integration-state="integrationEnvelope\\.state"`,'s'),`${name} must receive integration data/state`);
}
for(const [source,operation] of [[announcements,'OAN-001'],[announcements,'OAN-002'],[apps,'OAP-001'],[apps,'OAP-002'],[apps,'OAP-011']])assert.match(source,new RegExp(`\\['${operation}'\\]`));
for(const source of [announcements,apps]){
  assert.match(source,/integrationState:\s*\{\s*type:\s*String,\s*default:\s*['"]mock['"]/);
  assert.match(source,/authentication-required/);assert.match(source,/permission-denied/);assert.match(source,/remoteMode/);
  assert.match(source,/<caption/,'remote admin table must keep a perceptible caption');
  assert.match(source,/:disabled="remoteMode"/,'remote writes must be disabled');
}
assert.match(announcements,/announcementId\|\|item\.id/);assert.match(apps,/appId\|\|item\.applicationId\|\|item\.id/);
console.log('P1 operation announcement/app remote-only list contracts passed');
