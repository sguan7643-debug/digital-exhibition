import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createFeishuSchemaAdminClient } from '../server/feishu-schema-admin-client.mjs';
import { ONBOARDING_POC_MANIFEST, ONBOARDING_POC_MANIFEST_SHA256, ONBOARDING_POC_SCHEMA_TABLES } from '../server/contracts/feishu-onboarding-poc-schema-manifest.mjs';
import { createRedactedEvidence, redactIdentifier, writeRedactedEvidence } from '../server/contracts/feishu-onboarding-poc-evidence.mjs';
import { createOnboardingVerifierApi, resolveOnboardingVerifierTargets } from './onboarding-verifier-api.mjs';

const startedAt = new Date().toISOString();
const verifierTargets = resolveOnboardingVerifierTargets({
  legacyBaseUrl: process.env.FEISHU_VERIFY_BASE_URL || 'http://127.0.0.1:4173',
  apiBaseUrl: process.env.FEISHU_VERIFY_API_BASE_URL,
  appBaseUrl: process.env.FEISHU_VERIFY_APP_BASE_URL,
  appPublicBase: process.env.FEISHU_VERIFY_APP_PUBLIC_BASE || process.env.VITE_EXHIBITION_APP_BASE || '/test2/'
});
const evidenceFile = resolve(process.env.FEISHU_ONBOARDING_POC_BROWSER_EVIDENCE_PATH || '.local/feishu-onboarding-poc-browser-evidence.json');
const ledgerFile = resolve(process.env.FEISHU_ONBOARDING_POC_LEDGER_PATH || '.local/feishu-onboarding-poc-ledger.json');
const automationEvidencePath = resolve(String(process.env.FEISHU_ONBOARDING_POC_AUTOMATION_EVIDENCE_PATH || ''));
const profile = resolve(process.env.FEISHU_VERIFY_BROWSER_PROFILE || '.local/feishu-onboarding-poc-browser');
const headless = process.argv.includes('--headless');
const resumeApplicationId = String(process.argv.find(value => value.startsWith('--resume-application='))?.split('=')[1] || '');
const executablePath = [process.env.BROWSER_EXECUTABLE_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path => path && existsSync(path));
assert.ok(executablePath, '未找到 Chrome/Edge');
assert.ok(process.env.FEISHU_ONBOARDING_POC_AUTOMATION_EVIDENCE_PATH && existsSync(automationEvidencePath), '缺少跨 8 天结构化自动化证据文件');
const automationEvidence = JSON.parse(readFileSync(automationEvidencePath, 'utf8'));
let restartCommand;
try { restartCommand = JSON.parse(String(process.env.FEISHU_VERIFY_RESTART_COMMAND_JSON || '')); }
catch { throw new Error('FEISHU_VERIFY_RESTART_COMMAND_JSON 必须是 JSON 字符串数组'); }
assert.ok(Array.isArray(restartCommand) && restartCommand.length > 0 && restartCommand.every(value => typeof value === 'string' && value.length > 0), '必须提供可执行的外部服务重启命令');

function runCommand(command, label, timeoutMs = 120_000) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command[0], command.slice(1), { cwd: process.cwd(), env: process.env, shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill(); rejectCommand(new Error(`${label} 超时`)); }, timeoutMs);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => { clearTimeout(timer); rejectCommand(error); });
    child.on('exit', code => {
      clearTimeout(timer);
      if (code === 0) resolveCommand({ stdout, stderr });
      else rejectCommand(new Error(`${label} 退出码 ${code}: ${stderr.slice(-500)}`));
    });
  });
}

function assertEightDayAutomation(artifact, { runId, applicationId, instanceId }) {
  assert.equal(artifact.version, 'onboarding-poc-automation.v1');
  assert.equal(artifact.passed, true);
  assert.equal(artifact.runId, runId);
  assert.equal(artifact.applicationId, applicationId);
  assert.equal(artifact.instanceId, instanceId);
  const elapsedMs = Number(artifact.elapsedMs ?? (Date.parse(artifact.resumedObservedAt) - Date.parse(artifact.initialObservedAt)));
  assert.ok(Number.isFinite(elapsedMs) && elapsedMs >= 8 * 24 * 60 * 60 * 1000, '结构化自动化证据未覆盖至少 8 天');
  assert.equal(artifact.restart?.executed, true, '跨 8 天自动化证据必须包含真实重启结果');
  assert.equal(artifact.reloaded?.applicationId, applicationId);
  assert.equal(artifact.reloaded?.instanceId, instanceId);
  return elapsedMs;
}

async function waitForRestart(context, api, applicationId) {
  const deadline = Date.now() + Number(process.env.FEISHU_VERIFY_RESTART_TIMEOUT_MS || 120_000);
  while (Date.now() < deadline) {
    const live = await api('/api/v1/health/live').catch(() => null);
    if (live?.status === 200) {
      const detail = await api(`/api/v1/onboarding/applications/${encodeURIComponent(applicationId)}`).catch(() => null);
      if (detail?.status === 200) return detail.body;
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 1000));
  }
  throw new Error('外部服务重启后未能恢复并再次读取申请');
}

const context = await chromium.launchPersistentContext(profile, { headless, executablePath, viewport: { width: 1440, height: 1000 } });
const api = createOnboardingVerifierApi({ request: context.request, apiBaseUrl: verifierTargets.apiBaseUrl });
let runId = '';
let identity = {};
try {
  const page = context.pages()[0] || await context.newPage();
  await page.goto(verifierTargets.appUrl('/apps/onboarding/apply'), { waitUntil: 'domcontentloaded' });
  const sessionDeadline = Date.now() + Number(process.env.FEISHU_VERIFY_AUTH_TIMEOUT_MS || 600_000);
  while (Date.now() < sessionDeadline) {
    const response = await api('/api/v1/auth/feishu/session').catch(() => null);
    const body = response?.body || {};
    if (response?.status === 200 && body.authenticated) { identity = body.identity || {}; break; }
    const authorize = page.getByRole('button', { name: /确认授权|授权|允许/ }).last();
    if (await authorize.isVisible({ timeout: 250 }).catch(() => false)) await authorize.click();
    await new Promise(resolveWait => setTimeout(resolveWait, 1000));
  }
  assert.ok(identity.userId || identity.subject || identity.openId, '真实飞书授权会话不可用');

  let applicationId = resumeApplicationId;
  if (!applicationId) {
    await page.goto(verifierTargets.appUrl('/apps/onboarding/apply'), { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: '应用上架申请' }).waitFor();
    await page.getByLabel(/应用类型/).selectOption('T005');
    const suffix = String(Date.now());
    const applicant = page.locator('fieldset').filter({ hasText: '申请人信息' });
    await applicant.getByLabel(/所属部门/).selectOption({ index: 1 });
    await applicant.getByLabel(/联系电话/).fill('13900000000');
    await applicant.getByLabel(/联系邮箱/).fill('poc@example.invalid');
    await page.getByLabel(/应用名称/).fill(`海能Work POC验证 ${suffix}`);
    await page.getByLabel(/应用编码/).fill(`TEST_HW_POC_${suffix}`);
    await page.getByLabel(/所属应用域/).selectOption({ index: 1 });
    await page.getByLabel(/摘要/).fill('真实飞书上线申请最小闭环验证');
    await page.getByLabel(/应用简介/).fill('验证真实目录、文件上传、审批、状态同步和批准投影。');
    await page.getByLabel(/开发合作方信息/).fill('内部 POC 验证');
    await page.getByLabel(/Web应用地址/).fill('https://example.invalid/onboarding-poc');
    const contact = page.locator('fieldset').filter({ hasText: '接入人信息' });
    await contact.getByLabel(/所属部门/).selectOption({ index: 1 });
    await contact.getByLabel(/接入人/).selectOption({ index: 1 });
    await contact.getByLabel(/联系电话/).fill('13900000000');
    await contact.getByLabel(/联系邮箱/).fill('poc@example.invalid');
    const permission = page.locator('fieldset').filter({ hasText: '应用权限开通' });
    await permission.getByLabel(/适用部门/).selectOption({ index: 1 });
    await permission.getByLabel(/适用用户/).selectOption({ index: 1 });
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
    const fileInputs = page.locator('input[type=file]');
    await fileInputs.nth(0).setInputFiles({ name: 'poc-icon.png', mimeType: 'image/png', buffer: png });
    await fileInputs.nth(1).setInputFiles({ name: 'poc-attachment.pdf', mimeType: 'application/pdf', buffer: pdf });
    await page.locator('.upload-list li.ready').nth(1).waitFor({ timeout: 30_000 });
    assert.equal(await page.locator('.upload-list li.ready').count(), 2, '必须上传图标和至少一个普通附件');
    await page.getByRole('button', { name: '提交审核' }).click();
    await page.waitForURL(/\/apps\/onboarding\/status\?applicationId=/, { timeout: 60_000 });
    applicationId = new URL(page.url()).searchParams.get('applicationId') || '';
  }
  assert.match(applicationId, /^TEST_[A-Za-z0-9_-]+$/, '未获得稳定 applicationId');

  const listResponse = await api('/api/v1/onboarding/applications');
  assert.equal(listResponse.status, 200, JSON.stringify(listResponse.body));
  assert.ok(listResponse.body.items?.some(item => item.applicationId === applicationId), '我的申请列表未找到同一 applicationId');
  const detailResponse = await api(`/api/v1/onboarding/applications/${encodeURIComponent(applicationId)}`);
  const detail = detailResponse.body;
  assert.equal(detailResponse.status, 200, JSON.stringify(detail));
  assert.ok(detail.instanceId, '真实申请未返回 instanceId');
  assert.equal(detail.icon?.sha256?.length, 64, '真实图标 SHA-256 缺失');
  assert.ok(detail.attachments?.length >= 1 && detail.attachments[0].sha256?.length === 64, '真实普通附件及 SHA-256 缺失');
  runId = String(detail.runId || '');
  assert.match(runId, /^TEST_ONBOARDING_POC_/, '真实申请缺少 runId，禁止报告通过');
  const elapsedMs = assertEightDayAutomation(automationEvidence, { runId, applicationId, instanceId: detail.instanceId });

  const approveResponse = await api(`/api/v1/approvals/instances/${encodeURIComponent(detail.instanceId)}/approve`, { method: 'POST', body: { resourceId: detail.resourceId } });
  assert.equal(approveResponse.status, 200, JSON.stringify(approveResponse.body));
  assert.equal(approveResponse.body.status, 'APPROVED');
  const syncResponse = await api(`/api/v1/onboarding/applications/${encodeURIComponent(applicationId)}/sync`, { method: 'POST', body: {} });
  const synced = syncResponse.body;
  assert.equal(syncResponse.status, 200, JSON.stringify(synced));
  assert.equal(synced.status, 'APPROVED');
  assert.equal(synced.instanceId, detail.instanceId, '详情与同步必须对应同一审批实例');
  const attachment = synced.attachments[0];
  const grantResponse = await api(`/api/v1/onboarding/applications/${encodeURIComponent(applicationId)}/files/${encodeURIComponent(attachment.fileId)}/grant`, { method: 'POST', body: { mode: 'DOWNLOAD' } });
  assert.equal(grantResponse.status, 200, JSON.stringify(grantResponse.body));
  assert.ok(grantResponse.body.url && grantResponse.body.expiresAt, '普通附件访问授权缺失');

  assert.ok(existsSync(ledgerFile), 'POC ledger 不存在');
  const ledger = JSON.parse(readFileSync(ledgerFile, 'utf8'));
  const expectedBaseFingerprint = createHash('sha256').update(String(process.env.FEISHU_BASE_TOKEN || '')).digest('hex');
  assert.equal(ledger.runId, runId);
  assert.equal(ledger.baseFingerprint, expectedBaseFingerprint);
  assert.equal(ledger.manifestVersion, ONBOARDING_POC_MANIFEST.version);
  assert.equal(ledger.manifestSha256, ONBOARDING_POC_MANIFEST_SHA256);
  const adminClient = createFeishuSchemaAdminClient();
  const remoteTables = new Map((await adminClient.listTables()).map(table => [String(table.name || ''), table]));
  for (const schema of ONBOARDING_POC_MANIFEST.tables) {
    const table = remoteTables.get(schema.table_name);
    assert.ok(table?.table_id, `Base 缺少 manifest 表：${schema.table_name}`);
    const fields = new Set((await adminClient.listFields(table.table_id)).map(field => String(field.field_name || '')));
    for (const expected of schema.fields) assert.ok(fields.has(expected.field_name), `${schema.table_name} 缺少字段 ${expected.field_name}`);
  }
  const recordEntries = ledger.objects.filter(entry => entry.objectType === 'RECORD');
  const coveredTables = new Set(recordEntries.map(entry => entry.tableName));
  for (const tableName of ONBOARDING_POC_SCHEMA_TABLES) assert.ok(coveredTables.has(tableName), `ledger 未覆盖真实记录表 ${tableName}`);
  for (const entry of recordEntries) {
    const remote = await adminClient.getRecord(entry.tableId, entry.recordId);
    assert.equal(String(remote.fields?.[entry.keyField] || ''), String(entry.businessKey));
    if (ONBOARDING_POC_SCHEMA_TABLES.has(entry.tableName)) assert.equal(String(remote.fields?.['运行标识'] || ''), runId);
  }

  await runCommand(restartCommand, '外部服务重启');
  const restartedDetail = await waitForRestart(context, api, applicationId);
  assert.equal(restartedDetail.applicationId, applicationId);
  assert.equal(restartedDetail.instanceId, detail.instanceId);
  assert.equal(restartedDetail.status, 'APPROVED');
  await page.goto(verifierTargets.appUrl(`/apps/onboarding/status?applicationId=${encodeURIComponent(applicationId)}`), { waitUntil: 'networkidle' });
  await page.getByText('已通过', { exact: true }).waitFor({ timeout: 30_000 });

  await runCommand([process.execPath, 'tools/feishu-onboarding-poc.mjs', '--cleanup'], 'POC 精确清理');
  const cleanedLedger = JSON.parse(readFileSync(ledgerFile, 'utf8'));
  assert.equal(cleanedLedger.runId, runId);
  assert.match(cleanedLedger.status, /^CLEANED/);
  assert.ok(cleanedLedger.objects.filter(entry => entry.objectType === 'RECORD').every(entry => entry.cleanupResult === 'VERIFIED_ABSENT'), '远端记录未全部精确清理并验空');
  const retained = cleanedLedger.objects.filter(entry => entry.cleanupResult === 'RETAINED_PENDING_GC');
  assert.ok(retained.some(entry => entry.objectType === 'MEDIA'), '媒体残留未披露');
  assert.ok(retained.some(entry => entry.objectType === 'APPROVAL_INSTANCE'), '审批实例残留未披露');

  const evidence = createRedactedEvidence({ phase: 'real-browser-closure', passed: true, runId, identity, startedAt, checks: {
    requestInterception: false,
    application: redactIdentifier(applicationId), instance: redactIdentifier(detail.instanceId), resource: redactIdentifier(detail.resourceId),
    iconAndOrdinaryAttachment: true, listDetailSyncSameInstance: true, attachmentGrant: true,
    restartRecovery: true, elapsedMs, baseFingerprintAndManifest: true, remoteRecordTables: [...coveredTables].sort(),
    cleanupStatus: cleanedLedger.status, retainedObjects: retained.map(entry => ({ objectType: entry.objectType, cleanupResult: entry.cleanupResult })),
    finalStatus: synced.status, statusPageApproved: true
  } });
  writeRedactedEvidence(evidenceFile, evidence);
  console.log(JSON.stringify({ ...evidence, evidenceFile }, null, 2));
} catch (error) {
  const evidence = createRedactedEvidence({ phase: 'real-browser-closure', passed: false, runId, identity, startedAt, checks: { requestInterception: false }, failure: error });
  writeRedactedEvidence(evidenceFile, evidence);
  console.error(JSON.stringify({ ...evidence, evidenceFile }, null, 2));
  process.exitCode = 1;
} finally {
  await context.close();
}
