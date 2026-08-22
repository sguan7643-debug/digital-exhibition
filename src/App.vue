<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import ExhibitionShell from './components/ExhibitionShell.vue';
import GenericPage from './pages/GenericPage.vue';
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

function syncLocation() {
  locationKey.value = window.location.href;
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
  window.history.pushState({}, '', `${next.pathname}${next.search}${next.hash}`);
  syncLocation();
  nextTick(() => document.getElementById('main-content')?.focus());
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
    <workbench-page v-if="page.id === '01' && page.state === 'normal'" />
    <messages-page v-else-if="page.id === '02' && page.state === 'normal'" />
    <favorites-page v-else-if="page.id === '03' && page.state === 'normal'" />
    <profile-page v-else-if="page.id === '04' && page.state === 'normal'" />
    <announcements-page v-else-if="page.id === '05' && page.state === 'normal'" />
    <notice-detail-page v-else-if="page.id === '06' && page.state === 'normal'" />
    <apps-page v-else-if="page.id === '07' && page.state === 'normal'" />
    <tool-detail-page v-else-if="page.id === '08' && page.state === 'normal'" />
    <haineng-work-detail-page v-else-if="page.id === '09' && page.state === 'normal'" />
    <report-detail-page v-else-if="page.id === '10' && page.state === 'normal'" />
    <dashboard-detail-page v-else-if="page.id === '11' && page.state === 'normal'" />
    <dataset-detail-page v-else-if="page.id === '12' && page.state === 'normal'" />
    <metric-detail-page v-else-if="page.id === '13' && page.state === 'normal'" />
    <ai-detail-page v-else-if="page.id === '14' && page.state === 'normal'" />
    <ead-detail-page v-else-if="page.id === '15' && page.state === 'normal'" />
    <rpa-detail-page v-else-if="page.id === '16' && page.state === 'normal'" />
    <onboarding-page v-else-if="page.id === '17' && page.state === 'normal'" />
    <points-page v-else-if="page.id === '18' && page.state === 'normal'" />
    <points-details-page v-else-if="page.id === '19' && page.state === 'normal'" />
    <training-page v-else-if="page.id === '20' && page.state === 'normal'" />
    <operations-page v-else-if="page.id === '21' && page.state === 'normal'" />
    <announcement-admin-page v-else-if="page.id === '22' && page.state === 'normal'" />
    <announcement-editor-page v-else-if="page.id === '23' && page.state === 'normal'" />
    <app-admin-page v-else-if="page.id === '24' && page.state === 'normal'" />
    <app-editor-page v-else-if="page.id === '25' && page.state === 'normal'" />
    <admin-page v-else-if="page.id === '26' && page.state === 'normal'" />
    <certification-page v-else-if="page.id === '27' && page.state === 'normal'" />
    <talent-people-page v-else-if="page.id === '28' && page.state === 'normal'" />
    <talent-projects-page v-else-if="page.id === '29' && page.state === 'normal'" />
    <talent-progress-page v-else-if="page.id === '30' && page.state === 'normal'" />
    <portal-page v-else-if="page.state === 'normal'" :page="page" />
    <generic-page v-else :page="page" @restore="restoreNormal" />
  </exhibition-shell>
</template>
