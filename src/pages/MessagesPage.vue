<script setup>
const REFERENCE_SHA256 = '8181F60BE17D8B4068A4B6432850FE5EB9489E954D379FD5B236A426F07B9F22';
const stats = [
  ['全部消息', '128', '18', '/assets/msg-stat-all.png'], ['未读消息', '18', '5', '/assets/msg-stat-unread.png'],
  ['已读消息', '110', '13', '/assets/msg-stat-read.png'], ['今日新增', '9', '3', '/assets/msg-stat-new.png']
];
const messages = [
  ['公告通知', '【新应用上线】供应商风险预警应用已发布上线', '供应商风险预警应用正式发布上线，支持多维风险监测与预警，助力采购决策更科学高效。', '05-08 09:32', '未读', '查看详情'],
  ['新应用上线', '【新应用上线】采购合同执行分析看板V2.0版本发布', '采购合同执行分析看板V2.0版本已发布，优化可视化与数据分析能力，支持自定义维度分析。', '05-07 16:18', '未读', '查看详情'],
  ['申请进度', '应用上架申请已通过审批', '您申请上架的“库存周转分析报表”已通过平台审核，现已正式上架。', '05-07 11:05', '未读', '进入相关页面'],
  ['培训课堂', '您已成功参加“数说心智·数智应用案例分享”', '课程已加入您的学习计划，可前往培训课堂查看课程详情。', '05-05 17:42', '已读', '进入课堂'],
  ['导出完成', '数据导出任务已完成', '您在 05-05 15:30 发起的“采购订单数据导出”任务已完成，文件已生成。', '05-05 15:33', '已读', '下载文件'],
  ['平台通知', '平台将于5月10日22:00~23:00进行系统维护', '为提升平台稳定性与性能，平台将于5月10日22:00~23:00进行系统维护，期间部分功能受影响。', '05-04 14:21', '已读', '查看详情']
];
</script>

<template>
  <div class="messages-page" :data-reference-sha="REFERENCE_SHA256">
    <header><h1>消息中心</h1><p>及时获取系统动态与业务通知，助力高效协同与决策</p></header>
    <section class="message-stats" aria-label="消息数据概览">
      <article v-for="([label,total,increase,icon]) in stats" :key="label"><img :src="icon" width="61" height="61" alt="" /><div><strong>{{ label }}</strong><b>{{ total }}</b><small>较昨日　<em>↑ {{ increase }}</em></small></div></article>
    </section>
    <form class="message-filters" aria-label="消息筛选" @submit.prevent>
      <label>消息类型：<select><option>全部类型</option></select></label><label>时间范围：<select><option>近30天</option></select></label>
      <label class="keyword">关键词搜索：<input type="search" placeholder="请输入消息标题或内容关键词" /></label><button type="submit">全部标为已读</button>
    </form>
    <section class="message-panel">
      <div class="message-tabs"><nav aria-label="消息状态"><button type="button" aria-current="page">全部（128）</button><button type="button">未读（18）</button><button type="button">已读（110）</button></nav><label>按时间排序　<select aria-label="消息排序"><option>最新优先</option></select></label></div>
      <ul>
        <li v-for="(item,index) in messages" :key="item[1]">
          <img :src="`/assets/msg-row-${index+1}.png`" width="42" height="42" alt="" /><small>{{ item[0] }}</small><i v-if="index<3" aria-label="未读"></i>
          <div><strong>{{ item[1] }}</strong><p>{{ item[2] }}</p></div><time :datetime="`2025-${item[3].replace(' ','T')}`">{{ item[3] }}</time><em>{{ item[4] }}</em><a href="/announcements/notice-001">{{ item[5] }}　›</a>
        </li>
      </ul>
      <footer><span>共 128 条</span><select aria-label="每页条数"><option>10条/页</option></select><nav aria-label="分页"><button disabled>‹</button><button aria-current="page">1</button><button>2</button><button>3</button><button>4</button><button>5</button><span>…</span><button>13</button><button>›</button></nav><label>前往　<input value="1" aria-label="页码" />　页</label></footer>
    </section>
  </div>
</template>

<style scoped>
.messages-page{min-height:calc(100vh - 79px);padding:14px 27px 21px;color:#10284b}.messages-page>header{height:73px;padding:0 12px}.messages-page h1{margin:0 0 6px;font-size:25px}.messages-page header p{color:#435b78;font-size:13px}.message-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.message-stats article{height:121px;display:flex;align-items:center;gap:28px;padding:15px 29px;background:#fff;border:1px solid #d9e2ec;border-radius:5px}.message-stats img{width:61px;height:61px}.message-stats div{display:grid;gap:4px}.message-stats strong{font-size:12px}.message-stats b{font-size:27px}.message-stats small{font-size:11px}.message-stats em{color:#079145;font-style:normal}.message-filters{height:72px;display:flex;align-items:center;gap:34px;padding:0 20px;margin:14px 0;background:#fff;border:1px solid #d9e2ec;border-radius:5px;font-size:12px}.message-filters label{display:flex;align-items:center;gap:12px;white-space:nowrap}.message-filters select,.message-filters input,.message-tabs select{height:38px;border:1px solid #d2deea;border-radius:4px;background:#fff;padding:0 13px;color:#304865}.message-filters select{width:184px}.message-filters .keyword{flex:1}.message-filters input{width:100%}.message-filters button{height:40px;padding:0 27px;border:0;border-radius:4px;color:#fff;background:#075fd0}.message-panel{background:#fff;border:1px solid #d9e2ec;border-radius:5px}.message-tabs{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid #dde6ef}.message-tabs nav{display:flex;gap:41px;height:100%}.message-tabs button{height:100%;border:0;background:#fff;color:#173052}.message-tabs button[aria-current=page]{color:#0769e9;border-bottom:3px solid #0b70ed}.message-tabs label{font-size:11px}.message-tabs select{height:34px}.message-panel ul{list-style:none;margin:0;padding:0 18px}.message-panel li{min-height:68px;display:grid;grid-template-columns:43px 95px 9px minmax(280px,1fr) 118px 52px 109px;align-items:center;gap:10px;border-bottom:1px solid #e0e7ef}.message-panel li>img{width:42px;height:42px}.message-panel li>small{font-size:11px}.message-panel li>i{width:7px;height:7px;background:#0871eb;border-radius:50%}.message-panel li div{min-width:0}.message-panel li strong,.message-panel li p{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.message-panel li strong{font-size:12px}.message-panel li p{margin-top:6px;color:#536983;font-size:10px}.message-panel time,.message-panel li>em{color:#465f7c;font-size:11px;font-style:normal}.message-panel li>a{color:#0769e6;font-size:11px;text-align:right}.message-panel footer{height:70px;display:flex;align-items:center;gap:20px;padding:0 20px;font-size:11px}.message-panel footer>span{margin-right:auto}.message-panel footer select{height:35px;border:1px solid #d3dfeb}.message-panel footer nav{display:flex;align-items:center;gap:7px}.message-panel footer button{min-width:31px;height:31px;border:1px solid #d4deea;background:#fff;border-radius:4px}.message-panel footer button[aria-current=page]{color:#fff;background:#0768dc}.message-panel footer input{width:42px;height:31px;border:1px solid #d3deea;text-align:center}:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:1100px){.message-stats{grid-template-columns:repeat(2,1fr)}.message-filters{height:auto;flex-wrap:wrap;padding-block:12px}.message-panel{overflow-x:auto}.message-panel ul,.message-tabs,.message-panel footer{min-width:1040px}}@media(max-width:760px){.messages-page{padding:12px}.message-stats{grid-template-columns:1fr}.message-panel li{grid-template-columns:43px 90px minmax(280px,1fr)}}
</style>
