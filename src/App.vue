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
    <portal-page v-else-if="page.state === 'normal'" :page="page" />
    <generic-page v-else :page="page" @restore="restoreNormal" />
  </exhibition-shell>
</template>
