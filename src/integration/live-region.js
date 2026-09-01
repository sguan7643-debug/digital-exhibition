import { h } from 'vue';

export function resolveIntegrationLiveAnnouncement(envelope = {}, sourceLabel = '') {
  if (envelope.announcement && sourceLabel) return `${sourceLabel}。${envelope.announcement}`;
  return envelope.announcement || sourceLabel || '真实数据接入未启用';
}

export const IntegrationLiveRegion = Object.freeze({
  name: 'IntegrationLiveRegion',
  props: { envelope: { type: Object, required: true } },
  setup(props) {
    return () => h('p', {
      class: 'sr-only integration-source-status',
      'data-integration-status': '',
      'aria-live': 'polite'
    }, resolveIntegrationLiveAnnouncement(props.envelope));
  }
});
