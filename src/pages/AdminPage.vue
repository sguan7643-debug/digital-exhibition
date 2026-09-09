<script setup>
// Reference SHA-256: 91D03978BB5A413EBF79A2CDC25E00EABBF79499F65B672A267BFAB19596FB39
import { reactive, ref } from "vue";
import TypeLineIcon from "../components/TypeLineIcon.vue";

const types = reactive([
  {
    icon: "visual",
    name: "可视化",
    code: "VISUAL",
    description: "大屏与驾驶舱可视化应用",
    sort: 1,
    enabled: true,
  },
  {
    icon: "report",
    name: "报表",
    code: "REPORT",
    description: "报表设计、分析与导出应用",
    sort: 2,
    enabled: true,
  },
  {
    icon: "rpa",
    name: "RPA",
    code: "RPA",
    description: "流程自动化与机器人应用",
    sort: 3,
    enabled: true,
  },
  {
    icon: "dataset",
    name: "数据集",
    code: "DATASET",
    description: "标准数据资源集合与管理",
    sort: 4,
    enabled: true,
  },
  {
    icon: "metric",
    name: "指标",
    code: "METRIC",
    description: "指标定义、口径与分析服务",
    sort: 5,
    enabled: true,
  },
  {
    icon: "ai",
    name: "AI",
    code: "AI_AGENT",
    description: "智能交互、分析与协同应用",
    sort: 6,
    enabled: true,
  },
  {
    icon: "work",
    name: "海能work应用",
    code: "HAINENG_WORK",
    description: "海能work协同办公应用",
    sort: 7,
    enabled: true,
  },
  {
    icon: "ead",
    name: "EAD",
    code: "EAD",
    description: "企业架构设计与治理应用",
    sort: 8,
    enabled: true,
  },
  {
    icon: "tools",
    name: "其他工具",
    code: "OTHER_TOOL",
    description: "其他通用数字化工具",
    sort: 9,
    enabled: true,
  },
]);
const domains = reactive([
  {
    icon: "visual",
    name: "生产运营",
    types: "可视化 / 报表 / 数据集",
    sort: 1,
    enabled: true,
  },
  {
    icon: "metric",
    name: "市场营销",
    types: "报表 / 指标",
    sort: 2,
    enabled: true,
  },
  {
    icon: "dataset",
    name: "物资采购",
    types: "数据集 / RPA / AI",
    sort: 3,
    enabled: true,
  },
  {
    icon: "report",
    name: "财务管理",
    types: "报表 / 指标 / RPA",
    sort: 4,
    enabled: true,
  },
  {
    icon: "work",
    name: "人力资源",
    types: "海能work应用 / 报表",
    sort: 5,
    enabled: true,
  },
  {
    icon: "ead",
    name: "安全环保",
    types: "可视化 / 数据集 / EAD",
    sort: 6,
    enabled: true,
  },
  {
    icon: "tools",
    name: "工程建设",
    types: "数据集 / 其他工具",
    sort: 7,
    enabled: true,
  },
  {
    icon: "metric",
    name: "成本控制",
    types: "指标 / 报表",
    sort: 8,
    enabled: true,
  },
  {
    icon: "apps",
    name: "综合管理",
    types: "海能work应用 / AI",
    sort: 9,
    enabled: true,
  },
]);
const logRows = [
  [
    "2026-09-01 09:45:17",
    "/api/auth/login",
    "登录",
    "IAM 单点登录策略校验，记录号 FX-817-0",
    "待处理",
  ],
  [
    "2026-09-01 09:41:17",
    "/api/data/sync",
    "同步",
    "采购主数据增量同步完成，记录号 FX-817-1",
    "待处理",
  ],
  [
    "2026-09-01 09:37:17",
    "/api/report/export",
    "导出",
    "经营月报导出任务完成，记录号 FX-817-2",
    "已处理",
  ],
  [
    "2026-09-01 09:33:17",
    "/api/file/upload",
    "上传",
    "应用上架资料完成安全扫描，记录号 FX-817-3",
    "已处理",
  ],
  [
    "2026-09-01 09:29:17",
    "/api/user/info",
    "查询",
    "用户组织权限范围校验完成，记录号 FX-817-4",
    "已处理",
  ],
];
const announcement = ref("");
function action(label, name) {
  announcement.value = `${name}：${label}操作已记录为本地演示`;
}
</script>

<template>
  <article class="backend-page" aria-labelledby="backend-title">
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <nav>运营管理　/　后台管理</nav>
    <header>
      <h1 id="backend-title">后台管理</h1>
      <p>管理应用类型、主题域与操作日志，保障平台配置一致、可追溯。</p>
    </header>
    <div class="config-grid">
      <section>
        <div class="section-heading">
          <div>
            <h2>应用类型配置</h2>
            <p>类型与前台分类共用同一套线稿图标和排序规则。</p>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>应用类型名称</th>
                <th>类型说明 / 描述</th>
                <th>排序</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in types" :key="item.code">
                <td>
                  <span class="table-icon"
                    ><TypeLineIcon :name="item.icon" :size="20" /></span
                  ><strong>{{ item.name }}</strong>
                </td>
                <td>
                  <b>{{ item.code }}</b
                  ><small>{{ item.description }}</small>
                </td>
                <td>
                  <input
                    v-model.number="item.sort"
                    class="sort-input"
                    type="number"
                    min="1"
                    :max="types.length"
                    inputmode="numeric"
                    :aria-label="`${item.name}排序`"
                  />
                </td>
                <td>
                  <label class="switch"
                    ><input v-model="item.enabled" type="checkbox" />{{
                      item.enabled ? "启用" : "停用"
                    }}</label
                  >
                </td>
                <td>
                  <button type="button" @click="action('编辑', item.name)">
                    编辑</button
                  ><button type="button" @click="action('删除', item.name)">
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <div class="section-heading">
          <div>
            <h2>主题域配置</h2>
            <p>图标按业务含义关联，避免使用无关随机图标。</p>
          </div>
          <button type="button" @click="action('新增', '主题域')">
            新增主题域
          </button>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>图标</th>
                <th>主题域名称</th>
                <th>所属应用 / 类型</th>
                <th>排序</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in domains" :key="item.name">
                <td>
                  <span class="table-icon"
                    ><TypeLineIcon :name="item.icon" :size="20"
                  /></span>
                </td>
                <td>
                  <strong>{{ item.name }}</strong>
                </td>
                <td>{{ item.types }}</td>
                <td>
                  <input
                    v-model.number="item.sort"
                    class="sort-input"
                    type="number"
                    min="1"
                    :max="domains.length"
                    inputmode="numeric"
                    :aria-label="`${item.name}排序`"
                  />
                </td>
                <td>
                  <label class="switch"
                    ><input v-model="item.enabled" type="checkbox" />{{
                      item.enabled ? "启用" : "停用"
                    }}</label
                  >
                </td>
                <td>
                  <button type="button" @click="action('编辑', item.name)">
                    编辑</button
                  ><button type="button" @click="action('删除', item.name)">
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
    <section class="log-panel">
      <div class="section-heading">
        <div>
          <h2>后台操作日志</h2>
          <p>记录 IAM 与平台服务的关键操作，便于审计与追溯。</p>
        </div>
        <span class="warning">未处理告警 2</span>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>操作对象</th>
              <th>操作类型</th>
              <th>详情信息</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in logRows" :key="item[0] + item[1]">
              <td>{{ item[0] }}</td>
              <td>{{ item[1] }}</td>
              <td class="operation-type">{{ item[2] }}</td>
              <td>{{ item[3] }}</td>
              <td :class="item[4] === '待处理' ? 'pending' : 'handled'">
                {{ item[4] }}
              </td>
              <td>
                <button type="button" @click="action('查看详情', item[1])">
                  查看详情</button
                ><button type="button" @click="action('处理记录', item[1])">
                  处理记录
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </article>
</template>

<style scoped>
.backend-page {
  min-height: 100%;
  padding: 18px 22px 28px;
  color: #17304f;
}
.backend-page > nav {
  color: #6d8094;
  font-size: 12px;
}
.backend-page > header {
  margin: 11px 0 15px;
}
.backend-page h1 {
  margin: 0;
  color: #102d50;
  font-size: 26px;
}
.backend-page > header p {
  margin: 5px 0 0;
  color: #61758b;
  font-size: 13px;
}
.config-grid {
  display: grid;
  grid-template-columns: minmax(560px, 1fr) minmax(620px, 1.15fr);
  gap: 14px;
}
.config-grid > section,
.log-panel {
  min-width: 0;
  padding: 17px;
  background: #fff;
  border: 1px solid #d7e2ec;
  border-radius: 7px;
  box-shadow: 0 1px 3px rgba(26, 54, 82, 0.04);
}
.section-heading {
  min-height: 54px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
}
.section-heading h2 {
  margin: 0;
  color: #173b60;
  font-size: 20px;
  line-height: 1.4;
}
.section-heading p {
  margin: 4px 0 0;
  color: #6b7d91;
  font-size: 14px;
  line-height: 1.55;
}
.section-heading > button {
  height: 40px;
  padding: 0 18px;
  color: #fff;
  background: #0060a6;
  border: 1px solid #0060a6;
  border-radius: 4px;
  font-size: 14px;
}
.table-scroll {
  max-width: 100%;
  overflow-x: auto;
}
.backend-page table {
  width: 100%;
  min-width: 650px;
  margin-top: 10px;
  border-collapse: collapse;
  font-size: 14px;
}
.backend-page th,
.backend-page td {
  min-height: 50px;
  padding: 10px 11px;
  border-bottom: 1px solid #e1e8ef;
  text-align: left;
  vertical-align: middle;
}
.backend-page th {
  height: 44px;
  color: #38536d;
  background: #f3f6f9;
  font-size: 14px;
  white-space: nowrap;
}
.backend-page tbody tr:hover {
  background: #f9fbfd;
}
.backend-page td:first-child {
  white-space: nowrap;
}
.backend-page td strong {
  font-size: 14px;
}
.backend-page td:nth-child(2) > b {
  display: block;
  color: #526b83;
  font-size: 13px;
}
.backend-page td small {
  display: block;
  margin-top: 2px;
  color: #657b90;
  font-size: 13px;
  line-height: 1.5;
}
.table-icon {
  width: 36px;
  height: 36px;
  display: inline-grid;
  place-items: center;
  margin-right: 8px;
  color: #173f68;
  background: #f6f9fb;
  border: 1px solid #d5e0ea;
  border-radius: 5px;
  vertical-align: middle;
}
.sort-input {
  width: 64px;
  height: 38px;
  padding: 0 7px;
  color: #153b60;
  background: #fff;
  border: 1px solid #b8cada;
  border-radius: 4px;
  text-align: center;
  font-weight: 700;
}
.sort-input:focus {
  border-color: #0060a6;
  outline: 3px solid rgba(10, 101, 191, 0.13);
}
.switch {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.switch input {
  width: 16px;
  height: 16px;
  accent-color: #0060a6;
}
.backend-page td button {
  min-height: 34px;
  padding: 4px 7px;
  color: #0060a6;
  background: transparent;
  border: 0;
  font-size: 14px;
}
.backend-page td button + button {
  margin-left: 4px;
  color: #6d7d8d;
}
.log-panel {
  margin-top: 14px;
}
.log-panel .warning {
  padding: 7px 9px;
  color: #c83a34;
  background: #fff2f1;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}
.log-panel table {
  min-width: 900px;
}
.operation-type {
  color: #c7631a;
  font-weight: 700;
}
.pending {
  color: #bd6b18;
}
.handled {
  color: #15845e;
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
button:focus-visible {
  outline: 3px solid #ff9f1a;
  outline-offset: 2px;
}
@media (max-width: 1350px) {
  .config-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .backend-page {
    padding: 10px;
  }
  .config-grid > section,
  .log-panel {
    padding: 12px;
  }
  .section-heading {
    flex-wrap: wrap;
  }
}
</style>
