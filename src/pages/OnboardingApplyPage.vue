<script setup>
import { computed, reactive, ref } from "vue";
import { submitOnboarding } from "../integration/onboarding-approval.js";
import { normalizeAppBasePath, prependAppBasePath } from "../integration/app-base-path.js";

const props = defineProps({
  integrationData: { type: Object, default: null },
  integrationState: { type: String, default: "loading" },
  integrationMode: { type: String, default: "remote" },
});

const form = reactive({
  applicant: "",
  department: "",
  phone: "",
  email: "",
  name: "",
  applicationCode: "",
  type: "",
  domain: "",
  summary: "",
  scenario: "",
  collaboration: "",
  webAddress: "",
  mobileAddress: "",
  contact: "",
  contactDepartment: "",
  contactPhone: "",
  contactEmail: "",
  users: "",
  accessDepartment: "",
  roles: "",
  scope: "assigned",
  remarks: "",
});
const applicationDetailSchemas = Object.freeze({
  T007: {
    tableName: "可视化驾驶舱详情",
    fields: [
      { key: "集成数据", control: "textarea", placeholder: "请输入驾驶舱集成的数据范围" },
      { key: "数据更新频率", placeholder: "例如：每日 08:00 更新" },
      { key: "权限控制要求", control: "textarea", placeholder: "请输入数据权限和访问控制要求" },
      { key: "核心功能", control: "textarea", placeholder: "请描述驾驶舱核心功能" },
      { key: "应用描述", control: "textarea", placeholder: "请输入应用描述" },
    ],
  },
  T006: {
    tableName: "可视化报表详情",
    fields: [
      { key: "集成数据", control: "textarea", placeholder: "请输入报表集成的数据范围" },
      { key: "数据更新频率", placeholder: "例如：每小时更新" },
      { key: "权限控制要求", control: "textarea", placeholder: "请输入数据权限和访问控制要求" },
      { key: "核心功能", control: "textarea", placeholder: "请描述报表核心功能" },
      { key: "应用描述", control: "textarea", placeholder: "请输入应用描述" },
    ],
  },
  T005: {
    tableName: "海能work应用详情",
    fields: [
      { key: "应用图片或视频", placeholder: "请填写图片或视频说明、文件名或地址" },
      { key: "使用指南", control: "textarea", placeholder: "请输入应用使用指南" },
      { key: "使用功能", control: "textarea", placeholder: "请描述应用提供的功能" },
      { key: "使用说明文档链接", placeholder: "请输入使用说明文档链接" },
      { key: "应用描述", control: "textarea", placeholder: "请输入应用描述" },
    ],
  },
  T004: {
    tableName: "工具应用详情",
    fields: [
      { key: "使用说明", control: "textarea", placeholder: "请输入工具使用说明" },
      { key: "核心功能", control: "textarea", placeholder: "请描述工具核心功能" },
      { key: "应用描述", control: "textarea", placeholder: "请输入应用描述" },
    ],
  },
  T003: {
    tableName: "RPA应用详情",
    fields: [
      { key: "RPA所属平台", placeholder: "请输入 RPA 所属平台" },
      { key: "操作流程步骤", control: "textarea", placeholder: "请按顺序描述操作流程步骤" },
      { key: "应用描述", control: "textarea", placeholder: "请输入应用描述" },
    ],
  },
  T002: {
    tableName: "EAD应用详情",
    fields: [
      { key: "应用内容", control: "textarea", placeholder: "请输入 EAD 应用内容" },
      { key: "使用流程步骤", control: "textarea", placeholder: "请按顺序描述使用流程步骤" },
      { key: "应用描述", control: "textarea", placeholder: "请输入应用描述" },
    ],
  },
  T001: {
    tableName: "AI应用详情",
    fields: [
      { key: "所属数据源", control: "textarea", placeholder: "请输入 AI 应用使用的数据源" },
      { key: "应用描述", control: "textarea", placeholder: "请输入应用描述" },
      { key: "核心功能", control: "textarea", placeholder: "请描述 AI 应用核心功能" },
    ],
  },
  T008: {
    tableName: "数据集应用详情",
    fields: [
      { key: "数据来源", control: "textarea", placeholder: "请输入数据集来源" },
      { key: "更新频率", placeholder: "例如：每日更新" },
      { key: "数据字段列表", control: "textarea", placeholder: "请填写数据集字段列表" },
      { key: "应用描述", control: "textarea", placeholder: "请输入应用描述" },
    ],
  },
  T009: {
    tableName: "指标应用详情",
    fields: [
      { key: "主要领域", placeholder: "请输入指标主要领域" },
      { key: "指标应用场景", control: "textarea", placeholder: "请输入指标应用场景" },
      { key: "指标级别", placeholder: "请输入指标级别" },
      { key: "业务解释部门", placeholder: "请输入业务解释部门" },
      { key: "成果来源系统", placeholder: "请输入成果来源系统" },
      { key: "指标定义", control: "textarea", placeholder: "请输入指标定义" },
      { key: "业务获取逻辑", control: "textarea", placeholder: "请输入业务获取逻辑" },
      { key: "业务计算公式", control: "textarea", placeholder: "请输入业务计算公式" },
      { key: "计算单位", placeholder: "请输入计算单位" },
      { key: "采集方式", placeholder: "请输入采集方式" },
      { key: "维度", placeholder: "请输入指标维度" },
      { key: "统计粒度", placeholder: "请输入统计粒度" },
      { key: "关键值", placeholder: "请输入关键值" },
      { key: "权限控制要求", control: "textarea", placeholder: "请输入权限控制要求" },
      { key: "使用说明", control: "textarea", placeholder: "请输入使用说明" },
      { key: "列20", placeholder: "请输入补充字段" },
    ],
  },
});
function createDetailDraft(fields) {
  return Object.fromEntries(fields.map((field) => [field.key, ""]));
}
const detailDrafts = reactive(
  Object.fromEntries(
    Object.entries(applicationDetailSchemas).map(([type, schema]) => [
      type,
      createDetailDraft(schema.fields),
    ])
  )
);
const dictionaries = computed(() => props.integrationData?.["COM-005"]?.itemsByType || {});
const applicationTypes = computed(() => (dictionaries.value.APPLICATION_TYPE || []).map(item => ({ label: item.label, value: item.value })));
const activeApplicationType = computed(
  () => applicationTypes.value.find((item) => item.value === form.type) || { label: "未选择", value: "" }
);
const activeDetailSchema = computed(
  () => applicationDetailSchemas[form.type] || { tableName: "应用详情", fields: [] }
);
function buildDetailFields() {
  return Object.fromEntries(
    activeDetailSchema.value.fields.map((field) => [
      field.key,
      detailDrafts[form.type]?.[field.key] || "",
    ])
  );
}
const files = reactive({ icon: "", materials: "", attachment: "" });
const selectedFiles = { icon: [], materials: [], attachment: [] };
const saved = ref(false);
const submitted = ref(false);
const submitting = ref(false);
const submitError = ref("");
const submitMessage = ref("");
const announcement = ref("");
const approvalResult = ref(null);
const appBasePath = normalizeAppBasePath(import.meta.env.VITE_EXHIBITION_APP_BASE || import.meta.env.BASE_URL);
const statusHref = computed(() => {
  if (!approvalResult.value) return prependAppBasePath("/apps/onboarding/status", appBasePath);
  const query = new URLSearchParams({ source: approvalResult.value.kind });
  if (approvalResult.value.instanceId) query.set("instanceId", approvalResult.value.instanceId);
  if (approvalResult.value.resourceId) query.set("resourceId", approvalResult.value.resourceId);
  return prependAppBasePath(`/apps/onboarding/status?${query}`, appBasePath);
});
const feishuAuthHref = computed(() => {
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/api/v1/auth/feishu/start?returnTo=${encodeURIComponent(returnTo)}`;
});

const businessDomains = computed(() => (dictionaries.value.BUSINESS_DOMAIN || []).map(item => ({ label: item.label, value: item.value })));

function flattenOrganizations(items, result = []) {
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || item.enabled === false) continue;
    result.push({
      id: String(item.orgId || item.departmentId || item.orgCode || item.orgName || ""),
      name: String(item.orgName || item.departmentName || item.orgCode || ""),
    });
    flattenOrganizations(item.children, result);
  }
  return result;
}

const departmentOptions = computed(() => {
  const unique = new Map();
  for (const item of flattenOrganizations(props.integrationData?.["COM-003"]?.items)) {
    if (item.id && item.name) unique.set(item.id, item);
  }
  return [...unique.values()];
});
const userOptions = computed(() => {
  return (props.integrationData?.["COM-004"]?.items || [])
    .filter((item) => item?.enabled !== false)
    .map((item) => ({
      adAccount: String(item.userId || item.employeeNo || ""),
      displayName: String(item.displayName || item.userId || item.employeeNo || ""),
      departmentId: String(item.departmentId || item.orgId || ""),
      departmentName: String(item.departmentName || item.orgName || ""),
    }))
    .filter((item) => item.adAccount && item.displayName);
});
const directoryState = computed(() => {
  if (props.integrationState === "loading") return "loading";
  if (["authentication-required", "permission-denied"].includes(props.integrationState)) return "permission-denied";
  if (["error", "timeout", "rate-limited", "schema-drift", "security-error"].includes(props.integrationState)) return "error";
  if (props.integrationState === "disabled") return "disabled";
  return departmentOptions.value.length && userOptions.value.length ? "normal" : "empty";
});
const directoryDisabled = computed(() => directoryState.value !== "normal");
function usersInDepartment(departmentName) {
  if (!departmentName) return userOptions.value;
  const department = departmentOptions.value.find((item) => item.name === departmentName || item.id === departmentName);
  return userOptions.value.filter((item) =>
    item.departmentName === departmentName || (department?.id && item.departmentId === department.id)
  );
}
const contactUserOptions = computed(() => usersInDepartment(form.contactDepartment));
const applicableUserOptions = computed(() => usersInDepartment(form.accessDepartment));
function syncApplicantDepartment() {
  const user = userOptions.value.find((item) => item.adAccount === form.applicant);
  if (user?.departmentName) form.department = user.departmentName;
}
function resetContactForDepartment() {
  if (!contactUserOptions.value.some((item) => item.adAccount === form.contact)) form.contact = "";
}
function resetApplicableUserForDepartment() {
  if (!applicableUserOptions.value.some((item) => item.adAccount === form.users)) form.users = "";
}

function rememberFile(key, event) {
  const selected = Array.from(event.target.files || []);
  selectedFiles[key] = selected;
  files[key] = selected.map((file) => file.name).join("、");
  announcement.value = selected.length
    ? `已选择 ${selected.length} 个文件`
    : "未选择文件";
}
function saveDraft() {
  saved.value = true;
  announcement.value = "申请草稿已保存在当前浏览器会话中";
}
function departmentId(value) {
  return departmentOptions.value.find((item) => item.name === value || item.id === value)?.id
    || value;
}
function buildRpaApprovalRequest() {
  return {
    tableId: "tbl1Tvwl7t5RxcMs",
    title: form.name,
    fields: {
      应用名称: form.name,
      应用类型: "T003",
      所属部门ID: departmentId(form.department),
      所属业务域ID: form.domain,
      摘要: form.summary,
      应用简介: form.scenario,
      开发合作方信息: form.collaboration,
      应用URL地址: form.webAddress,
      移动端地址: form.mobileAddress,
      申请人AD账号: form.applicant,
      申请人联系电话: form.phone,
      申请人联系邮箱: form.email,
      接入人AD账号: form.contact,
      接入人所属部门ID: departmentId(form.contactDepartment),
      联系电话: form.contactPhone,
      联系邮箱: form.contactEmail,
      适用用户AD账号: form.users,
      适用部门ID: departmentId(form.accessDepartment),
      适用角色: form.roles,
      权限范围:
        form.scope === "all" ? "全部组织可见" : "仅开放给部分部门/用户",
      状态: "待审批",
    },
    detailFields: {
      应用编码: form.applicationCode,
      备注说明: form.remarks,
      ...buildDetailFields(),
    },
  };
}
async function submitApplication() {
  if (submitting.value) return;
  if (directoryDisabled.value) {
    submitError.value = "飞书部门和人员数据尚未加载完成";
    announcement.value = submitError.value;
    return;
  }
  submitting.value = true;
  submitError.value = "";
  submitted.value = false;
  announcement.value = form.type === "T005" ? "正在提交海能Work飞书审批" : "正在提交 RPA 应用审批";
  try {
    approvalResult.value = await submitOnboarding(
      {
        ...form,
        detailFields: buildDetailFields(),
        rpaRequest: buildRpaApprovalRequest(),
      },
      Object.values(selectedFiles).flat()
    );
    submitted.value = true;
    saved.value = false;
    submitMessage.value = approvalResult.value.message;
    const trackingMessage = approvalResult.value.status === "PENDING"
      ? "当前进入审批中状态"
      : approvalResult.value.message;
    announcement.value = `${form.type === "T005" ? "海能Work" : "RPA"} 应用上架申请已提交，${trackingMessage}`;
    window.location.assign(statusHref.value);
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : "审批接口请求失败";
    announcement.value = submitError.value;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <article class="apply-page" aria-labelledby="apply-title">
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <nav class="apply-crumb" aria-label="面包屑">
      <a href="/apps">应用中心</a><span>/</span><span>应用上架申请</span>
    </nav>
    <header class="apply-heading">
      <div>
        <h1 id="apply-title">应用上架申请</h1>
        <p>
          请准确填写申请信息，带
          <b>*</b> 的项目为必填项。提交后可在审批状态页查看进度。
        </p>
      </div>
      <div class="heading-actions">
        <a class="feishu-auth-link" :href="feishuAuthHref" data-native-navigation>飞书授权</a>
        <a class="back-link" href="/apps">返回应用中心</a>
      </div>
    </header>

    <section v-if="submitted" class="submit-success" role="status">
      <span aria-hidden="true">✓</span>
      <div>
        <h2>申请已提交</h2>
        <p>{{ submitMessage }}，审批进度可在状态页查看。</p>
      </div>
      <a :href="statusHref">查看审批状态</a>
    </section>
    <section v-if="submitError" class="submit-error" role="alert">
      {{ submitError }}，请检查网络后重试。
    </section>
    <section v-if="submitting" class="submit-loading" role="status" aria-live="assertive">
      <span class="submit-spinner" aria-hidden="true"></span>
      <div>
        <strong>正在提交审批，请稍候…</strong>
        <p>正在创建审批并写入多维表格，请勿重复点击。</p>
      </div>
    </section>

    <form class="apply-form" :aria-busy="submitting" @submit.prevent="submitApplication">
      <p v-if="directoryState === 'loading'" class="directory-state" role="status">正在从飞书读取部门和人员数据…</p>
      <p v-else-if="directoryState === 'permission-denied'" class="directory-state directory-state-error" role="alert">需要完成飞书授权或获得通讯录读取权限后才能选择部门和人员。</p>
      <p v-else-if="directoryState === 'error'" class="directory-state directory-state-error" role="alert">飞书部门或人员数据读取失败，请稍后重试。</p>
      <p v-else-if="directoryState === 'disabled'" class="directory-state directory-state-error" role="alert">飞书部门和人员接口尚未启用。</p>
      <p v-else-if="directoryState === 'empty'" class="directory-state directory-state-error" role="alert">当前飞书账号下没有可选择的部门或人员。</p>
      <fieldset>
        <legend><span>1</span>申请人信息</legend>
        <div class="field-grid four-cols">
          <label>申请人<b>*</b><select v-model="form.applicant" :disabled="directoryDisabled" required @change="syncApplicantDepartment">
            <option value="" disabled>请选择申请人</option>
            <option v-for="user in userOptions" :key="user.adAccount" :value="user.adAccount">{{ user.displayName }}（{{ user.adAccount }}）</option>
          </select></label>
          <label>所属部门<b>*</b><select v-model="form.department" :disabled="directoryDisabled" required>
            <option value="" disabled>请选择所属部门</option>
            <option v-for="department in departmentOptions" :key="department.id" :value="department.name">{{ department.name }}</option>
          </select></label>
          <label>联系电话<b>*</b><input v-model="form.phone" required /></label>
          <label
            >联系邮箱<b>*</b><input v-model="form.email" type="email" required
          /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend><span>2</span>应用基础信息</legend>
        <div class="field-grid two-cols">
          <label
            >应用名称<b>*</b
            ><input
              v-model="form.name"
              maxlength="50"
              placeholder="请输入应用名称（不超过50个字）"
              required
          /></label>
          <label
            >应用编码
            <input
              v-model="form.applicationCode"
              maxlength="100"
              placeholder="请输入应用编码，例如 RPA-SCM-VENDOR-001"
          /></label>
          <label
            >应用类型<b>*</b
            ><select v-model="form.type" required>
              <option value="" disabled>请选择应用类型</option>
              <option
                v-for="item in applicationTypes"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select></label
          >
          <label
            >所属应用域<b>*</b
            ><select v-model="form.domain" required>
              <option value="" disabled>请选择所属应用域</option>
              <option
                v-for="item in businessDomains"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select></label
          >
          <label
            >摘要<b>*</b
            ><input
              v-model="form.summary"
              maxlength="80"
              placeholder="简要描述应用用途、价值和使用场景"
              required
          /></label>
          <label class="span-full"
            >应用简介<b>*</b
            ><textarea
              v-model="form.scenario"
              maxlength="300"
              rows="3"
              placeholder="请输入关键功能、使用对象和适用场景"
              required
            ></textarea
            ><small>{{ form.scenario.length }} / 300</small></label
          >
        </div>
      </fieldset>

      <fieldset class="type-detail-fields">
        <legend><span>2.1</span>应用详情信息</legend>
        <p class="detail-schema-hint">
          当前类型「{{ activeApplicationType.label }}」对应「{{ activeDetailSchema.tableName }}」，以下字段将随申请一并提交。
        </p>
        <div class="field-grid two-cols">
          <label
            v-for="field in activeDetailSchema.fields"
            :key="field.key"
            :class="{ 'span-full': field.control === 'textarea' }"
          >
            {{ field.key }}
            <textarea
              v-if="field.control === 'textarea'"
              v-model="detailDrafts[form.type][field.key]"
              rows="3"
              :placeholder="field.placeholder"
            ></textarea>
            <input
              v-else
              v-model="detailDrafts[form.type][field.key]"
              type="text"
              :placeholder="field.placeholder"
            />
          </label>
        </div>
      </fieldset>

      <div class="split-fields">
        <fieldset>
          <legend><span>3</span>协作与开发信息</legend>
          <label class="stacked"
            ><span>开发合作方信息<b>*</b></span
            ><textarea
              v-model="form.collaboration"
              maxlength="200"
              rows="4"
              placeholder="说明开发合作方、产品安全与数据合规情况"
              required
            ></textarea
            ><small>{{ form.collaboration.length }} / 200</small></label
          >
        </fieldset>
        <fieldset>
          <legend><span>4</span>应用链接 / 访问地址</legend>
          <label class="stacked"
            ><span>Web应用地址<b>*</b></span
            ><input
              v-model="form.webAddress"
              placeholder="请输入内网应用访问地址"
              required
          /></label>
          <label class="stacked"
            ><span>移动端地址（选填）</span
            ><input
              v-model="form.mobileAddress"
              placeholder="请输入移动端访问地址或应用名称"
          /></label>
        </fieldset>
      </div>

      <fieldset>
        <legend><span>5</span>接入人信息</legend>
        <div class="field-grid four-cols">
          <label>所属部门<b>*</b><select v-model="form.contactDepartment" :disabled="directoryDisabled" required @change="resetContactForDepartment">
            <option value="" disabled>请选择所属部门</option>
            <option v-for="department in departmentOptions" :key="department.id" :value="department.name">{{ department.name }}</option>
          </select></label>
          <label>接入人<b>*</b><select v-model="form.contact" :disabled="directoryDisabled || !form.contactDepartment" required>
            <option value="" disabled>请先选择所属部门</option>
            <option v-for="user in contactUserOptions" :key="user.adAccount" :value="user.adAccount">{{ user.displayName }}（{{ user.adAccount }}）</option>
          </select></label>
          <label
            >联系电话<b>*</b><input v-model="form.contactPhone" required
          /></label>
          <label
            >联系邮箱<b>*</b
            ><input v-model="form.contactEmail" type="email" required
          /></label>
        </div>
      </fieldset>

      <fieldset class="permission-box">
        <legend><span>6</span>应用权限开通</legend>
        <div class="field-grid four-cols">
          <label
            >适用部门<b v-if="form.type === 'T005'">*</b><select v-model="form.accessDepartment" :disabled="directoryDisabled" :required="form.type === 'T005'" @change="resetApplicableUserForDepartment">
              <option value="">请选择部门</option>
              <option v-for="department in departmentOptions" :key="department.id" :value="department.name">{{ department.name }}</option>
            </select></label
          >
          <label>适用用户<b v-if="form.type === 'T005'">*</b><select v-model="form.users" :disabled="directoryDisabled || !form.accessDepartment" :required="form.type === 'T005'">
            <option value="">请先选择适用部门</option>
            <option v-for="user in applicableUserOptions" :key="user.adAccount" :value="user.adAccount">{{ user.displayName }}（{{ user.adAccount }}）</option>
          </select></label>
          <label
            >适用角色<input v-model="form.roles" placeholder="请输入适用角色"
          /></label>
          <div class="scope-field">
            <span>权限范围<b>*</b></span
            ><label
              ><input
                v-model="form.scope"
                type="radio"
                value="assigned"
              />仅开放给部分部门/用户</label
            ><label
              ><input
                v-model="form.scope"
                type="radio"
                value="all"
              />全部组织可见</label
            >
          </div>
        </div>
      </fieldset>

      <div class="split-fields upload-section">
        <fieldset>
          <legend><span>7</span>组件与资源材料上传</legend>
          <div class="upload-grid">
            <label class="upload-box"
              ><strong>应用图标<b>*</b></strong
              ><span>＋ 点击上传</span
              ><small>PNG / JPG / SVG，单个不超过 10MB</small
              ><input
                type="file"
                accept=".png,.jpg,.jpeg,.svg"
                required
                @change="rememberFile('icon', $event)"
              /><em>{{ files.icon }}</em></label
            >
            <label class="upload-box"
              ><strong>资源压缩包（选填）</strong><span>＋ 点击上传</span
              ><small>ZIP / RAR，单个不超过 512MB</small
              ><input
                type="file"
                accept=".zip,.rar"
                @change="rememberFile('materials', $event)"
              /><em>{{ files.materials }}</em></label
            >
          </div>
        </fieldset>
        <fieldset>
          <legend><span>8</span>附件上传（选填）</legend>
          <label class="upload-box"
            ><strong>附件</strong><span>＋ 点击上传</span
            ><small>支持常用文档及压缩格式，最多 5 个文件</small
            ><input
              type="file"
              multiple
              @change="rememberFile('attachment', $event)"
            /><em>{{ files.attachment }}</em></label
          >
        </fieldset>
      </div>

      <fieldset>
        <legend><span>9</span>备注说明（选填）</legend>
        <label class="stacked">
          <textarea
            v-model="form.remarks"
            maxlength="500"
            rows="3"
            placeholder="如无其他需要说明的内容，请留空"
          ></textarea
          ><small>最多 500 字</small></label
        >
      </fieldset>

      <footer class="form-actions">
        <button type="button" @click="saveDraft">保存草稿</button
        ><a href="/apps">取消</a
        ><button type="submit" :disabled="submitting || directoryDisabled">
          {{ submitting ? "提交中…" : "提交审核" }}</button
        ><span v-if="saved">草稿已保存</span>
      </footer>
    </form>
  </article>
</template>

<style scoped>
.apply-page {
  height: auto;
  min-height: 100%;
  overflow: visible;
  padding: 18px 22px 32px;
  color: #183553;
}
.apply-crumb {
  display: flex;
  gap: 9px;
  margin-bottom: 10px;
  color: #6a7e94;
  font-size: 13px;
}
.apply-crumb a {
  color: #0060a6;
}
.apply-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #d9e4ee;
  border-radius: 7px;
}
.apply-heading h1 {
  margin: 0;
  color: #122d4f;
  font-size: 26px;
}
.apply-heading p {
  margin: 5px 0 0;
  color: #61758c;
  font-size: 13px;
}
.apply-heading b,
.apply-form b {
  margin-left: 3px;
  color: #d72f2f;
}
.back-link {
  padding: 9px 14px;
  color: #0060a6;
  border: 1px solid #9bb9d7;
  border-radius: 4px;
}
.heading-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.feishu-auth-link {
  padding: 9px 14px;
  color: #fff;
  background: #0060a6;
  border: 1px solid #0060a6;
  border-radius: 4px;
}
.feishu-auth-link:hover,
.feishu-auth-link:focus-visible {
  background: #004e8a;
  border-color: #004e8a;
}
.submit-success {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
  padding: 15px 18px;
  color: #165f45;
  background: #f0faf6;
  border: 1px solid #b9dfcf;
  border-radius: 7px;
}
.submit-success > span {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  color: #fff;
  background: #18865f;
  border-radius: 50%;
  font-size: 20px;
}
.submit-success h2,
.submit-success p {
  margin: 0;
}
.submit-success h2 {
  font-size: 17px;
}
.submit-success p {
  margin-top: 3px;
  font-size: 13px;
}
.submit-success a {
  color: #0060a6;
  font-weight: 700;
}
.submit-error {
  margin-bottom: 14px;
  padding: 12px 16px;
  color: #a52222;
  background: #fff5f5;
  border: 1px solid #efb8b8;
  border-radius: 7px;
}
.submit-loading {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 14px;
  padding: 13px 16px;
  color: #174a7a;
  background: #eef6ff;
  border: 1px solid #a9caeb;
  border-radius: 7px;
}
.submit-loading p {
  margin: 3px 0 0;
  color: #5e7791;
  font-size: 12px;
}
.submit-spinner {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border: 3px solid #b9d7f3;
  border-top-color: #0060a6;
  border-radius: 50%;
  animation: submit-spin 0.75s linear infinite;
}
@keyframes submit-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .submit-spinner { animation-duration: 1.8s; }
}
.apply-form {
  display: grid;
  gap: 12px;
}
.directory-state {
  margin: 0;
  padding: 11px 14px;
  color: #174a7a;
  background: #eef6ff;
  border: 1px solid #bdd6ef;
  border-radius: 6px;
  font-size: 13px;
}
.directory-state-error {
  color: #8f2d24;
  background: #fff5f5;
  border-color: #efb8b8;
}
.apply-form fieldset {
  min-width: 0;
  margin: 0;
  padding: 18px 16px 17px;
  background: #fff;
  border: 1px solid #d9e4ee;
  border-radius: 7px;
}
.apply-form legend {
  float: left;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 14px;
  padding: 0;
  color: #123b6a;
  font-size: 15px;
  font-weight: 700;
  line-height: 23px;
}
.apply-form legend + * {
  clear: both;
}
.apply-form legend span {
  width: 23px;
  height: 23px;
  display: inline-grid;
  place-items: center;
  margin-right: 0;
  color: #fff;
  background: #0060a6;
  border-radius: 50%;
  font-size: 12px;
}
.field-grid {
  display: grid;
  gap: 13px 16px;
}
.four-cols {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.two-cols {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.span-full {
  grid-column: 1/-1;
}
.type-detail-fields {
  border-color: #b7d0e8 !important;
}
.detail-schema-hint {
  clear: both;
  margin: -2px 0 14px;
  color: #6a7e94;
  font-size: 12px;
}
.type-detail-fields .field-grid > label {
  display: grid;
  grid-template-columns: minmax(92px, auto) minmax(0, 1fr);
  align-items: start;
  gap: 9px;
}
.type-detail-fields .field-grid > label.span-full {
  grid-template-columns: minmax(92px, auto) minmax(0, 1fr);
}
.type-detail-fields textarea {
  min-height: 74px;
}
.apply-form label {
  min-width: 0;
  color: #314b68;
  font-size: 13px;
}
.field-grid > label:not(.span-full) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 9px;
}
.apply-form :is(input, select, textarea) {
  width: 100%;
  min-width: 0;
  color: #263f5c;
  background: #fff;
  border: 1px solid #cbd9e7;
  border-radius: 4px;
}
.apply-form :is(input, select) {
  height: 38px;
  padding: 0 11px;
}
.apply-form textarea {
  padding: 10px 11px;
  resize: vertical;
  line-height: 1.6;
}
.apply-form :is(input, select, textarea):focus {
  border-color: #0060a6;
  outline: 3px solid rgba(11, 103, 199, 0.13);
}
.apply-form small {
  justify-self: end;
  color: #7a8c9e;
  font-size: 12px;
}
.stacked {
  display: grid;
  gap: 8px;
}
.split-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.scope-field {
  display: flex;
  align-items: center;
  gap: 13px;
  flex-wrap: wrap;
}
.scope-field > span {
  font-size: 13px;
}
.scope-field label {
  display: flex;
  align-items: center;
  gap: 5px;
}
.scope-field input {
  width: 16px;
  height: 16px;
}
.permission-box {
  border-color: #80b3e7 !important;
}
.upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.upload-box {
  min-height: 116px;
  position: relative;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 5px;
  padding: 12px;
  text-align: center;
  background: #fbfdff;
  border: 1px dashed #9eb8d3;
  border-radius: 5px;
  cursor: pointer;
}
.upload-box > span {
  color: #0060a6;
  font-weight: 700;
}
.upload-box input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.upload-box em {
  max-width: 100%;
  color: #2f668d;
  font-size: 12px;
  font-style: normal;
  overflow-wrap: anywhere;
}
.form-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 10px;
}
.form-actions :is(button, a) {
  min-width: 108px;
  height: 38px;
  display: grid;
  place-items: center;
  padding: 0 18px;
  color: #0060a6;
  background: #fff;
  border: 1px solid #7da8d6;
  border-radius: 4px;
}
.form-actions button[type="submit"] {
  color: #fff;
  background: #0060a6;
  border-color: #0060a6;
}
.form-actions button:disabled {
  cursor: wait;
  opacity: 0.65;
}
.form-actions span {
  color: #19805c;
  font-size: 13px;
}
@media (max-width: 1400px) {
  .four-cols {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .upload-section {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 900px) {
  .apply-heading {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .heading-actions {
    justify-self: start;
    flex-wrap: wrap;
  }
}
@media (max-width: 780px) {
  .apply-page {
    padding: 10px;
  }
  .apply-heading,
  .submit-success {
    grid-template-columns: 1fr;
    display: grid;
    gap: 10px;
  }
  .two-cols,
  .four-cols,
  .split-fields,
  .upload-grid {
    grid-template-columns: 1fr;
  }
  .field-grid > label:not(.span-full) {
    grid-template-columns: 1fr;
  }
  .form-actions {
    flex-wrap: wrap;
  }
}
.field-grid > label:not(.span-full) {
  grid-template-columns: max-content max-content minmax(0, 1fr);
  align-content: start;
  gap: 4px;
}
.field-grid > label:not(.span-full) > :is(input, select) {
  grid-column: 1/-1;
  margin-top: 3px;
}
.field-grid > label:not(.span-full) > b {
  margin: 0;
}
.apply-form {
  font-size: 15px;
}
.apply-form legend {
  font-size: 17px;
}
.apply-form label {
  font-size: 14px;
}
@media (max-width: 780px) {
  .field-grid > label:not(.span-full) {
    grid-template-columns: max-content max-content 1fr;
  }
}
</style>
