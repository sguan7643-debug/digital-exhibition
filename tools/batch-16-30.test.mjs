import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PAGE_MATRIX } from '../src/fixtures/pages.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/App.vue');
const remoteDetail = read('src/components/RemoteAppDetailPage.vue');
const remoteRecord = read('src/components/RemoteRecordPage.vue');
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
  assert.equal(PAGE_MATRIX.find((page)=>page.id===id)?.sha256,sha,`${id} 路由矩阵缺少参考 SHA`);
  assert.ok(app.includes(`page.id === '${id}'`),`${id} 未绑定独立组件`);
  if(id==='16'){
    assert.match(source,/RemoteAppDetailPage/,`${id} 必须复用统一远端详情组件`);
    assert.match(source,/icon="rpa"/,`${id} 必须声明 RPA 类型图标`);
  }else if(source.includes('RemoteRecordPage')){
    assert.match(source,/<RemoteRecordPage/,`${id} 必须渲染统一远端记录组件`);
    assert.match(source,/(?:^|\s):?title=/m,`${id} 必须向统一远端记录组件传递标题`);
  }else{
    assert.match(source,/<h1|<h2/);
    assert.match(source,/:focus-visible/);
  }
  if(id==='17'){
    assert.match(source,/statusMeta[\s\S]*aria-hidden="true"/,
      '审批状态符号只能作为带文字标签的隐藏装饰使用');
  }else{
    assert.doesNotMatch(source,/[●◆■▲✦⬢▣◇]/u);
  }
}
assert.match(remoteDetail,/<h1|<h2/,'统一远端详情组件必须保留语义标题');
assert.match(remoteDetail,/:focus-visible/,'统一远端详情组件必须保留键盘焦点样式');
assert.match(remoteRecord,/<h1|<h2/,'统一远端记录组件必须保留语义标题');
assert.match(remoteRecord,/role="status"/,'统一远端记录组件必须向辅助技术通报加载和空状态');
assert.match(remoteRecord,/role="alert"/,'统一远端记录组件必须向辅助技术通报错误状态');
console.log('16–30 独立页面、参考 SHA、语义和焦点合同测试通过');
