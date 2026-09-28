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
const matrix = read('src/integration/page-integration-matrix.js');
const service = read('server/feishu-read-only-service.mjs');
assert.ok(app.includes("page.id === '31'"), '素材中心必须绑定独立页面组件');
assert.ok(app.includes(':operation-executor="executeReadOperation"'), '素材中心必须获得受控读取执行器');
assert.ok(shell.includes("'/materials'"), '顶部素材中心必须进入独立路由');
for (const contract of ['创建人','所属业务域','更新时间','下载量','收藏','PaginationControl','xlt:materials-filter']) {
  assert.ok(materials.includes(contract), `素材中心缺少合同：${contract}`);
}
assert.ok(materials.includes('TypeLineIcon') && materials.includes('categoryIconName(item.type)'), '素材卡片必须按类型复用统一线稿图标');
assert.ok(matrix.includes("define('31','/materials',['MAT-001','MAT-002','MAT-003']"), '素材中心必须接入真实分面、列表和下载接口');
assert.ok(materials.includes("props.integrationData?.['MAT-002']") && !materials.includes('Array.from({ length:'), '素材中心必须使用 MAT-002 真实记录且不得恢复模拟数据');
assert.ok(materials.includes("props.operationExecutor('MAT-003'") && materials.includes('startSameOriginDownload'), '素材下载必须使用 MAT-003 同源安全下载通道');
assert.ok(service.includes("fileId: hasPrimaryFile ? materialId : ''"), 'MAT-002 必须只返回素材 ID 作为 MAT-003 下载句柄，不能暴露飞书文件令牌');
assert.ok(materials.includes("query.get('query')") && materials.includes("query.get('type')") && materials.includes("query.get('domain')"), '素材筛选必须与 URL 同步');
assert.equal(normalizeMaterialCategory('流程'), 'RPA', '旧流程深链必须归入 RPA');
assert.equal(matchesMaterialCategory({type:'API'}, '其他工具'), true, 'API 素材必须归入其他工具');
for (const [category, type] of Object.entries({可视化:'模板',报表:'报表',RPA:'脚本',数据集:'数据集',指标:'指标',AI:'AI',海能work应用:'海能work应用',EAD:'EAD',其他工具:'其他'})) {
  assert.equal(matchesMaterialCategory({type}, category), true, `${category} 素材分类映射错误`);
}

console.log('素材中心真实列表、筛选、重置、分页与安全下载合同通过');
