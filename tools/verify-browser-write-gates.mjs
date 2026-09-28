import fs from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { PAGE_INTEGRATION_MATRIX } from '../src/integration/page-integration-matrix.js';

const candidates=[process.env.BROWSER_EXECUTABLE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
const executablePath=candidates.find(candidate=>fs.existsSync(candidate));
if(!executablePath)throw new Error('未找到 Edge/Chromium');
const origin=process.env.EXHIBITION_TEST_ORIGIN||'http://127.0.0.1:4173';
const profile=process.env.FEISHU_VERIFY_BROWSER_PROFILE;
const browser=profile?null:await chromium.launch({headless:true,executablePath});
const context=profile
  ?await chromium.launchPersistentContext(resolve(profile),{headless:true,executablePath,viewport:{width:1440,height:1000}})
  :await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const results=[];
const renderedOperationIds=new Set();
try{
  for(const contract of PAGE_INTEGRATION_MATRIX.filter(item=>item.actions.length)){
    await page.goto(`${origin}${contract.route}?test-write-panel=1`,{waitUntil:'domcontentloaded',timeout:30000});
    const panel=page.locator('.controlled-write-panel');
    await panel.waitFor({state:'visible',timeout:10000});
    if(await panel.getAttribute('data-write-state')==='blocked'){
      results.push({route:contract.route,expected:contract.actions.length,rendered:0,visible:true,blocked:true});
      continue;
    }
    const rendered=await panel.locator('details').count();
    for(const value of await panel.locator('details summary code').allTextContents())renderedOperationIds.add(value.trim());
    results.push({route:contract.route,expected:contract.actions.length,rendered,visible:await panel.isVisible()});
  }
  await page.goto(`${origin}/apps/report-001?test-write-panel=1`,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('.controlled-write-panel').waitFor({state:'visible',timeout:10000});
  if(await page.locator('.controlled-write-panel').getAttribute('data-write-state')==='blocked'){
    const passed=results.every(item=>item.blocked);
    console.log(JSON.stringify({passed,mode:'blocked',results},null,2));
    process.exit(passed?0:2);
  }
  const operationCalls=[];
  page.on('request',request=>{if(request.url().includes('/api/v1/operations/'))operationCalls.push(request.url().split('/').at(-1));});
  const first=page.locator('.controlled-write-panel details').first();
  await first.locator('summary').click();
  await first.locator('button[type=submit]').click();
  await page.waitForTimeout(150);
  const unconfirmedCalls=[...operationCalls];
  await first.locator('.confirm input').check();
  await first.locator('button[type=submit]').click();
  await page.waitForTimeout(500);
  const confirmedCalls=[...operationCalls];
  const output=await first.locator('output').innerText();
  const renderedInstances=results.reduce((sum,item)=>sum+item.rendered,0);
  const passed=renderedOperationIds.size===36&&results.every(item=>item.visible&&item.rendered===item.expected)&&unconfirmedCalls.length===0&&confirmedCalls.join(',')==='COM-001';
  console.log(JSON.stringify({passed,expectedUniqueActions:36,renderedUniqueActions:renderedOperationIds.size,renderedInstances,unconfirmedCalls,confirmedCalls,output,results},null,2));
  if(!passed)process.exitCode=2;
}finally{await context.close();if(browser)await browser.close();}
