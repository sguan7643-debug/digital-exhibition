<script setup>
// Reference SHA-256: 8090BF0B8BFDCE7981D32F7C6B6335230D9F9508BF4549E716C10A2A4382D0CC
import TypeLineIcon from "../components/TypeLineIcon.vue";
const metrics = [
  ["创建日期", "2025-06-06"],
  ["应用类型", "EAD应用"],
  ["所属业务域", "综合管理"],
  ["适用对象", "集团及所属单位"],
  ["开发单位", "数字化管理部"],
  ["负责人", "张三丰"],
  ["所属部门", "物资采购中心"],
];
const steps = [
  "开始",
  "创建/导入应用",
  "设计/维护应用流程",
  "配置权限与数据",
  "配置菜单",
  "发布上线",
  "结束",
];
</script>
<template>
  <article class="product-detail ead-detail" aria-labelledby="ead-title">
    <nav class="detail-crumb" aria-label="面包屑">
      应用中心　/　EAD应用　/　应用详情
    </nav>
    <header class="detail-hero">
      <div class="detail-hero-main">
        <span class="detail-logo detail-type-icon" role="img" aria-label="EAD应用图标"><TypeLineIcon name="ead" :size="34" /></span>
        <div class="detail-title">
          <h1 id="ead-title">EAD应用</h1>
          <mark>EAD应用</mark><mark>综合管理</mark>
          <p>
            EAD应用是基于认证平台的企业应用架构与开发平台，支持应用设计、流程编排、权限管理、数据连接于一体，助力企业高效构建、敏捷发布与数字化转型。
          </p>
          <div class="detail-tags">
            <strong>应用关键词</strong><mark>智能办公</mark><mark>流程编排</mark
            ><mark>权限管理</mark><mark>数据集成</mark><mark>低代码</mark
            ><mark>数字化转型</mark>
          </div>
        </div>
        <div class="detail-hero-side">
          <button type="button">收藏</button
          ><button type="button">立即使用</button
          ><button type="button">申请复用</button>
        </div>
      </div>
    </header>
    <dl class="detail-metrics">
      <div v-for="([key, value], index) in metrics" :key="key">
        <b>{{ index + 1 }}</b>
        <dt>{{ key }}</dt>
        <dd>{{ value }}</dd>
      </div>
    </dl>
    <section class="detail-panel detail-panel--half">
      <h2>应用基本信息</h2>
      <dl class="info-grid ead-info">
        <div>
          <dt>应用编码</dt>
          <dd>EAD_APP_001</dd>
        </div>
        <div>
          <dt>版本号</dt>
          <dd>V1.0.0</dd>
        </div>
        <div>
          <dt>所属场景</dt>
          <dd>综合管理</dd>
        </div>
        <div>
          <dt>应用描述</dt>
          <dd>
            提供企业应用设计、流程编排与开发运行能力，助力企业高效构建、敏捷发布与数字化转型。
          </dd>
        </div>
      </dl>
    </section>
    <section class="detail-panel detail-panel--half ead-content">
      <h2>应用内容</h2>
      <img
        src="/assets/ead-preview.png"
        width="290"
        height="105"
        alt="EAD应用内容预览"
      />
      <p>
        EAD应用是基于认证平台的企业应用架构与开发平台，支持应用设计、流程编排、权限管理、数据连接于一体。
      </p>
    </section>
    <section id="usage" class="detail-panel detail-panel--full" tabindex="-1">
      <h2>使用说明与流程</h2>
      <ol class="ead-flow">
        <li v-for="(step, index) in steps" :key="step">
          <span>{{ step }}</span
          ><i v-if="index < steps.length - 1" aria-hidden="true"></i>
        </li>
      </ol>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>相关培训内容 <a href="/training">查看更多</a></h2>
      <div class="training-row">
        <article
          v-for="(name, index) in [
            'EAD应用快速入门',
            'EAD流程编排模板库',
            'EAD权限与角色体系',
            'EAD数据集成连接器',
          ]"
          :key="name"
        >
          <img
            :src="
              index < 2 ? '/assets/ead-logo.png' : '/assets/ead-preview.png'
            "
            alt=""
          />
          <div>
            <h3>{{ name }}</h3>
            <p>视频 · {{ 12 + index }}:40</p>
            <a href="/training">去学习</a>
          </div>
        </article>
      </div>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>关联素材</h2>
      <div class="ead-empty"><span>暂无关联素材</span></div>
    </section>
    <form class="detail-comment" @submit.prevent>
      <label>应用评论<input placeholder="请输入您对该应用的评论..." /></label
      ><button type="submit">提交评论</button>
    </form>
  </article>
</template>
<style scoped>
.ead-detail .detail-hero {
  min-height: 240px;
}
.ead-detail .detail-logo {
  width: 66px;
  height: 66px;
}
.ead-info {
  grid-template-columns: 1fr;
  max-width: 540px;
}
.ead-info div:nth-child(odd) {
  border-right: 0;
}
.ead-content {
  display: grid;
  grid-template-columns: 290px 1fr;
  gap: 30px;
}
.ead-content h2 {
  grid-column: 1/-1;
}
.ead-content p {
  padding: 14px 0;
  font-size: 10px;
  line-height: 2;
}
.ead-flow {
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 0;
  padding: 8px;
}
.ead-flow li {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ead-flow span {
  min-width: 85px;
  padding: 7px 11px;
  text-align: center;
  color: #0060a6;
  background: #eef5ff;
  border: 1px solid #bcd7fa;
  border-radius: 5px;
  font-size: 10px;
}
.ead-flow i {
  width: 28px;
  height: 1px;
  background: #a9b8c9;
}
.ead-empty {
  height: 70px;
  display: grid;
  place-items: center;
  color: #9aa7b7;
  font-size: 11px;
  border: 1px solid #edf1f5;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid #ff9f1a;
  outline-offset: 2px;
}
@media (max-width: 700px) {
  .ead-content {
    grid-template-columns: 1fr;
  }
  .ead-flow {
    flex-wrap: wrap;
  }
}
</style>
