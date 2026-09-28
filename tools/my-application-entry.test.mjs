import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const profileSource = await readFile(new URL('../src/pages/ProfilePage.vue', import.meta.url), 'utf8');
const readServiceSource = await readFile(new URL('../server/feishu-read-only-service.mjs', import.meta.url), 'utf8');
const onboardingSource = await readFile(new URL('../src/pages/OnboardingPage.vue', import.meta.url), 'utf8');

assert.match(
  profileSource,
  /<nav aria-label="个人申请入口"><a href="\/apps\/onboarding\/status">我的申请<\/a>/,
  '现有文字入口必须继续进入我的申请列表'
);
assert.match(
  readServiceSource,
  /\['todos',\s*'我的申请',\s*'查看申请进度',\s*'\/apps\/onboarding\/status',\s*'applications\.view'\]/,
  '我的申请快捷卡片必须投影到与文字入口相同的路由'
);
assert.match(
  readServiceSource,
  /enabled:\s*code\s*===\s*'todos'\s*\|\|\s*user\.permissions\.includes\(permissionCode\)\s*\|\|\s*user\.permissions\.includes\('\*'\)/,
  '我的申请快捷卡片必须与现有始终可用的文字入口保持相同可用行为'
);

assert.match(
  onboardingSource,
  /<span class="timeline-track"[^>]*><i aria-hidden="true">✓<\/i><\/span>/,
  '时间线图标必须位于独立轨道行'
);
assert.match(
  onboardingSource,
  /<span class="timeline-copy"><strong>提交申请<\/strong><time>/,
  '时间线标题与时间必须位于独立文字行'
);
assert.match(onboardingSource, /\.timeline\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, '宽屏时间线必须使用确定性的等宽网格');
assert.match(onboardingSource, /\.timeline li\{display:grid;grid-template-rows:28px auto;/, '宽屏阶段必须分为图标轨道行和文字行');
assert.match(onboardingSource, /\.timeline li:not\(:last-child\) \.timeline-track::after\{[^}]*left:calc\(50% \+ 14px\);[^}]*width:calc\(100% - 28px\);/, '连接段必须由前一阶段拥有并连接相邻图标外缘');
assert.doesNotMatch(onboardingSource, /\.timeline li:not\(:last-child\)::after/, '连接线不得绘制在同时承载文字的阶段容器上');
assert.match(onboardingSource, /@media\(max-width:760px\)[^{]*\{[\s\S]*?\.timeline li\{grid-template-columns:28px minmax\(0,1fr\);grid-template-rows:auto;/, '窄屏必须切换到图标列与文字列分离的竖向时间线');
assert.match(onboardingSource, /@media\(max-width:760px\)[\s\S]*?\.timeline li:not\(:last-child\) \.timeline-track::after\{[^}]*top:28px;[^}]*left:13px;[^}]*width:2px;/, '窄屏连接线必须只位于图标列');

const componentStyles = onboardingSource.match(/<style scoped>([\s\S]*?)<\/style>/)?.[1];
assert.ok(componentStyles, '必须能读取申请详情页的真实组件样式');

const executablePath = [
  process.env.BROWSER_EXECUTABLE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean).find(existsSync);
assert.ok(executablePath, '必须能找到 Edge/Chromium 以执行真实布局回归');

const browser = await chromium.launch({ headless: true, executablePath });
const layoutEvidence = [];
try {
  const scenarios = [
    { name: 'normal', fixtureWidth: 620, title: '提交申请', time: '2026年9月27日 01:08' },
    { name: 'wrapped', fixtureWidth: 300, title: '提交一条会在窄屏文字列中自然换行的海能Work应用上线申请', time: '2026年9月27日 01:08 最近一次同步完成' }
  ];

  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
    await page.setContent(`
      <style>${componentStyles}</style>
      <main style="width:${scenario.fixtureWidth}px">
        <ol class="timeline" aria-label="审批时间线">
          <li>
            <span class="timeline-track" aria-hidden="true"><i aria-hidden="true">✓</i></span>
            <span class="timeline-copy"><strong>${scenario.title}</strong><time>${scenario.time}</time></span>
          </li>
          <li class="pending">
            <span class="timeline-track" aria-hidden="true"><i aria-hidden="true">◷</i></span>
            <span class="timeline-copy"><strong>飞书审批中</strong><time>2026年9月27日 01:19</time></span>
          </li>
        </ol>
      </main>
    `);

    const geometry = await page.locator('.timeline').evaluate(timeline => {
      const firstItem = timeline.querySelector('li');
      const firstTrack = firstItem.querySelector('.timeline-track');
      const firstIcon = firstTrack.querySelector('i');
      const firstCopy = firstItem.querySelector('.timeline-copy');
      const secondIcon = timeline.querySelector('li:nth-child(2) .timeline-track i');
      const trackBox = firstTrack.getBoundingClientRect();
      const iconBox = firstIcon.getBoundingClientRect();
      const copyBox = firstCopy.getBoundingClientRect();
      const nextIconBox = secondIcon.getBoundingClientRect();
      const connector = getComputedStyle(firstTrack, '::after');
      const top = Number.parseFloat(connector.top);
      const bottom = Number.parseFloat(connector.bottom);
      const left = Number.parseFloat(connector.left);
      const width = Number.parseFloat(connector.width);
      return {
        connector: {
          top: trackBox.top + top,
          bottom: trackBox.bottom - bottom,
          left: trackBox.left + left,
          right: trackBox.left + left + width
        },
        firstIcon: { top: iconBox.top, bottom: iconBox.bottom, left: iconBox.left, right: iconBox.right },
        firstCopy: { top: copyBox.top, bottom: copyBox.bottom, left: copyBox.left, right: copyBox.right },
        nextIcon: { top: nextIconBox.top, bottom: nextIconBox.bottom, left: nextIconBox.left, right: nextIconBox.right },
        firstItemHeight: firstItem.getBoundingClientRect().height
      };
    });

    assert.ok(
      Math.abs(geometry.connector.top - geometry.firstIcon.bottom) <= 0.5,
      `${scenario.name}: 连接线起点必须贴合当前图标下缘：${JSON.stringify(geometry)}`
    );
    assert.ok(
      Math.abs(geometry.connector.bottom - geometry.nextIcon.top) <= 0.5,
      `${scenario.name}: 连接线终点必须贴合下一图标上缘：${JSON.stringify(geometry)}`
    );
    assert.ok(
      geometry.connector.left >= geometry.firstIcon.left && geometry.connector.right <= geometry.firstIcon.right,
      `${scenario.name}: 连接线必须位于图标列：${JSON.stringify(geometry)}`
    );
    assert.ok(
      geometry.connector.right < geometry.firstCopy.left,
      `${scenario.name}: 连接线不得进入文字列：${JSON.stringify(geometry)}`
    );
    if (scenario.name === 'wrapped') {
      assert.ok(geometry.firstItemHeight > 60, `wrapped: 长文本必须实际换行并增高阶段行：${JSON.stringify(geometry)}`);
    }
    layoutEvidence.push({ scenario: scenario.name, viewportWidth: 700, fixtureWidth: scenario.fixtureWidth, ...geometry });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ narrowTimelineLayout: layoutEvidence }, null, 2));
console.log('my application entry and timeline contract passed');
