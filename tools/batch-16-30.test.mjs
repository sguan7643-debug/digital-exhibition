import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/App.vue');
const files = {
  '16':['src/pages/RpaDetailPage.vue','C66930E5C44E4ADAEB81872C7E64E8D41DC17A5BB46256314E404A9177C2923A'],
  '17':['src/pages/OnboardingPage.vue','FC7F33ED038DD52F20892D1C4A7F58FAFF57FB54658B06443A1A885B1EB86F68'],
  '18':['src/pages/PointsPage.vue','A93E46949EBAF8861FFC6314A7AB2B05D6D7C99E60CC6B39FF8C925BF56A74E9'],
  '19':['src/pages/PointsDetailsPage.vue','82F80F3AB4A821165E6B14344C809B5E102CC7DD8013DD69B7F7F39BF9900F34'],
  '20':['src/pages/TrainingPage.vue','68508151B1490F117074C44F464732A6986DAE68DDE5C23296DB0529C2C12E86'],
  '21':['src/pages/OperationsPage.vue','5F2DC6F56EF909A2EBADED1184353856CB105F2BA33B5BEFD7B8AF00AA342E11'],
  '22':['src/pages/AnnouncementAdminPage.vue','07B0623CB569C7829B490B85A65007D2773C4AE2ADB3ADE4B6089279F3D248FB'],
  '23':['src/pages/AnnouncementEditorPage.vue','5ADAECAADC46CCC242A570AEE5037A045FCECF39CBDA7D091283CE288DF9BE4F'],
  '24':['src/pages/AppAdminPage.vue','D3996593EAF90E612EA8874CDD41283565876ACDA3A9BD774343C0C469903795'],
  '25':['src/pages/AppEditorPage.vue','A938145F4215B6AAC18DC370228DE182C9AAB531152746C6DA9EC27D82C3A864'],
  '26':['src/pages/AdminPage.vue','91D03978BB5A413EBF79A2CDC25E00EABBF79499F65B672A267BFAB19596FB39'],
  '27':['src/pages/CertificationPage.vue','3A6FE5F2761C9AF32A5759879FDBF1F27AEE4056EEE4006FD0297B6ECA5866D6'],
  '28':['src/pages/TalentPeoplePage.vue','3F38FEA2909904F070F5CFBF4FB110337856035CE5774519545689776FD4C558'],
  '29':['src/pages/TalentProjectsPage.vue','4EADBB9CAA596393D67C69CA4F446DBAD38856D2CFF2687E1530F9B8C9EC9E3D'],
  '30':['src/pages/TalentProgressPage.vue','1C66525AC285F0825E52CEB928093EB0CA7A412C4B526B51E181A5A16BC732C3']
};
for(const [id,[path,sha]] of Object.entries(files)){
  const source=read(path);
  assert.ok(source.includes(sha),`${id} 缺少参考 SHA`);
  assert.ok(app.includes(`page.id === '${id}'`),`${id} 未绑定独立组件`);
  assert.match(source,/<h1|<h2/);
  assert.match(source,/:focus-visible/);
  assert.doesNotMatch(source,/[●◆■▲✦⬢▣◇]/u);
}
console.log('16–30 独立页面、参考 SHA、语义和焦点合同测试通过');
