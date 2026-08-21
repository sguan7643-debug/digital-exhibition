import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/App.vue');
const files = {
  '06': ['src/pages/NoticeDetailPage.vue', 'A9827301EF6051E8B9B963B07F7073F6AB7AE4BFD21BAC97FDDA67A08FF3D78F'],
  '07': ['src/pages/AppsPage.vue', 'E11BA453D013006EE96D19695AC3770A794DEF4DB32B71D993A4158F7BC23ADD'],
  '08': ['src/pages/ToolDetailPage.vue', '35ACE981294AF359A243AFB1F53C29590BA124742F8EEF3BBE7152F4984F7A69'],
  '09': ['src/pages/HainengWorkDetailPage.vue', '21D2FCC06638F323E7824176C53BB72DDE1050790E6B4E457D54CD2D7398431C'],
  '10': ['src/pages/ReportDetailPage.vue', 'A7A5B61527C5A2D7C83ACD2C769AA56FD038B252EDE4D1A46A91D1396F2113B1'],
  '11': ['src/pages/DashboardDetailPage.vue', '3D66270477C159EB9097CF74C904858A9158D9C9005A90C372B284AFB8980C43'],
  '12': ['src/pages/DatasetDetailPage.vue', '7260427E1B5E85ECDFE37D52D6A88439178542503EC8E5E6FC5D679701633C97'],
  '13': ['src/pages/MetricDetailPage.vue', '48C41CBB2DF433C9680DD955A4777FA436BBFF6E094D56A3B5E6E0E48B01690B'],
  '14': ['src/pages/AiDetailPage.vue', '2A55B1987EA239C0D5FB184B7CAECF9F39FFB5AB7C505FB669746356A2820EC7'],
  '15': ['src/pages/EadDetailPage.vue', '8090BF0B8BFDCE7981D32F7C6B6335230D9F9508BF4549E716C10A2A4382D0CC']
};

for (const [id, [path, sha]] of Object.entries(files)) {
  const source = read(path);
  assert.ok(source.includes(sha), `${id} 缺少参考 SHA`);
  assert.ok(app.includes(`page.id === '${id}'`), `${id} 未绑定独立组件`);
  assert.match(source, /<h1|<h2/);
  assert.match(source, /:focus-visible/);
  assert.doesNotMatch(source, /[●◆■▲✦⬢▣◇]/u);
}

for (const id of Object.keys(files)) {
  assert.match(app, new RegExp(`<[a-z-]+-page v-else-if="page\\.id === '${id}'`));
}

console.log('06–15 独立页面、参考 SHA、语义与同源资产合同测试通过');
