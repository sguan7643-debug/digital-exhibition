<script setup>
// Reference SHA-256: A9827301EF6051E8B9B963B07F7073F6AB7AE4BFD21BAC97FDDA67A08FF3D78F
const highlights = [
  ['多源数据融合', '整合工商、司法、舆情、履约等多源数据，全面评估供应商风险。'],
  ['智能预警分级', '自动识别风险并分级预警（低/中/高），支持自定义预警规则。'],
  ['风险处置闭环', '预警触发后生成处置任务，跟踪处置进度，形成管理闭环。'],
  ['可视化分析看板', '提供风险趋势、分布、Top风险等多维度可视化分析，辅助决策。']
];
</script>

<template>
  <article class="notice-page" aria-labelledby="notice-title">
    <nav class="crumb" aria-label="面包屑"><a href="/workbench">首页</a><span>/</span><a href="/announcements">公告通知</a><span>/</span><b>公告详情</b></nav>
    <section class="notice-sheet">
      <header><mark>新应用上线</mark><h1 id="notice-title">供应商风险预警应用已发布上线</h1></header>
      <dl class="notice-meta"><div><dt>公告类型：</dt><dd>新应用上线</dd></div><div><dt>发布时间：</dt><dd>2025-05-08 09:32</dd></div><div><dt>发布部门：</dt><dd>物资采购中心</dd></div><div><dt>发布范围：</dt><dd>全体用户</dd></div><div><dt>阅读量：</dt><dd>1,286</dd></div></dl>
      <div class="notice-copy"><strong>各物资采购单位、相关部门及全体用户：</strong><p>为加强供应商全生命周期风险管控，提升风险识别与预警能力，数智产品展厅“供应商风险预警应用”已正式上线运行。</p><p>该应用基于多维数据分析与智能算法，实时监测供应商在经营、履约、资质、舆情等方面的风险动态，支持风险分级预警、处置跟踪与可视化分析，助力采购业务稳健高效开展。</p></div>
      <div class="notice-visual"><img src="/assets/notice-risk-hero.png" width="862" height="206" alt="供应商风险预警应用：智能预警、精准识别、高效处置" /><aside><h2>注意事项</h2><ol><li>请各单位及时组织相关人员学习应用操作，确保风险预警信息及时响应与处置。</li><li>系统预警结果仅供参考，具体风险判断请结合实际业务情况。</li><li>如在使用过程中遇到问题，请联系平台运营团队。</li></ol></aside></div>
      <section class="notice-highlights" aria-labelledby="highlight-title"><h2 id="highlight-title">应用亮点</h2><ol><li v-for="([title, text], index) in highlights" :key="title"><span>{{ index + 1 }}</span><strong>{{ title }}</strong><p>{{ text }}</p></li></ol></section>
      <div class="notice-bottom"><section><h2>附件下载</h2><ul><li><b>PDF</b><span>供应商风险预警应用操作手册（V1.0）.pdf</span><small>2.45 MB</small><a href="#main-content">下载</a></li><li><b>XLSX</b><span>供应商风险预警指标说明（V1.0）.xlsx</span><small>1.12 MB</small><a href="#main-content">下载</a></li><li><b>DOCX</b><span>常见问题解答（FAQ）.docx</span><small>512 KB</small><a href="#main-content">下载</a></li></ul></section><section><h2>关联对象 <a href="/apps">查看全部</a></h2><article><img src="/assets/app-screen.png" width="48" height="48" alt="" /><div><strong>供应商风险预警应用</strong><p>多维风险识别与预警，支持风险分级与处置跟踪</p></div><button type="button">立即使用</button></article><article><img src="/assets/app-rpa.png" width="48" height="48" alt="" /><div><strong>风险管理交流会</strong><p>05-13 10:00　线上交流会（已报名 723 人）</p></div><button type="button">去查看</button></article></section></div>
    </section>
    <footer class="notice-footer">中国海油物资供应领域数智化转型平台　© 2025 版权所有　　建议使用 1920×1080 及以上分辨率浏览</footer>
  </article>
</template>

<style scoped>
.notice-page{padding:14px 17px 0;color:#132849}.crumb{height:33px;display:flex;gap:10px;align-items:center;font-size:12px}.crumb a{color:#536985}.notice-sheet{padding:18px;background:#fff;border:1px solid #dce6f0;border-radius:6px}.notice-sheet>header{display:flex;align-items:center;gap:30px}.notice-sheet h1{margin:0;font-size:26px;color:#101722}.notice-sheet mark{padding:8px 14px;color:#0569e8;background:#eaf3ff;border-radius:5px;font-weight:700}.notice-meta{display:flex;gap:45px;margin:16px 0 12px;padding-bottom:14px;border-bottom:1px solid #dce5ef}.notice-meta div{display:flex;font-size:12px}.notice-meta dt{color:#4c6179}.notice-meta dd{margin:0;color:#163971;font-weight:700}.notice-copy{font-size:12px;line-height:1.9}.notice-copy p{padding-left:32px}.notice-visual{display:grid;grid-template-columns:minmax(0,862px) minmax(330px,1fr);gap:18px;margin-top:18px}.notice-visual img{width:100%;height:206px;object-fit:cover;border-radius:7px}.notice-visual aside{padding:19px 24px;border:1px solid #f2c36d;background:#fffaf1;border-radius:7px}.notice-visual aside h2{margin:0;color:#e97200;font-size:18px}.notice-visual aside li{margin-top:16px;color:#566579;font-size:11px;line-height:1.7}.notice-highlights h2,.notice-bottom h2{margin:14px 0 8px;color:#065ed1;font-size:15px}.notice-highlights ol{list-style:none;margin:0;padding:0}.notice-highlights li{display:grid;grid-template-columns:24px 140px 1fr;align-items:center;min-height:25px;font-size:12px}.notice-highlights li>span{width:18px;height:18px;display:grid;place-items:center;color:#fff;background:#086de8;border-radius:50%;font-size:10px}.notice-bottom{display:grid;grid-template-columns:1fr 1fr;gap:20px}.notice-bottom>section{padding:0 14px 10px;border:1px solid #dce5ef;border-radius:6px}.notice-bottom h2>a{float:right;color:#0871ec;font-size:11px}.notice-bottom ul{list-style:none;margin:0;padding:0}.notice-bottom li,.notice-bottom article{min-height:38px;display:flex;align-items:center;gap:13px;font-size:11px}.notice-bottom li b{min-width:38px;color:#fff;background:#e83030;border-radius:3px;text-align:center;font-size:9px}.notice-bottom li:nth-child(2) b{background:#18a75b}.notice-bottom li:nth-child(3) b{background:#1780e7}.notice-bottom li span{flex:1}.notice-bottom li small{width:70px}.notice-bottom li a{color:#0870ed}.notice-bottom article div{flex:1}.notice-bottom article p{color:#687b91;font-size:10px}.notice-bottom button{padding:6px 17px;color:#0870ed;background:#fff;border:1px solid #9bc2f5;border-radius:4px}.notice-footer{padding:18px;text-align:center;color:#75869a;font-size:10px}a:focus-visible,button:focus-visible{outline:3px solid #ff9f1a;outline-offset:2px}@media(max-width:900px){.notice-visual,.notice-bottom{grid-template-columns:1fr}.notice-meta{flex-wrap:wrap;gap:10px 22px}.notice-sheet h1{font-size:20px}}
</style>
