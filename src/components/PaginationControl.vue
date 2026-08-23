<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  total: { type: Number, required: true },
  page: { type: Number, required: true },
  pageSize: { type: Number, default: 10 },
  pageSizes: { type: Array, default: () => [10, 20, 50] },
  label: { type: String, default: '分页' },
  disabled: { type: Boolean, default: false }
});
const emit = defineEmits(['update:page', 'update:pageSize']);
const jump = ref(String(props.page));
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const pages = computed(() => Array.from({ length: totalPages.value }, (_, index) => index + 1));
watch(() => props.page, value => { jump.value = String(value); });
function setPage(value) {
  const next = Math.min(totalPages.value, Math.max(1, Number(value) || 1));
  emit('update:page', next);
}
function setPageSize(event) {
  emit('update:pageSize', Number(event.target.value));
  emit('update:page', 1);
}
</script>

<template>
  <div class="pagination-control">
    <span>共 {{ total }} 条</span>
    <label>每页
      <select :value="pageSize" :disabled="disabled" @change="setPageSize">
        <option v-for="size in pageSizes" :key="size" :value="size">{{ size }} 条</option>
      </select>
    </label>
    <nav :aria-label="label">
      <button type="button" :disabled="disabled || page === 1" @click="setPage(page - 1)">上一页</button>
      <button v-for="number in pages" :key="number" type="button" :disabled="disabled" :aria-current="page === number ? 'page' : undefined" :aria-label="`第 ${number} 页`" @click="setPage(number)">{{ number }}</button>
      <button type="button" :disabled="disabled || page === totalPages" @click="setPage(page + 1)">下一页</button>
    </nav>
    <label>前往 <input v-model="jump" inputmode="numeric" :disabled="disabled" aria-label="前往页码" @keydown.enter.prevent="setPage(jump)" /> 页</label>
  </div>
</template>

<style scoped>
.pagination-control{min-height:54px;display:flex;align-items:center;justify-content:flex-end;gap:14px;color:#405675;font-size:11px}.pagination-control>span{margin-right:auto}.pagination-control label,.pagination-control nav{display:flex;align-items:center;gap:6px}.pagination-control select,.pagination-control input,.pagination-control button{height:31px;border:1px solid #d3deea;border-radius:4px;background:#fff;color:#304865}.pagination-control select{padding:0 24px 0 9px}.pagination-control input{width:42px;text-align:center}.pagination-control button{min-width:31px;padding:0 9px}.pagination-control button[aria-current=page]{border-color:#0868dd;color:#fff;background:#0868dd}.pagination-control :is(button,select,input):disabled{color:#8b98a8;background:#f2f4f7;cursor:not-allowed}@media(max-width:760px){.pagination-control{min-width:max-content;justify-content:flex-start}.pagination-control>span{margin-right:0}}
</style>
