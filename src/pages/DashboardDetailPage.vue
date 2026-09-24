<script setup>
import RemoteAppDetailPage from '../components/RemoteAppDetailPage.vue';
import { useAppDetailProjection } from '../state/use-app-detail-projection.js';

const props = defineProps({
  integrationData: { type: Object, default: null },
  integrationState: { type: String, default: 'loading' },
  operationExecutor: { type: Function, default: null },
});
const projection = useAppDetailProjection(props);
</script>

<template>
  <RemoteAppDetailPage :projection="projection" icon="visual" />
</template>
