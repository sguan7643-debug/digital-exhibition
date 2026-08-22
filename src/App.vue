<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
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

function currentRouteKey(){return window.location.pathname;}
function captureRouteSession(){
  const main=document.getElementById('main-content');
  const active=document.activeElement;
  const focusId=active&&main?.contains(active)?active.id||active.getAttribute('data-session-focus')||'':'';
  routeSession.capture(currentRouteKey(),{scrollTop:main?.scrollTop||0,focusId});
}
function restoreRouteSession(){
  const main=document.getElementById('main-content');
  const snapshot=routeSession.snapshot(currentRouteKey());
  if(!main)return;
  main.scrollTop=snapshot?.scrollTop||0;
  const target=snapshot?.focusId&&(document.getElementById(snapshot.focusId)||document.querySelector(`[data-session-focus="${snapshot.focusId}"]`));
  (target||main).focus();
}
function syncLocation() {
  locationKey.value = window.location.href;
  nextTick(restoreRouteSession);
}

function restoreNormal() {
  const next = new URL(window.location.href);
  next.searchParams.delete('state');
  window.history.replaceState({}, '', `${next.pathname}${next.search}${next.hash}`);
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
  captureRouteSession();
  window.history.pushState({ xltFromPath: window.location.pathname }, '', `${next.pathname}${next.search}${next.hash}`);
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
</script>

<template>
  <exhibition-shell :page="page">
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
