<script setup>
defineProps({
  page: {
    type: Object,
    required: true
  }
});

const primaryNav = [
  ['/workbench', '工作台'],
  ['/apps', '应用中心'],
  ['/points', '积分中心'],
  ['/training', '培训课堂'],
  ['/certification', '数字化认证'],
  ['/talent/people', '人才管理'],
  ['/operations', '运营管理'],
  ['/admin', '后台管理']
];

const sideNav = [
  ['/workbench', '首页', '⌂'],
  ['/messages', '消息中心', '✉'],
  ['/favorites', '我的收藏', '☆'],
  ['/profile', '个人中心', '♙'],
  ['/announcements', '公告通知', '▤']
];

function active(route, exact = false) {
  return exact ? page.route === route : page.route === route || page.route.startsWith(`${route}/`);
}
</script>

<template>
  <div class="exhibition-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <header class="topbar">
      <a class="brand" href="/workbench" aria-label="中国海油数智展厅首页">
        <img src="/assets/cnooc-logo.png" width="126" height="43" alt="中国海油" />
      </a>
      <nav class="primary-nav" aria-label="主导航">
        <a
          v-for="([route, label], index) in primaryNav"
          :key="route"
          :href="route"
          :aria-current="active(route, route === '/workbench') ? 'page' : undefined"
        >
          <span class="nav-glyph" aria-hidden="true">{{ index + 1 }}</span>
          {{ label }}
        </a>
      </nav>
      <div class="top-actions" aria-label="快捷操作">
        <a href="/messages" aria-label="消息中心">消息</a>
        <a href="/favorites" aria-label="我的收藏">收藏</a>
        <a class="top-user" href="/profile">
          <img src="/assets/user-avatar.png" width="30" height="30" alt="" />
          张三丰
        </a>
      </div>
    </header>

    <div class="page-frame">
      <aside class="sidebar">
        <section class="user-card" aria-label="当前用户">
          <img src="/assets/user-avatar.png" width="68" height="68" alt="张三丰头像" />
          <div>
            <strong>张三丰</strong>
            <span>海油发展</span>
          </div>
        </section>
        <nav class="side-nav" aria-label="个人功能">
          <a
            v-for="([route, label, glyph]) in sideNav"
            :key="route"
            :href="route"
            :aria-current="active(route, true) ? 'page' : undefined"
          >
            <span aria-hidden="true">{{ glyph }}</span>{{ label }}
          </a>
        </nav>
      </aside>

      <main id="main-content" tabindex="-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.skip-link {
  position: fixed;
  z-index: 100;
  left: 16px;
  top: -60px;
  padding: 10px 16px;
  color: #fff;
  background: #0057b8;
  border-radius: 4px;
}

.skip-link:focus-visible { top: 10px; }

.topbar {
  height: 62px;
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 0 22px 0 18px;
  background: #fff;
  border-bottom: 1px solid #e6edf5;
  box-shadow: 0 1px 5px rgb(32 67 105 / 8%);
}

.brand { flex: 0 0 160px; display: flex; align-items: center; }
.brand img { width: 126px; height: 43px; object-fit: contain; }
.primary-nav { display: flex; align-self: stretch; flex: 1; min-width: 0; }
.primary-nav a {
  min-width: 82px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  position: relative;
  color: #46566a;
  font-size: 14px;
  white-space: nowrap;
}
.primary-nav a[aria-current='page'] { color: #1476e6; font-weight: 600; }
.primary-nav a[aria-current='page']::after {
  position: absolute; content: ''; bottom: 0; left: 18px; right: 18px; height: 3px; background: #1476e6;
}
.nav-glyph {
  width: 19px; height: 19px; display: inline-grid; place-items: center;
  color: #fff; background: #6e90b5; border-radius: 5px; font-size: 11px;
}
.primary-nav a[aria-current='page'] .nav-glyph { background: #1476e6; }
.top-actions { display: flex; align-items: center; gap: 15px; font-size: 13px; white-space: nowrap; }
.top-actions > a { color: #566475; }
.top-user { display: flex; align-items: center; gap: 7px; }
.top-user img { border-radius: 50%; }

.page-frame { min-height: calc(100vh - 62px); display: grid; grid-template-columns: 220px minmax(0, 1fr); }
.sidebar { background: #fff; border-right: 1px solid #e9eef4; }
.user-card { display: flex; align-items: center; gap: 14px; min-height: 125px; padding: 24px 20px 18px; }
.user-card img { border-radius: 50%; box-shadow: 0 3px 9px rgb(30 89 148 / 18%); }
.user-card div { min-width: 0; }
.user-card strong { display: block; color: #22364d; font-size: 16px; margin-bottom: 8px; }
.user-card span { color: #8795a5; font-size: 12px; }
.side-nav { display: grid; padding-top: 8px; }
.side-nav a { height: 53px; display: flex; align-items: center; gap: 14px; padding: 0 26px; color: #556579; border-left: 3px solid transparent; }
.side-nav a span { width: 20px; color: #8090a2; font-size: 19px; text-align: center; }
.side-nav a[aria-current='page'] { color: #1476e6; background: #eef6ff; border-left-color: #1476e6; font-weight: 600; }
.side-nav a[aria-current='page'] span { color: #1476e6; }
main { min-width: 0; background: #f3f6f9; outline: none; }

a:focus-visible,
main:focus-visible {
  outline: 3px solid #ff9f1a;
  outline-offset: 3px;
}

@media (max-width: 1050px) {
  .primary-nav a:nth-child(n + 6) { display: none; }
  .top-actions > a:not(.top-user) { display: none; }
}

@media (max-width: 760px) {
  .topbar { height: auto; min-height: 62px; flex-wrap: wrap; padding-block: 8px; }
  .brand { flex-basis: auto; }
  .primary-nav { order: 3; width: 100%; overflow-x: auto; }
  .primary-nav a { min-height: 46px; }
  .page-frame { grid-template-columns: 1fr; }
  .sidebar { border-right: 0; border-bottom: 1px solid #e9eef4; }
  .user-card { display: none; }
  .side-nav { display: flex; overflow-x: auto; }
  .side-nav a { flex: 0 0 auto; height: 48px; padding: 0 15px; border-left: 0; border-bottom: 3px solid transparent; }
  .side-nav a[aria-current='page'] { border-bottom-color: #1476e6; }
}
</style>
