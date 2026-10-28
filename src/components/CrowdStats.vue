<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { fetchDecadeStats, STATS_UPDATED, statsEnabled } from '../utils/stats.js';
import { useAnimeData } from '../composables/useAnimeData.js';
import { displayTitle, formatLabel } from '../utils/anime.js';

const props = defineProps({
  focusYears: { type: Array, default: () => [] },
});

const DECADES = [
  { start: 1990, label: '1990s', cn: '九十年代' },
  { start: 2000, label: '2000s', cn: '零零年代' },
  { start: 2010, label: '2010s', cn: '一零年代' },
  { start: 2020, label: '2020s', cn: '二零年代' },
];
const TOP_N = 3;
const MIN_SAMPLE = 30;

const { loadYear } = useAnimeData();
const loading = ref(statsEnabled);
const error = ref('');
const data = ref(null);
const active = ref(null);
const resolved = ref({});

const decades = computed(() => {
  const byStart = new Map((data.value?.decades || []).map((item) => [item.decade, item]));
  return DECADES.map((decade) => ({ ...decade, stats: byStart.get(decade.start) || null }));
});

const current = computed(() => decades.value.find((item) => item.start === active.value) || null);

const rows = computed(() =>
  (current.value?.stats?.top || []).slice(0, TOP_N).map((item) => ({
    ...item,
    anime: resolved.value[item.anime_id] || null,
  })),
);

const maxPicks = computed(() =>
  rows.value.reduce((max, row) => Math.max(max, Number(row.picks) || 0), 0),
);

const totalSubmissions = computed(() => Number(data.value?.submissions) || 0);
const insufficient = computed(() => totalSubmissions.value < MIN_SAMPLE);

async function load(force = false) {
  if (!statsEnabled) return;
  loading.value = true;
  error.value = '';
  try {
    data.value = await fetchDecadeStats(force);
    chooseDecade();
  } catch (err) {
    error.value = err?.message || '读取失败';
  } finally {
    loading.value = false;
  }
}

function chooseDecade() {
  const withData = decades.value.filter((item) => item.stats);
  if (!withData.length) {
    active.value = null;
    return;
  }
  const focus = props.focusYears.length
    ? Math.floor(Math.max(...props.focusYears) / 10) * 10
    : null;
  const matched = focus == null ? null : withData.find((item) => item.start === focus);
  const preferred =
    matched ||
    [...withData].sort(
      (a, b) => b.stats.submissions - a.stats.submissions || b.start - a.start,
    )[0];
  active.value = preferred.start;
}

async function resolveRows() {
  const pending = rows.value.filter((row) => !resolved.value[row.anime_id]);
  if (!pending.length) return;
  await Promise.all(
    pending.map(async (row) => {
      try {
        const list = await loadYear(row.year);
        const hit = list.find((item) => item.id === row.anime_id);
        if (hit) resolved.value = { ...resolved.value, [row.anime_id]: hit };
      } catch {
        // 年份数据缺失时保留 id，行内退化为占位标题
      }
    }),
  );
}

function barWidth(row) {
  if (!maxPicks.value) return '6%';
  const ratio = (Number(row.picks) || 0) / maxPicks.value;
  return `${Math.max(6, Math.round(ratio * 100))}%`;
}

function dropCover(row) {
  const anime = resolved.value[row.anime_id];
  if (anime) anime.cover = null;
}

watch(
  () => rows.value.map((row) => `${row.anime_id}:${row.year}`).join('|'),
  resolveRows,
  { immediate: true },
);

function onStatsUpdated() {
  load(true);
}

onMounted(() => {
  window.addEventListener(STATS_UPDATED, onStatsUpdated);
  load();
});

onBeforeUnmount(() => {
  window.removeEventListener(STATS_UPDATED, onStatsUpdated);
});
</script>

<template>
  <section v-if="statsEnabled" class="crowd">
    <div class="crowd-head">
      <span class="vn-badge">众人</span>
      <h2>大家都在看</h2>
      <p class="crowd-sub">
        <template v-if="loading">正在读取众人榜单…</template>
        <template v-else-if="error">
          榜单暂时读取不到。<button class="text-link" type="button" @click="load(true)">重试</button>
        </template>
        <template v-else-if="totalSubmissions">
          {{ totalSubmissions }} 份匿名番单 · 占比按该年代选择次数计算
        </template>
        <template v-else>还没有人提交，你的第一份会出现在这里。</template>
      </p>
    </div>

    <div class="crowd-tabs" role="tablist" aria-label="按年代查看">
      <button
        v-for="decade in decades"
        :key="decade.start"
        class="crowd-tab"
        :class="{ active: decade.start === active }"
        type="button"
        role="tab"
        :aria-selected="decade.start === active"
        :disabled="!decade.stats"
        @click="active = decade.start"
      >
        <b>{{ decade.label }}</b>
        <span>{{ decade.cn }}</span>
        <i v-if="decade.stats">{{ decade.stats.submissions }}</i>
      </button>
    </div>

    <p v-if="insufficient && !loading && !error && totalSubmissions" class="crowd-note">
      样本还少（{{ totalSubmissions }} / {{ MIN_SAMPLE }} 份），先当参考，别当结论。
    </p>

    <ol v-if="rows.length" class="crowd-list">
      <li v-for="(row, index) in rows" :key="row.anime_id" class="crowd-row">
        <span class="crowd-rank">{{ index + 1 }}</span>

        <img
          v-if="row.anime?.cover"
          class="crowd-cover"
          :src="row.anime.cover"
          :alt="displayTitle(row.anime)"
          loading="lazy"
          @error="dropCover(row)"
        />
        <span v-else class="crowd-cover crowd-cover--empty" aria-hidden="true"></span>

        <div class="crowd-info">
          <b>{{ row.anime ? displayTitle(row.anime) : '作品 #' + row.anime_id }}</b>
          <span class="crowd-meta">
            {{ row.year }} 年<span v-if="row.anime">{{ formatLabel(row.anime.format) }}</span>
          </span>
          <span class="crowd-bar"><i :style="{ width: barWidth(row) }"></i></span>
        </div>

        <div class="crowd-num">
          <b>{{ row.share }}%</b>
          <span>{{ row.picks }} 次</span>
        </div>
      </li>
    </ol>

    <p v-else-if="!loading && !error" class="crowd-empty">
      {{ totalSubmissions ? '这个年代还没有人做出选择。' : '榜单会在有人生成番单后出现。' }}
    </p>
  </section>
</template>
