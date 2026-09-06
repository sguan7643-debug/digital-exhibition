<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 }
});
</script>

<template>
  <svg class="type-line-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <g v-if="name === 'materials'">
      <path d="M3.5 7.5h6l1.8 2h9.2v8.75a2.25 2.25 0 0 1-2.25 2.25H5.75a2.25 2.25 0 0 1-2.25-2.25z" />
      <path d="M3.5 10h17" />
    </g>
    <g v-else-if="name === 'apps'">
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
      <rect x="14" y="14" width="6.5" height="6.5" rx="1" />
    </g>
    <g v-else-if="name === 'visual'">
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M7 16v-3m4 3V9m4 7v-5m4 5V7" />
    </g>
    <g v-else-if="name === 'report'">
      <path d="M6 3.5h8l4 4v13H6z" />
      <path d="M14 3.5v4h4M9 11h6m-6 3h6m-6 3h4" />
    </g>
    <g v-else-if="name === 'rpa'">
      <path d="M12 3v3M9.5 3h5" />
      <rect x="5" y="7" width="14" height="12.5" rx="3" />
      <path d="M9 12h.01M15 12h.01M9 16h6M5 11H3v4h2m14-4h2v4h-2" />
    </g>
    <g v-else-if="name === 'dataset'">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.65 3.58 3 8 3s8-1.35 8-3V6M4 12v6c0 1.65 3.58 3 8 3s8-1.35 8-3v-6" />
    </g>
    <g v-else-if="name === 'metric'">
      <path d="M4 18a8 8 0 0 1 16 0M12 18l4-6M6.5 13.5 5 12M17.5 13.5 19 12M12 10V8" />
      <path d="M9.5 18h5" />
    </g>
    <g v-else-if="name === 'ai'">
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 15l2-6 2 6m-3.3-2h2.6M15 9v6M9 3v3m3-3v3m3-3v3M9 18v3m3-3v3m3-3v3M3 9h3m-3 3h3m-3 3h3m12-6h3m-3 3h3m-3 3h3" />
    </g>
    <g v-else-if="name === 'work'">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.25" />
      <path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20M15 14.5h1.8a3.7 3.7 0 0 1 3.7 3.7V20" />
    </g>
    <g v-else-if="name === 'ead'">
      <path d="M6 3.5h8l4 4v13H6z" />
      <path d="M14 3.5v4h4M9 14l2 2 4-5" />
    </g>
    <g v-else-if="name === 'message'">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M10 20h4" />
    </g>
    <g v-else-if="name === 'favorite'">
      <path d="m12 3.5 2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.78 6.8 19.51l.99-5.79-4.21-4.1 5.82-.85z" />
    </g>
    <g v-else>
      <path d="M3.5 9h17v10.5h-17zM8 9V6.5h8V9M3.5 13h17" />
      <path d="M10 13v2h4v-2" />
    </g>
  </svg>
</template>

<style scoped>
.type-line-icon{display:block;flex:0 0 auto;color:inherit}
</style>
