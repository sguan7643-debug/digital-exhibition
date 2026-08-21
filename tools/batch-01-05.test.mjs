import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/App.vue');
const shell = read('src/components/ExhibitionShell.vue');
const files = {
  '02': ['src/pages/MessagesPage.vue', '8181F60BE17D8B4068A4B6432850FE5EB9489E954D379FD5B236A426F07B9F22'],
  '03': ['src/pages/FavoritesPage.vue', '9B259ED9F99029ECB68A1F2FB3EB8E745FF23692BC53CFFBD5D6A46008CEAE1A'],
  '04': ['src/pages/ProfilePage.vue', 'F08DE51669B152D46224A0031945CFFF85969E40D7416D93849B6E1CDD35FA9A'],
  '05': ['src/pages/AnnouncementsPage.vue', '58A43229752CC4A5210A2846B88DB267A622543AA8F7F034CDA42BC2041F4F8C']
};

for (const [id, [path, sha]] of Object.entries(files)) {
  const source = read(path);
  assert.ok(source.includes(sha), `${id} 缺少参考 SHA`);
  assert.ok(app.includes(`page.id === '${id}'`), `${id} 未绑定独立组件`);
  assert.match(source, /<h1/);
  assert.match(source, /:focus-visible/);
  assert.doesNotMatch(source, /[●◆■▲✦⬢▣◇]/u);
}

for (const label of ['首页工作台', '素材中心', '人才管理', '应用中心', '培训课堂', '积分中心', '数字化认证', '运营管理', '公告通知', '后台管理']) {
  assert.ok(shell.includes(`/assets/nav-${label}.png`), `共享壳缺少同源图标：${label}`);
}
assert.doesNotMatch(shell, /[●◆■▲✦⬢▣◇]/u);

console.log('01–05 独立页面、参考 SHA 与同源图标合同测试通过');
