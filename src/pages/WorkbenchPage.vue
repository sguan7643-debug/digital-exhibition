<script setup>
const overview = [
  ['AI 应用', '86', 'purple'],
  ['数据应用', '128', 'blue'],
  ['可视化报表', '75', 'cyan'],
  ['自动化工具', '43', 'orange']
];

const hotApps = [
  ['智能问数', 'AI', '让数据问答更简单', 'purple'],
  ['经营分析驾驶舱', '图', '多维经营指标总览', 'blue'],
  ['智能合同审核', '审', '快速识别合同风险', 'cyan'],
  ['海能 Work', 'W', '一站式移动办公', 'orange']
];

const courses = [
  ['数据治理基础与实践', '数据资产', '08-18'],
  ['AI 大模型应用入门', '人工智能', '08-16'],
  ['低代码自动化训练营', '流程自动化', '08-14']
];

const notices = [
  ['关于开展数字化应用成果征集的通知', '2026-08-18'],
  ['数智展厅应用上架管理规范（试行）', '2026-08-15'],
  ['八月数字化能力培训计划', '2026-08-12'],
  ['平台升级维护公告', '2026-08-08']
];
</script>

<template>
  <div class="workbench-page">
    <section class="hero-panel" aria-labelledby="greeting-title">
      <div class="greeting">
        <p>2026年8月19日　星期三</p>
        <h1 id="greeting-title">上午好，张三丰</h1>
        <p>欢迎来到中国海油数智展厅，开启高效数字化工作。</p>
      </div>
      <img src="/assets/hero-ocean.png" width="827" height="136" alt="海上钻井平台、船舶与远山插图" />
    </section>

    <div class="dashboard-grid">
      <section class="panel overview-panel" aria-labelledby="overview-title">
        <header><h2 id="overview-title">应用类型概览</h2><a href="/apps">查看全部</a></header>
        <div class="overview-list">
          <a v-for="([label, total, tone]) in overview" :key="label" href="/apps" class="overview-item">
            <span :class="['app-symbol', tone]" aria-hidden="true">{{ label.slice(0, 1) }}</span>
            <span><strong>{{ total }}</strong><small>{{ label }}</small></span>
          </a>
        </div>
      </section>

      <section class="panel hot-panel" aria-labelledby="hot-title">
        <header><h2 id="hot-title">热门应用推荐</h2><a href="/apps">更多应用</a></header>
        <div class="hot-list">
          <a v-for="([name, glyph, description, tone], index) in hotApps" :key="name" :href="`/apps/${index === 3 ? 'haineng-work-001' : 'ai-001'}`" class="hot-card">
            <span :class="['hot-icon', tone]" aria-hidden="true">{{ glyph }}</span>
            <span><strong>{{ name }}</strong><small>{{ description }}</small></span>
            <b aria-hidden="true">›</b>
          </a>
        </div>
      </section>

      <section class="panel course-panel" aria-labelledby="course-title">
        <header><h2 id="course-title">培训课堂</h2><a href="/training">全部课程</a></header>
        <ul>
          <li v-for="([name, category, date], index) in courses" :key="name">
            <a href="/training">
              <span class="course-cover" :class="`cover-${index + 1}`" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="course-copy"><strong>{{ name }}</strong><small>{{ category }} · {{ date }}</small></span>
            </a>
          </li>
        </ul>
      </section>

      <section class="panel notice-panel" aria-labelledby="notice-title">
        <header><h2 id="notice-title">公告通知</h2><a href="/announcements">查看更多</a></header>
        <ul>
          <li v-for="([title, date], index) in notices" :key="title">
            <a :href="index === 0 ? '/announcements/notice-001' : '/announcements'">
              <span class="notice-mark" aria-hidden="true"></span><span>{{ title }}</span><time :datetime="date">{{ date.slice(5) }}</time>
            </a>
          </li>
        </ul>
      </section>

      <section class="panel usage-panel" aria-labelledby="usage-title">
        <header><h2 id="usage-title">我的使用统计</h2><span>截至 09:00</span></header>
        <div class="usage-content">
          <div class="donut" aria-label="本月使用 28 次"><strong>28</strong><span>本月使用</span></div>
          <dl>
            <div><dt>收藏应用</dt><dd>12</dd></div>
            <div><dt>学习课程</dt><dd>7</dd></div>
            <div><dt>获得积分</dt><dd>860</dd></div>
          </dl>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.workbench-page { padding: 16px 20px 22px; color: #26394e; }
.hero-panel { height: 136px; position: relative; display: flex; align-items: center; overflow: hidden; border-radius: 4px; background: linear-gradient(90deg, #e9f5ff 0%, #e9f6fe 52%, #cfeafc 100%); box-shadow: 0 1px 4px rgb(25 66 105 / 8%); }
.hero-panel::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 30% 40%, rgb(255 255 255 / 70%), transparent 38%); }
.hero-panel img { position: absolute; right: 0; inset-block: 0; width: min(50%, 827px); height: 136px; object-fit: cover; object-position: right center; }
.greeting { position: relative; z-index: 1; padding-left: 35px; }
.greeting p:first-child { color: #71869b; font-size: 12px; margin-bottom: 7px; }
.greeting h1 { margin: 0 0 9px; color: #173b62; font-size: 24px; line-height: 1.2; }
.greeting p:last-child { color: #66809a; font-size: 13px; }
.dashboard-grid { display: grid; grid-template-columns: 1.1fr 1.2fr .82fr; grid-template-areas: 'overview hot course' 'notice notice usage'; gap: 15px; margin-top: 15px; }
.panel { min-width: 0; background: #fff; border: 1px solid #edf1f5; border-radius: 4px; box-shadow: 0 2px 7px rgb(28 62 97 / 5%); }
.panel > header { height: 51px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; border-bottom: 1px solid #edf1f5; }
.panel h2 { margin: 0; padding-left: 11px; position: relative; color: #243a52; font-size: 15px; }
.panel h2::before { content: ''; position: absolute; left: 0; top: 2px; width: 3px; height: 16px; border-radius: 2px; background: #1b82e8; }
.panel header a, .panel header span { color: #8b98a7; font-size: 12px; }
.overview-panel { grid-area: overview; }
.overview-list { display: grid; grid-template-columns: repeat(2, 1fr); padding: 19px 16px 12px; gap: 13px; }
.overview-item { min-height: 73px; display: flex; align-items: center; gap: 13px; padding: 10px 12px; background: #f8fafc; border-radius: 4px; }
.app-symbol { width: 43px; height: 43px; flex: 0 0 43px; display: grid; place-items: center; border-radius: 11px; color: #fff; font-size: 19px; font-weight: 700; }
.purple { background: linear-gradient(135deg, #8b7bff, #6454e9); }
.blue { background: linear-gradient(135deg, #58a9ff, #2682e7); }
.cyan { background: linear-gradient(135deg, #42d0d2, #19a9b8); }
.orange { background: linear-gradient(135deg, #ffc06c, #f28b35); }
.overview-item strong { display: block; color: #263b53; font-size: 21px; line-height: 1.15; }
.overview-item small { display: block; margin-top: 5px; color: #8b98a7; font-size: 11px; }
.hot-panel { grid-area: hot; }
.hot-list { display: grid; grid-template-columns: repeat(2, 1fr); padding: 13px 15px; gap: 5px 10px; }
.hot-card { min-width: 0; min-height: 77px; display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-bottom: 1px solid #f0f3f6; }
.hot-icon { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; border-radius: 9px; color: #fff; font-weight: 700; }
.hot-card > span:nth-child(2) { min-width: 0; flex: 1; }
.hot-card strong, .hot-card small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hot-card strong { color: #33485f; font-size: 13px; margin-bottom: 7px; }
.hot-card small { color: #98a3af; font-size: 10px; }
.hot-card b { color: #aeb7c1; font-size: 18px; font-weight: 400; }
.course-panel { grid-area: course; }
.course-panel ul, .notice-panel ul { list-style: none; margin: 0; padding: 8px 15px 11px; }
.course-panel li a { display: flex; align-items: center; gap: 11px; padding: 7px 0; }
.course-cover { width: 62px; height: 38px; flex: 0 0 62px; display: grid; place-items: center; color: #fff; border-radius: 3px; font-size: 18px; font-weight: 700; }
.cover-1 { background: linear-gradient(135deg, #226eae, #3ca8cf); }
.cover-2 { background: linear-gradient(135deg, #6655bc, #ae68c7); }
.cover-3 { background: linear-gradient(135deg, #e59345, #edc35b); }
.course-copy { min-width: 0; }
.course-copy strong, .course-copy small { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.course-copy strong { color: #3b4e63; font-size: 12px; margin-bottom: 6px; }
.course-copy small { color: #99a4af; font-size: 10px; }
.notice-panel { grid-area: notice; }
.notice-panel ul { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 32px; padding-block: 13px; }
.notice-panel li a { display: grid; grid-template-columns: 7px minmax(0, 1fr) auto; align-items: center; gap: 9px; min-height: 38px; border-bottom: 1px dashed #e8edf2; color: #526274; font-size: 12px; }
.notice-panel li a > span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notice-panel time { color: #a0abb6; font-size: 10px; }
.notice-mark { width: 4px; height: 4px; background: #278ce9; border-radius: 50%; }
.usage-panel { grid-area: usage; }
.usage-content { display: flex; align-items: center; min-height: 115px; padding: 10px 20px; gap: 20px; }
.donut { width: 83px; height: 83px; flex: 0 0 83px; display: grid; place-content: center; text-align: center; border-radius: 50%; background: radial-gradient(circle at center, #fff 55%, transparent 56%), conic-gradient(#278ce9 0 73%, #e8f0f8 73% 100%); }
.donut strong { color: #237bd4; font-size: 19px; }
.donut span { margin-top: 2px; color: #95a2af; font-size: 9px; }
.usage-content dl { flex: 1; margin: 0; }
.usage-content dl div { display: flex; justify-content: space-between; align-items: baseline; padding: 5px 0; border-bottom: 1px solid #f0f3f6; }
.usage-content dt { color: #7d8c9c; font-size: 11px; }
.usage-content dd { margin: 0; color: #34506f; font-size: 14px; font-weight: 600; }

@media (max-width: 1180px) {
  .dashboard-grid { grid-template-columns: 1fr 1fr; grid-template-areas: 'overview hot' 'course usage' 'notice notice'; }
}

@media (max-width: 760px) {
  .workbench-page { padding: 12px; }
  .hero-panel img { opacity: .45; width: 100%; }
  .greeting { padding-left: 20px; }
  .dashboard-grid { grid-template-columns: 1fr; grid-template-areas: 'overview' 'hot' 'course' 'notice' 'usage'; }
  .notice-panel ul { grid-template-columns: 1fr; }
}
</style>
