<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ExhibitionShell from './components/ExhibitionShell.vue';
import PageStateBoundary from './components/PageStateBoundary.vue';
import AnnouncementsPage from './pages/AnnouncementsPage.vue';
import FavoritesPage from './pages/FavoritesPage.vue';
import MessagesPage from './pages/MessagesPage.vue';
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
import { resolveIntegrationRuntime } from './integration/runtime-config.js';
import { createPageDataSource, describeDataSourceEnvelope } from './integration/page-data-source.js';

const integrationRuntime = resolveIntegrationRuntime({
  requestedMode: import.meta.env.VITE_EXHIBITION_DATA_MODE,
  proxyBase: import.meta.env.VITE_EXHIBITION_API_BASE_URL,
  remoteEnabled: import.meta.env.VITE_EXHIBITION_REMOTE_ENABLED === 'true',
  contractEvidenceComplete: import.meta.env.VITE_EXHIBITION_CONTRACT_EVIDENCE === 'complete',
  timeoutMs: Number(import.meta.env.VITE_EXHIBITION_REQUEST_TIMEOUT_MS),
  origin: window.location.origin
});

function normalizeInitialRoute() {
  if (window.location.pathname === '/') {
    window.history.replaceState(window.history.state, '', '/workbench' + window.location.search + window.location.hash);
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
  return resolvePage(window.location.href, stateFromLocation()) || {
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
  const next = new URL(anchor.href, window.location.href);
  if (next.origin !== window.location.origin) return;
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

onMounted(() => {
  window.addEventListener('popstate', syncLocation);
  document.addEventListener('click', handleInternalNavigation);
});
onBeforeUnmount(() => {
  window.removeEventListener('popstate', syncLocation);
  document.removeEventListener('click', handleInternalNavigation);
});

const page = computed(() => current.value);
const integrationContract = computed(() => getPageIntegrationContract(page.value.route));
const integrationEnvelope = ref({ mode: 'disabled', state: 'disabled', operationIds: [] });
let integrationDataSource;

async function syncIntegrationEnvelope() {
  integrationDataSource = createPageDataSource({
    route: page.value.route,
    runtime: integrationRuntime,
    mockLoader: () => ({ source: 'existing-approved-page-fixture', route: page.value.route })
  });
  integrationEnvelope.value = await integrationDataSource.load();
}

watch(() => page.value.route, syncIntegrationEnvelope, { immediate: true });
const integrationSourceLabel = computed(() => describeDataSourceEnvelope(integrationEnvelope.value));
</script>

<template>
  <exhibition-shell
    :page="page"
    :data-integration-mode="integrationEnvelope.mode"
    :data-integration-operations="integrationContract?.readOperationIds.join(',')"
  >
    <p class="sr-only integration-source-status" data-integration-status aria-live="polite">{{ integrationSourceLabel }}</p>
    <page-state-boundary :page="page" :state="page.state" @restore="restoreNormal">
      <workbench-page v-if="page.id === '01'" />
      <messages-page v-else-if="page.id === '02'" />
      <favorites-page v-else-if="page.id === '03'" />
      <profile-page v-else-if="page.id === '04'" />
      <announcements-page v-else-if="page.id === '05'" />
      <notice-detail-page v-else-if="page.id === '06'" />
      <apps-page v-else-if="page.id === '07'" />
      <tool-detail-page v-else-if="page.id === '08'" />
      <haineng-work-detail-page v-else-if="page.id === '09'" />
      <report-detail-page v-else-if="page.id === '10'" />
      <dashboard-detail-page v-else-if="page.id === '11'" />
      <dataset-detail-page v-else-if="page.id === '12'" />
      <metric-detail-page v-else-if="page.id === '13'" />
      <ai-detail-page v-else-if="page.id === '14'" />
      <ead-detail-page v-else-if="page.id === '15'" />
      <rpa-detail-page v-else-if="page.id === '16'" />
      <onboarding-page v-else-if="page.id === '17'" />
      <points-page v-else-if="page.id === '18'" />
      <points-details-page v-else-if="page.id === '19'" />
      <training-page v-else-if="page.id === '20'" />
      <operations-page v-else-if="page.id === '21'" />
      <announcement-admin-page v-else-if="page.id === '22'" />
      <announcement-editor-page v-else-if="page.id === '23'" />
      <app-admin-page v-else-if="page.id === '24'" />
      <app-editor-page v-else-if="page.id === '25'" />
      <admin-page v-else-if="page.id === '26'" />
      <certification-page v-else-if="page.id === '27'" />
      <talent-people-page v-else-if="page.id === '28'" />
      <talent-projects-page v-else-if="page.id === '29'" />
      <talent-progress-page v-else-if="page.id === '30'" />
      <portal-page v-else :page="page" />
    </page-state-boundary>
  </exhibition-shell>
</template>
