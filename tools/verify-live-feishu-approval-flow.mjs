import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = String(process.env.FEISHU_VERIFY_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const evidenceFile = process.env.LIVE_EVIDENCE_FILE
  ? resolve(process.env.LIVE_EVIDENCE_FILE)
  : resolve('.ai-team/tasks/DEH-LIVE-101-20260914/evidence/live-approval-closure.json');
const userDataDir = resolve(process.env.FEISHU_VERIFY_BROWSER_PROFILE || '.local/feishu-approval-live-browser');
const headless = process.argv.includes('--headless');
const resumeInstanceId = String(
  process.argv.find(argument => argument.startsWith('--resume-instance='))?.slice('--resume-instance='.length) || ''
).trim();
const resumeResourceId = String(
  process.argv.find(argument => argument.startsWith('--resource-id='))?.slice('--resource-id='.length) || ''
).trim();
const authTimeoutMs = Math.max(60_000, Number(process.env.FEISHU_VERIFY_AUTH_TIMEOUT_MS || 10 * 60 * 1000));
const chromePath = [
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : '',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
].find(candidate => existsSync(candidate));

assert.ok(chromePath, '未找到 Google Chrome');
assert.equal(Boolean(resumeInstanceId), Boolean(resumeResourceId), '续跑时必须同时提供 --resume-instance 与 --resource-id');

function safeJson(response) {
  return response.json().catch(() => ({}));
}

async function confirmAuthorizationIfVisible(page) {
  if (!page || page.isClosed()) return false;
  const authorizeButton = page.getByRole('button', { name: /确认授权|授权|允许/ }).last();
  if (!await authorizeButton.isVisible({ timeout: 300 }).catch(() => false)) return false;
  await authorizeButton.click({ timeout: 5_000 });
  console.log('已根据本次明确授权自动确认飞书授权提示。');
  return true;
}

async function waitForAuthorizedSession(context, page) {
  const deadline = Date.now() + authTimeoutMs;
  let lastStatus = 0;
  while (Date.now() < deadline) {
    const response = await context.request.get(`${baseUrl}/api/v1/auth/feishu/session`, {
      headers: { Accept: 'application/json' },
      timeout: 15_000
    }).catch(() => null);
    lastStatus = response?.status() || 0;
    if (response?.ok()) {
      const body = await safeJson(response);
      if (body?.authenticated === true) return body.identity || {};
    }
    await confirmAuthorizationIfVisible(page).catch(() => false);
    await new Promise(resolveWait => setTimeout(resolveWait, 1000));
  }
  throw new Error(`等待飞书授权超时（最后会话状态 ${lastStatus || 'unavailable'}）`);
}

async function browserFetch(page, path, init = {}) {
  return page.evaluate(async ({ path: requestPath, init: requestInit }) => {
    const response = await fetch(requestPath, { credentials: 'same-origin', ...requestInit });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, ok: response.ok, body };
  }, { path, init });
}

const startedAt = new Date().toISOString();
const suffix = String(Date.now());
const resourceId = resumeResourceId || `TEST_HW_LIVE_${suffix}`;
const title = `TEST_海能Work审批闭环_${suffix}`;
const context = await chromium.launchPersistentContext(userDataDir, {
  headless,
  executablePath: chromePath,
  viewport: { width: 1440, height: 1000 }
});

try {
  const page = context.pages()[0] || await context.newPage();
  await page.goto(`${baseUrl}/apps/onboarding/apply?type=T005`, { waitUntil: 'domcontentloaded' });
  console.log(headless
    ? '正在复用已授权的飞书验收会话。'
    : '已打开真实飞书授权窗口；如出现授权页，请在窗口中完成一次授权。');

  const identity = await waitForAuthorizedSession(context, page);
  await page.goto(`${baseUrl}/apps/onboarding/apply?type=T005`, { waitUntil: 'domcontentloaded' });

  let submit = null;
  let instanceId = resumeInstanceId;
  if (!instanceId) {
    submit = await browserFetch(page, '/api/v1/approvals/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationType: 'T005',
        title,
        applicationCode: resourceId,
        resourceId,
        businessKey: `TEST_T005_${resourceId}`,
        idempotencyKey: `TEST_IDEM_T005_${resourceId}_${suffix}`,
        description: 'TEST_真实飞书审批提交、审批与状态查询闭环验收',
        detailFields: {
          使用指南: 'TEST_真实审批闭环验收',
          使用功能: 'TEST_提交、审批、状态回读',
          应用描述: 'TEST_仅用于数智展厅真实飞书审批验收'
        },
        application: {
          name: title,
          applicationCode: resourceId,
          summary: 'TEST_真实飞书审批闭环验收',
          description: 'TEST_真实飞书审批提交、审批与状态查询闭环验收',
          applicant: String(identity.userId || identity.subject || ''),
          department: 'TEST_验收部门',
          detailFields: {
            使用指南: 'TEST_真实审批闭环验收',
            使用功能: 'TEST_提交、审批、状态回读'
          }
        }
      })
    });
    assert.equal(submit.status, 201, `真实审批提交失败：${JSON.stringify(submit.body)}`);
    assert.match(String(submit.body?.instanceId || ''), /^[A-Za-z0-9_-]{1,256}$/, '真实审批未返回实例 ID');
    assert.equal(submit.body?.status, 'PENDING', '真实审批提交后必须进入 PENDING');
    instanceId = String(submit.body.instanceId);
  } else {
    assert.match(instanceId, /^[A-Za-z0-9_-]{1,256}$/, '续跑审批实例 ID 不合法');
    console.log(`正在续跑真实审批实例 ${instanceId}，不会重复创建审批。`);
  }
  const statusPath = `/api/v1/approvals/instances/${encodeURIComponent(instanceId)}?resourceId=${encodeURIComponent(resourceId)}`;
  const before = await browserFetch(page, statusPath, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
  assert.equal(before.status, 200, `真实审批状态首次查询失败：${JSON.stringify(before.body)}`);
  assert.equal(before.body?.status, 'PENDING', '审批前状态必须是 PENDING');

  const approved = await browserFetch(page, `/api/v1/approvals/instances/${encodeURIComponent(instanceId)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceId })
  });
  assert.equal(approved.status, 200, `真实审批任务处理失败：${JSON.stringify(approved.body)}`);
  assert.equal(approved.body?.status, 'APPROVED', '审批接口必须返回 APPROVED');

  const after = await browserFetch(page, statusPath, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
  assert.equal(after.status, 200, `审批后状态查询失败：${JSON.stringify(after.body)}`);
  assert.equal(after.body?.status, 'APPROVED', '审批后状态必须是 APPROVED');

  const statusUrl = `${baseUrl}/apps/onboarding/status?source=feishu&instanceId=${encodeURIComponent(instanceId)}&resourceId=${encodeURIComponent(resourceId)}`;
  await page.goto(statusUrl, { waitUntil: 'domcontentloaded' });
  await page.getByText('审批已通过', { exact: true }).waitFor({ state: 'visible', timeout: 30_000 });

  const evidence = {
    passed: true,
    startedAt,
    completedAt: new Date().toISOString(),
    baseUrl,
    authenticated: true,
    identity: {
      userId: String(identity.userId || ''),
      displayName: String(identity.displayName || identity.name || '')
    },
    resourceId,
    instanceCode: instanceId,
    submit: submit
      ? { httpStatus: submit.status, approvalStatus: submit.body.status, resumed: false }
      : { httpStatus: null, approvalStatus: before.body.status, resumed: true },
    initialQuery: { httpStatus: before.status, approvalStatus: before.body.status },
    approve: { httpStatus: approved.status, approvalStatus: approved.body.status },
    finalQuery: { httpStatus: after.status, approvalStatus: after.body.status },
    statusPageApproved: true,
    requestInterception: false,
    remoteCleanup: 'approved TEST_ instances and API-created definitions cannot be deleted; retained with TEST_ markers'
  };
  mkdirSync(dirname(evidenceFile), { recursive: true });
  writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ...evidence, evidenceFile }, null, 2));
} finally {
  await context.close();
}
