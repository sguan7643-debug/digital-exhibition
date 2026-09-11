<script setup>
// Reference SHA-256: 35ACE981294AF359A243AFB1F53C29590BA124742F8EEF3BBE7152F4984F7A69
import { nextTick, ref } from "vue";
import { createDetailController } from "../state/detail-controller.js";
import { routeSession } from "../state/session-store.js";
import TypeLineIcon from "../components/TypeLineIcon.vue";
import AppDetailStateBoundary from "../components/AppDetailStateBoundary.vue";
import AppDetailRemoteFacts from "../components/AppDetailRemoteFacts.vue";
import AppDetailAuthoritativeBody from "../components/AppDetailAuthoritativeBody.vue";
import { useAppDetailProjection } from "../state/use-app-detail-projection.js";
const props=defineProps({integrationData:{type:Object,default:null},integrationState:{type:String,default:'mock'},operationExecutor:{type:Function,default:null}});
const projection=useAppDetailProjection(props,{name:'智能数据处理工具',summary:'面向日常办公与数据处理场景，提供文件格式转换、Excel批量处理、数据清洗、文本整理等常用工具能力。'});
const metrics = [
  ["访问", "6,820 次"],
  ["类型", "工具"],
  ["业务域", "通用办公"],
  ["更新", "2025-06-18"],
  ["开发单位", "信息技术部"],
  ["负责人", "张三丰"],
  ["部门", "物资采购中心"],
];
const training = [
  "智能数据处理工具功能介绍",
  "Excel批量处理操作教程",
  "文件格式转换使用方法",
  "数据清洗与常见问题",
];
const related = ["Excel批量处理模板", "通用数据清洗规则库", "文档格式转换组件"];
const detail = routeSession.controller("detail-tool", () =>
  createDetailController("/apps/tool-001", routeSession),
);
const commentInput = ref(null);
async function submitComment() {
  if (detail.submitComment()) {
    await nextTick();
    commentInput.value?.focus();
  }
}
</script>
<template>
  <article class="product-detail tool-detail" aria-labelledby="tool-title" :data-authoritative-detail="projection.remoteMode">
    <AppDetailStateBoundary :projection="projection">
    <p class="sr-only" aria-live="polite">{{ detail.announcement }}</p>
    <nav class="detail-crumb" aria-label="面包屑">
      <a href="/apps?category=工具" data-detail-return>应用中心</a
      >　/　工具　/　应用详情
    </nav>
    <header class="detail-hero">
      <div class="detail-hero-main">
        <span class="detail-logo detail-type-icon" role="img" aria-label="智能数据处理工具图标"><TypeLineIcon name="tools" :size="34" /></span>
        <div class="detail-title">
          <h1 id="tool-title">{{ projection.name }}</h1>
          <mark>工具</mark><mark>通用办公</mark>
          <p v-if="projection.remoteMode">{{ projection.summary }}</p><p v-else>
            面向日常办公与数据处理场景，提供文件格式转换、Excel批量处理、数据清洗、文本整理等常用工具能力。
          </p>
          <p>应用URL地址　<b>本地演示地址</b></p>
          <div class="detail-tags">
            <strong>应用关键词</strong><mark>文件处理</mark><mark>格式转换</mark
            ><mark>批量操作</mark><mark>数据清洗</mark><mark>办公提效</mark>
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
          ><button type="button" @click="detail.apply('申请复用')">申请复用</button>
        </div>
      </div>
    </header>
    <AppDetailRemoteFacts :projection="projection" /><AppDetailAuthoritativeBody :projection="projection" /><dl class="detail-metrics">
      <div v-for="([key, value], index) in metrics" :key="key">
        <b>{{ index + 1 }}</b>
        <dt>{{ key }}</dt>
        <dd>{{ value }}</dd>
      </div>
    </dl>
    <section class="detail-panel detail-panel--full">
      <h2>应用基本信息</h2>
      <dl class="info-grid">
        <div>
          <dt>应用编号</dt>
          <dd>APP-TOOL-001</dd>
        </div>
        <div>
          <dt>所属场景</dt>
          <dd>通用办公</dd>
        </div>
        <div>
          <dt>版本号</dt>
          <dd>V1.2.0</dd>
        </div>
        <div>
          <dt>适用对象</dt>
          <dd>集团公司及所属单位全体员工</dd>
        </div>
      </dl>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>相关培训内容 <a href="/training">查看全部培训</a></h2>
      <div class="training-row">
        <article v-for="(item, index) in training" :key="item">
          <AppIcon :name="index % 2 ? 'app-dataset' : 'tool-logo'" :size="54" />
          <div>
            <h3>{{ item }}</h3>
            <p>时长：{{ 10 + index * 2 }}:{{ index }}0</p>
            <button type="button" @click="detail.watchTraining(item)">
              观看视频
            </button>
          </div>
        </article>
      </div>
    </section>
    <section id="usage" class="detail-panel detail-panel--half" tabindex="-1">
      <h2>使用说明</h2>
      <div class="related-row">
        <article>
          <b>PDF</b>
          <div>
            <h3>智能数据处理工具-用户操作手册.pdf</h3>
            <p>2.4 MB　2025-06-18</p>
          </div>
        </article>
        <article>
          <b>PDF</b>
          <div>
            <h3>智能数据处理工具-快速使用指南.pdf</h3>
            <p>1.6 MB　2025-06-18</p>
          </div>
        </article>
      </div>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>附件材料</h2>
      <table class="file-list">
        <caption class="sr-only">
          智能数据处理工具附件材料
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
          <tr>
            <td>智能数据处理工具_用户操作手册.pdf</td>
            <td>2.4 MB</td>
            <td>2025-06-18 09:20:10</td>
            <td>张三丰</td>
            <td>
              <button
                type="button"
                @click="
                  detail.mockDownload('智能数据处理工具_用户操作手册.pdf')
                "
              >
                下载
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>关联素材 <a href="/materials">查看全部素材</a></h2>
      <div class="related-row">
        <article v-for="(item, index) in related" :key="item">
          <AppIcon
            :name="['app-rpa', 'app-dataset', 'app-cockpit'][index]"
            :size="54"
          />
          <div>
            <h3>
              <a :href="`/materials?query=${encodeURIComponent(item)}`">{{
                item
              }}</a>
            </h3>
            <p>{{ 3260 + index * 1320 }} 次下载</p>
          </div>
        </article>
      </div>
    </section>
    <form class="detail-comment" @submit.prevent="submitComment">
      <label
        >应用评价<input
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
    </AppDetailStateBoundary>
  </article>
</template>
<style scoped>
.tool-detail {
  max-width: 100%;
}
.tool-detail .detail-hero {
  min-height: 385px;
}
.training-row a,
.training-row button,
.file-list button {
  padding: 0;
  border: 0;
  color: #0060a6;
  background: transparent;
  font-size: 9px;
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
