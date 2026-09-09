<script setup>
// Reference SHA-256: 48C41CBB2DF433C9680DD955A4777FA436BBFF6E094D56A3B5E6E0E48B01690B
import TypeLineIcon from "../components/TypeLineIcon.vue";
const metrics = [
  ["访问次数", "2,375 次"],
  ["最近更新", "2025-05-06"],
  ["所属部门", "物资采购中心"],
  ["负责人", "张三丰"],
  ["开发单位", "信息化管理部"],
  ["开发人", "李明"],
];
const rows = [
  ["应用编码", "AFP00012345", "所属业务域", "经营管理域"],
  ["指标应用场景", "客户价值分析", "指标适用范围", "集团公司及所属子公司"],
  ["指标级别", "过程指标", "数据管理部门", "数据管理部"],
  ["业务数据部门", "市场营销部", "成果来源系统", "客户关系管理系统（CRM）"],
  ["指标定义", "反映在统计周期内，客户为企业带来的综合价值贡献水平。", "", ""],
  [
    "业务获取逻辑",
    "从CRM系统中获取客户相关数据，按照客户价值计算规则进行加工。",
    "",
    "",
  ],
  ["计算单位", "元", "统计粒度", "月度"],
  ["采集方式", "系统自动采集", "关键值", "客户价值 ≈ 100,000 元"],
];
</script>
<template>
  <article class="product-detail metric-detail" aria-labelledby="metric-title">
    <nav class="detail-crumb" aria-label="面包屑">
      应用中心　/　指标　/　应用详情
    </nav>
    <header class="detail-hero">
      <div class="detail-hero-main">
        <span class="detail-logo detail-type-icon" role="img" aria-label="物资供应链域指标库图标"><TypeLineIcon name="metric" :size="34" /></span>
        <div class="detail-title">
          <h1 id="metric-title">物资供应链域指标库</h1>
          <mark>指标</mark><mark>经营管理域</mark>
          <p>
            <strong>主要领域：</strong>供应链管理 ·
            采购管理　　<strong>适用范围：</strong>集团公司、专业分公司、所属单位
          </p>
          <p>
            面向物资供应链全过程，沉淀采购全链、计划执行、寻源、履约阶段等场景的通用及定义、计算公式等指标口径。
          </p>
          <div class="detail-tags">
            <strong>应用关键词</strong><mark>客户价值分析</mark
            ><mark>供应链</mark><mark>指标管理</mark><mark>经营管理</mark>
          </div>
        </div>
        <div class="detail-hero-side">
          <button type="button">收藏</button
          ><button type="button">申请使用</button
          ><button type="button">个性化指标创建</button>
        </div>
      </div>
    </header>
    <section class="detail-panel detail-panel--full metric-strip">
      <dl class="detail-metrics">
        <div v-for="([key, value], index) in metrics" :key="key">
          <b>{{ index + 1 }}</b>
          <dt>{{ key }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>应用简介</h2>
      <table class="metric-table">
        <caption class="sr-only">
          物资供应链域指标库应用简介
        </caption>
        <tbody>
          <tr v-for="row in rows" :key="row[0]">
            <th>{{ row[0] }}</th>
            <td>{{ row[1] }}</td>
            <th>{{ row[2] }}</th>
            <td>{{ row[3] }}</td>
          </tr>
        </tbody>
      </table>
    </section>
    <section id="usage" class="detail-panel detail-panel--half" tabindex="-1">
      <h2>使用说明</h2>
      <p class="metric-copy">
        客户价值指标用于衡量客户为企业创造的综合价值，可用于客户分层、营销策略制定、资源分配优化等场景。统计周期为月度，数据来源于CRM系统，由系统自动采集并计算生成。
      </p>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>相关培训内容</h2>
      <table class="file-list">
        <caption class="sr-only">
          指标库相关培训内容
        </caption>
        <tbody>
          <tr
            v-for="name in [
              '客户价值指标业务说明书.pdf',
              '指标体系设计与口径统一方法',
              '指标应用与报表制作实操',
            ]"
            :key="name"
          >
            <td>{{ name }}</td>
            <td><a href="/training">去学习</a></td>
          </tr>
        </tbody>
      </table>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>附件资料</h2>
      <table class="file-list">
        <caption class="sr-only">
          指标库附件资料
        </caption>
        <thead>
          <tr>
            <th>文件名称</th>
            <th>文件大小</th>
            <th>上传时间</th>
            <th>上传人</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="name in [
              '客户价值指标业务说明书.pdf',
              '客户价值指标口径表.pptx',
              '客户价值指标数据示例.xlsx',
              '客户价值计算规则.docx',
            ]"
            :key="name"
          >
            <td>{{ name }}</td>
            <td>1.8 MB</td>
            <td>2025-05-06 10:32:10</td>
            <td>张三丰</td>
            <td><a href="#main-content">下载</a></td>
          </tr>
        </tbody>
      </table>
    </section>
    <section class="detail-panel detail-panel--full">
      <h2>关联素材</h2>
      <div class="related-row">
        <article
          v-for="(name, index) in [
            '供应链指标口径库',
            '客户价值分析数据集',
            '经营管理驾驶舱模板',
          ]"
          :key="name"
        >
          <img
            :src="
              [
                '/assets/metric-logo.png',
                '/assets/dataset-logo.png',
                '/assets/dashboard-logo.png',
              ][index]
            "
            alt=""
          />
          <div>
            <h3>{{ name }}</h3>
            <p>查看详情</p>
          </div>
        </article>
      </div>
    </section>
    <form class="detail-comment" @submit.prevent>
      <label>应用评论<input placeholder="请输入您对该应用的评论..." /></label
      ><button type="submit">提交评论</button>
    </form>
  </article>
</template>
<style scoped>
.metric-detail .detail-hero {
  min-height: 185px;
}
.metric-detail .detail-logo {
  width: 64px;
  height: 64px;
}
.metric-art {
  width: 390px;
  max-width: 100%;
  object-position: right;
}
.metric-strip {
  padding: 4px 0;
}
.metric-strip .detail-metrics {
  grid-template-columns: repeat(6, 1fr);
  margin: 0;
  padding: 8px 0;
  border: 0;
}
.metric-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9px;
}
.metric-table th,
.metric-table td {
  height: 23px;
  padding: 4px 10px;
  border: 1px solid #dce4ed;
  text-align: left;
}
.metric-table th {
  background: #f4f6f9;
}
.metric-copy {
  font-size: 10px;
  line-height: 1.8;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid #ff9f1a;
  outline-offset: 2px;
}
</style>
