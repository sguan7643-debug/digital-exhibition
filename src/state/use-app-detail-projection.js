import { computed, unref } from 'vue';

export function useAppDetailProjection(props, defaults) {
  const remoteMode = computed(() => props.integrationState !== 'mock');
  const remote = computed(() => props.integrationData?.['APP-003'] || null);
  const state = computed(() => {
    if (!remoteMode.value) return 'normal';
    if (props.integrationState === 'loading') return 'loading';
    if (['authentication-required', 'permission-denied'].includes(props.integrationState)) return 'auth';
    if (['error', 'timeout', 'rate-limited', 'schema-drift', 'security-error'].includes(props.integrationState)) return 'error';
    return remote.value?.appId ? 'normal' : 'empty';
  });
  const field = (key, fallback = '—') => computed(() => remoteMode.value ? (remote.value?.[key] || fallback) : (unref(defaults[key]) || fallback));
  return {
    remoteMode, state, contentVisible: computed(() => state.value === 'normal'), detail: remote,
    name: field('name', defaults.name), summary: field('summary', defaults.summary), appCode: field('appCode', defaults.appCode),
    typeName: field('typeName', defaults.typeName), versionName: field('versionName', defaults.versionName),
    ownerName: computed(() => remoteMode.value ? (remote.value?.ownerName || remote.value?.developerName || '—') : (defaults.ownerName || '—')),
    departmentName: computed(() => remoteMode.value ? (remote.value?.departmentName || remote.value?.ownerDepartmentName || '—') : (defaults.departmentName || '—')),
    updatedAt: field('updatedAt', defaults.updatedAt), attachments: computed(() => remoteMode.value ? (remote.value?.attachments || []) : (defaults.attachments || []))
  };
}
