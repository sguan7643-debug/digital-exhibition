<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
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

onMounted(() => window.addEventListener('popstate', syncLocation));
onBeforeUnmount(() => window.removeEventListener('popstate', syncLocation));

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
    <portal-page v-else-if="page.state === 'normal'" :page="page" />
    <generic-page v-else :page="page" @restore="restoreNormal" />
  </exhibition-shell>
</template>
