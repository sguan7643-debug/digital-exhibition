import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../src/pages/', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');

for (const [file, marker] of [
  ['AdminPage.vue', '.config-grid>section,.log-panel{min-width:0;padding:18px;background:#fff;border:1px solid #dce5ef'],
  ['CertificationPage.vue', '.news,.learning-card,.cert-info>section{padding:18px;background:#fff;border:1px solid #d8e3ed'],
  ['TalentPeoplePage.vue', '.talent-people :is(.talent-body>main,.talent-body>aside,.talent-body form input,.talent-body form select,.talent-body form button,.talent-body th,.talent-body td,.talent-body footer button,.talent-body>aside header){border-color:#f4faff}'],
  ['TalentProjectsPage.vue', '.talent-projects :is(.projects-body>main,.projects-body>aside,.projects-body main>form input,.projects-body main>form select,.projects-body main>form button,.projects-body th,.projects-body td,.projects-body section>footer button,.projects-body>aside>header,.projects-body>aside input,.projects-body>aside select,.projects-body>aside textarea,.projects-body>aside footer button){border-color:#f4faff}'],
  ['TalentProgressPage.vue', '.progress-page>section{margin-top:12px;padding:20px;background:#fff;border:1px solid #f4faff'],
]) {
  assert.ok(read(file).includes(marker), `${file} 必须使用 fresh 模拟证明的低对比边框层级`);
}

console.log('后台、认证与人才页 fresh 低对比边框视觉合同通过');
