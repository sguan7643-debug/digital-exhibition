import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../src/pages/', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');

for (const [file, marker] of [
  ['AdminPage.vue', '.backend-page :is(.config-grid section,.log-panel,th,td){border-color:#f4faff}'],
  ['CertificationPage.vue', '.cert-page :is(.cert-hero,.ticker,.cert-layout>aside,.cert-layout main>section,.cert-info>section,.cert-tags button,.cert-layout>aside>input){border-color:#f4faff}'],
  ['TalentPeoplePage.vue', '.talent-people :is(.talent-body>main,.talent-body>aside,.talent-body form input,.talent-body form select,.talent-body form button,.talent-body th,.talent-body td,.talent-body footer button,.talent-body>aside header){border-color:#f4faff}'],
  ['TalentProjectsPage.vue', '.talent-projects :is(.projects-body>main,.projects-body>aside,.projects-body main>form input,.projects-body main>form select,.projects-body main>form button,.projects-body th,.projects-body td,.projects-body section>footer button,.projects-body>aside>header,.projects-body>aside input,.projects-body>aside select,.projects-body>aside textarea,.projects-body>aside footer button){border-color:#f4faff}'],
  ['TalentProgressPage.vue', ':is(.progress-page>section,.progress-page form input,.progress-page form select,.progress-page form button,.progress-table,.progress-page th,.progress-page td,.progress-table button){border-color:#f4faff}'],
]) {
  assert.ok(read(file).includes(marker), `${file} 必须使用 fresh 模拟证明的低对比边框层级`);
}

console.log('后台、认证与人才页 fresh 低对比边框视觉合同通过');
