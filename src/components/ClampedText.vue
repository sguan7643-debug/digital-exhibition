<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
const props = defineProps({ text: { type: String, required: true }, id: { type: String, required: true } });
const content = ref(null);
const clipped = ref(false);
const expanded = ref(false);
let observer;
function measure() { if (!content.value) return; clipped.value = content.value.scrollHeight > content.value.clientHeight + 1; if (!clipped.value) expanded.value = false; }
onMounted(() => { observer = new ResizeObserver(measure); observer.observe(content.value); measure(); });
onBeforeUnmount(() => observer?.disconnect());
watch(() => props.text, () => nextTick(measure));
</script>

<template>
  <div class="catalog-description" :tabindex="clipped ? 0 : undefined" :aria-describedby="clipped && expanded ? id : undefined"
    @mouseenter="expanded = true" @mouseleave="expanded = false" @focus="expanded = true" @blur="expanded = false"
    @keydown.esc.stop="expanded = false" @click="expanded = !expanded">
    <p ref="content">{{ text }}</p>
    <div v-if="clipped && expanded" :id="id" class="catalog-description-tooltip" role="tooltip">{{ text }}</div>
  </div>
</template>

<style>
#main-content .catalog-description{position:relative;min-width:0;color:#536b82;outline-offset:3px}
#main-content .catalog-description p{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:44px;max-height:44px;margin:0;font-size:14px;line-height:22px;overflow-wrap:anywhere}
#main-content .catalog-description-tooltip{position:absolute;z-index:20;top:calc(100% + 6px);left:0;width:100%;padding:12px;color:#fff;background:#203b55;border-radius:8px;box-shadow:0 6px 20px #13335026;font-size:14px;line-height:22px;overflow-wrap:anywhere;pointer-events:none}
</style>
