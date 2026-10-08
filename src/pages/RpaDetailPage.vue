<script setup>
import RemoteAppDetailPage from '../components/RemoteAppDetailPage.vue';
import { useAppDetailProjection } from '../state/use-app-detail-projection.js';

const props = defineProps({
  integrationData: { type: Object, default: null },
  integrationState: { type: String, default: 'loading' },
  operationExecutor: { type: Function, default: null },
  actionExecutor: { type: Function, default: null },
  writesEnabled: { type: Boolean, default: false },
});
const projection = useAppDetailProjection(props);
</script>

<template>
  <RemoteAppDetailPage :projection="projection" :integration-data="integrationData" :operation-executor="operationExecutor" :action-executor="actionExecutor" :writes-enabled="writesEnabled" icon="rpa" kind="rpa" />
</template>
