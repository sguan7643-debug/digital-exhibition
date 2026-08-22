import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base='http://127.0.0.1:4173';
const evidenceRoot='C:\\Users\\20266\\Documents\\Codex\\2026-08-15\\we\\evidence\\digital-exhibition-ui-0817-dev-r3-20260821\\shell-groups';
await mkdir(evidenceRoot,{recursive:true});
const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true});
const context=await browser.newContext({viewport:{width:1672,height:941}});
const externalRequests=[];
await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==base){externalRequests.push(url.href);return route.abort();}
  return route.continue();
});
const page=await context.newPage();
const results=[];

async function record(name,materialsExpanded,appsExpanded){
  const material=page.locator('[aria-controls="materials-group-menu"]');
  const apps=page.locator('[aria-controls="apps-group-menu"]');
  assert.equal(await material.getAttribute('aria-expanded'),String(materialsExpanded));
  assert.equal(await apps.getAttribute('aria-expanded'),String(appsExpanded));
  assert.equal(await page.locator('#materials-group-menu').isVisible(),materialsExpanded);
  assert.equal(await page.locator('#apps-group-menu').isVisible(),appsExpanded);
  assert.equal(await page.locator('.scene-search').isVisible(),true,'场景化搜索必须始终可见');
  assert.equal(await page.getByRole('heading',{name:'素材中心'}).isVisible(),true);
  assert.equal(await page.getByRole('heading',{name:'应用中心'}).isVisible(),true);
  const screenshot=`${evidenceRoot}\\${name}.png`;
  await page.screenshot({path:screenshot,fullPage:false});
  results.push({name,materialsExpanded,appsExpanded,screenshot});
}

try{
  await page.goto(`${base}/workbench`);
  assert.equal(await page.locator('.sidebar-toggle').count(),0,'不得存在顶部全局收起控件');
  assert.equal(await page.locator('.sidebar-collapsed').count(),0,'不得存在整栏折叠状态');
  const sidebarBox=await page.locator('.sidebar').boundingBox();
  const mainBox=await page.locator('#main-content').boundingBox();
  await record('groups-11',true,true);

  const material=page.locator('[aria-controls="materials-group-menu"]');
  const apps=page.locator('[aria-controls="apps-group-menu"]');
  await material.focus();await page.keyboard.press('Enter');
  assert.notEqual((await material.evaluate(node=>getComputedStyle(node).outlineStyle)),'none','键盘操作后必须保留可见焦点');
  await record('groups-01',false,true);
  await apps.focus();await page.keyboard.press(' ');
  await record('groups-00',false,false);
  await material.focus();await page.keyboard.press('Enter');
  await record('groups-10',true,false);

  const sidebarAfter=await page.locator('.sidebar').boundingBox();
  const mainAfter=await page.locator('#main-content').boundingBox();
  assert.equal(sidebarAfter.width,sidebarBox.width,'分组折叠不得改变侧栏宽度');
  assert.equal(mainAfter.x,mainBox.x,'分组折叠不得让主内容左右位移');
  assert.equal(externalRequests.length,0,'分组切换不得产生非本地请求');
  const report={route:'/workbench',viewport:{width:1672,height:941},sidebarWidth:sidebarBox.width,mainX:mainBox.x,externalRequests,combinations:results};
  await writeFile(`${evidenceRoot}\\results.json`,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(`真实 Edge 侧栏分组：4种组合、键盘/aria、固定宽度与零外网通过；证据 ${evidenceRoot}`);
} finally {
  await context.close();
  await browser.close();
}
