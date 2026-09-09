<script setup>
import { reactive, ref } from "vue";

const form = reactive({
  applicant: "张三丰",
  department: "物资采购中心",
  phone: "139****5678",
  email: "zhangsan@enterprise.local",
  name: "",
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
const files = reactive({ icon: "", materials: "", attachment: "" });
const selectedFiles = { icon: [], materials: [], attachment: [] };
const saved = ref(false);
const submitted = ref(false);
const submitting = ref(false);
const submitError = ref("");
const submitMessage = ref("");
const announcement = ref("");

const applicationTypes = [
  { label: "可视化", value: "T007" },
  { label: "报表", value: "T006" },
  { label: "RPA", value: "T003" },
  { label: "数据集", value: "T008" },
  { label: "指标", value: "T009" },
  { label: "AI", value: "T001" },
  { label: "海能work应用", value: "T005" },
  { label: "EAD", value: "T002" },
  { label: "其他工具", value: "T004" },
];
const businessDomains = [
  { label: "智能办公", value: "BD001" },
  { label: "综合管理", value: "BD002" },
  { label: "供应链管理", value: "BD003" },
  { label: "经营分析", value: "BD004" },
  { label: "数字化办公", value: "BD005" },
];
const departmentCodes = {
  信息化管理部: "D001",
  数据智能部: "D002",
  供应链管理部: "D003",
  物资采购中心: "D004",
  经营管理部: "D005",
};

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
  announcement.value = "申请草稿已保存在本地演示会话中";
}
function departmentId(value) {
  return departmentCodes[value] || value;
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
      接入人AD账号: form.contact,
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
      备注说明: form.remarks,
    },
  };
}
async function submitApplication() {
  if (form.type !== "T003") {
    submitted.value = true;
    saved.value = false;
    announcement.value = "应用上架申请已提交，当前进入审批中状态";
    return;
  }

  submitting.value = true;
  submitError.value = "";
  submitted.value = false;
  announcement.value = "正在提交 RPA 应用审批";
  try {
    const formData = new FormData();
    formData.append("request", JSON.stringify(buildRpaApprovalRequest()));
    Object.values(selectedFiles).flat().forEach((file) => {
      formData.append("file", file, file.name);
    });
    const response = await fetch("http://10.151.23.119:28080/api/processInstanceStart", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`审批接口请求失败（${response.status}）`);
    }
    const result = await response.json();
    if (result.code !== "00000") {
      throw new Error(result.message || "提交失败");
    }
    submitted.value = true;
    saved.value = false;
    submitMessage.value = result.message || "操作成功";
    announcement.value = "RPA 应用上架申请已提交，当前进入审批中状态";
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
      <a class="back-link" href="/apps">返回应用中心</a>
    </header>

    <section v-if="submitted" class="submit-success" role="status">
      <span aria-hidden="true">✓</span>
      <div>
        <h2>申请已提交</h2>
        <p>{{ submitMessage }}，审批进度可在状态页查看。</p>
      </div>
      <a href="/apps/onboarding/status">查看审批状态</a>
    </section>
    <section v-if="submitError" class="submit-error" role="alert">
      {{ submitError }}，请检查网络后重试。
    </section>

    <form class="apply-form" @submit.prevent="submitApplication">
      <fieldset>
        <legend><span>1</span>申请人信息</legend>
        <div class="field-grid four-cols">
          <label
            >申请人<b>*</b><input v-model="form.applicant" required
          /></label>
          <label
            >所属部门<b>*</b><input v-model="form.department" required
          /></label>
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
          <label
            >所属部门<b>*</b><input v-model="form.contactDepartment" required
          /></label>
          <label>接入人<b>*</b><input v-model="form.contact" required /></label>
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
            >适用部门<select v-model="form.accessDepartment">
              <option value="">请选择部门</option>
              <option>集团公司</option>
              <option>专业分公司</option>
              <option>直属单位</option>
            </select></label
          >
          <label
            >适用用户<input v-model="form.users" placeholder="请输入适用用户"
          /></label>
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
        ><button type="submit" :disabled="submitting">
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
.apply-form {
  display: grid;
  gap: 12px;
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
  .back-link {
    justify-self: start;
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
