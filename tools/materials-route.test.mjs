import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolvePage } from '../src/fixtures/pages.js';
import { matchesMaterialCategory, normalizeMaterialCategory } from '../src/state/interaction-controllers.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = resolvePage('/materials?type=流程');
assert.equal(page.id, '31');
assert.equal(page.route, '/materials');
assert.equal(page.title, '素材中心');
assert.equal(resolvePage('/materials', 'empty').state, 'empty');

const app = read('src/App.vue');
const shell = read('src/components/ExhibitionShell.vue');
const materials = read('src/pages/MaterialsPage.vue');
assert.ok(app.includes("page.id === '31'"), '素材中心必须绑定独立页面组件');
assert.ok(shell.includes("'/materials'"), '顶部素材中心必须进入独立路由');
for (const contract of ['创建人','所属业务域','更新时间','下载量','收藏','PaginationControl','xlt:materials-filter']) {
  assert.ok(materials.includes(contract), `素材中心缺少合同：${contract}`);
}
assert.ok(materials.includes('TypeLineIcon') && materials.includes('categoryIconName(item.type)'), '素材卡片必须按类型复用统一线稿图标');
assert.ok(materials.includes("Array.from({ length: 116 }"), '素材中心必须保持 128 条确定性素材');
assert.ok(materials.includes("query.get('query')") && materials.includes("query.get('type')") && materials.includes("query.get('domain')"), '素材筛选必须与 URL 同步');
for (const category of ['可视化','报表','RPA','数据集','指标','AI','海能work应用','EAD','其他工具']) {
  assert.ok(materials.includes(category), `素材中心缺少新分类：${category}`);
}
assert.equal(normalizeMaterialCategory('流程'), 'RPA', '旧流程深链必须归入 RPA');
assert.equal(matchesMaterialCategory({type:'API'}, '其他工具'), true, 'API 素材必须归入其他工具');
for (const [category, type] of Object.entries({可视化:'模板',报表:'报表',RPA:'脚本',数据集:'数据集',指标:'指标',AI:'AI',海能work应用:'海能work应用',EAD:'EAD',其他工具:'其他'})) {
  assert.equal(matchesMaterialCategory({type}, category), true, `${category} 素材分类映射错误`);
}

console.log('新增素材中心路由、字段、筛选与确定性数据合同通过');
