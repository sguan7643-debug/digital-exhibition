<script setup>
// Reference SHA-256: A7A5B61527C5A2D7C83ACD2C769AA56FD038B252EDE4D1A46A91D1396F2113B1
import { nextTick, ref } from "vue";
import { createDetailController } from "../state/detail-controller.js";
import { routeSession } from "../state/session-store.js";
import BusinessPreviewGallery from "../components/BusinessPreviewGallery.vue";
import TypeLineIcon from "../components/TypeLineIcon.vue";
import IndicatorBuildDialog from "../components/IndicatorBuildDialog.vue";
const metrics = [
  ["访问次数", "4,286 次"],
  ["应用类型", "可视化报表"],
  ["所属业务域", "经营分析"],
  ["最近更新", "2026-08-31"],
  ["开发单位", "数据智能部"],
  ["负责人", "李四强"],
  ["开发者", "王海峰"],
];
const features = [
  ["指标可视化", "支持柱状图、折线图、饼图、地图等多种图表"],
  ["趋势分析", "展示指标变化趋势及同比环比分析"],
  ["多维筛选", "支持单位、时间、业务板块等多条件筛选"],
  ["报表导出", "支持报表导出为PDF、Excel及图片"],
  ["图表联动", "图表间支持交互联动与数据钻取"],
];
const attachments = [
  "用户操作手册.pdf",
  "快速使用指南.pdf",
  "经营指标口径说明.xlsx",
  "报表数据接口规范.docx",
];
const attachmentSizes = ["2.8 MB", "2.1 MB", "1.4 MB", "860 KB"];
const training = [
  "可视化报表功能介绍",
  "图表配置与数据筛选",
  "多维分析与联动钻取",
  "报表导出与分享",
];
const related = [
  ["经营分析报表模板", "/apps/tool-001", "/assets/report-logo.png"],
  ["经营指标数据集", "/apps/dataset-001", "/assets/app-dataset.png"],
  ["月度经营分析指标", "/apps/metric-001", "/assets/app-metric.png"],
];
const detail = routeSession.controller("detail-report", () =>
  createDetailController("/apps/report-001", routeSession, {
    name: "经营分析可视化报表",
  }),
);
const commentInput = ref(null);
const metricBuildDialog = ref(null);
function openMetricBuild() {
  metricBuildDialog.value?.open();
}
function submitMetricBuild(payload) {
  detail.apply(`个性化指标构建申请（${payload.name}）`);
}
async function submitComment() {
  if (detail.submitComment()) {
    await nextTick();
    commentInput.value?.focus();
  }
}
</script>
<template>
  <article class="product-detail report-detail" aria-labelledby="report-title">
    <p class="sr-only" aria-live="polite">{{ detail.announcement }}</p>
    <nav class="detail-crumb" aria-label="面包屑">
      <a href="/apps?category=可视化报表" data-detail-return>应用中心</a
      >　/　可视化报表　/　应用详情
    </nav>
    <header class="detail-hero">
      <div class="detail-hero-main">
        <span class="detail-logo detail-type-icon" role="img" aria-label="经营分析可视化报表图标"><TypeLineIcon name="report" :size="34" /></span>
        <div class="detail-title">
          <h1 id="report-title">经营分析可视化报表</h1>
          <mark>可视化报表</mark><mark>经营分析</mark>
          <p>
            汇聚企业经营核心数据，通过丰富的图表组件与灵活的分析维度，直观呈现经营指标、趋势变化及结构分布。
          </p>
          <p>应用URL地址　<b>本地受控演示</b></p>
          <div class="detail-tags">
            <strong>应用关键词</strong><mark>经营分析</mark
            ><mark>可视化报表</mark><mark>数据洞察</mark><mark>趋势分析</mark
            ><mark>多维分析</mark>
          </div>
        </div>
        <div class="detail-hero-side">
          <button
            type="button"
            :aria-pressed="detail.favorite"
            @click="detail.toggleFavorite"
          >
            {{ detail.favorite ? "已收藏" : "收藏" }}</button
          ><button type="button" @click="detail.apply('申请使用')">
            申请使用</button
          ><button class="metric-build-trigger" type="button" @click="openMetricBuild">个性化指标构建</button>
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
      <h2>应用简介</h2>
      <dl class="info-grid">
        <div>
          <dt>应用编码</dt>
          <dd>APP-KSHBB-001</dd>
        </div>
        <div>
          <dt>集成数据</dt>
          <dd>财务数据、预算数据、生产数据、采购数据、销售数据等</dd>
        </div>
        <div>
          <dt>版本号</dt>
          <dd>V2.0.0</dd>
        </div>
        <div>
          <dt>数据更新频率</dt>
          <dd>每日08:00更新</dd>
        </div>
        <div>
          <dt>所属场景</dt>
          <dd>经营管理</dd>
        </div>
        <div>
          <dt>权限控制要求</dt>
          <dd>支持基于角色和组织范围进行权限控制</dd>
        </div>
        <div>
          <dt>适用对象</dt>
          <dd>集团公司、专业分公司、直属单位</dd>
        </div>
        <div>
          <dt>应用URL地址</dt>
          <dd>本地受控演示</dd>
        </div>
      </dl>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>核心功能</h2>
      <div class="feature-grid">
        <article v-for="([name, text], index) in features" :key="name">
          <b>{{ index + 1 }}</b
          ><strong>{{ name }}</strong>
          <p>{{ text }}</p>
        </article>
      </div>
    </section>
    <section class="detail-panel detail-panel--full detail-panel--preview">
      <h2>演示截图</h2>
      <figure>
        <BusinessPreviewGallery variant="report" />
        <figcaption>
          经营指标总览、趋势分析与结构分布三项清晰的只读报表预览；数据为固定演示口径。
        </figcaption>
      </figure>
    </section>
    <section id="usage" class="detail-panel usage-panel" tabindex="-1">
      <h2>使用说明</h2>
      <div class="related-row">
        <article>
          <b>PDF</b>
          <div>
            <h3>经营分析可视化报表-用户操作手册.pdf</h3>
            <p>2.8 MB　2025-06-12</p>
          </div>
        </article>
        <article>
          <b>PDF</b>
          <div>
            <h3>经营分析可视化报表-快速使用指南.pdf</h3>
            <p>2.0 MB　2025-06-12</p>
          </div>
        </article>
      </div>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>附件资料</h2>
      <table class="file-list">
        <caption class="sr-only">
          经营分析可视化报表附件资料
        </caption>
        <thead>
          <tr>
            <th scope="col">文件名称</th>
            <th scope="col">文件大小</th>
            <th scope="col">上传时间</th>
            <th scope="col">上传人</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(name, index) in attachments" :key="name">
            <td>{{ name }}</td>
            <td>{{ attachmentSizes[index] }}</td>
            <td>2026-08-31 09:{{ 20 + index }}:10</td>
            <td>李四强</td>
            <td>
              <button
                class="text-action"
                type="button"
                :aria-label="`下载 ${name}`"
                @click="detail.mockDownload(name)"
              >
                下载
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>相关培训内容 <a href="/training">查看全部培训</a></h2>
      <div class="training-row">
        <article v-for="(name, index) in training" :key="name">
          <img src="/assets/report-logo.png" alt="" />
          <div>
            <h3>{{ name }}</h3>
            <p>时长：{{ 14 + index * 2 }}:30</p>
            <a href="/training" :aria-label="`学习：${name}`">去学习</a>
          </div>
        </article>
      </div>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>关联素材</h2>
      <div class="related-row">
        <article v-for="([name, route, image], index) in related" :key="name">
          <img :src="image" alt="" />
          <div>
            <h3>
              <a :href="route">{{ name }}</a>
            </h3>
            <p>{{ 2680 + index * 1180 }} 次下载</p>
          </div>
        </article>
      </div>
    </section>
    <form class="detail-comment" @submit.prevent="submitComment">
      <label
        >应用评论<input
          ref="commentInput"
          v-model="detail.commentDraft"
          placeholder="请输入您对该应用的评论..." /></label
      ><button type="submit" :disabled="!detail.commentDraft.trim()">
        提交评论
      </button>
      <ul v-if="detail.comments.length" aria-label="本地评论">
        <li
          v-for="comment in detail.comments"
          :key="comment.id"
          :data-comment-id="comment.id"
        >
          {{ comment.text }}
        </li>
      </ul>
    </form>
    <IndicatorBuildDialog ref="metricBuildDialog" app-name="经营分析可视化报表" @submit="submitMetricBuild" />
  </article>
</template>
<style scoped>
.report-detail {
  min-height: 100%;
  overflow: visible;
}
.report-detail .detail-hero {
  min-height: 350px;
}
.report-detail figure {
  margin: 0;
}
.report-detail figcaption {
  margin-top: 12px;
  color: #536a84;
  font-size: 12px;
}
.text-action {
  padding: 0;
  border: 0;
  color: #0060a6;
  background: transparent;
}
.detail-comment ul {
  margin: 12px 0 0;
  padding-left: 24px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid #ff9f1a;
  outline-offset: 2px;
}
</style>
