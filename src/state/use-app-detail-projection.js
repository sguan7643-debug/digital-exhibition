import { computed, reactive } from 'vue';

export function useAppDetailProjection(props) {
  const remoteMode = computed(() => true);
  const remote = computed(() => props.integrationData?.['APP-003'] || null);
  const state = computed(() => {
    if (props.integrationState === 'loading') return 'loading';
    if (['authentication-required', 'permission-denied'].includes(props.integrationState)) return 'auth';
    if (['error', 'timeout', 'rate-limited', 'schema-drift', 'security-error'].includes(props.integrationState)) return 'error';
    return remote.value?.appId ? 'normal' : 'empty';
  });
  const field = (key, fallback = '—') => computed(() => remote.value?.[key] || fallback);
  return reactive({
    remoteMode, state, contentVisible: computed(() => state.value === 'normal'), detail: remote,
    name: field('name'), summary: computed(() => remote.value?.summary || remote.value?.description || '—'), appCode: field('appCode'),
    typeName: computed(() => remote.value?.typeName || remote.value?.typeCode || '—'), versionName: field('versionName'),
    ownerName: computed(() => remote.value?.ownerName || remote.value?.developerName || '—'),
    departmentName: computed(() => remote.value?.departmentName || remote.value?.ownerDepartmentName || '—'),
    updatedAt: field('updatedAt'), attachments: computed(() => remote.value?.attachments || [])
  });
}
