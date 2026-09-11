<script setup>
// Reference SHA-256: 3A6FE5F2761C9AF32A5759879FDBF1F27AEE4056EEE4006FD0297B6ECA5866D6
import { computed, ref } from "vue";
import TypeLineIcon from "../components/TypeLineIcon.vue";

const props = defineProps({
  integrationData: { type: Object, default: null },
  integrationState: { type: String, default: "mock" },
});

const directions = [
  ["全部", "apps"],
  ["可视化", "visual"],
  ["报表", "report"],
  ["RPA", "rpa"],
  ["数据集", "dataset"],
  ["指标", "metric"],
  ["AI", "ai"],
  ["海能work应用", "work"],
  ["EAD", "ead"],
];
const scenes = [
  "全部场景域",
  "生产运营",
  "设备管理",
  "设备分析",
  "安全环保",
  "供应链管理",
  "人力资源",
  "财务管理",
  "市场营销",
];
const news = [
  ["通知", "2026年第三期数智化认证考试报名正式启动", "09月01日"],
  ["通知", "数字化认证平台能力地图与学习路径更新说明", "08月28日"],
  ["培训", "FineReport 高级认证专题培训课程预告", "08月25日"],
  ["资讯", "AI 与驾驶舱联合认证案例分享活动通知", "08月21日"],
  ["通知", "第三期认证考试地点及场次安排", "08月18日"],
];
const selectedDirection = ref("全部");
const selectedScene = ref("全部场景域");
const sceneQuery = ref("");
const announcement = ref("");
const bookingDialog = ref(null);
const bookingType = ref("报表");

const remoteMode = computed(() => props.integrationState !== "mock");
const remoteState = computed(() => props.integrationState);
const remoteBlocked = computed(
  () =>
    remoteState.value === "error" ||
    remoteState.value === "authentication-required" ||
    remoteState.value === "empty",
);
const remoteOverview = computed(() => props.integrationData?.['CER-001'] || {});
const remoteList = computed(() => props.integrationData?.['CER-002'] || {});
const remoteDetail = computed(() => props.integrationData?.['CER-003'] || null);
const remoteBookingConfigured = computed(() => props.integrationData?.['CER-004']?.configured === true);
const remoteBookingBlocked = computed(() => remoteMode.value && !remoteBookingConfigured.value);

function valueText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function itemName(item, fallback = "") {
  if (typeof item === "string") return item;
  return valueText(
    item?.name ??
      item?.label ??
      item?.title ??
      item?.directionName ??
      item?.sceneName ??
      item?.categoryName ??
      item?.code ??
      item?.id,
    fallback,
  );
}

function iconFor(name) {
  const text = String(name).toLowerCase();
  if (text.includes("rpa")) return "rpa";
  if (text.includes("ai")) return "ai";
  if (text.includes("数据")) return "dataset";
  if (text.includes("指标")) return "metric";
  if (text.includes("驾驶")) return "dashboard";
  if (text.includes("报表")) return "report";
  if (text.includes("可视")) return "visual";
  if (text.includes("work")) return "work";
  if (text.includes("ead")) return "ead";
  return "apps";
}

function unique(values) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

const remoteDirections = computed(() => {
  if (remoteBlocked.value) return [];
  const rows = Array.isArray(remoteOverview.value.directions)
    ? remoteOverview.value.directions
    : [];
  const mapped = unique(rows.map((item) => itemName(item))).map((name) => [
    name,
    iconFor(name),
  ]);
  return mapped.length ? [["全部", "apps"], ...mapped] : [];
});

const remoteScenes = computed(() => {
  if (remoteBlocked.value) return [];
  const rows = Array.isArray(remoteOverview.value.sceneTags)
    ? remoteOverview.value.sceneTags
    : [];
  const mapped = unique(rows.map((item) => itemName(item)));
  return mapped.length ? ["全部场景域", ...mapped] : [];
});

const remoteNews = computed(() => {
  if (remoteBlocked.value) return [];
  const rows = Array.isArray(remoteOverview.value.news)
    ? remoteOverview.value.news
    : [];
  return rows
    .map((item) => [
      valueText(item?.type ?? item?.category ?? item?.statusName, "动态"),
      valueText(item?.title ?? item?.name ?? item?.summary, "认证动态"),
      valueText(item?.publishedAt ?? item?.date ?? item?.updatedAt),
    ])
    .filter((item) => item[1]);
});

const remoteBookingTypes = computed(() => {
  if (remoteBlocked.value) return [];
  const rows = Array.isArray(remoteList.value.items) ? remoteList.value.items : [];
  const detailName = itemName(remoteDetail.value);
  return unique([detailName, ...rows.map((item) => itemName(item))]).slice(0, 8);
});

const displayedDirections = computed(() =>
  remoteMode.value ? remoteDirections.value : directions,
);
const displayedScenes = computed(() =>
  remoteMode.value ? remoteScenes.value : scenes,
);
const displayedNews = computed(() => (remoteMode.value ? remoteNews.value : news));
const bookingTypes = computed(() =>
  remoteMode.value
    ? remoteBookingTypes.value
    : ["RPA", "可视化", "驾驶舱", "报表", "数据集", "AI"],
);
const tickerItems = computed(() =>
  displayedNews.value.length
    ? displayedNews.value.slice(0, 3).map((item) => item[1])
    : ["认证数据正在等待同步"],
);
const remoteBoundaryVisible = computed(
  () =>
    remoteMode.value &&
    (remoteState.value === "error" ||
      remoteState.value === "authentication-required" ||
      remoteState.value === "empty" ||
      (!displayedDirections.value.length &&
        !displayedScenes.value.length &&
        !displayedNews.value.length)),
);
const remoteBoundaryTitle = computed(() =>
  remoteState.value === "error" || remoteState.value === "authentication-required"
    ? "认证数据加载失败"
    : "暂无认证数据",
);
const remoteBoundaryDescription = computed(() =>
  remoteState.value === "authentication-required"
    ? "当前账号暂未获得查看认证数据的权限。"
    : remoteState.value === "error"
      ? "远程认证数据暂不可用，请稍后重试。"
      : "当前筛选下暂无认证方向、场景域或动态。",
);
const filteredScenes = computed(() =>
  displayedScenes.value.filter(
    (item) => !sceneQuery.value || item.includes(sceneQuery.value.trim()),
  ),
);

function chooseDirection(item) {
  selectedDirection.value = item;
  announcement.value = `已选择认证方向：${item}`;
}
function chooseScene(item) {
  selectedScene.value = item;
  announcement.value = `已选择场景域：${item}`;
}
function openBooking(item = "报表") {
  if (remoteBookingBlocked.value) {
    announcement.value = "正式预约写入合同尚未提供，当前仅可查看认证信息";
    return;
  }
  bookingType.value = item;
  bookingDialog.value?.showModal();
}
function confirmBooking() {
  if (remoteBookingBlocked.value) {
    announcement.value = "正式预约写入合同尚未提供，未提交预约";
    return;
  }
  announcement.value = `已完成 ${bookingType.value} 认证考试的本地预约演示`;
  bookingDialog.value?.close();
}
</script>

<template>
  <article class="cert-page" aria-labelledby="cert-title">
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <section class="cert-hero">
      <div class="cert-hero-copy">
        <span class="hero-kicker">数字化认证平台</span>
        <h1 id="cert-title">企业内唯一与帆软公司联合认证单位</h1>
        <p>依托帆软权威认证体系，提供 FineReport / FineBI 全方向培训与认证。</p>
        <p>从学习到考试一站式完成，让认证成为你数智化能力的硬核证明。</p>
        <div>
          <a class="hero-primary" href="#study">工具学习</a
          ><button type="button" :disabled="remoteBookingBlocked" :aria-disabled="remoteBookingBlocked" @click="openBooking()">考试预约</button>
        </div>
      </div>
      <div class="hero-visual">
        <img
          src="/assets/certification-hero-illustration.png"
          width="710"
          height="302"
          alt="蓝色认证盾牌与数字城市插图"
        />
      </div>
    </section>

    <div class="ticker" role="note">
      <strong>认证动态</strong
      ><template v-for="(item, index) in tickerItems" :key="item"
        ><span>{{ item }}</span
        ><i v-if="index < tickerItems.length - 1"></i
      ></template>
    </div>

    <section
      v-if="remoteBoundaryVisible"
      class="cert-remote-state"
      role="status"
      aria-live="polite"
    >
      <TypeLineIcon name="ead" :size="30" />
      <div>
        <h2>{{ remoteBoundaryTitle }}</h2>
        <p>{{ remoteBoundaryDescription }}</p>
      </div>
    </section>

    <div class="cert-layout">
      <section class="cert-main" aria-label="认证动态与学习工具">
        <section class="news">
          <header>
            <div>
              <span>最新动态</span>
              <h2>新闻公告</h2>
            </div>
            <a href="/announcements">查看全部</a>
          </header>
          <ul>
            <li v-for="item in displayedNews" :key="item[1]">
              <mark>{{ item[0] }}</mark
              ><span>{{ item[1] }}</span
              ><time>{{ item[2] }}</time>
            </li>
          </ul>
        </section>

        <section id="study" class="learning-card" aria-labelledby="study-title">
          <header>
            <span class="action-icon"
              ><TypeLineIcon name="report" :size="28"
            /></span>
            <div>
              <small>认证学习中心</small>
              <h2 id="study-title">工具学习</h2>
              <p>
                选择认证方向和业务场景，获取匹配的课程、学习路径与能力测评。
              </p>
            </div>
          </header>
          <div class="learning-filters">
            <section aria-labelledby="direction-title">
              <h3 id="direction-title">认证方向 / 应用类型</h3>
              <div class="direction-tags">
                <button
                  v-for="[item, icon] in displayedDirections"
                  :key="item"
                  type="button"
                  :aria-pressed="selectedDirection === item"
                  @click="chooseDirection(item)"
                >
                  <TypeLineIcon :name="icon" :size="18" />{{ item }}
                </button>
              </div>
            </section>
            <section aria-labelledby="scene-title">
              <h3 id="scene-title">场景域搜索</h3>
              <label class="scene-input"
                ><span class="sr-only">搜索场景域</span
                ><input
                  v-model="sceneQuery"
                  type="search"
                  placeholder="搜索场景域"
              /></label>
              <div class="scene-tags">
                <button
                  v-for="item in filteredScenes"
                  :key="item"
                  type="button"
                  :aria-pressed="selectedScene === item"
                  @click="chooseScene(item)"
                >
                  {{ item }}
                </button>
              </div>
            <p v-if="!filteredScenes.length" class="no-result">
              未找到匹配场景域
            </p>
            </section>
          </div>
          <footer class="learning-result">
            <div>
              <span>当前筛选</span
              ><strong>{{ selectedDirection }} · {{ selectedScene }}</strong>
              <p>已为你匹配专题课程、案例复盘、能力测评和考试准备资料。</p>
            </div>
            <a href="/training">进入课堂　›</a>
          </footer>
        </section>
      </section>

      <aside class="cert-info">
        <section class="platform-service">
          <div class="info-block">
            <span class="info-icon"
              ><TypeLineIcon name="apps" :size="24"
            /></span>
            <div>
              <small>平台与服务</small>
              <h2>数字化认证平台</h2>
              <p>
                企业内唯一与帆软联合的认证单位，依托权威体系培养数智化专业人才，助力业务创新与数字化转型。
              </p>
            </div>
          </div>
          <div class="info-block service-block">
            <span class="info-icon"
              ><TypeLineIcon name="work" :size="24"
            /></span>
            <div>
              <h3>认证服务</h3>
              <p>工作日 09:00—17:30</p>
              <p>Cert@haiyou.com<br />010-8888-0000</p>
            </div>
          </div>
        </section>
        <section id="booking" class="booking">
          <span class="action-icon"
            ><TypeLineIcon name="ead" :size="28"
          /></span>
          <div>
            <small>线上预约服务</small>
            <h2>考试预约</h2>
            <p>选择认证类别并预约考试场次。</p>
            <p v-if="remoteBookingBlocked" class="booking-blocked" role="status">正式预约写入合同尚未提供，预约入口已禁用。</p><div class="booking-tags">
              <button
                v-for="item in bookingTypes"
                :key="item"
                type="button"
                :disabled="remoteBookingBlocked"
                :aria-disabled="remoteBookingBlocked"
                @click="openBooking(item)"
              >
                {{ item }}
              </button>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <dialog
      ref="bookingDialog"
      class="booking-dialog"
      aria-labelledby="booking-title"
    >
      <form method="dialog" @submit.prevent="confirmBooking">
        <header>
          <span class="dialog-icon"
            ><TypeLineIcon name="ead" :size="26"
          /></span>
          <div>
            <h2 id="booking-title">预约认证考试</h2>
            <p>当前预约类别：{{ bookingType }}</p>
          </div>
          <button
            type="button"
            aria-label="关闭"
            @click="bookingDialog.close()"
          >
            ×
          </button>
        </header>
        <label
          >考试场次<select required>
            <option value="">请选择考试场次</option>
            <option>2026-09-18 14:00　总部考试中心</option>
            <option>2026-09-25 09:30　线上监考场</option>
            <option>2026-10-16 14:00　总部考试中心</option>
          </select></label
        >
        <label>联系电话<input value="139****5678" required /></label>
        <footer>
          <button type="button" @click="bookingDialog.close()">取消</button
          ><button type="submit" :disabled="remoteBookingBlocked">确认预约</button>
        </footer>
      </form>
    </dialog>
  </article>
</template>

<style scoped>
:global(#main-content) > .cert-page {
  padding: 18px 20px 28px;
}
.cert-page {
  min-height: 100%;
  overflow: visible;
  color: #17304f;
}
.cert-hero {
  min-height: 310px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 1fr);
  overflow: hidden;
  background: linear-gradient(110deg, #eef5fd 0, #f7fbff 52%, #dcecff 100%);
  border: 1px solid #d3e0ee;
  border-radius: 8px;
}
.cert-hero-copy {
  z-index: 1;
  align-self: center;
  padding: 36px 28px 36px 42px;
}
.hero-kicker {
  display: inline-block;
  margin-bottom: 10px;
  color: #0060a6;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.cert-hero h1 {
  max-width: 720px;
  margin: 0 0 18px;
  color: #102c50;
  font-size: clamp(26px, 2vw, 34px);
  line-height: 1.25;
}
.cert-hero p {
  margin: 7px 0;
  color: #344d69;
  font-size: 15px;
  line-height: 1.65;
}
.cert-hero-copy > div {
  display: flex;
  gap: 14px;
  margin-top: 24px;
}
.cert-hero-copy :is(a, button) {
  min-width: 136px;
  height: 42px;
  display: grid;
  place-items: center;
  padding: 0 18px;
  border: 1px solid #0060a6;
  border-radius: 4px;
  font-size: 14px;
}
.cert-hero-copy .hero-primary {
  color: #fff !important;
  background: #0060a6;
}
.cert-hero-copy button {
  color: #0060a6;
  background: #fff;
}
.hero-visual {
  min-width: 0;
  min-height: 310px;
  position: relative;
  overflow: hidden;
}
.hero-visual img {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
  display: block;
  object-fit: cover;
  object-position: center;
}
.ticker {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
  padding: 11px 16px;
  background: #fff;
  border: 1px solid #d8e3ed;
  border-radius: 6px;
  color: #435d77;
  font-size: 13px;
}
.ticker strong {
  color: #0060a6;
}
.ticker i {
  width: 1px;
  height: 16px;
  background: #d8e1ea;
}
.cert-remote-state {
  min-height: 92px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #d8e3ed;
  border-radius: 7px;
  color: #50677f;
}
.cert-remote-state h2 {
  margin: 0 0 6px;
  color: #17304f;
  font-size: 18px;
}
.cert-remote-state p {
  margin: 0;
  font-size: 14px;
}
.cert-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(340px, 0.65fr);
  gap: 12px;
  margin-top: 12px;
}
.cert-main,
.cert-info {
  display: grid;
  align-content: start;
  gap: 12px;
}
.news,
.learning-card,
.cert-info > section {
  padding: 18px;
  background: #fff;
  border: 1px solid #d8e3ed;
  border-radius: 7px;
}
.cert-layout h2 {
  margin: 0;
  color: #163654;
  font-size: 18px;
}
.news header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 9px;
}
.news header span,
.learning-card small,
.booking small,
.info-block small {
  color: #0060a6;
  font-size: 12px;
  font-weight: 700;
}
.news header h2 {
  margin-top: 2px;
}
.news header a {
  color: #0060a6;
  font-size: 13px;
  font-weight: 700;
}
.news ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.news li {
  min-height: 43px;
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr) 72px;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #e9eef3;
  font-size: 13px;
}
.news li:last-child {
  border: 0;
}
.news mark {
  justify-self: start;
  padding: 3px 6px;
  color: #0060a6;
  background: #eaf3fc;
  border-radius: 3px;
}
.news time {
  color: #738599;
  text-align: right;
}
.learning-card > header {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
}
.learning-card header p,
.booking p,
.cert-info p {
  margin: 7px 0;
  color: #5c7187;
  font-size: 13px;
  line-height: 1.65;
}
.action-icon,
.info-icon,
.dialog-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  flex: 0 0 48px;
  color: #0060a6;
  background: #f2f7fc;
  border: 1px solid #d4e0ec;
  border-radius: 6px;
}
.learning-filters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 18px;
  padding-top: 17px;
  border-top: 1px solid #e4ebf2;
}
.learning-filters > section {
  min-width: 0;
}
.learning-filters h3 {
  margin: 0 0 11px;
  color: #29445f;
  font-size: 14px;
}
.direction-tags,
.scene-tags {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.direction-tags button,
.scene-tags button {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
  padding: 7px 9px;
  color: #29445f;
  background: #fff;
  border: 1px solid #d5e0ea;
  border-radius: 4px;
  text-align: left;
  font-size: 12px;
}
.direction-tags button[aria-pressed="true"],
.scene-tags button[aria-pressed="true"] {
  color: #0060a6;
  background: #eaf3fd;
  border-color: #78aee2;
  font-weight: 700;
}
.scene-input {
  display: flex;
  margin-bottom: 9px;
}
.scene-input input {
  width: 100%;
  height: 38px;
  padding: 0 11px;
  color: #344d68;
  border: 1px solid #cbd9e6;
  border-radius: 4px;
}
.scene-tags button {
  justify-content: center;
}
.no-result {
  color: #75869a;
  text-align: center;
}
.learning-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 18px;
  padding: 15px 16px;
  background: #f5f9fd;
  border: 1px solid #d8e6f2;
  border-radius: 6px;
}
.learning-result div {
  display: grid;
  gap: 3px;
}
.learning-result span {
  color: #6a7f94;
  font-size: 12px;
}
.learning-result strong {
  color: #163d66;
  font-size: 15px;
}
.learning-result p {
  margin: 0;
  color: #5b7188;
  font-size: 13px;
}
.learning-result a {
  flex: 0 0 auto;
  min-width: 132px;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  color: #fff !important;
  background: #0060a6;
  border: 1px solid #0060a6;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}
.cert-info > section {
  display: grid;
  gap: 16px;
}
.info-block {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 13px;
}
.service-block {
  padding-top: 16px;
  border-top: 1px solid #e4ebf2;
}
.service-block h3 {
  margin: 0;
  color: #173654;
  font-size: 16px;
}
.cert-info .booking {
  grid-template-columns: auto 1fr;
}
.booking-tags {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 12px;
}
.booking-tags button {
  min-height: 36px;
  color: #0060a6;
  background: #fff;
  border: 1px solid #aac2da;
  border-radius: 4px;
}
.booking-tags button:hover {
  background: #edf5fd;
}
.booking-dialog {
  width: min(520px, calc(100% - 32px));
  padding: 0;
  border: 0;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(8, 32, 58, 0.25);
}
.booking-dialog::backdrop {
  background: rgba(5, 29, 54, 0.42);
}
.booking-dialog form {
  display: grid;
  gap: 15px;
  padding: 20px;
}
.booking-dialog header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
}
.booking-dialog header h2,
.booking-dialog header p {
  margin: 0;
}
.booking-dialog header p {
  margin-top: 3px;
  color: #64788e;
}
.booking-dialog header > button {
  border: 0;
  background: transparent;
  font-size: 25px;
}
.booking-dialog label {
  display: grid;
  gap: 7px;
  font-weight: 700;
}
.booking-dialog :is(select, input) {
  height: 40px;
  padding: 0 10px;
  border: 1px solid #cbd9e6;
  border-radius: 4px;
}
.booking-dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.booking-dialog footer button {
  min-width: 92px;
  height: 38px;
  color: #0060a6;
  background: #fff;
  border: 1px solid #8ab0d4;
  border-radius: 4px;
}
.booking-dialog footer button:last-child {
  color: #fff;
  background: #0060a6;
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
:is(button, a):focus-visible {
  outline: 3px solid #ff9f1a;
  outline-offset: 2px;
}
@media (max-width: 1180px) {
  .cert-hero {
    grid-template-columns: minmax(0, 1fr) minmax(360px, 0.9fr);
  }
  .cert-layout {
    grid-template-columns: 1fr;
  }
  .cert-info {
    grid-template-columns: 1.15fr 0.85fr;
  }
  .learning-filters {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 820px) {
  .cert-hero {
    grid-template-columns: 1fr;
  }
  .hero-visual {
    min-height: 230px;
  }
  .cert-layout,
  .cert-info,
  .learning-filters {
    grid-template-columns: 1fr;
  }
  .ticker {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .ticker i {
    display: none;
  }
}
@media (max-width: 600px) {
  :global(#main-content) > .cert-page {
    padding: 10px;
  }
  .cert-hero-copy {
    padding: 26px 20px;
  }
  .cert-hero-copy > div {
    flex-wrap: wrap;
  }
  .cert-hero-copy :is(a, button) {
    flex: 1;
  }
  .direction-tags,
  .scene-tags {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .news li {
    grid-template-columns: 45px 1fr;
  }
  .news time {
    grid-column: 2;
  }
  .learning-result {
    align-items: flex-start;
    flex-direction: column;
  }
  .booking-tags {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
