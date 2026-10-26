<script setup>
import { computed, ref, watch } from 'vue';
import IntroStep from './components/IntroStep.vue';
import YearStep from './components/YearStep.vue';
import PickStep from './components/PickStep.vue';
import PosterStep from './components/PosterStep.vue';
import ToastBar from './components/ToastBar.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import { MAX_YEARS, MIN_YEARS, useDraft } from './composables/useDraft.js';
import { useAnimeData } from './composables/useAnimeData.js';
import { askConfirm } from './composables/useConfirm.js';
import { hideToast, showToast } from './composables/useToast.js';
import { displayTitle } from './utils/anime.js';

const {
  state: draft,
  filledCount,
  isComplete,
  hasDraft,
  orderedPicks,
  setNickname,
  addYear,
  removeYear,
  clearYears,
  setPick,
  clearPick,
  reset,
} = useDraft();
const { yearCounts } = useAnimeData();
const baseUrl = import.meta.env.BASE_URL;

const initialStep = draft.nickname
  ? isComplete.value
    ? 'poster'
    : draft.years.length >= MIN_YEARS
      ? 'picks'
      : 'years'
  : 'intro';
const step = ref(initialStep);

const trail = [
  { key: 'years', label: '年份' },
  { key: 'picks', label: '作品' },
  { key: 'poster', label: '海报' },
];
const trailIndex = computed(() => trail.findIndex((item) => item.key === step.value));
const hasActionBar = computed(() => step.value === 'years' || step.value === 'picks');

watch(step, () => {
  hideToast();
  window.scrollTo({ top: 0, behavior: 'auto' });
});

function handleStart(nickname) {
  setNickname(nickname);
  if (isComplete.value) step.value = 'poster';
  else if (draft.years.length >= MIN_YEARS) step.value = 'picks';
  else step.value = 'years';
}

async function handleToggleYear(year) {
  if (!draft.years.includes(year)) {
    if (draft.years.length >= MAX_YEARS) {
      showToast('最多选 20 年，先取消一个年份');
      return;
    }
    addYear(year);
    return;
  }

  const pick = draft.picks[year];
  if (pick) {
    const confirmed = await askConfirm({
      title: `移除 ${year} 年？`,
      message: `这一年已选了《${displayTitle(pick)}》，移除年份会同时清除这个选择。`,
      confirmText: '移除',
      tone: 'danger',
    });
    if (!confirmed) return;
  }

  removeYear(year);
  showToast(pick ? `已移除 ${year} 年及《${displayTitle(pick)}》` : `已移除 ${year} 年`);
}

async function handleClearYears() {
  if (!draft.years.length) return;
  const confirmed = await askConfirm({
    title: '清空年份？',
    message: `已选的 ${draft.years.length} 个年份和对应作品会被清空，昵称保留。`,
    confirmText: '清空年份',
    tone: 'danger',
  });
  if (!confirmed) return;
  clearYears();
  showToast('已清空年份和作品');
}

function handlePick(year, anime) {
  setPick(year, anime);
}

function handleUnpick(year) {
  clearPick(year);
}

function handleGenerate() {
  if (!isComplete.value) {
    if (draft.years.length < MIN_YEARS) {
      showToast(`至少选 ${MIN_YEARS} 年`);
    } else {
      showToast(`还差 ${draft.years.length - filledCount.value} 部作品`);
    }
    return;
  }
  step.value = 'poster';
}

async function handleReset() {
  const confirmed = await askConfirm({
    title: '重新开始？',
    message: '昵称、年份和已选作品都会被清空，无法撤销。',
    confirmText: '清空重来',
    tone: 'danger',
  });
  if (!confirmed) return;
  reset();
  step.value = 'intro';
}

function goBack() {
  if (step.value === 'picks') step.value = 'years';
  else if (step.value === 'poster') step.value = 'picks';
  else if (step.value === 'years') step.value = 'intro';
}
</script>

<template>
  <div class="scene-bg" aria-hidden="true">
    <div
      class="bg-layer bg-1"
      :style="{ backgroundImage: `url(${baseUrl}bg/scene-seaside.jpg)` }"
    ></div>
    <div
      class="bg-layer bg-2"
      :style="{ backgroundImage: `url(${baseUrl}bg/scene-rooftop.jpg)` }"
    ></div>
    <div
      class="bg-layer bg-3"
      :style="{ backgroundImage: `url(${baseUrl}bg/scene-riverside.jpg)` }"
    ></div>
  </div>

  <a class="skip-link" href="#main">跳到主要内容</a>

  <div class="site" :class="{ 'has-action': hasActionBar }">
    <header class="site-head">
      <div class="site-head-inner">
        <div class="wordmark">
          <span class="pinwheel" aria-hidden="true"></span>
          <b>二十年番单</b>
          <span>20 Best Anime</span>
        </div>

        <nav v-if="step !== 'intro'" class="trail" aria-label="填写进度">
          <span
            v-for="(item, index) in trail"
            :key="item.key"
            class="trail-item"
            :class="{ active: item.key === step, done: trailIndex > index }"
          >
            <em>{{ String(index + 1).padStart(2, '0') }}</em>{{ item.label }}
          </span>
        </nav>

        <div class="head-meta">
          <span v-if="step === 'years'" class="head-progress">
            {{ draft.years.length }}<i>/20</i>
          </span>
          <span v-else-if="step === 'picks'" class="head-progress">
            {{ filledCount }}<i>/{{ draft.years.length }}</i>
          </span>
          <span v-else-if="step === 'poster'" class="head-progress">
            {{ draft.years.length }}<i>/{{ draft.years.length }}</i>
          </span>
          <span v-else class="head-progress head-years">
            1990—2026
          </span>

          <button v-if="step !== 'intro'" class="head-back" type="button" @click="goBack">
            ← <span>返回</span>
          </button>
        </div>
      </div>
    </header>

    <main id="main" class="page">
      <Transition name="step" mode="out-in">
        <IntroStep
          v-if="step === 'intro'"
          key="intro"
          :initial-nickname="draft.nickname"
          :has-draft="hasDraft"
          @start="handleStart"
          @reset="handleReset"
        />

        <YearStep
          v-else-if="step === 'years'"
          key="years"
          :selected="draft.years"
          :counts="yearCounts"
          @toggle="handleToggleYear"
          @clear="handleClearYears"
          @next="step = 'picks'"
        />

        <PickStep
          v-else-if="step === 'picks'"
          key="picks"
          :years="draft.years"
          :picks="draft.picks"
          @pick="handlePick"
          @unpick="handleUnpick"
          @generate="handleGenerate"
        />

        <PosterStep
          v-else
          key="poster"
          :nickname="draft.nickname"
          :items="orderedPicks"
          @back="step = 'picks'"
          @reset="handleReset"
        />
      </Transition>
    </main>

    <footer class="site-foot">
      <div class="foot-brand">
        <span class="pinwheel" aria-hidden="true"></span>
        <b>二十年番单</b>
        <span>20 Best Anime</span>
      </div>
      <div class="foot-meta">
        <span>© 2026 · 私人动漫编年史</span>
        <span class="credits">
          数据：
          <a href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>
          · 中文名：
          <a href="https://github.com/bangumi-data/bangumi-data" target="_blank" rel="noreferrer">
            bangumi-data
          </a>
          （CC BY 4.0）
        </span>
        <a
          class="foot-link"
          href="https://github.com/zlc0099/20_best_anime"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </div>
    </footer>

    <ToastBar />
    <ConfirmDialog />
  </div>
</template>
