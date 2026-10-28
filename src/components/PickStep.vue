<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue';
import { MIN_YEARS } from '../composables/useDraft.js';
import { useAnimeData } from '../composables/useAnimeData.js';
import { showToast } from '../composables/useToast.js';
import { displayTitle, formatLabel } from '../utils/anime.js';

const props = defineProps({
  years: { type: Array, required: true },
  picks: { type: Object, required: true },
});
const emit = defineEmits(['pick', 'unpick', 'generate']);

const { loadYear } = useAnimeData();

const PAGE_SIZE = 60;

const activeYear = ref(props.years.find((year) => !props.picks[year]) ?? props.years[0]);
const candidates = shallowRef([]);
const loading = ref(false);
const loadError = ref('');
const broken = reactive(new Set());
const search = ref('');
const sortMode = ref('popular');
const formatFilter = ref('all');
const visibleLimit = ref(PAGE_SIZE);
const chipRefs = ref({});
const gridEl = ref(null);
let loadToken = 0;
let advanceTimer = null;

const sortOptions = [
  { key: 'popular', label: '热度' },
  { key: 'score', label: '评分' },
  { key: 'date', label: '首播' },
];
const formatOptions = [
  { key: 'all', label: '全部' },
  { key: 'tv', label: 'TV' },
  { key: 'movie', label: '剧场版' },
  { key: 'ova', label: 'OVA/ONA' },
  { key: 'special', label: '特别篇' },
];
const formatSets = {
  all: null,
  tv: new Set(['TV', 'TV_SHORT']),
  movie: new Set(['MOVIE']),
  ova: new Set(['OVA', 'ONA']),
  special: new Set(['SPECIAL']),
};
const formatPlates = {
  TV: 'plate-indigo',
  TV_SHORT: 'plate-indigo',
  MOVIE: 'plate-pink',
  OVA: 'plate-emerald',
  ONA: 'plate-emerald',
  SPECIAL: 'plate-slate',
};

const selectedCount = computed(
  () => props.years.filter((year) => Boolean(props.picks[year])).length,
);
const isComplete = computed(
  () => props.years.length >= MIN_YEARS && selectedCount.value === props.years.length,
);
const activePick = computed(() => props.picks[activeYear.value] || null);
const progress = computed(
  () => `${(selectedCount.value / Math.max(props.years.length, 1)) * 100}%`,
);

const filteredList = computed(() => {
  const allowedFormats = formatSets[formatFilter.value];
  let list = candidates.value;
  if (allowedFormats) list = list.filter((anime) => allowedFormats.has(anime.format));

  const query = search.value.trim().toLowerCase();
  if (query) {
    const tokens = query.split(/\s+/);
    list = list.filter((anime) => tokens.every((token) => anime.search.includes(token)));
  }

  const sorted = [...list];
  if (sortMode.value === 'score') {
    sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.pop - a.pop);
  } else if (sortMode.value === 'date') {
    sorted.sort(
      (a, b) =>
        (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99') || b.pop - a.pop,
    );
  } else {
    sorted.sort((a, b) => b.pop - a.pop);
  }
  return sorted;
});

const displayedList = computed(() => filteredList.value.slice(0, visibleLimit.value));
const remainingCount = computed(
  () => filteredList.value.length - displayedList.value.length,
);
const nextBatch = computed(() => Math.min(PAGE_SIZE, remainingCount.value));

watch(
  activeYear,
  async (year) => {
    clearPendingAdvance();
    search.value = '';
    visibleLimit.value = PAGE_SIZE;
    await load(year);
    await nextTick();
    chipRefs.value[year]?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    });
    if (gridEl.value?.getBoundingClientRect().top < 0) {
      gridEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },
  { immediate: true },
);

watch([search, formatFilter, sortMode], () => {
  visibleLimit.value = PAGE_SIZE;
});

onBeforeUnmount(clearPendingAdvance);

async function load(year) {
  const token = ++loadToken;
  loading.value = true;
  loadError.value = '';
  candidates.value = [];
  try {
    const list = await loadYear(year);
    if (token !== loadToken) return;
    candidates.value = list;
  } catch (error) {
    if (token !== loadToken) return;
    loadError.value = error?.message || '数据加载失败';
  } finally {
    if (token === loadToken) loading.value = false;
  }
}

function clearPendingAdvance() {
  if (advanceTimer) {
    window.clearTimeout(advanceTimer);
    advanceTimer = null;
  }
}

function setActiveYear(year) {
  clearPendingAdvance();
  if (!year || year === activeYear.value) return;
  activeYear.value = year;
}

function setChipRef(element, year) {
  if (element) chipRefs.value[year] = element;
  else delete chipRefs.value[year];
}

function choose(anime) {
  const year = activeYear.value;
  if (!year) return;
  const previous = props.picks[year] || null;

  if (previous?.id === anime.id) {
    showToast('已经是这一部了');
    return;
  }

  clearPendingAdvance();
  emit('pick', year, anime);

  if (!previous) {
    const next = props.years.find((item) => item !== year && !props.picks[item]);
    if (next) {
      advanceTimer = window.setTimeout(() => {
        advanceTimer = null;
        setActiveYear(next);
      }, 650);
      showToast(`已选《${displayTitle(anime)}》`, {
        actionLabel: '撤销',
        action: () => {
          clearPendingAdvance();
          emit('unpick', year);
          setActiveYear(year);
        },
      });
    } else {
      showToast(`${props.years.length} 部都选好了，可以生成海报了`);
    }
  } else {
    showToast(`已换成《${displayTitle(anime)}》`, {
      actionLabel: '撤销',
      action: () => emit('pick', year, previous),
    });
  }
}

function clearActivePick() {
  const previous = activePick.value;
  if (!previous) return;
  clearPendingAdvance();
  emit('unpick', activeYear.value);
  showToast(`已清除 ${activeYear.value} 年的选择`, {
    actionLabel: '撤销',
    action: () => emit('pick', activeYear.value, previous),
  });
}

function resetFilters() {
  search.value = '';
  formatFilter.value = 'all';
}

function showMore() {
  visibleLimit.value += PAGE_SIZE;
}

function showAll() {
  visibleLimit.value = filteredList.value.length;
}

function titleOf(year) {
  return props.picks[year] ? displayTitle(props.picks[year]) : '待选择';
}

function fullTitle(anime) {
  return [...new Set([displayTitle(anime), anime.jp, anime.romaji].filter(Boolean))].join(' / ');
}

function badgeClass(format) {
  return formatPlates[format] || 'plate-slate';
}
</script>

<template>
  <section class="step picks-step">
    <header class="picks-head">
      <div>
        <span class="vn-badge plate-indigo">第二步</span>
        <h1>每年选一部</h1>
        <p class="lede">每年从热度前 20 部里挑一部，选完自动跳到下一个空年份。</p>
      </div>
      <div class="picks-progress" aria-live="polite">
        <b>{{ selectedCount }}</b><span>/{{ years.length }} 部</span>
      </div>
    </header>

    <div class="picks-layout">
      <aside class="year-rail-panel vn-card">
        <span class="vn-plate plate-pink">我的年份</span>
        <div class="year-rail" aria-label="已选年份">
          <button
            v-for="year in years"
            :key="year"
            class="rail-item"
            :class="{ active: year === activeYear, filled: Boolean(picks[year]) }"
            type="button"
            @click="setActiveYear(year)"
          >
            <span class="rail-year">{{ year }}</span>
            <span class="rail-title">{{ titleOf(year) }}</span>
            <span class="rail-dot" aria-hidden="true"></span>
          </button>
        </div>
      </aside>

      <div class="candidate-panel">
        <div class="mobile-year-strip" role="group" aria-label="年份">
          <button
            v-for="year in years"
            :key="year"
            :ref="(element) => setChipRef(element, year)"
            class="year-chip"
            :class="{ active: year === activeYear, filled: Boolean(picks[year]) }"
            type="button"
            :aria-pressed="year === activeYear"
            :aria-label="`${year} 年${picks[year] ? '，已选' : ''}`"
            @click="setActiveYear(year)"
          >
            {{ year }}
            <i v-if="picks[year]" class="chip-dot" aria-hidden="true"></i>
          </button>
        </div>

        <div class="picker-toolbar vn-card">
          <span class="vn-plate plate-indigo">选片</span>

          <div class="picker-top">
            <div class="picker-year">
              <h2>{{ activeYear }}</h2>
              <span>{{ candidates.length }} 部作品</span>
            </div>
            <button
              v-if="activePick"
              class="text-link"
              type="button"
              @click="clearActivePick"
            >
              清除本年选择
            </button>
          </div>

          <div class="search-box">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.4" />
              <path d="M13 13L17 17" stroke="currentColor" stroke-width="1.4" />
            </svg>
            <input
              v-model="search"
              type="search"
              enterkeyhint="search"
              autocomplete="off"
              placeholder="搜索作品：中文 / 日文 / 罗马音"
              aria-label="搜索当年的作品"
            />
            <button
              v-if="search"
              class="search-clear"
              type="button"
              aria-label="清空搜索"
              @click="search = ''"
            >
              ×
            </button>
          </div>

          <div class="filters">
            <div class="seg" role="group" aria-label="排序">
              <button
                v-for="option in sortOptions"
                :key="option.key"
                type="button"
                :class="{ active: sortMode === option.key }"
                @click="sortMode = option.key"
              >
                {{ option.label }}
              </button>
            </div>

            <div class="format-chips" role="group" aria-label="类型筛选">
              <button
                v-for="option in formatOptions"
                :key="option.key"
                class="chip"
                :class="{ active: formatFilter === option.key }"
                type="button"
                @click="formatFilter = option.key"
              >
                {{ option.label }}
              </button>
            </div>

            <span class="result-count">
              {{ loading ? '加载中' : `${filteredList.length} / ${candidates.length} 部` }}
            </span>
          </div>
        </div>

        <div v-if="loading" class="card-grid" aria-hidden="true">
          <div v-for="n in 12" :key="n" class="skeleton-card">
            <span class="sk-cover"></span>
            <span class="sk-line"></span>
            <span class="sk-line short"></span>
          </div>
        </div>

        <div v-else-if="loadError" class="empty-state">
          <p>{{ loadError }}</p>
          <button class="btn btn-ghost" type="button" @click="load(activeYear)">重新加载</button>
        </div>

        <div v-else-if="!filteredList.length" class="empty-state">
          <template v-if="candidates.length === 0">
            这一年的数据暂时为空，换一年试试。
          </template>
          <template v-else>
            <p>没找到匹配的作品。试试日文原名或罗马音。</p>
            <button class="text-link" type="button" @click="resetFilters">清除筛选</button>
          </template>
        </div>

        <div v-else ref="gridEl" class="card-grid">
          <button
            v-for="anime in displayedList"
            :key="anime.id"
            class="anime-card"
            :class="{ selected: activePick?.id === anime.id }"
            type="button"
            :aria-pressed="activePick?.id === anime.id"
            :title="fullTitle(anime)"
            @click="choose(anime)"
          >
            <span class="card-badge" :class="badgeClass(anime.format)">
              {{ formatLabel(anime.format) }}
            </span>
            <span class="cover">
              <img
                v-if="anime.cover && !broken.has(anime.id)"
                :src="anime.cover"
                alt=""
                width="230"
                height="326"
                loading="lazy"
                decoding="async"
                @error="broken.add(anime.id)"
              />
              <span class="card-check" aria-hidden="true">✓</span>
            </span>
            <span class="card-title">{{ displayTitle(anime) }}</span>
            <span class="card-meta">
              {{ anime.score ? `${anime.score} 分` : '暂无评分' }}
            </span>
          </button>
        </div>

        <div v-if="!loading && !loadError && remainingCount > 0" class="load-more">
          <span>已显示 {{ displayedList.length }} / {{ filteredList.length }} 部</span>
          <div class="load-more-actions">
            <button class="btn btn-ghost" type="button" @click="showMore">
              再显示 {{ nextBatch }} 部
            </button>
            <button class="text-link" type="button" @click="showAll">显示全部</button>
          </div>
        </div>
      </div>
    </div>

    <div class="action-bar vn-dark">
      <span class="vn-plate plate-pink">进度</span>

      <div class="action-bar-inner">
        <div class="bar-progress">
          <span class="bar-num">{{ selectedCount }}<i>/{{ years.length }}</i></span>
          <span class="bar-track" aria-hidden="true">
            <span class="bar-fill" :style="{ width: progress }"></span>
          </span>
          <span class="bar-hint">
            {{ isComplete ? '全部选好了' : `还差 ${years.length - selectedCount} 部` }}
          </span>
        </div>

        <button
          class="btn btn-primary"
          type="button"
          :disabled="!isComplete"
          @click="emit('generate')"
        >
          生成海报 →
        </button>
      </div>
    </div>
  </section>
</template>
