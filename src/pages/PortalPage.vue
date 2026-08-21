<script setup>
import { computed } from 'vue';
import { PAGE_CONTENT } from '../fixtures/page-content.js';

const props = defineProps({ page: { type: Object, required: true } });
const content = computed(() => PAGE_CONTENT[props.page.id]);
const symbols = ['●', '◆', '■', '▲', '✦', '⬢', '▣', '◇'];
</script>

<template>
  <article class="portal-page" :data-page-id="page.id" :data-kind="content.kind">
    <header class="page-heading">
      <div><h1>{{ content.heading }}</h1><p>{{ content.description }}</p></div>
      <button v-if="content.action" type="button">＋ {{ content.action }}</button>
    </header>

    <section v-if="content.stats" class="stat-grid" :class="`stats-${content.stats.length}`" aria-label="数据概览">
      <article v-for="([label, value], index) in content.stats" :key="label">
        <span :class="`tone-${index % 4}`" aria-hidden="true">{{ symbols[index] }}</span>
        <div><small>{{ label }}</small><strong>{{ value.toLocaleString() }}</strong><em>较昨日　↑ {{ index + 3 }}</em></div>
      </article>
    </section>

    <form v-if="!['notice-detail', 'app-detail', 'onboarding', 'certification'].includes(content.kind)" class="filters" aria-label="筛选条件" @submit.prevent>
      <label><span>关键词搜索：</span><input type="search" :placeholder="`请输入${content.heading}关键词`" /></label>
      <label><span>状态：</span><select><option>全部状态</option><option>正常</option><option>已完成</option></select></label>
      <label><span>时间范围：</span><select><option>近30天</option><option>近7天</option><option>本月</option></select></label>
      <button type="submit">查询</button><button type="reset">重置</button>
    </form>

    <section v-if="content.kind === 'messages'" class="table-panel messages" aria-labelledby="messages-tabs">
      <nav id="messages-tabs" class="tabs" aria-label="消息状态"><button type="button" aria-current="page">全部（128）</button><button type="button">未读（18）</button><button type="button">已读（110）</button></nav>
      <ul class="message-list">
        <li v-for="(item, index) in content.items" :key="item.id"><span class="square-icon" :class="`tone-${index % 4}`" aria-hidden="true">{{ symbols[index] }}</span><small>{{ ['公告通知', '新应用上线', '申请进度', '培训课堂', '导出完成', '平台通知'][index] }}</small><i v-if="index < 3" aria-label="未读"></i><div><strong>{{ item.name }}</strong><p>{{ index < 3 ? '最新业务动态已送达，请及时查看详情。' : '该消息已处理，您可继续查看历史记录。' }}</p></div><time :datetime="item.date">{{ item.date.slice(5) }} {{ ['09:32','16:18','11:05','17:42','15:33','14:21'][index] }}</time><em>{{ index < 3 ? '未读' : '已读' }}</em><a href="/announcements/notice-001">查看详情　›</a></li>
      </ul>
    </section>

    <section v-else-if="content.kind === 'cards' || content.kind === 'apps' || content.kind === 'training'" class="card-panel">
      <nav class="tabs" aria-label="内容类型"><button type="button" aria-current="page">全部</button><button type="button">热门推荐</button><button type="button">最近更新</button></nav>
      <div class="content-cards">
        <article v-for="(item, index) in content.items" :key="item.id">
          <span class="large-icon" :class="`tone-${index % 4}`" aria-hidden="true">{{ symbols[index] }}</span>
          <div><h2>{{ item.name }}</h2><mark>{{ ['帆软报表', 'RPA机器人', 'EAD应用', 'AI智能体'][index % 4] }}</mark><p>适用于采购业务数字化场景，提供稳定的本地演示能力。</p><small>使用量 {{ 1280 + index * 137 }}　收藏 {{ 28 + index * 3 }}</small></div>
          <a :href="content.kind === 'training' ? '/training' : '/apps/report-001'">{{ content.kind === 'training' ? '立即学习' : '立即使用' }}</a>
        </article>
      </div>
    </section>

    <section v-else-if="content.kind === 'profile'" class="profile-layout">
      <section class="profile-card"><img src="/assets/user-avatar.png" width="74" height="74" alt="张三丰头像" /><div><h2>张三丰 <mark>已认证</mark></h2><p>员工编号：CNOOC-817　　组织：物资采购中心</p><p>岗位：采购数字化运营　　所在地：北京</p></div></section>
      <div class="profile-actions"><a v-for="(item, index) in content.items.slice(0,4)" :key="item.id" href="/profile"><span :class="`tone-${index}`">{{ symbols[index] }}</span><b>{{ item.name }}</b><i>›</i></a></div>
      <section class="profile-list"><h2>最近消息 / 待办任务</h2><ul><li v-for="item in content.items" :key="item.id"><span>{{ item.name }}</span><time :datetime="item.date">{{ item.date }}</time></li></ul></section>
    </section>

    <section v-else-if="content.kind === 'announcements' || content.kind === 'points-detail' || content.kind === 'management-table' || content.kind === 'talent-table'" class="table-panel">
      <table>
        <caption class="sr-only">{{ content.heading }}数据表</caption>
        <thead><tr><th>编号</th><th>名称</th><th>负责人</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody><tr v-for="item in content.items" :key="item.id"><td>{{ item.id }}</td><td>{{ item.name }}</td><td>{{ item.owner }}</td><td><mark>{{ item.status }}</mark></td><td>{{ item.date }}</td><td><a href="/announcements/notice-001">查看</a>　<a href="#main-content">编辑</a></td></tr></tbody>
      </table>
      <footer><span>共 {{ content.items.length * 21 }} 条</span><nav aria-label="分页"><button type="button">‹</button><button type="button" aria-current="page">1</button><button type="button">2</button><button type="button">3</button><button type="button">›</button></nav></footer>
    </section>

    <section v-else-if="content.kind === 'notice-detail'" class="notice-detail">
      <nav aria-label="面包屑"><a href="/announcements">公告通知</a>　/　新应用上线</nav><h2>{{ content.heading }}</h2><p class="meta">{{ content.meta.join('　　') }}</p>
      <div class="notice-hero"><span>供应商风险预警应用</span><b>智能预警 · 精准识别 · 高效处置</b></div>
      <p>为进一步提升供应链风险防控能力，供应商风险预警应用现已正式上线。应用通过多维数据分析，及时识别潜在风险并提供处置建议。</p>
      <ol><li v-for="item in content.items" :key="item.id"><strong>{{ item.name }}</strong>：提供稳定、清晰、可追溯的业务支持。</li></ol>
      <aside><h3>相关附件</h3><a href="#main-content">供应商风险预警应用操作手册.pdf</a><a href="#main-content">应用使用说明.docx</a></aside>
    </section>

    <section v-else-if="content.kind === 'app-detail'" class="app-detail">
      <header><span :class="['app-logo', content.accent]">{{ content.appType.slice(0,2) }}</span><div><h2>{{ content.heading }}</h2><p>{{ content.description }}</p><mark>{{ content.appType }}</mark></div><button type="button">立即使用</button><button type="button" class="secondary">☆ 收藏</button></header>
      <div class="app-metrics"><span v-for="(label,index) in ['访问次数','使用次数','收藏数量','综合评分','更新日期']" :key="label"><small>{{ label }}</small><strong>{{ [1280,568,128,'4.9','08-19'][index] }}</strong></span></div>
      <section v-for="(item,index) in content.items" :key="item.id"><h3>{{ index + 1 }}　{{ item.name }}</h3><p>本区域展示 {{ content.heading }} 的固定演示信息，所有内容均来自 seed 817，不连接真实业务系统。</p><div v-if="index === 2" class="preview-block"><span v-for="n in 3" :key="n">预览 {{ n }}</span></div></section>
    </section>

    <section v-else-if="content.kind === 'onboarding'" class="onboarding">
      <h2>审核进度</h2><ol><li v-for="(item,index) in content.items" :key="item.id" :class="{done:index < content.current,current:index === content.current}"><span>{{ index < content.current ? '✓' : index + 1 }}</span><strong>{{ item.name }}</strong><small>{{ index < content.current ? '已完成' : index === content.current ? '审批通过，已发布' : '待处理' }}</small></li></ol>
    </section>

    <section v-else-if="content.kind === 'points'" class="points-layout">
      <div class="points-cards"><article v-for="(item,index) in content.items.slice(0,3)" :key="item.id"><span :class="`tone-${index}`">{{ symbols[index] }}</span><h2>{{ item.name }}</h2><strong>{{ 1320 - index * 360 }}</strong><progress :value="75-index*15" max="100">{{ 75-index*15 }}%</progress></article></div>
      <section><h2>最近积分动态</h2><ul><li v-for="(item,index) in content.items" :key="item.id"><span>{{ item.name }}</span><b>+{{ 30-index*2 }} 积分</b><time :datetime="item.date">{{ item.date }}</time></li></ul></section>
    </section>

    <section v-else-if="content.kind === 'operations'" class="operations-layout">
      <div class="chart-grid"><section v-for="(item,index) in content.items" :key="item.id"><h2>{{ item.name }}</h2><div :class="index % 2 ? 'bars' : 'line-chart'"><i v-for="n in 8" :key="n" :style="{height:`${20+((n*17+index*9)%65)}%`}"></i></div></section></div>
    </section>

    <form v-else-if="content.kind === 'editor'" class="editor-form" aria-label="编辑表单" @submit.prevent>
      <section><h2>1　基础信息</h2><label v-for="(item,index) in content.items.slice(0,3)" :key="item.id"><span>{{ item.name }}<b>*</b></span><input :value="index === 0 ? content.heading : ''" /></label></section>
      <section><h2>2　内容配置</h2><label><span>{{ content.items[3].name }}<b>*</b></span><textarea rows="8">固定 seed 817 演示内容</textarea></label></section>
      <section><h2>3　发布设置</h2><label v-for="item in content.items.slice(4)" :key="item.id"><span>{{ item.name }}</span><input /></label></section>
      <footer><button type="submit">{{ content.action }}</button><button type="button">预览</button><button type="reset">取消</button></footer>
    </form>

    <section v-else-if="content.kind === 'admin'" class="admin-layout">
      <section><h2>应用类型配置</h2><ul><li v-for="(item,index) in content.items" :key="item.id"><span :class="`tone-${index%4}`">{{ symbols[index] }}</span><b>{{ item.name }}</b><label>启用 <input type="checkbox" checked /></label><a href="#main-content">编辑</a></li></ul></section>
      <section><h2>主题分类配置</h2><ul><li v-for="item in content.items" :key="`topic-${item.id}`"><b>{{ item.name }}主题</b><label>启用 <input type="checkbox" checked /></label><a href="#main-content">编辑</a></li></ul></section>
    </section>

    <section v-else-if="content.kind === 'certification'" class="certification-layout">
      <div class="cert-hero"><span>海油内唯一与软公司联合认证单位</span><p>{{ content.description }}</p><button type="button">了解更多</button></div>
      <div class="cert-grid"><article v-for="(item,index) in content.items" :key="item.id"><span :class="`tone-${index%4}`">{{ symbols[index] }}</span><h2>{{ item.name }}</h2><p>固定展示的认证服务与学习资源。</p><a href="#main-content">查看详情　›</a></article></div>
    </section>
  </article>
</template>

<style scoped>
.portal-page{min-height:calc(100vh - 63px);padding:17px 27px 24px;color:#1a3151}.page-heading{min-height:61px;display:flex;align-items:flex-start;justify-content:space-between}.page-heading h1{margin:0 0 5px;font-size:24px}.page-heading p{color:#506680;font-size:12px}.page-heading>button,.filters button,.page-heading+button{height:36px;padding:0 20px;border:0;color:#fff;background:#0869df;border-radius:4px}.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin:5px 0 14px}.stat-grid article{height:120px;display:flex;align-items:center;gap:21px;padding:18px 28px;background:#fff;border:1px solid #dce5ee;border-radius:5px}.stat-grid article>span,.square-icon,.large-icon,.profile-actions a>span,.points-cards article>span,.admin-layout li>span,.cert-grid article>span{display:grid;place-items:center;color:#fff;border-radius:50%}.stat-grid article>span{width:58px;height:58px;font-size:24px}.stat-grid article div{display:grid;gap:3px}.stat-grid small{font-size:12px}.stat-grid strong{font-size:24px}.stat-grid em{color:#159447;font-size:11px;font-style:normal}.tone-0{background:#147af2}.tone-1{background:#ff8a00}.tone-2{background:#12a95d}.tone-3{background:#6c34d9}
.filters{min-height:72px;display:flex;align-items:center;gap:24px;padding:12px 20px;margin-bottom:13px;background:#fff;border:1px solid #dce5ee;border-radius:5px}.filters label{display:flex;align-items:center;gap:10px;color:#223a59;font-size:12px}.filters input,.filters select{height:36px;min-width:165px;padding:0 12px;border:1px solid #d7e1eb;border-radius:4px;background:#fff}.filters button{height:34px;padding:0 19px}.filters button[type=reset]{color:#2a405e;background:#fff;border:1px solid #cbd7e3}
.table-panel,.card-panel,.profile-layout>section,.notice-detail,.app-detail,.onboarding,.points-layout>section,.operations-layout,.editor-form,.admin-layout>section,.cert-grid article{background:#fff;border:1px solid #dce5ee;border-radius:5px}.tabs{height:52px;display:flex;align-items:flex-end;gap:36px;padding:0 20px;border-bottom:1px solid #e1e8ef}.tabs button{height:45px;border:0;color:#2a3e5a;background:transparent}.tabs button[aria-current=page]{color:#066bea;border-bottom:3px solid #0c72ee}.message-list{list-style:none;margin:0;padding:0 20px}.message-list li{min-height:68px;display:grid;grid-template-columns:43px 90px 12px minmax(240px,1fr) 110px 45px 95px;align-items:center;gap:11px;border-bottom:1px solid #e1e7ee}.square-icon{width:40px;height:40px;border-radius:6px}.message-list li>small{font-size:11px}.message-list li>i{width:7px;height:7px;background:#0875ed;border-radius:50%}.message-list li strong,.message-list li p{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.message-list li strong{font-size:12px}.message-list li p{margin-top:5px;color:#687b91;font-size:10px}.message-list time,.message-list em{color:#546b84;font-size:11px;font-style:normal}.message-list li>a{color:#086be4;font-size:11px}
.content-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:20px}.content-cards article{min-height:176px;position:relative;display:flex;gap:14px;padding:20px;border:1px solid #dce5ee;border-radius:6px}.large-icon{width:54px;height:54px;flex:0 0 54px;border-radius:8px}.content-cards h2{margin:2px 0 7px;font-size:14px}.content-cards mark{color:#0c6ce8;background:#e8f2ff;font-size:10px}.content-cards p{margin:10px 0;color:#687b91;font-size:11px;line-height:1.7}.content-cards small{color:#74869b;font-size:10px}.content-cards article>a{position:absolute;right:18px;bottom:17px;color:#096be4;font-size:11px}
.profile-layout{display:grid;grid-template-columns:1fr 1fr;gap:14px}.profile-card{grid-column:1/-1;display:flex;align-items:center;gap:22px;padding:22px}.profile-card img{border-radius:50%}.profile-card h2{margin:0 0 10px;font-size:18px}.profile-card mark{color:#0b73ec;background:#e8f3ff;font-size:10px}.profile-card p{margin-top:7px;color:#60738a;font-size:11px}.profile-actions{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.profile-actions a{height:92px;display:flex;align-items:center;gap:14px;padding:16px;background:#fff;border:1px solid #dce5ee;border-radius:5px}.profile-actions a>span{width:44px;height:44px}.profile-actions a>b{font-size:13px}.profile-actions a>i{margin-left:auto;font-style:normal}.profile-list{padding:18px}.profile-list h2{margin:0 0 12px;font-size:15px}.profile-list ul{list-style:none;margin:0;padding:0}.profile-list li{display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid #edf1f5;font-size:11px}.profile-list time{color:#8593a2}
table{width:100%;border-collapse:collapse;font-size:11px}th,td{height:52px;padding:0 15px;border-bottom:1px solid #e5ebf1;text-align:left}th{height:44px;color:#405672;background:#f7f9fc}td mark{color:#169154;background:#e7f8ef;border-radius:3px}td a{color:#076ce7}.table-panel footer{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;font-size:11px}.table-panel footer nav{display:flex;gap:6px}.table-panel footer button{width:31px;height:31px;border:1px solid #d5dfe9;background:#fff;border-radius:4px}.table-panel footer button[aria-current=page]{color:#fff;background:#0869e6}
.notice-detail{padding:20px 26px}.notice-detail nav{color:#73869b;font-size:11px}.notice-detail h2{margin:15px 0 9px;font-size:22px}.notice-detail .meta{padding-bottom:17px;border-bottom:1px solid #e3e9f0;color:#77889b;font-size:10px}.notice-hero{height:125px;display:flex;flex-direction:column;justify-content:center;padding-left:32px;margin:20px 0;background:linear-gradient(100deg,#d9eeff,#f4faff);color:#0872ea}.notice-hero span{font-size:24px;font-weight:700}.notice-hero b{margin-top:10px;font-size:12px}.notice-detail>p,.notice-detail li{color:#4c617a;font-size:12px;line-height:2}.notice-detail aside{display:grid;gap:8px;margin-top:20px;padding:16px;background:#f8fafc}.notice-detail aside h3{margin:0}.notice-detail aside a{color:#096de7;font-size:11px}
.app-detail{padding:15px}.app-detail>header{display:flex;align-items:center;gap:14px;padding:13px;border-bottom:1px solid #e1e8ef}.app-logo{width:62px;height:62px;display:grid;place-items:center;color:#fff;border-radius:10px;font-weight:700}.app-logo.blue{background:#147af2}.app-logo.purple{background:#6936dc}.app-logo.green{background:#13a95c}.app-logo.orange{background:#f18a22}.app-detail>header div{flex:1}.app-detail>header h2{margin:0 0 4px;font-size:18px}.app-detail>header p{color:#61758c;font-size:11px}.app-detail>header mark{color:#096de8;background:#e7f2ff;font-size:10px}.app-detail>header button{height:34px;padding:0 22px;border:0;color:#fff;background:#086be5;border-radius:3px}.app-detail>header button.secondary{color:#086be5;background:#fff;border:1px solid #79acf2}.app-metrics{display:grid;grid-template-columns:repeat(5,1fr);padding:18px 0;border-bottom:1px solid #e1e8ef}.app-metrics span{display:grid;gap:7px;text-align:center;border-right:1px solid #e1e8ef}.app-metrics span:last-child{border-right:0}.app-metrics small{color:#687a90;font-size:10px}.app-metrics strong{font-size:16px}.app-detail>section{padding:16px 6px;border-bottom:1px solid #e1e8ef}.app-detail>section h3{margin:0 0 10px;color:#086bea;font-size:14px}.app-detail>section p{color:#52677f;font-size:11px;line-height:1.8}.preview-block{height:130px;display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:10px}.preview-block span{display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#073575,#138cdb);border-radius:4px}
.onboarding{min-height:255px;padding:28px}.onboarding h2{margin:0 0 35px;font-size:16px}.onboarding ol{list-style:none;display:flex;margin:0;padding:0}.onboarding li{flex:1;position:relative;display:grid;justify-items:center;gap:8px;text-align:center}.onboarding li::after{content:'';position:absolute;left:60%;right:-40%;top:16px;height:2px;background:#cfdbe8}.onboarding li:last-child::after{display:none}.onboarding li>span{width:34px;height:34px;z-index:1;display:grid;place-items:center;color:#58708d;background:#fff;border:2px solid #cbd8e5;border-radius:50%}.onboarding li.done>span{color:#fff;background:#1478ef;border-color:#1478ef}.onboarding li.current>span{color:#fff;background:#ef534f;border-color:#ef534f}.onboarding strong{font-size:12px}.onboarding small{color:#7e8e9f;font-size:10px}
.points-layout{display:grid;grid-template-columns:1fr 1fr;gap:14px}.points-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.points-cards article{display:grid;justify-items:center;gap:9px;padding:23px;background:#fff;border:1px solid #dce5ee;border-radius:5px}.points-cards article>span{width:48px;height:48px}.points-cards h2{margin:0;font-size:12px}.points-cards strong{font-size:21px}.points-cards progress{width:80%;height:7px}.points-layout>section{padding:18px}.points-layout>section h2{margin:0;font-size:15px}.points-layout ul{list-style:none;margin:10px 0 0;padding:0}.points-layout li{display:grid;grid-template-columns:1fr 75px 90px;padding:10px;border-bottom:1px solid #e8edf2;font-size:11px}.points-layout li b{color:#096ee8}.points-layout li time{color:#78899d}
.chart-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:16px}.chart-grid section{min-height:200px;padding:16px;border:1px solid #e0e7ef;border-radius:5px}.chart-grid h2{margin:0 0 20px;font-size:13px}.line-chart,.bars{height:125px;display:flex;align-items:flex-end;gap:9px;border-bottom:1px solid #cdd8e4}.line-chart i,.bars i{flex:1;background:#2786ee;border-radius:2px 2px 0 0}.line-chart i{width:7px;flex:0 0 7px;margin-inline:auto;border-radius:50%}
.editor-form{padding:15px}.editor-form section{padding:12px 5px;border-bottom:1px solid #e3e9ef}.editor-form h2{margin:0 0 16px;color:#086be8;font-size:14px}.editor-form label{display:flex;align-items:center;gap:16px;margin:11px 0;font-size:11px}.editor-form label>span{width:120px;text-align:right}.editor-form label b{color:#e33}.editor-form input,.editor-form textarea{flex:1;padding:9px;border:1px solid #d5e0ea;border-radius:3px}.editor-form footer{display:flex;justify-content:center;gap:12px;padding:18px}.editor-form button{height:34px;min-width:92px;border:1px solid #8ab7f2;color:#076be4;background:#fff;border-radius:3px}.editor-form button:first-child{color:#fff;background:#086be4}
.admin-layout{display:grid;grid-template-columns:1fr 1fr;gap:15px}.admin-layout>section{padding:16px}.admin-layout h2{margin:0 0 14px;color:#086be7;font-size:14px}.admin-layout ul{list-style:none;margin:0;padding:0}.admin-layout li{height:54px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e4eaf0;font-size:11px}.admin-layout li>span{width:30px;height:30px}.admin-layout li>b{flex:1}.admin-layout label{display:flex;align-items:center;gap:6px}.admin-layout a{color:#086be5}.cert-hero{height:230px;padding:50px 43px;background:linear-gradient(110deg,#e7f5ff,#cce8ff);border-radius:5px}.cert-hero span{color:#193d6b;font-size:28px;font-weight:700}.cert-hero p{max-width:650px;margin:17px 0;color:#416486;line-height:1.8}.cert-hero button{height:37px;padding:0 25px;border:0;color:#fff;background:#086de9;border-radius:3px}.cert-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}.cert-grid article{padding:20px}.cert-grid article>span{width:42px;height:42px}.cert-grid h2{font-size:14px}.cert-grid p{color:#6f8194;font-size:11px}.cert-grid a{color:#0870eb;font-size:11px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}
@media(max-width:1100px){.content-cards,.chart-grid{grid-template-columns:repeat(2,1fr)}.points-layout,.profile-layout,.admin-layout{grid-template-columns:1fr}.message-list li{grid-template-columns:43px 75px minmax(180px,1fr) 75px}.message-list li>i,.message-list time,.message-list em{display:none}.filters{flex-wrap:wrap}.app-metrics{grid-template-columns:repeat(3,1fr)}}@media(max-width:760px){.portal-page{padding:12px}.content-cards,.chart-grid,.cert-grid{grid-template-columns:1fr}.stat-grid{grid-template-columns:repeat(2,1fr)}.stat-grid article{padding:12px}.filters label{width:100%}.filters input,.filters select{flex:1;min-width:0}.message-list li{grid-template-columns:40px minmax(0,1fr)}.message-list li>small,.message-list li>a{display:none}.overview-list{grid-template-columns:1fr}.points-cards{grid-template-columns:1fr}.app-detail>header{flex-wrap:wrap}.app-metrics{grid-template-columns:repeat(2,1fr)}table{min-width:720px}.table-panel{overflow-x:auto}}
</style>
