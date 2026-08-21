<script setup>
// Reference SHA-256: 35ACE981294AF359A243AFB1F53C29590BA124742F8EEF3BBE7152F4984F7A69
const metrics=[['访问','6,820 次'],['类型','工具'],['业务域','通用办公'],['更新','2025-06-18'],['开发单位','信息技术部'],['负责人','张三丰'],['部门','物资采购中心']];
const training=['智能数据处理工具功能介绍','Excel批量处理操作教程','文件格式转换使用方法','数据清洗与常见问题'];
</script>
<template>
  <article class="product-detail tool-detail" aria-labelledby="tool-title"><nav class="detail-crumb" aria-label="面包屑">应用中心　/　工具　/　应用详情</nav>
    <header class="detail-hero"><div class="detail-hero-main"><img class="detail-logo" src="/assets/tool-logo.png" width="91" height="91" alt="智能数据处理工具图标" /><div class="detail-title"><h1 id="tool-title">智能数据处理工具</h1><mark>工具</mark><mark>通用办公</mark><p>面向日常办公与数据处理场景，提供文件格式转换、Excel批量处理、数据清洗、文本整理等常用工具能力。</p><p>应用URL地址　<b>本地演示地址</b></p><div class="detail-tags"><strong>应用关键词</strong><mark>文件处理</mark><mark>格式转换</mark><mark>批量操作</mark><mark>数据清洗</mark><mark>办公提效</mark></div></div><div class="detail-hero-side"><button type="button">收藏</button><button type="button">申请使用</button><button type="button">申请复用</button><img class="detail-illustration" src="/assets/tool-hero.png" width="190" height="190" alt="工具箱插画" /></div></div><dl class="detail-metrics"><div v-for="([key,value],index) in metrics" :key="key"><b>{{ index+1 }}</b><dt>{{ key }}</dt><dd>{{ value }}</dd></div></dl></header>
    <section class="detail-panel"><h2>应用基本信息</h2><dl class="info-grid"><div><dt>应用编号</dt><dd>APP-TOOL-001</dd></div><div><dt>所属场景</dt><dd>通用办公</dd></div><div><dt>版本号</dt><dd>V1.2.0</dd></div><div><dt>适用对象</dt><dd>集团公司及所属单位全体员工</dd></div></dl></section>
    <section class="detail-panel"><h2>相关培训内容 <a href="/training">查看全部培训</a></h2><div class="training-row"><article v-for="(item,index) in training" :key="item"><img :src="index%2?'/assets/app-dataset.png':'/assets/tool-logo.png'" alt="" /><div><h3>{{ item }}</h3><p>时长：{{ 10+index*2 }}:{{ index }}0</p><a href="/training">观看视频</a></div></article></div></section>
    <section class="detail-panel"><h2>使用说明</h2><div class="related-row"><article><b>PDF</b><div><h3>智能数据处理工具-用户操作手册.pdf</h3><p>2.4 MB　2025-06-18</p></div></article><article><b>PDF</b><div><h3>智能数据处理工具-快速使用指南.pdf</h3><p>1.6 MB　2025-06-18</p></div></article></div></section>
    <section class="detail-panel"><h2>附件材料</h2><table class="file-list"><thead><tr><th>文件名称</th><th>文件大小</th><th>上传时间</th><th>上传人</th><th>操作</th></tr></thead><tbody><tr><td>智能数据处理工具_用户操作手册.pdf</td><td>2.4 MB</td><td>2025-06-18 09:20:10</td><td>张三丰</td><td><a href="#main-content">下载</a></td></tr></tbody></table></section>
    <section class="detail-panel"><h2>关联素材 <a href="/favorites">查看全部素材</a></h2><div class="related-row"><article v-for="(item,index) in ['Excel批量处理模板','通用数据清洗规则库','文档格式转换组件']" :key="item"><img :src="['/assets/app-rpa.png','/assets/app-dataset.png','/assets/app-cockpit.png'][index]" alt="" /><div><h3>{{ item }}</h3><p>{{ 3260+index*1320 }} 次下载</p></div></article></div></section>
    <form class="detail-comment" @submit.prevent><label>应用评价<input placeholder="请输入您对该应用的评论..." /></label><button type="submit">提交评论</button></form>
  </article>
</template>
<style scoped>.tool-detail{max-width:100%}.tool-detail .detail-hero{min-height:385px}.training-row a{color:#0870e8;font-size:9px}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}</style>
