import fs from 'node:fs';
import { chromium } from 'playwright';
import { PAGE_INTEGRATION_MATRIX } from '../src/integration/page-integration-matrix.js';

const candidates=[process.env.BROWSER_EXECUTABLE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
const executablePath=candidates.find(candidate=>fs.existsSync(candidate));
if(!executablePath)throw new Error('未找到 Edge/Chromium');
const origin=process.env.EXHIBITION_TEST_ORIGIN||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const results=[];
const renderedOperationIds=new Set();
try{
  for(const contract of PAGE_INTEGRATION_MATRIX.filter(item=>item.actions.length)){
    await page.goto(`${origin}${contract.route}`,{waitUntil:'networkidle',timeout:30000});
    const panel=page.locator('.controlled-write-panel');
    const rendered=await panel.locator('details').count();
    for(const value of await panel.locator('details summary code').allTextContents())renderedOperationIds.add(value.trim());
    results.push({route:contract.route,expected:contract.actions.length,rendered,visible:await panel.isVisible()});
  }
  await page.goto(`${origin}/apps/report-001`,{waitUntil:'networkidle',timeout:30000});
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
}finally{await browser.close();}
