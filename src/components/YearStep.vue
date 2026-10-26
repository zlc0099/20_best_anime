<script setup>
import { computed } from 'vue';
import { ALL_YEARS, MIN_YEARS } from '../composables/useDraft.js';

const props = defineProps({
  selected: { type: Array, required: true },
  counts: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['toggle', 'clear', 'next']);

const decades = [
  {
    label: '1990s',
    zh: '九十年代',
    tone: 'plate-indigo',
    years: ALL_YEARS.filter((year) => year < 2000),
  },
  {
    label: '2000s',
    zh: '零零年代',
    tone: 'plate-pink',
    years: ALL_YEARS.filter((year) => year >= 2000 && year < 2010),
  },
  {
    label: '2010s',
    zh: '一零年代',
    tone: 'plate-emerald',
    years: ALL_YEARS.filter((year) => year >= 2010 && year < 2020),
  },
  {
    label: '2020s',
    zh: '二零年代',
    tone: 'plate-indigo',
    years: ALL_YEARS.filter((year) => year >= 2020),
  },
];

const selectedSet = computed(() => new Set(props.selected));
const capped = computed(() => props.selected.length >= 20);
const remaining = computed(() => 20 - props.selected.length);
const needMore = computed(() => Math.max(0, MIN_YEARS - props.selected.length));
const canContinue = computed(() => props.selected.length >= MIN_YEARS);
const progress = computed(() => `${(props.selected.length / 20) * 100}%`);
const hint = computed(() => {
  if (needMore.value > 0) return `还差 ${needMore.value} 年（至少 ${MIN_YEARS} 年）`;
  if (props.selected.length === 20) return '已选满 20 年';
  return `可以继续，或再选 ${remaining.value} 年`;
});

function isSelected(year) {
  return selectedSet.value.has(year);
}

function countOf(year) {
  return props.counts?.[year] ?? 0;
}
</script>

<template>
  <section class="step years-step">
    <header class="step-head">
      <span class="vn-badge plate-indigo">第一步</span>
      <h1>先选出 10–20 个年份</h1>
      <p class="lede">37 年里留 10–20 年。点一下选中，再点一下取消。</p>

      <div class="progress-row">
        <span class="progress-text" aria-live="polite">
          已选 <b>{{ selected.length }}</b> / 20
        </span>
        <span class="progress-track" aria-hidden="true">
          <span class="progress-fill" :style="{ width: progress }"></span>
        </span>
        <span class="progress-hint">{{ hint }}</span>
      </div>
    </header>

    <div class="decades">
      <section v-for="decade in decades" :key="decade.label" class="decade vn-card">
        <span class="vn-plate" :class="decade.tone">{{ decade.zh }}</span>

        <div class="decade-label">
          <b>{{ decade.label }}</b>
          <span>{{ decade.years.length }} 年</span>
        </div>

        <div class="year-grid">
          <button
            v-for="year in decade.years"
            :key="year"
            class="year-btn"
            :class="{
              selected: isSelected(year),
              dimmed: capped && !isSelected(year),
            }"
            type="button"
            :aria-pressed="isSelected(year)"
            :aria-disabled="capped && !isSelected(year)"
            :title="capped && !isSelected(year) ? '已选满 20 年，先取消一个年份' : undefined"
            @click="emit('toggle', year)"
          >
            <span class="year-num">{{ year }}</span>
            <span class="year-count">{{ countOf(year) }} 部</span>
            <span class="year-check" aria-hidden="true">✓</span>
          </button>
        </div>
      </section>
    </div>

    <div class="action-bar vn-dark">
      <span class="vn-plate plate-pink">进度</span>

      <div class="action-bar-inner">
        <div class="bar-progress">
          <span class="bar-num">{{ selected.length }}<i>/20</i></span>
          <span class="bar-track" aria-hidden="true">
            <span class="bar-fill" :style="{ width: progress }"></span>
          </span>
          <span class="bar-hint">
            {{ needMore > 0 ? `还差 ${needMore} 年` : '可以继续' }}
          </span>
        </div>

        <div class="bar-actions">
          <button
            v-if="selected.length"
            class="text-link bar-clear"
            type="button"
            @click="emit('clear')"
          >
            清空年份
          </button>
          <button
            class="btn btn-primary"
            type="button"
            :disabled="!canContinue"
            @click="emit('next')"
          >
            下一步：选作品
            <span class="btn-arrow" aria-hidden="true">›</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
