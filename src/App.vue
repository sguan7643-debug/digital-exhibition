<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue';
import ExhibitionShell from './components/ExhibitionShell.vue';
import PageStateBoundary from './components/PageStateBoundary.vue';
import IntegrationAuthBanner from './components/IntegrationAuthBanner.vue';
import AppDetailLiveSections from './components/AppDetailLiveSections.vue';
import ProfileLiveSections from './components/ProfileLiveSections.vue';
import OperationalDetailStatus from './components/OperationalDetailStatus.vue';
import ControlledWritePanel from './components/ControlledWritePanel.vue';
import AnnouncementsPage from './pages/AnnouncementsPage.vue';
import FavoritesPage from './pages/FavoritesPage.vue';
import MessagesPage from './pages/MessagesPage.vue';
import MaterialsPage from './pages/MaterialsPage.vue';
import PortalPage from './pages/PortalPage.vue';
import ProfilePage from './pages/ProfilePage.vue';
import WorkbenchPage from './pages/WorkbenchPage.vue';
import NoticeDetailPage from './pages/NoticeDetailPage.vue';
import AppsPage from './pages/AppsPage.vue';
import ToolDetailPage from './pages/ToolDetailPage.vue';
import HainengWorkDetailPage from './pages/HainengWorkDetailPage.vue';
import ReportDetailPage from './pages/ReportDetailPage.vue';
import DashboardDetailPage from './pages/DashboardDetailPage.vue';
import DatasetDetailPage from './pages/DatasetDetailPage.vue';
import MetricDetailPage from './pages/MetricDetailPage.vue';
import AiDetailPage from './pages/AiDetailPage.vue';
import EadDetailPage from './pages/EadDetailPage.vue';
import RpaDetailPage from './pages/RpaDetailPage.vue';
import OnboardingPage from './pages/OnboardingPage.vue';
import OnboardingApplyPage from './pages/OnboardingApplyPage.vue';
import PointsPage from './pages/PointsPage.vue';
import PointsDetailsPage from './pages/PointsDetailsPage.vue';
import TrainingPage from './pages/TrainingPage.vue';
import OperationsPage from './pages/OperationsPage.vue';
import AnnouncementAdminPage from './pages/AnnouncementAdminPage.vue';
import AnnouncementEditorPage from './pages/AnnouncementEditorPage.vue';
import AppAdminPage from './pages/AppAdminPage.vue';
import AppEditorPage from './pages/AppEditorPage.vue';
import AdminPage from './pages/AdminPage.vue';
import CertificationPage from './pages/CertificationPage.vue';
import TalentPeoplePage from './pages/TalentPeoplePage.vue';
import TalentProjectsPage from './pages/TalentProjectsPage.vue';
import TalentProgressPage from './pages/TalentProgressPage.vue';
import { PAGE_MATRIX, resolvePage } from './fixtures/pages.js';
import { routeSession } from './state/session-store.js';
import { getPageIntegrationContract } from './integration/page-integration-matrix.js';
import { isRemoteRuntime, resolveIntegrationRuntime } from './integration/runtime-config.js';
import { createPageDataSource, describeDataSourceEnvelope } from './integration/page-data-source.js';
import { resolveIntegrationLiveAnnouncement } from './integration/live-region.js';
import { createSafeProxyClient } from './integration/safe-proxy-client.js';
import { createVerifiedReadOperationContracts, createVerifiedWriteOperationContracts } from './integration/operation-contract-schemas.js';
import { OPERATION_REGISTRY, getOperation } from './integration/operation-registry.js';
import { resolveRemoteReadOperation } from './integration/remote-operation-capabilities.js';
import { buildPageReadRequestPlan } from './integration/page-read-request-plan.js';
import { getRequestActivity, subscribeRequestActivity } from './integration/request-status.js';
import { normalizeAppBasePath, prependAppBasePath, prefixAppBaseLinks, stripAppBasePath } from './integration/app-base-path.js';

const props = defineProps({
  entryAuth: { type: Object, default: () => ({ authorized: true, render: true }) }
});
const entryAuth = props.entryAuth;
const appBasePath = normalizeAppBasePath(import.meta.env.VITE_EXHIBITION_APP_BASE || import.meta.env.BASE_URL);
const entryUnavailable = ref(entryAuth.reason === 'session-unavailable');
const entryRetrying = ref(false);

const integrationRuntime = resolveIntegrationRuntime({
  requestedMode: import.meta.env.VITE_EXHIBITION_DATA_MODE,
  proxyBase: import.meta.env.VITE_EXHIBITION_API_BASE_URL,
  remoteEnabled: import.meta.env.VITE_EXHIBITION_REMOTE_ENABLED === 'true',
  contractEvidenceComplete: import.meta.env.VITE_EXHIBITION_CONTRACT_EVIDENCE === 'complete',
  testWritesEnabled: import.meta.env.VITE_EXHIBITION_TEST_WRITES_ENABLED === 'true',
  timeoutMs: Number(import.meta.env.VITE_EXHIBITION_REQUEST_TIMEOUT_MS),
  origin: window.location.origin
});
const verifiedReadContracts = createVerifiedReadOperationContracts();
const verifiedWriteContracts = createVerifiedWriteOperationContracts(OPERATION_REGISTRY.filter(operation => operation.access === 'write').map(operation => operation.id));
const integrationClient = createSafeProxyClient({
  baseUrl: integrationRuntime.proxyBase,
  origin: window.location.origin,
  timeoutMs: integrationRuntime.timeoutMs,
  operationContracts: { ...verifiedReadContracts, ...verifiedWriteContracts }
});
const requestActivity = ref(getRequestActivity());
const showControlledWritePanel = computed(() => import.meta.env.DEV && new URLSearchParams(window.location.search).get('test-write-panel') === '1');
let requestActivityUnsubscribe;
let appBaseLinkObserver;

function resolveRemoteOperation(operationId) {
  const read = resolveRemoteReadOperation(operationId);
  if (read) return read;
  const operation = getOperation(operationId);
  return operation?.access === 'write' && integrationRuntime.testWritesEnabled
    ? Object.freeze({ ...operation, remoteEnabled: true })
    : operation;
}

async function executeReadOperation(operationId, input) {
  const operation = resolveRemoteReadOperation(operationId);
  if (!isRemoteRuntime(integrationRuntime) || !operation?.remoteEnabled) throw new Error('真实接口当前未启用');
  return integrationClient.execute(operationId, input);
}

async function requestHash(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function executePageWriteOperation(operationId, input, options = {}) {
  if (!integrationRuntime.testWritesEnabled || !integrationDataSource) throw new Error('测试写入通道未启用');
  if (!String(input?.businessKey || '').startsWith('TEST_') || !String(input?.idempotencyKey || '').startsWith('TEST_')) {
    throw new Error('页面联调写入只允许 TEST_ 业务键和幂等键');
  }
  const currentUser = await integrationClient.execute('COM-001', {});
  return integrationDataSource.executeAction(operationId, input, {
    permissions: currentUser.data.permissions,
    confirmed: options.confirmed === true,
    idempotencyKey: input.idempotencyKey,
    ifMatch: input.ifMatch,
    isolatedTestRecordId: input.businessKey,
    auditContractId: 'feishu-test-write.v1',
    requestHash: await requestHash({ operationId, input })
  });
}

function normalizeInitialRoute() {
  if (stripAppBasePath(window.location.pathname, appBasePath) === '/') {
    window.history.replaceState(window.history.state, '', prependAppBasePath(`/workbench${window.location.search}${window.location.hash}`, appBasePath));
  }
}

normalizeInitialRoute();

const supportedStates = new Set([
  'normal',
  'loading',
  'empty',
  'error',
  'disabled',
  'permission-denied'
]);

function stateFromLocation() {
  const value = new URLSearchParams(window.location.search).get('state') || 'normal';
  return supportedStates.has(value) ? value : 'normal';
}

const locationKey = ref(window.location.href);
const current = computed(() => {
  locationKey.value;
  return resolvePage(window.location.href, stateFromLocation(), appBasePath) || {
    ...PAGE_MATRIX[0],
    state: 'error',
    title: '页面不存在'
  };
});

function ensureEntryKey(){
  const state=window.history.state||{};
  if(state.xltEntryKey)return state.xltEntryKey;
  const xltEntryKey=routeSession.nextEntryKey();
  window.history.replaceState({...state,xltEntryKey},'',window.location.href);
  return xltEntryKey;
}
const activeEntryKey=ref(ensureEntryKey());
const activeHref=ref(`${window.location.pathname}${window.location.search}${window.location.hash}`);
function captureRouteSession(entryKey=activeEntryKey.value,focusOverride=''){
  const main=document.getElementById('main-content');
  const active=document.activeElement;
  const focusId=focusOverride||(active&&main?.contains(active)?active.id||active.getAttribute('data-session-focus')||'':'');
  routeSession.capture(entryKey,{href:activeHref.value,scrollTop:main?.scrollTop||0,focusId,viewState:routeSession.captureViewState()});
}
function restoreRouteSession(){
  const main=document.getElementById('main-content');
  const snapshot=routeSession.snapshot(activeEntryKey.value);
  if(!main)return;
  routeSession.restoreViewState(snapshot?.viewState);
  const hashId=decodeURIComponent(window.location.hash.slice(1));
  const hashTarget=hashId&&document.getElementById(hashId);
  if(hashTarget){
    main.scrollTop=0;
    hashTarget.scrollIntoView({block:'start'});
    hashTarget.focus({preventScroll:true});
    return;
  }
  main.scrollTop=snapshot?.scrollTop||0;
  const target=snapshot?.focusId&&(document.getElementById(snapshot.focusId)||document.querySelector(`[data-session-focus="${snapshot.focusId}"]`));
  (target||main).focus();
}
function syncLocation(event) {
  if(event?.type==='popstate')captureRouteSession(activeEntryKey.value);
  activeEntryKey.value=ensureEntryKey();
  activeHref.value=`${window.location.pathname}${window.location.search}${window.location.hash}`;
  locationKey.value = window.location.href;
  nextTick(restoreRouteSession);
}

function restoreNormal() {
  const next = new URL(window.location.href);
  next.searchParams.delete('state');
  window.history.replaceState({...window.history.state}, '', `${next.pathname}${next.search}${next.hash}`);
  syncLocation();
}

function handleInternalNavigation(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.target.closest?.('a[href]');
  if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
  if (anchor.hasAttribute('data-native-navigation')) return;
  const next = new URL(anchor.href, window.location.href);
  if (next.origin !== window.location.origin) return;
  const logicalPath = stripAppBasePath(next.pathname, appBasePath) || next.pathname;
  if (resolvePage(logicalPath)) next.pathname = prependAppBasePath(logicalPath, appBasePath);
  if (next.pathname === window.location.pathname && next.search === window.location.search && next.hash) return;
  event.preventDefault();
  if(anchor.hasAttribute('data-detail-return')&&window.history.state?.xltSource){
    captureRouteSession(activeEntryKey.value);
    window.history.back();
    return;
  }
  captureRouteSession(activeEntryKey.value,anchor.getAttribute('data-session-focus')||'');
  const sourceSnapshot=routeSession.snapshot(activeEntryKey.value);
  const xltEntryKey=routeSession.nextEntryKey();
  const xltSource={entryKey:activeEntryKey.value,href:sourceSnapshot?.href,focusId:sourceSnapshot?.focusId,scrollTop:sourceSnapshot?.scrollTop};
  window.history.pushState({xltEntryKey,xltSource}, '', `${next.pathname}${next.search}${next.hash}`);
  activeEntryKey.value=xltEntryKey;
  syncLocation();
}

function syncAppBaseLinks() {
  prefixAppBaseLinks(document, appBasePath, {
    origin: window.location.origin,
    isAppRoute: route => Boolean(resolvePage(route))
  });
}

onMounted(() => {
  requestActivityUnsubscribe = subscribeRequestActivity((value) => { requestActivity.value = value; });
  window.addEventListener('popstate', syncLocation);
  document.addEventListener('click', handleInternalNavigation);
  nextTick(syncAppBaseLinks);
  const appRoot = document.getElementById('app');
  if (appRoot) {
    appBaseLinkObserver = new MutationObserver(syncAppBaseLinks);
    appBaseLinkObserver.observe(appRoot, { childList: true, subtree: true });
  }
});
onUpdated(syncAppBaseLinks);
onBeforeUnmount(() => {
  requestActivityUnsubscribe?.();
  window.removeEventListener('popstate', syncLocation);
  document.removeEventListener('click', handleInternalNavigation);
  appBaseLinkObserver?.disconnect();
});

const page = computed(() => current.value);
const LOCAL_UI_ONLY_CONTRACT = Object.freeze({
  readOperationIds: Object.freeze([]),
  actions: Object.freeze([])
});
const integrationContract = computed(() => getPageIntegrationContract(page.value.route) || LOCAL_UI_ONLY_CONTRACT);
const integrationEnvelope = ref({ mode: 'disabled', state: 'disabled', operationIds: [] });
const integrationRetrying = ref(false);
let integrationDataSource;
let integrationLoadOptions = {};

const integrationRecovery = computed(() => {
  const envelope = integrationEnvelope.value;
  if (!Array.isArray(envelope.retryScope) || envelope.retryScope.length === 0) return null;
  const sectionRecords = Object.values(envelope.sectionRecords || {});
  const timeout = sectionRecords.some(record => record?.errorState === 'timeout');
  const traceId = envelope.traceIds?.[0] || envelope.traceId || null;
  return {
    message: timeout ? '部分飞书数据请求超时，已保留可用内容。' : '部分飞书数据暂时不可用，已保留可用内容。',
    traceId
  };
});

async function syncIntegrationEnvelope() {
  integrationDataSource?.cancel('页面已切换');
  if (entryUnavailable.value) {
    integrationDataSource = null;
    integrationEnvelope.value = { mode: 'disabled', state: 'disabled', operationIds: [], data: {} };
    return;
  }
  const route = page.value.route;
  if (!getPageIntegrationContract(route)) {
    integrationDataSource = null;
    integrationEnvelope.value = { mode: 'disabled', state: 'disabled', operationIds: [], data: {} };
    return;
  }
  integrationDataSource = createPageDataSource({
    route,
    runtime: integrationRuntime,
    mockLoader: () => ({ source: 'existing-approved-page-fixture', route: page.value.route }),
    client: integrationClient,
    operationResolver: resolveRemoteOperation
  });
  let loadOptions = buildPageReadRequestPlan({
    route, readOperationIds: integrationContract.value.readOperationIds,
    operationContracts: verifiedReadContracts, search: window.location.search
  });
  if (route === '/admin' && isRemoteRuntime(integrationRuntime)) {
    const allowedAdminReads = new Set(['ADM-003', 'ADM-004', 'ADM-006', 'ADM-007', 'INT-001', 'INT-003', 'INT-004', 'INT-005', 'ARC-002']);
    loadOptions = {
      ...loadOptions,
      operationIds: loadOptions.operationIds.filter((operationId) => allowedAdminReads.has(operationId))
    };
  }
  integrationLoadOptions = loadOptions;
  const pending = integrationDataSource.load({}, loadOptions);
  integrationEnvelope.value = integrationDataSource.snapshot();
  const result = await pending;
  if (page.value.route === route) integrationEnvelope.value = result;
}

watch(() => page.value.route, syncIntegrationEnvelope, { immediate: true });
const integrationSourceLabel = computed(() => describeDataSourceEnvelope(integrationEnvelope.value));
const integrationLiveAnnouncement = computed(() => resolveIntegrationLiveAnnouncement(integrationEnvelope.value, integrationSourceLabel.value));
const integrationAuthRequired = computed(() => integrationEnvelope.value.state === 'authentication-required'
  || Object.values(integrationEnvelope.value.sectionRecords || {}).some(record => record?.errorState === 'authentication-required'));
const feishuAuthUrl = computed(() => `/api/v1/auth/feishu/start?returnTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}`)}`);

async function retryIntegration() {
  if (integrationRetrying.value || !integrationDataSource || !integrationRecovery.value) return;
  const route = page.value.route;
  const source = integrationDataSource;
  integrationRetrying.value = true;
  try {
    const result = await source.retry({}, integrationLoadOptions);
    if (page.value.route === route && integrationDataSource === source) integrationEnvelope.value = result;
  } finally {
    integrationRetrying.value = false;
  }
}

async function retryEntryAuthorization() {
  if (entryRetrying.value || typeof entryAuth.retry !== 'function') return;
  entryRetrying.value = true;
  const retry = await entryAuth.retry();
  if (retry.authorized) {
    window.location.reload();
    return;
  }
  entryRetrying.value = false;
}
</script>

<template>
  <main v-if="entryUnavailable" aria-live="polite" aria-busy="entryRetrying" style="display:grid;min-height:100vh;place-items:center;padding:24px">
    <section role="status" style="max-width:420px;padding:24px;text-align:center">
      <h1>暂时无法确认登录状态</h1>
      <p>请重试登录检查，确认后再加载页面数据。</p>
      <button type="button" :disabled="entryRetrying" @click="retryEntryAuthorization">{{ entryRetrying ? '正在重试…' : '重试登录检查' }}</button>
    </section>
  </main>
  <exhibition-shell
    v-else
    :page="page"
    :app-base-path="appBasePath"
    :data-integration-mode="integrationEnvelope.mode"
    :data-integration-operations="integrationContract?.readOperationIds.join(',')"
  >
    <section
      v-if="requestActivity.isLoading"
      class="request-activity-banner"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy="true"
    >
      <span class="request-activity-banner__bar" aria-hidden="true"></span>
      <span class="request-activity-banner__copy">
        <strong v-if="requestActivity.activeCount > 1">正在处理 {{ requestActivity.activeCount }} 项请求</strong>
        <strong v-else>{{ requestActivity.labels[0] || '正在加载数据' }}…</strong>
        <small>页面其他区域仍可继续使用</small>
      </span>
    </section>
    <p class="sr-only integration-source-status" data-integration-status aria-live="polite">{{ integrationLiveAnnouncement }}</p>
    <integration-auth-banner v-if="integrationAuthRequired" :href="feishuAuthUrl" />
    <section v-if="integrationRecovery" class="integration-recovery" role="status" aria-live="polite" data-integration-retry>
      <span>{{ integrationRecovery.message }}</span>
      <button type="button" :disabled="integrationRetrying" @click="retryIntegration">{{ integrationRetrying ? '正在重试…' : '重试受影响数据' }}</button>
      <small v-if="integrationRecovery.traceId">请求标识：{{ integrationRecovery.traceId }}</small>
    </section>
    <page-state-boundary :page="page" :state="page.state" @restore="restoreNormal">
      <workbench-page v-if="page.id === '01'" :integration-data="integrationEnvelope.data" :operation-executor="executeReadOperation" />
      <messages-page v-else-if="page.id === '02'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" />
      <favorites-page v-else-if="page.id === '03'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" :action-executor="executePageWriteOperation" :test-writes-enabled="integrationRuntime.testWritesEnabled" />
      <profile-page v-else-if="page.id === '04'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <announcements-page v-else-if="page.id === '05'"
        :integration-data="integrationEnvelope.data"
        :integration-state="integrationEnvelope.state"
      />
      <notice-detail-page v-else-if="page.id === '06'" :state="page.state" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <apps-page v-else-if="page.id === '07'"
        :integration-data="integrationEnvelope.data"
        :integration-state="integrationEnvelope.state"
        :operation-executor="executeReadOperation"
        :action-executor="executePageWriteOperation"
        :test-writes-enabled="integrationRuntime.testWritesEnabled"
      />
      <tool-detail-page v-else-if="page.id === '08'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <haineng-work-detail-page v-else-if="page.id === '09'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <report-detail-page v-else-if="page.id === '10'"
        :integration-data="integrationEnvelope.data"
        :integration-state="integrationEnvelope.state"
        :operation-executor="executeReadOperation"
      />
      <dashboard-detail-page v-else-if="page.id === '11'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <dataset-detail-page v-else-if="page.id === '12'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <metric-detail-page v-else-if="page.id === '13'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <ai-detail-page v-else-if="page.id === '14'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <ead-detail-page v-else-if="page.id === '15'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <rpa-detail-page v-else-if="page.id === '16'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <onboarding-page v-else-if="page.id === '17'" />
      <onboarding-apply-page
        v-else-if="page.id === '32'"
        :integration-data="integrationEnvelope.data"
        :integration-state="integrationEnvelope.state"
        :integration-mode="integrationEnvelope.mode"
      />
      <points-page v-else-if="page.id === '18'" :integration-data="integrationEnvelope.data" />
      <points-details-page v-else-if="page.id === '19'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" />
      <training-page v-else-if="page.id === '20'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" :action-executor="executePageWriteOperation" :test-writes-enabled="integrationRuntime.testWritesEnabled" />
      <operations-page v-else-if="page.id === '21'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" />
      <announcement-admin-page v-else-if="page.id === '22'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <announcement-editor-page v-else-if="page.id === '23'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <app-admin-page v-else-if="page.id === '24'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" :operation-executor="executeReadOperation" />
      <app-editor-page v-else-if="page.id === '25'" />
      <admin-page
        v-else-if="page.id === '26'"
        :integration-data="integrationEnvelope.data"
        :integration-state="integrationEnvelope.state"
      />
      <certification-page v-else-if="page.id === '27'"
        :integration-data="integrationEnvelope.data"
        :integration-state="integrationEnvelope.state"
      />
      <talent-people-page v-else-if="page.id === '28'"
        :integration-data="integrationEnvelope.data"
        :integration-state="integrationEnvelope.state"
      />
      <talent-projects-page v-else-if="page.id === '29'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" />
      <talent-progress-page v-else-if="page.id === '30'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" />
      <materials-page v-else-if="page.id === '31'"
        :integration-data="integrationEnvelope.data"
        :integration-state="integrationEnvelope.state"
      />
      <portal-page v-else :page="page" />
      <app-detail-live-sections v-if="Number(page.id) >= 8 && Number(page.id) <= 16"
        :integration-data="integrationEnvelope.data"
        :integration-state="integrationEnvelope.state"
        :operation-executor="executeReadOperation"
        :action-executor="executePageWriteOperation"
        :test-writes-enabled="integrationRuntime.testWritesEnabled && integrationContract.actions.some(action => ['FAV-003','FAV-004','APP-005','APP-006','APP-008'].includes(action.operationId))"
      />
      <profile-live-sections v-if="page.id === '04'" :integration-data="integrationEnvelope.data" :integration-state="integrationEnvelope.state" />
      <operational-detail-status v-if="page.id === '26'" :operation-executor="executeReadOperation" />
      <controlled-write-panel
        v-if="showControlledWritePanel"
        :actions="integrationContract.actions"
        :executor="executePageWriteOperation"
        :enabled="integrationRuntime.testWritesEnabled"
      />
    </page-state-boundary>
  </exhibition-shell>
</template>
