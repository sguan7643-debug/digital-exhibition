<script setup>
// Reference SHA-256: C66930E5C44E4ADAEB81872C7E64E8D41DC17A5BB46256314E404A9177C2923A
import TypeLineIcon from "../components/TypeLineIcon.vue";
import AppDetailStateBoundary from "../components/AppDetailStateBoundary.vue";import { useAppDetailProjection } from "../state/use-app-detail-projection.js";
import AppDetailRemoteFacts from "../components/AppDetailRemoteFacts.vue";
import AppDetailAuthoritativeBody from "../components/AppDetailAuthoritativeBody.vue";
const props=defineProps({integrationData:{type:Object,default:null},integrationState:{type:String,default:'mock'},operationExecutor:{type:Function,default:null}});const projection=useAppDetailProjection(props,{name:'供应商信息自动录入机器人',summary:''});
const metrics = [
  ["RPA流程名", "供应商信息自动录入机器人"],
  ["创建日期", "2025-05-08"],
  ["应用类型", "财务管理 / 供应商管理"],
  ["所属业务域", "V1.2.0"],
  ["适用对象", "具备收取供应商邮件人员"],
  ["开发单位", "信息化管理部"],
  ["负责人", "张三丰"],
  ["所属部门", "物资采购中心"],
  ["开发者", "李明"],
];
const steps = [
  ["获取邮件附件", "机器人自动监控邮箱，抓取供应商信息邮件"],
  ["数据提取与校验", "解析Excel/CSV文件，提取并校验供应商信息"],
  ["登录系统", "使用预设账号登录系统，打开供应商维护页面"],
  ["数据录入", "自动填写供应商信息，并提交保存"],
  ["结果反馈", "记录执行结果，发送执行摘要至指定邮箱"],
];
const rpaDisplayUrl = [
  "https:",
  "//rpa.example.com/app/supplier-info-auto-entry",
].join("");
</script>
<template>
  <article v-if="projection.contentVisible" class="product-detail rpa-detail" aria-labelledby="rpa-title" :data-authoritative-detail="projection.remoteMode">
    <nav class="detail-crumb" aria-label="面包屑">
      应用构建　/　应用中心　/　RPA应用详情
    </nav>
    <header class="detail-hero">
      <div class="detail-hero-main">
        <span class="detail-logo detail-type-icon" role="img" aria-label="供应商信息自动录入机器人图标"><TypeLineIcon name="rpa" :size="34" /></span>
        <div class="detail-title">
          <h1 id="rpa-title">{{ projection.name }}</h1><p v-if="projection.remoteMode">{{ projection.summary }}</p>
          <mark>RPA</mark><mark>供应链管理</mark><mark>已上线</mark>
          <p>
            <strong>应用简介：</strong
            >通过RPA机器人自动从供应商邮件附件中提取信息，并录入到SAP系统，实现供应商数据的自动录入和同步，提升效率，降低人工操作风险。
          </p>
          <p class="rpa-url">{{ rpaDisplayUrl }}</p>
          <div class="detail-tags">
            <mark>供应商管理</mark><mark>自动录入</mark><mark>SAP集成</mark
            ><mark>Excel/CSV</mark>
          </div>
        </div>
        <div class="detail-hero-side">
          <button type="button">收藏</button
          ><button type="button">申请使用</button
          ><button type="button">申请复用</button>
        </div>
      </div>
    </header><AppDetailRemoteFacts :projection="projection" /><AppDetailAuthoritativeBody :projection="projection" />
    <dl class="detail-metrics rpa-metrics">
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
          <dt>版本号</dt>
          <dd>V1.0</dd>
        </div>
        <div>
          <dt>应用编码</dt>
          <dd>RPA-SCM-VENDOR-001</dd>
        </div>
        <div>
          <dt>RPA所属平台</dt>
          <dd>海螺数智</dd>
        </div>
        <div>
          <dt>所属场景</dt>
          <dd>供应商管理－供应商信息维护</dd>
        </div>
        <div class="wide">
          <dt>所属描述</dt>
          <dd>
            机器人自动读取供应商邮件附件，提取供应商基础信息，并自动注入SAP系统完成数据录入，实现全流程自动化处理。
          </dd>
        </div>
      </dl>
    </section>
    <section class="detail-panel detail-panel--full detail-panel--preview">
      <h2>流程录屏</h2>
      <img
        class="preview-wide rpa-video"
        src="/assets/rpa-video.png"
        width="1135"
        height="192"
        alt="供应商信息自动录入机器人操作指引视频封面"
      />
    </section>
    <section class="detail-panel detail-panel--full">
      <h2>操作流程概览</h2>
      <ol class="rpa-flow">
        <li v-for="(step, index) in steps" :key="step[0]">
          <b>{{ index + 1 }}. {{ step[0] }}</b>
          <p>{{ step[1] }}</p>
        </li>
      </ol>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>相关培训内容</h2>
      <table class="file-list rpa-training-list">
        <caption class="rpa-sr-only">
          RPA 相关培训内容
        </caption>
        <tbody>
          <tr
            v-for="(item, index) in [
              ['RPA基础入门与平台操作', '45分钟'],
              ['供应商信息自动录入机器人使用教程', '32分钟'],
              ['SAP系统数据录入流程注意事项', '28分钟'],
              ['RPA异常处理与邮件通知设置', '36分钟'],
            ]"
            :key="item[0]"
          >
            <td>
              <img src="/assets/rpa-video.png" alt="" />
            </td>
            <td>{{ item[0] }}</td>
            <td>时长：{{ item[1] }}</td>
            <td>
              <a href="/training" :aria-label="`学习：${item[0]}`">去学习</a>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <section class="detail-panel detail-panel--half">
      <h2>附件资料</h2>
      <table class="file-list rpa-attachments">
        <caption class="rpa-sr-only">
          RPA 附件资料
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
          <tr
            v-for="(item, index) in [
              ['供应商信息自动录入机器人操作手册.pdf', '2.45 MB'],
              ['供应商信息模板.xlsx', '166 KB'],
              ['常见问题及处理.docx', '320 KB'],
              ['自动加载信息脱敏说明.pdf', '1.28 MB'],
            ]"
            :key="item[0]"
          >
            <td>{{ item[0] }}</td>
            <td>{{ item[1] }}</td>
            <td>2025-05-06 10:{{ 20 + index }}:10</td>
            <td>张三丰</td>
            <td>
              <a href="#main-content" :aria-label="`本地下载：${item[0]}`"
                >下载</a
              >
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <section class="detail-panel detail-panel--full">
      <h2>关联素材</h2>
      <div class="related-row">
        <article
          v-for="(name, index) in [
            '供应商基础信息数据集',
            '供应商信息表RPA脚本',
            '供应链分析大屏模板',
          ]"
          :key="name"
        >
          <AppIcon
            :name="['dataset-logo', 'app-rpa', 'app-cockpit'][index]"
            :size="54"
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
  </article><AppDetailStateBoundary v-else :projection="projection" />
</template>
<style scoped>
.rpa-detail .detail-hero {
  min-height: 218px;
}
.rpa-metrics {
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}
.wide {
  grid-column: 1/-1;
}
.rpa-url {
  color: #0060a6;
}
.rpa-flow {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 45px;
  margin: 0;
  padding: 0 10px;
}
.rpa-flow li {
  position: relative;
  min-height: 80px;
  padding: 14px;
  border: 1px solid #75aaf4;
  border-radius: 4px;
  font-size: 10px;
}
.rpa-flow li:not(:last-child)::after {
  content: "→";
  position: absolute;
  right: -34px;
  top: 30px;
  color: #0060a6;
  font-size: 22px;
}
.rpa-flow p {
  margin-top: 8px;
  line-height: 1.6;
}
.rpa-sr-only {
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
@media (max-width: 900px) {
  .rpa-flow {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .rpa-flow li::after {
    display: none;
  }
}
</style>
