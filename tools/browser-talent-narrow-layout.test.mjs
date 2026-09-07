import fs from 'node:fs';
import { chromium } from 'playwright';

const executablePath=[process.env.BROWSER_EXECUTABLE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean).find(fs.existsSync);
if(!executablePath)throw new Error('未找到 Edge/Chromium');
const origin=process.env.EXHIBITION_TEST_ORIGIN||'http://127.0.0.1:4173';
const widths=[761,869,932,1000,1054];
const routes=[
  {route:'/talent/people',wrapper:'.talent-table-scroll'},
  {route:'/talent/projects',wrapper:'.table-scroll'},
  {route:'/talent/progress',wrapper:'.progress-table'}
];
const browser=await chromium.launch({headless:true,executablePath});
const results=[];
try{
  for(const {route,wrapper} of routes){
    for(const width of widths){
      const page=await browser.newPage({viewport:{width,height:760}});
      const errors=[];const remoteRequests=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('request',request=>{const url=new URL(request.url());if(url.hostname!=='127.0.0.1'&&url.hostname!=='localhost')remoteRequests.push(request.url());});
      const response=await page.goto(`${origin}${route}`,{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForSelector(wrapper);
      await page.waitForTimeout(150);
      const geometry=await page.evaluate(({wrapper})=>{
        const rect=node=>{const value=node.getBoundingClientRect();return {left:value.left,right:value.right,width:value.width};};
        const main=document.querySelector('#main-content');
        const article=document.querySelector('#main-content article');
        const form=article.querySelector('form');
        const tableWrapper=document.querySelector(wrapper);
        const pagination=article.querySelector('.pagination-control');
        const sidebar=document.querySelector('.sidebar');
        const controls=[...form.querySelectorAll('input,select,button')].filter(node=>!node.closest('[role="dialog"]'));
        const before=rect(pagination);
        tableWrapper.scrollLeft=tableWrapper.scrollWidth;
        const after=rect(pagination);
        const viewportWidth=document.documentElement.clientWidth;
        const bounded=value=>value.left>=main.getBoundingClientRect().left-1&&value.right<=viewportWidth+1;
        return {
          viewportWidth,documentWidth:document.documentElement.scrollWidth,
          main:{...rect(main),clientWidth:main.clientWidth,scrollWidth:main.scrollWidth},
          article:rect(article),form:{...rect(form),clientWidth:form.clientWidth,scrollWidth:form.scrollWidth},
          controls:controls.map(node=>({name:node.getAttribute('aria-label')||node.textContent.trim()||node.getAttribute('placeholder'),...rect(node)})),
          wrapper:{...rect(tableWrapper),clientWidth:tableWrapper.clientWidth,scrollWidth:tableWrapper.scrollWidth,overflowX:getComputedStyle(tableWrapper).overflowX,tabIndex:tableWrapper.tabIndex,role:tableWrapper.getAttribute('role'),label:tableWrapper.getAttribute('aria-label')},
          pagination:{before,after,outsideWrapper:!tableWrapper.contains(pagination)},sidebar:rect(sidebar),
          bounded:{article:bounded(rect(article)),form:bounded(rect(form)),controls:controls.every(node=>bounded(rect(node))),pagination:bounded(after)}
        };
      },{wrapper});
      const passed=response?.status()===200&&!errors.length&&!remoteRequests.length
        &&geometry.documentWidth<=geometry.viewportWidth
        &&geometry.sidebar.width===220
        &&geometry.main.scrollWidth<=geometry.main.clientWidth+1
        &&geometry.bounded.article&&geometry.bounded.form&&geometry.bounded.controls&&geometry.bounded.pagination
        &&geometry.wrapper.scrollWidth>geometry.wrapper.clientWidth
        &&['auto','scroll'].includes(geometry.wrapper.overflowX)
        &&geometry.wrapper.tabIndex===0&&geometry.wrapper.role==='region'&&/左右滚动/.test(geometry.wrapper.label||'')
        &&geometry.pagination.outsideWrapper
        &&Math.abs(geometry.pagination.before.left-geometry.pagination.after.left)<1
        &&Math.abs(geometry.pagination.before.right-geometry.pagination.after.right)<1;
      results.push({route,width,status:response?.status()||0,errors,remoteRequests,geometry,passed});
      await page.close();
    }
  }
}finally{await browser.close();}
const failed=results.filter(result=>!result.passed);
console.log(JSON.stringify({passed:!failed.length,expected:15,failed,results},null,2));
if(failed.length)process.exitCode=1;
