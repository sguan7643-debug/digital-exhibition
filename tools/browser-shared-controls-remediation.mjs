import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'file:///C:/Users/20266/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const output=resolve('evidence/shared-controls-remediation');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-background-networking','--force-device-scale-factor=1']});
const results=[];const errors=[];const externalRequests=[];
const context=await browser.newContext({viewport:{width:1672,height:941},deviceScaleFactor:1});
const page=await context.newPage();
page.on('pageerror',error=>errors.push(String(error)));
page.on('request',request=>{const url=new URL(request.url());if(!['127.0.0.1','localhost'].includes(url.hostname))externalRequests.push(request.url());});
async function visit(route){const response=await page.goto(`http://127.0.0.1:4173${route}`,{waitUntil:'networkidle'});assert.equal(response?.status(),200);await page.evaluate(()=>document.fonts.ready);}
try{
  await visit('/talent/projects');
  assert.equal(await page.locator('[role=dialog]').count(),0,'人才项目首次进入不得自动打开抽屉');
  assert.equal(await page.locator('.pagination-control select').inputValue(),'10','人才项目默认每页 10 条');
  await page.getByRole('button',{name:'新增任务'}).click();
  assert.equal(await page.locator('[role=dialog]').count(),1,'明确点击新增任务后才打开抽屉');
  assert.match(page.url(),/drawer=create/);
  results.push({route:'/talent/projects',initialDrawer:false,explicitOpen:true,pageSize:10});

  await visit('/talent/people');
  assert.equal(await page.locator('[role=dialog]').count(),0,'人才库首次进入不得自动展示详情');
  assert.equal(await page.locator('.pagination-control select').inputValue(),'10');
  assert.match(await page.locator('.pagination-control').innerText(),/共 32 条/);
  results.push({route:'/talent/people',initialDrawer:false,total:32,pageSize:10});

  await visit('/talent/progress');
  assert.equal(await page.locator('[role=dialog]').count(),0,'项目进度首次进入不得打开抽屉');
  assert.equal(await page.locator('.pagination-control select').inputValue(),'10');
  results.push({route:'/talent/progress',initialDrawer:false,pageSize:10});

  await visit('/operations');
  const before=await page.locator('.ops-stats strong').first().innerText();
  await page.getByRole('button',{name:'月'}).click();
  assert.equal(await page.getByRole('button',{name:'月'}).getAttribute('aria-pressed'),'true');
  const after=await page.locator('.ops-stats strong').first().innerText();
  assert.notEqual(after,before,'统计周期切换必须更新指标');
  const start=page.getByLabel('开始日期');
  await start.fill('2026-08-05');
  assert.match(await page.locator('.operations-page>footer').innerText(),/2026-08-05 至 2026-08-19/);
  assert.equal(await page.locator('[role=img]').count()>=4,true,'运营图表必须完整提供文本替代');
  await page.screenshot({path:resolve(output,'operations-month.png'),animations:'disabled'});
  results.push({route:'/operations',period:'month',before,after,start:'2026-08-05',charts:await page.locator('[role=img]').count()});

  for(const target of [
    {route:'/apps',items:'.apps-grid>article',expected:8,label:'应用中心分页'},
    {route:'/favorites',items:'.favorite-grid>article',expected:10,label:'收藏分页'},
    {route:'/messages',items:'.message-panel li',expected:10,label:'消息分页'},
    {route:'/announcements',items:'.notice-table tbody tr',expected:10,label:'公告分页'}
  ]){
    await visit(target.route);
    const pager=page.getByRole('navigation',{name:target.label});
    assert.equal(await pager.count(),1,`${target.route} 必须渲染共享分页导航`);
    assert.equal(await page.locator(target.items).count(),target.expected,`${target.route} 首屏必须显示 10 条`);
    const pageSize=page.locator('.pagination-control select').last();
    assert.equal(await pageSize.inputValue(),'10');
    await pageSize.selectOption('20');
    assert.equal(await pageSize.inputValue(),'20');
    assert.equal(await pager.getByRole('button',{name:'第 1 页'}).getAttribute('aria-current'),'page');
    results.push({route:target.route,pageSizeBefore:10,pageSizeAfter:20,sharedPagination:true});
  }
}finally{await browser.close();}
assert.deepEqual(errors,[],'真实 Edge 不得有 pageerror');assert.deepEqual(externalRequests,[],'真实 Edge 不得发起非本地请求');
const evidence={edgeVersion:'151.0.4129.101',results,errors,externalRequests};
await writeFile(resolve(output,'browser-results.json'),`${JSON.stringify(evidence,null,2)}\n`,'utf8');
console.log(JSON.stringify(evidence,null,2));
