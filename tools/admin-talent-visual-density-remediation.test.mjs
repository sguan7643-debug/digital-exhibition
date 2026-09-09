import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../src/pages/', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');

for (const [file, marker] of [
  ['AdminPage.vue', /\.config-grid > section,\s*\.log-panel\s*\{[\s\S]*?padding:\s*17px;[\s\S]*?border:\s*1px solid #d7e2ec/],
  ['CertificationPage.vue', /\.news,\s*\.learning-card,\s*\.cert-info > section\s*\{[\s\S]*?padding:\s*18px;[\s\S]*?border:\s*1px solid #d8e3ed/],
  ['TalentPeoplePage.vue', /\.talent-body > main\s*\{[\s\S]*?border:\s*1px solid #dce5ef/],
  ['TalentProjectsPage.vue', /\.talent-projects :is\([^}]+\)\{border-color:#f4faff\}/],
  ['TalentProgressPage.vue', /\.progress-page>section\{margin-top:12px;padding:20px;background:#fff;border:1px solid #f4faff/],
]) {
  assert.match(read(file), marker, `${file} 必须使用新版 UI 的低对比边框层级`);
}

console.log('后台、认证与人才页 fresh 低对比边框视觉合同通过');
