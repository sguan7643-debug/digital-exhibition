<script setup>
import { computed } from 'vue';
import RemoteRecordPage from '../components/RemoteRecordPage.vue';
const props = defineProps({ integrationData: { type: Object, default: null }, integrationState: { type: String, default: 'loading' } });
const record = computed(() => props.integrationData?.['OAN-003'] || null);
</script>
<template>
  <RemoteRecordPage
    title="公告详情"
    description="仅展示飞书多维表格返回的公告数据；写入接口未启用时不提供草稿保存或发布。"
    :record="record"
    :state="integrationState"
  />
</template>
