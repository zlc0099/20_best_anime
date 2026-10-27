<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { displayTitle, formatLabel, popularityLabel } from '../utils/anime.js';
import { BRACKET_SIZE, loadBattlePool } from '../composables/useBattle.js';
import { showToast } from '../composables/useToast.js';

const emit = defineEmits(['start', 'back']);

const DRAFT_KEY = 'anime-years.battle.draft.v1';
const PAGE = 60;
const DECADES = [
  { key: 'all', label: '全部年代' },
  { key: '1990', label: '1990s' },
  { key: '2000', label: '2000s' },
  { key: '2010', label: '2010s' },
  { key: '2020', label: '2020s' },
];

const pool = ref([]);
const loading = ref(true);
const keyword = ref('');
const decade = ref('all');
const limit = ref(PAGE);
const selected = ref([]);

const indexed = computed(() =>
  pool.value.map((item) => ({
    ...item,
    search: [item.cn, item.jp, item.romaji].filter(Boolean).join(' ').toLowerCase(),
  })),
);

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return indexed.value.filter((item) => {
    if (decade.value !== 'all' && String(Math.floor(item.year / 10) * 10) !== decade.value) {
      return false;
    }
    if (!kw) return true;
    return item.search.includes(kw) || String(item.id) === kw;
  });
});

const visible = computed(() => filtered.value.slice(0, limit.value));
const selectedIds = computed(() => new Set(selected.value.map((item) => item.id)));
const full = computed(() => selected.value.length === BRACKET_SIZE);

watch([keyword, decade], () => {
  limit.value = PAGE;
});

watch(
  selected,
  (list) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(list.map((item) => item.id)));
    } catch {
      // ignore unavailable storage
    }
  },
  { deep: true },
);

onMounted(async () => {
  try {
    pool.value = await loadBattlePool();
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
    } catch {
      saved = [];
    }
    const byId = new Map(pool.value.map((item) => [item.id, item]));
    selected.value = saved
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, BRACKET_SIZE);
  } catch (error) {
    console.error(error);
    showToast('候选池载入失败，请刷新重试');
  } finally {
    loading.value = false;
  }
});

function toggle(item) {
  const index = selected.value.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    selected.value.splice(index, 1);
    return;
  }
  if (selected.value.length >= BRACKET_SIZE) {
    showToast(`已经选满 ${BRACKET_SIZE} 部，先取消一部`);
    return;
  }
  selected.value.push(item);
}

function clearAll() {
  selected.value = [];
}

function start() {
  if (!full.value) {
    showToast(`还差 ${BRACKET_SIZE - selected.value.length} 部`);
    return;
  }
  emit('start', selected.value);
}
</script>

<template>
  <section class="step battle-pick-step">
    <header class="battle-pick-head">
      <span class="vn-badge plate-indigo">自选 32 部</span>
      <h1>自己挑 {{ BRACKET_SIZE }} 部，<span class="accent">再乱序开打</span>。</h1>
      <p class="lede">
        不限年份，从 {{ pool.length || 1800 }} 部候选里点选 32 部；选好后再打乱签位，
        照样是 32 强 → 决赛的 31 场二选一。
      </p>
    </header>

    <div class="battle-pick-layout">
      <div class="battle-pick-main">
        <div class="picker-toolbar vn-card">
          <span class="vn-plate plate-indigo">候选池</span>
          <div class="search-box">
            <input
              v-model="keyword"
              type="search"
              placeholder="搜索中文名 / 日文名 / 罗马音"
              aria-label="搜索作品"
            />
          </div>
          <div class="format-chips" role="group" aria-label="年代筛选">
            <button
              v-for="option in DECADES"
              :key="option.key"
              class="chip"
              :class="{ active: decade === option.key }"
              type="button"
              @click="decade = option.key"
            >
              {{ option.label }}
            </button>
          </div>
          <span class="result-count">
            <template v-if="loading">载入候选池…</template>
            <template v-else>匹配 {{ filtered.length }} 部 · 已选 {{ selected.length }} / {{ BRACKET_SIZE }}</template>
          </span>
        </div>

        <p v-if="!loading && !visible.length" class="crowd-empty">没有匹配的作品，换个关键词试试。</p>

        <ul v-else class="pick-list">
          <li
            v-for="item in visible"
            :key="item.id"
            class="pick-row"
            :class="{ on: selectedIds.has(item.id) }"
          >
            <button class="pick-main" type="button" @click="toggle(item)">
              <img v-if="item.cover" :src="item.cover" :alt="displayTitle(item)" loading="lazy" />
              <span v-else class="pick-ph" aria-hidden="true"></span>
              <span class="pick-text">
                <b>{{ displayTitle(item) }}</b>
                <i>{{ item.year }} · {{ formatLabel(item.format) }} · {{ popularityLabel(item.pop) }}</i>
              </span>
              <span class="pick-mark">{{ selectedIds.has(item.id) ? '✓' : '+' }}</span>
            </button>
          </li>
        </ul>

        <div v-if="filtered.length > limit" class="load-more">
          <button class="btn btn-glass" type="button" @click="limit += PAGE">再加载 {{ PAGE }} 部</button>
        </div>
      </div>

      <aside class="battle-pick-side vn-card">
        <span class="vn-plate plate-pink">我的 32 强</span>
        <div class="pick-count" :class="{ full }">
          <b>{{ selected.length }}</b><i>/ {{ BRACKET_SIZE }}</i>
        </div>
        <ol v-if="selected.length" class="pick-tray">
          <li v-for="(item, index) in selected" :key="item.id">
            <span class="tray-rank">{{ index + 1 }}</span>
            <span class="tray-title">{{ displayTitle(item) }}</span>
            <button class="tray-remove" type="button" :aria-label="`移除 ${displayTitle(item)}`" @click="toggle(item)">
              ×
            </button>
          </li>
        </ol>
        <p v-else class="pick-hint">还没有选择。左侧点一下就加进来。</p>

        <button class="btn btn-primary" type="button" :disabled="!full" @click="start">
          乱序开战 <span class="btn-arrow" aria-hidden="true">›</span>
        </button>
        <button class="btn btn-glass" type="button" :disabled="!selected.length" @click="clearAll">
          清空
        </button>
        <button class="text-link" type="button" @click="emit('back')">返回首页</button>
      </aside>
    </div>
  </section>
</template>
