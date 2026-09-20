<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  tags: { type: Array, required: true },
  id: { type: String, required: true },
});
const rail = ref(null);
const clipped = ref(false);
// Share an eighteen-character budget across at most three labels; no per-label cap.
const visibleTags = computed(() => {
  let remaining = 18;
  const result = [];
  for (const tag of props.tags.slice(0, 3)) {
    const characters = Array.from(tag);
    if (characters.length <= remaining) {
      result.push(tag);
      remaining -= characters.length;
    } else {
      if (remaining > 1) result.push(characters.slice(0, remaining - 1).join('') + '…');
      break;
    }
  }
  return result;
});
const hiddenCount = computed(() => Math.max(0, props.tags.length - visibleTags.value.length));
const shortened = computed(() => hiddenCount.value > 0 || visibleTags.value.some((tag, index) => tag !== props.tags[index]));
const needsTooltip = computed(() => clipped.value || shortened.value);
const hovered = ref(false);
const focused = ref(false);
const dismissed = ref(false);
const open = computed(() => needsTooltip.value && !dismissed.value && (hovered.value || focused.value));
let observer;
function measure() {
  if (!rail.value) return;
  clipped.value = rail.value.scrollWidth > rail.value.clientWidth + 1 ||
    Array.from(rail.value.children).some(tag => tag.scrollWidth > tag.clientWidth + 1);
}
onMounted(() => {
  observer = new ResizeObserver(measure);
  observer.observe(rail.value);
  measure();
});
onBeforeUnmount(() => observer?.disconnect());
watch(() => props.tags.join('|'), () => nextTick(measure));
</script>

<template>
  <div class="catalog-tags" :class="{ 'has-hidden-tags': hiddenCount > 0 }"
    :tabindex="needsTooltip ? 0 : undefined" :aria-describedby="open ? id : undefined"
    @mouseenter="hovered = true; dismissed = false" @mouseleave="hovered = false"
    @focus="focused = true; dismissed = false" @blur="focused = false"
    @keydown.esc.stop="dismissed = true">
    <div ref="rail" class="catalog-tag-rail">
      <mark v-for="(tag, index) in visibleTags" :key="index">{{ tag }}</mark>
    </div>
    <span v-if="hiddenCount" class="catalog-tag-more" aria-hidden="true">+{{ hiddenCount }}</span>
    <div v-if="open" :id="id" class="catalog-tag-tooltip" role="tooltip">{{ tags.join(' · ') }}</div>
  </div>
</template>

<style>
#main-content .catalog-tags{position:relative;min-width:0;margin-top:4px;outline-offset:3px}
#main-content .catalog-tag-rail{display:flex;flex-wrap:nowrap;gap:6px;overflow:hidden;white-space:nowrap}
#main-content .catalog-tag-rail>mark{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#main-content .has-hidden-tags .catalog-tag-rail{padding-right:26px}
#main-content .catalog-tag-more{position:absolute;right:0;top:0;width:24px;color:#61758c;font-size:14px;line-height:24px;text-align:right;pointer-events:none}
#main-content .catalog-tag-tooltip{position:absolute;z-index:30;top:calc(100% + 6px);left:0;width:100%;padding:10px 12px;color:#fff;background:#203b55;border-radius:8px;box-shadow:0 6px 20px #13335026;font-size:14px;line-height:22px;white-space:normal;overflow-wrap:anywhere}
#main-content .catalog-tag-tooltip::before{content:'';position:absolute;left:0;right:0;top:-6px;height:6px}
</style>
