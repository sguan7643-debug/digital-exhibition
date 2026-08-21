<script setup>
const overview = [
  ['数据集', '186', '/assets/overview-dataset.png'], ['帆软报表', '92', '/assets/overview-report.png'],
  ['RPA机器人', '64', '/assets/overview-rpa.png'], ['EAD应用', '18', '/assets/overview-ead.png'],
  ['AI智能体', '27', '/assets/overview-ai.png'], ['其他应用', '35', '/assets/overview-other.png']
];
const hotApps = [
  ['供应商评估看板', '帆软报表', '基于多维度指标对供应商进行综合评估与可视化分析。', '2,375', '/assets/hot-supplier.png'],
  ['库存周转分析报表', '帆软报表', '分析库存周转效率，优化库存结构，降低库存成本。', '1,876', '/assets/hot-inventory.png'],
  ['增值税发票查验机器人', 'RPA机器人', '自动查验发票真伪与税号，提升发票处理效率与准确性。', '1,542', '/assets/hot-rpa.png'],
  ['电子发票录入校验', 'EAD应用', '电子发票信息自动录入与校验，提质增效录入准确率。', '1,291', '/assets/hot-invoice.png']
];
const courses = [
  ['数说心智 · 数智应用案例分享', '分享最新应用实践与创新案例', '/assets/training-ai.png', '立即参加'],
  ['取经会 · 采购合规效率交流会', '交流采购合规与提效经验', '/assets/training-procurement.png', '立即参加'],
  ['AI社区 · 大模型在采购场景的应用', '探讨AI赋能采购业务实践', '/assets/training-community.png', '进入活动']
];
const notices = [
  ['新应用上线', '【新应用上线】供应商风险预警应用已发布上线', '05-08 09:32', 'blue'],
  ['新应用上线', '【新应用上线】采购合同执行分析看板V2.0版本发布', '05-07 16:18', 'blue'],
  ['活动通知', '【活动通知】数智课堂“数说心智·数智应用案例分享”报名开启', '05-06 11:05', 'green'],
  ['平台通知', '【平台通知】平台将于5月10日22:00-23:00进行系统维护', '05-05 17:42', 'red']
];
const usage = [
  ['应用访问次数', '128', '次', '18', '/assets/usage-visits.png'],
  ['应用使用次数', '56', '次', '9', '/assets/usage-count.png'],
  ['收藏应用数', '24', '个', '3', '/assets/usage-favorites.png']
];
</script>

<template>
  <div class="workbench-page">
    <section class="hero-panel" aria-labelledby="greeting-title">
      <img class="hero-reference" src="/assets/workbench-hero-reference.png" width="1409" height="140" alt="" />
      <div class="greeting sr-only">
        <h1 id="greeting-title">上午好，张三丰</h1>
        <p>欢迎来到数智产品展厅平台，探索更卓越的应用，助力业务高效运营！</p>
        <small>数据截至：2025-05-08　　最后更新：10:18</small>
      </div>
    </section>

    <section class="panel overview-panel" aria-labelledby="overview-title">
      <h2 id="overview-title">应用类型概览</h2>
      <div class="overview-list">
        <a v-for="([label, total, icon]) in overview" :key="label" href="/apps" class="overview-item">
          <img :src="icon" width="68" height="68" alt="" /><span><small>{{ label }}</small><strong>{{ total }}</strong></span>
        </a>
      </div>
    </section>

    <div class="dashboard-grid">
      <section class="panel hot-panel" aria-labelledby="hot-title">
        <header><h2 id="hot-title">热门应用推荐</h2><a href="/apps">查看更多　›</a></header>
        <div class="hot-list">
          <article v-for="([name, type, description, count, icon], index) in hotApps" :key="name" class="hot-card">
            <img :src="icon" width="55" height="55" alt="" />
            <h3>{{ name }}</h3><mark>{{ type }}</mark><p>{{ description }}</p><small>使用量　{{ count }}</small>
            <a :href="index === 2 ? '/apps/rpa-001' : '/apps/report-001'">立即使用</a>
          </article>
        </div>
      </section>

      <section class="panel course-panel" aria-labelledby="course-title">
        <header><h2 id="course-title">培训课堂</h2><a href="/training">查看更多　›</a></header>
        <ul>
          <li v-for="([name, description, icon, action]) in courses" :key="name">
            <img :src="icon" width="58" height="60" alt="" /><span><strong>{{ name }}</strong><small>{{ description }}</small></span><a href="/training">{{ action }}</a>
          </li>
        </ul>
      </section>

      <section class="panel notice-panel" aria-labelledby="notice-title">
        <header><h2 id="notice-title">公告通知</h2><a href="/announcements">查看更多　›</a></header>
        <ul>
          <li v-for="([type, title, time, tone], index) in notices" :key="title">
            <a :href="index === 0 ? '/announcements/notice-001' : '/announcements'">
              <mark :class="tone">{{ type }}</mark><span>{{ title }}</span><time :datetime="`2025-${time.replace(' ', 'T')}`">{{ time }}</time>
            </a>
          </li>
        </ul>
      </section>

      <section class="panel usage-panel" aria-labelledby="usage-title">
        <header><h2 id="usage-title">我的使用统计</h2><a href="/profile">查看详情　›</a></header>
        <div class="usage-list">
          <article v-for="([label, total, unit, increase, icon]) in usage" :key="label">
            <img :src="icon" width="58" height="58" alt="" /><span><small>{{ label }}</small><strong>{{ total }} <b>{{ unit }}</b></strong><em>较上周　<i>↑</i> {{ increase }}</em></span>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.workbench-page{padding:14px 20px 19px;color:#18304f}.panel{background:#fff;border:1px solid #dce5ef;border-radius:6px;box-shadow:0 1px 4px rgb(24 61 102 / 4%)}
.hero-panel{height:140px;position:relative;overflow:hidden;border:0;background:#fff}.hero-reference{width:100%;height:140px;object-fit:fill}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.overview-panel{height:155px;margin-top:11px;padding:10px 14px}.panel h2{margin:0;color:#0569ef;font-size:17px}.overview-list{display:grid;grid-template-columns:repeat(6,1fr);gap:20px;margin-top:5px}.overview-item{height:107px;display:flex;align-items:center;justify-content:center;gap:22px;border:1px solid #e1e8f0;border-radius:7px}.overview-item img{width:68px;height:68px}.overview-item span{display:grid;gap:7px}.overview-item small{color:#243754;font-size:13px}.overview-item strong{color:#13284a;font-size:26px;font-weight:600}
.dashboard-grid{display:grid;grid-template-columns:.94fr 1.06fr;grid-template-areas:'hot course' 'notice usage';gap:9px;margin-top:9px}.hot-panel{grid-area:hot;height:307px}.course-panel{grid-area:course;height:307px}.notice-panel{grid-area:notice;height:206px}.usage-panel{grid-area:usage;height:206px}.panel>header{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}.panel>header a{color:#0770ef;font-size:11px}
.hot-list{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:1px 16px 14px}.hot-card{height:247px;position:relative;padding:15px 9px 12px;border:1px solid #dfe7f0;border-radius:7px;text-align:center}.hot-card img{margin:0 auto 7px}.hot-card h3{height:20px;margin:0;color:#1d3150;font-size:13px}.hot-card mark{display:inline-block;padding:2px 10px;color:#176ee9;background:#eaf3ff;border-radius:9px;font-size:10px}.hot-card p{height:51px;margin:9px 0 4px;color:#687a90;font-size:10px;line-height:17px;text-align:left}.hot-card small{display:block;color:#596c84;font-size:10px;text-align:left}.hot-card>a{position:absolute;left:9px;right:9px;bottom:11px;height:26px;display:grid;place-items:center;color:#076aed;border:1px solid #75adf8;border-radius:3px;font-size:11px}
.course-panel ul{list-style:none;margin:0;padding:0 20px}.course-panel li{height:82px;display:flex;align-items:center;gap:15px;border-bottom:1px solid #e4eaf1}.course-panel li:last-child{border-bottom:0}.course-panel li img{width:58px;height:60px}.course-panel li span{min-width:0;display:grid;gap:8px;flex:1}.course-panel li strong{color:#243752;font-size:13px}.course-panel li small{color:#65788e;font-size:11px}.course-panel li>a{color:#086cec;font-size:12px}
.notice-panel ul{list-style:none;margin:0;padding:2px 17px}.notice-panel li a{height:35px;display:grid;grid-template-columns:85px minmax(0,1fr) 82px;align-items:center;border-bottom:1px solid #e7edf3;color:#314761;font-size:11px}.notice-panel mark{justify-self:start;padding:3px 8px;border-radius:3px;font-size:10px}.notice-panel mark.blue{color:#0873ef;background:#e7f2ff}.notice-panel mark.green{color:#10904a;background:#e7f8ee}.notice-panel mark.red{color:#ee3030;background:#ffe9e9}.notice-panel li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.notice-panel time{color:#5f728a;text-align:right}
.usage-list{height:153px;display:grid;grid-template-columns:repeat(3,1fr);align-items:center}.usage-list article{height:97px;display:flex;align-items:center;justify-content:center;gap:17px;border-right:1px solid #e1e8ef}.usage-list article:last-child{border-right:0}.usage-list img{width:58px;height:58px}.usage-list span{display:grid;gap:5px}.usage-list small{color:#354a65;font-size:12px}.usage-list strong{color:#122949;font-size:25px;font-weight:500}.usage-list strong b{font-size:12px;font-weight:400}.usage-list em{color:#718299;font-size:11px;font-style:normal}.usage-list i{color:#10a950;font-size:15px;font-style:normal}
@media(max-width:1250px){.overview-list{gap:8px}.overview-item{gap:8px}.dashboard-grid{grid-template-columns:1fr;grid-template-areas:'hot' 'course' 'notice' 'usage'}.hot-panel,.course-panel,.notice-panel,.usage-panel{height:auto}.workbench-page{overflow:auto}}
@media(max-width:760px){.workbench-page{padding:10px}.hero-reference{object-fit:cover;object-position:right}.overview-panel{height:auto}.overview-list{grid-template-columns:repeat(2,1fr)}.hot-list{grid-template-columns:repeat(2,1fr)}.usage-list{grid-template-columns:1fr;height:auto}.usage-list article{border-right:0;border-bottom:1px solid #e1e8ef}.notice-panel li a{grid-template-columns:75px minmax(0,1fr)}.notice-panel time{display:none}}
</style>
