<script setup>
import RemoteRecordPage from '../components/RemoteRecordPage.vue';
const props = defineProps({ integrationData: { type: Object, default: null }, integrationState: { type: String, default: 'loading' } });
</script>
<template>
  <RemoteRecordPage
    title="后台管理"
    description="仅展示飞书多维表格与受控集成接口返回的治理、审计和连接数据。"
    :record="props.integrationData"
    :state="integrationState"
  />
</template>
