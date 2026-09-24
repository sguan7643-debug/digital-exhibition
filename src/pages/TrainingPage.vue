<script setup>
// Reference SHA-256: 68508151B1490F117074C44F464732A6986DAE68DDE5C23296DB0529C2C12E86
import { computed, ref } from "vue";
import { buildApplicationWriteInput } from "../integration/application-actions.js";

const props = defineProps({
  integrationData: { type: Object, default: null },
  integrationState: { type: String, default: "loading" },
  operationExecutor: { type: Function, default: null },
  actionExecutor: { type: Function, default: null },
  testWritesEnabled: { type: Boolean, default: false },
});

const selected = ref("全部");
const announcement = ref("");
const remoteMode = computed(() => true);
const remoteState = computed(() => props.integrationState);
const remoteCourses = computed(() =>
  remoteState.value === "error" || remoteState.value === "authentication-required" || remoteState.value === "empty" ? [] : props.integrationData?.['TRN-002']?.items?.map((course) => ({
    id: course.courseId,
    category: course.categoryName || course.categoryCode || "其他",
    date: course.startAt || "时间待定",
    title: course.title,
    speaker: course.lecturerName || "讲师待定",
    description: course.summary || "暂无课程简介",
    count: String(course.registeredCount ?? 0),
    action: String(course.statusCode).toUpperCase() === "LIVE" ? "进入直播" : "立即报名",
    deliveryMode: course.deliveryMode,
  })) || [],
);
const courseSource = computed(() => remoteCourses.value);
const tabs = computed(() => {
  const counts = new Map();
  for (const course of courseSource.value) counts.set(course.category, (counts.get(course.category) || 0) + 1);
  return [["全部", courseSource.value.length], ...[...counts].sort(([a], [b]) => a.localeCompare(b, "zh-CN"))];
});
const visibleCourses = computed(() =>
  selected.value === "全部"
    ? courseSource.value
    : courseSource.value.filter((course) => course.category === selected.value),
);
function selectTab(tab) {
  selected.value = tab;
  announcement.value = `已筛选${tab}培训，共 ${visibleCourses.value.length} 项近期活动`;
}
async function register(course) {
  if (!props.testWritesEnabled || !props.actionExecutor || !course.id) {
    announcement.value = `${course.title}：真实 TEST_ 报名通道未启用`;
    return;
  }
  try {
    const input = buildApplicationWriteInput('TRN-004', course.id);
    await props.actionExecutor('TRN-004', input, { confirmed: true });
    announcement.value = `${course.title}：TEST_ 报名已由服务端确认`;
  } catch (error) {
    announcement.value = `${course.title}：报名失败，${error.message || '请稍后重试'}`;
  }
}
async function enterCourse(course) {
  if (!props.operationExecutor || !course.id) {
    announcement.value = `${course.title}：真实课程入口未启用`;
    return;
  }
  try {
    const response = await props.operationExecutor('TRN-006', { courseId: course.id, sourcePage: '/training' });
    if (!response.data.allowed || !response.data.launchUrl) {
      announcement.value = `${course.title}：${response.data.reasonCode || '当前无访问权限'}`;
      return;
    }
    window.open(response.data.launchUrl, '_blank', 'noopener,noreferrer');
    announcement.value = `${course.title}：已通过服务端权限校验`;
  } catch (error) {
    announcement.value = `${course.title}：课程入口获取失败，${error.message || '请稍后重试'}`;
  }
}
</script>

<template>
  <article class="training-page" aria-labelledby="training-title">
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <section class="training-hero">
      <div class="hero-copy">
        <span class="hero-kicker">学习与交流</span>
        <h1 id="training-title">培训课堂</h1>
        <p>
          聚焦业务分享与专题活动，支持报名参与与直播学习，助力知识沉淀与能力提升。
        </p>
        <div class="hero-stats">
          <article>
            <AppIcon name="training-stat-total" :size="58" /><span
              >活动总数<strong>186</strong></span
            >
          </article>
          <article>
            <AppIcon name="training-stat-registered" :size="58" /><span
              >报名中<strong>78</strong></span
            >
          </article>
          <article>
            <AppIcon name="training-stat-soon" :size="58" /><span
              >即将开始<strong>28</strong></span
            >
          </article>
        </div>
      </div>
      <img
        class="hero-illustration"
        src="/assets/training-hero-illustration.png"
        width="610"
        height="226"
        alt="培训课堂蓝色书本与学士帽插图"
      />
    </section>
    <nav class="training-tabs" aria-label="培训分类">
      <button
        v-for="[tab, total] in tabs"
        :key="tab"
        type="button"
        :aria-current="selected === tab ? 'page' : undefined"
        @click="selectTab(tab)"
      >
        {{ tab }}（{{ total }}）
      </button>
    </nav>
    <section class="course-grid" aria-label="近期培训活动">
      <article v-for="course in visibleCourses" :key="course.id || course.title">
        <header>
          <div class="course-meta">
            <mark>{{ course.category }}</mark
            ><time>{{ course.date }}</time>
          </div>
          <h2>{{ course.title }}</h2>
          <small>{{ course.speaker }}</small>
        </header>
        <p>{{ course.description }}</p>
        <dl class="course-status">
          <div>
            <dt>报名人数</dt>
            <dd>{{ course.count }} 人</dd>
          </div>
          <div>
            <dt>活动形式</dt>
            <dd>
              {{ course.action === "进入直播" ? "线上直播" : "专题活动" }}
            </dd>
          </div>
        </dl>
        <footer>
          <a v-if="course.id" :href="`/training?courseId=${encodeURIComponent(course.id)}`">查看详情</a
          ><button v-else type="button" disabled>查看详情</button
          ><button type="button" @click="course.action === '进入直播' ? enterCourse(course) : register(course)">
            {{ course.action }}
          </button>
        </footer>
      </article>
    </section>
    <section v-if="!visibleCourses.length" class="training-empty" role="status">
      <h2>{{ remoteState === "error" || remoteState === "authentication-required" ? "培训课程加载失败" : "暂无符合条件的培训课程" }}</h2>
      <p>当前未获得 TRN-002 飞书课程记录。</p>
    </section>
    <footer class="training-pagination">
      <strong>共 {{ courseSource.length }} 条</strong>
      <nav aria-label="分页">
        <button type="button">上一页</button
        ><button type="button" aria-current="page">1</button
        ><button type="button">2</button><button type="button">3</button
        ><button type="button">下一页</button>
      </nav>
    </footer>
  </article>
</template>

<style scoped>
.training-page {
  height: auto;
  min-height: 100%;
  overflow: visible;
  padding: 18px 20px 26px;
  color: #17304f;
}
.training-hero {
  min-height: 260px;
  position: relative;
  display: flex;
  overflow: hidden;
  padding: 28px 30px;
  background: linear-gradient(112deg, #eef5fd 0%, #f9fbfe 58%, #e8f2fc 100%);
  border: 1px solid #d5e2ed;
  border-radius: 8px;
}
.hero-copy {
  max-width: 760px;
  position: relative;
  z-index: 1;
}
.hero-kicker {
  color: #0060a6;
  font-size: 13px;
  font-weight: 700;
}
.hero-copy h1 {
  margin: 5px 0 8px;
  color: #102b50;
  font-size: 30px;
  line-height: 1.3;
}
.hero-copy > p {
  max-width: 650px;
  margin: 0;
  color: #46627f;
  font-size: 15px;
  line-height: 1.7;
}
.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 230px));
  gap: 16px;
  margin-top: 23px;
}
.hero-stats article {
  height: 86px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #d5e2ed;
  border-radius: 6px;
}
.hero-stats img {
  width: 45px;
  height: 45px;
}
.hero-stats span {
  display: grid;
  color: #4a627b;
  font-size: 13px;
}
.hero-stats strong {
  margin-top: 2px;
  color: #102d52;
  font-size: 26px;
}
.hero-illustration {
  position: absolute;
  right: 10px;
  bottom: 0;
  width: min(42%, 610px);
  height: 100%;
  object-fit: contain;
  object-position: right bottom;
}
.training-tabs {
  min-height: 60px;
  display: flex;
  gap: 34px;
  align-items: flex-end;
  border-bottom: 1px solid #d9e3ec;
}
.training-tabs button {
  height: 52px;
  padding: 0 7px;
  color: #526a82;
  background: transparent;
  border: 0;
  border-bottom: 3px solid transparent;
  font-size: 13px;
}
.training-tabs button[aria-current="page"] {
  color: #0060a6;
  border-bottom-color: #0060a6;
  font-weight: 700;
}
.course-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  padding-top: 16px;
}
.course-grid > article {
  min-height: 276px;
  display: flex;
  flex-direction: column;
  padding: 19px 20px;
  background: #fff;
  border: 1px solid #d6e1eb;
  border-radius: 6px;
  box-shadow: 0 2px 5px rgba(28, 58, 88, 0.04);
}
.course-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.course-grid mark {
  padding: 4px 7px;
  color: #0060a6;
  background: #eaf3fc;
  border-radius: 3px;
  font-size: 11px;
}
.course-grid time {
  color: #667c91;
  font-size: 12px;
}
.course-grid h2 {
  margin: 12px 0 7px;
  color: #142f51;
  font-size: 18px;
  line-height: 1.45;
}
.course-grid small {
  color: #62768c;
  font-size: 12px;
}
.course-grid article > p {
  min-height: 55px;
  margin: 17px 0;
  color: #536a81;
  font-size: 13px;
  line-height: 1.75;
}
.course-status {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  gap: 7px 10px;
  margin-top: auto;
  padding: 11px 0;
  border-top: 1px solid #e8edf2;
  font-size: 12px;
}
.course-status span {
  color: #718397;
}
.course-status :is(strong, b) {
  color: #203c5b;
}
.course-grid footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 9px;
}
.course-grid footer button {
  height: 36px;
  color: #0060a6;
  background: #fff;
  border: 1px solid #86add3;
  border-radius: 4px;
  font-size: 12px;
}
.course-grid footer button:last-child {
  color: #fff;
  background: #0060a6;
  border-color: #0060a6;
}
.training-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
}
.training-pagination nav {
  display: flex;
}
.training-pagination button {
  height: 36px;
  padding: 0 14px;
  color: #38526c;
  background: #fff;
  border: 1px solid #d2dce6;
}
.training-pagination button[aria-current="page"] {
  color: #fff;
  background: #0060a6;
  border-color: #0060a6;
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
@media (max-width: 1280px) {
  .course-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .hero-illustration {
    opacity: 0.38;
  }
  .hero-stats {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
  }
}
@media (max-width: 760px) {
  .training-page {
    padding: 10px;
  }
  .training-hero {
    padding: 22px 18px;
  }
  .hero-stats {
    grid-template-columns: 1fr;
  }
  .hero-illustration {
    display: none;
  }
  .training-tabs {
    gap: 8px;
    overflow-x: auto;
  }
  .training-tabs button {
    flex: 0 0 auto;
  }
  .course-grid {
    grid-template-columns: 1fr;
  }
  .course-grid > article {
    min-height: 260px;
  }
}
.course-grid > article {
  min-height: 340px;
  border-radius: 7px;
}
.course-grid > article > header {
  display: grid !important;
  grid-template-columns: 1fr;
  align-content: start;
  gap: 0;
}
.course-grid mark {
  font-size: 12px;
}
.course-grid time {
  font-size: 13px;
}
.course-grid h2 {
  min-height: 52px;
}
.course-grid small {
  display: block;
  font-size: 13px;
}
.course-grid article > p {
  min-height: 66px;
  margin: 16px 0;
  font-size: 14px;
  line-height: 1.7;
}
.course-status {
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: auto 0 0;
  padding: 12px 0 0;
}
.course-status div {
  display: grid;
  gap: 4px;
}
.course-status dt {
  color: #718397;
  font-size: 12px;
}
.course-status dd {
  margin: 0;
  color: #203c5b;
  font-size: 14px;
  font-weight: 700;
}
.course-grid footer {
  margin-top: 13px;
}
.course-grid footer button {
  font-size: 13px;
}
</style>
