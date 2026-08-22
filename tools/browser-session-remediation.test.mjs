import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base='http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:800}});
let externalRequests=0;
await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==base){externalRequests+=1;return route.abort();}
  return route.continue();
});

try{
  const routeFavorite=await context.newPage();
  await routeFavorite.goto(`${base}/favorites`);
  assert.equal(await routeFavorite.locator('.favorite-stats article').first().locator('b').textContent(),'28');
  await routeFavorite.locator('[data-favorite-id="favorite-001"] a[href="/apps/report-001"]').click();
  await routeFavorite.locator('.detail-hero-side button').filter({hasText:'已收藏'}).click();
  await routeFavorite.locator('[data-detail-return]').click();
  await routeFavorite.waitForURL(`${base}/favorites`);
  assert.equal(await routeFavorite.locator('.favorite-stats article').first().locator('b').textContent(),'27','路由级取消只能移除 canonical 收藏 ID');

  const historyPage=await context.newPage();
  await historyPage.goto(`${base}/favorites`);
  const oldKey=await historyPage.evaluate(()=>history.state.xltEntryKey);
  await historyPage.reload();
  const detailLink=historyPage.locator('[data-favorite-id="favorite-001"] a[href="/apps/report-001"]');
  const focusId=await detailLink.getAttribute('data-session-focus');
  assert.equal(focusId,'favorite-detail-favorite-001','收藏详情入口必须有稳定唯一焦点标识');
  await detailLink.focus();
  await historyPage.locator('#main-content').evaluate(node=>{node.scrollTop=180;});
  await detailLink.click();
  const newKey=await historyPage.evaluate(()=>history.state.xltEntryKey);
  assert.notEqual(newKey,oldKey,'刷新后创建的新 History entry key 不得碰撞旧 entry');
  await historyPage.locator('[data-detail-return]').click();
  await historyPage.waitForURL(`${base}/favorites`);
  await historyPage.waitForFunction(id=>document.activeElement?.getAttribute('data-session-focus')===id,focusId);
  assert.equal(await historyPage.locator('#main-content').evaluate(node=>node.scrollTop),180,'详情返回必须恢复右侧主区滚动');

  const statePage=await context.newPage();
  await statePage.goto(`${base}/favorites?state=error`);
  await statePage.getByRole('button',{name:'重试'}).click();
  await statePage.waitForTimeout(900);
  assert.match(await statePage.evaluate(()=>document.activeElement?.textContent||''),/收藏应用列表/,'恢复后必须聚焦真实页面结果标题');
  assert.equal(await statePage.evaluate(()=>document.activeElement?.getAttribute('data-state-result-heading')),'');
  assert.equal(externalRequests,0,'真实 App 会话回归不得请求非本地资源');
  console.log('真实 Edge App+页面：canonical 收藏、刷新 History、详情往返滚动/焦点与状态恢复通过');
} finally {
  await context.close();
  await browser.close();
}
