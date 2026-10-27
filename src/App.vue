<script setup>
import { computed, ref, watch } from 'vue';
import IntroStep from './components/IntroStep.vue';
import YearStep from './components/YearStep.vue';
import PickStep from './components/PickStep.vue';
import PosterStep from './components/PosterStep.vue';
import BattleStep from './components/BattleStep.vue';
import BattlePickStep from './components/BattlePickStep.vue';
import BattlePosterStep from './components/BattlePosterStep.vue';
import ToastBar from './components/ToastBar.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import { ALL_YEARS, MAX_YEARS, MIN_YEARS, useDraft } from './composables/useDraft.js';
import { useAnimeData } from './composables/useAnimeData.js';
import { useBattle, TOTAL_MATCHES } from './composables/useBattle.js';
import { askConfirm } from './composables/useConfirm.js';
import { hideToast, showToast } from './composables/useToast.js';
import { displayTitle } from './utils/anime.js';
import {
  loadContribute,
  saveContribute,
  statsEnabled,
  submitPicks,
} from './utils/stats.js';

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
  setYears,
  setPick,
  clearPick,
  reset,
} = useDraft();
const { yearCounts } = useAnimeData();

const {
  state: battleState,
  active: battleActive,
  currentMatch: battleCurrentMatch,
  rounds: battleRounds,
  champion: battleChampion,
  runnerUp: battleRunnerUp,
  decidedCount: battleDecided,
  start: startBattle,
  pick: pickBattle,
  undo: undoBattle,
  reset: resetBattle,
} = useBattle();

const FLOW_KEY = 'anime-years.flow.v1';

function writeFlow(value) {
  try {
    localStorage.setItem(FLOW_KEY, value);
  } catch {
    // ignore unavailable storage
  }
}

function readFlow() {
  try {
    return localStorage.getItem(FLOW_KEY);
  } catch {
    return null;
  }
}

const yearbookStep = draft.nickname
  ? isComplete.value
    ? 'poster'
    : draft.years.length >= MIN_YEARS
      ? 'picks'
      : 'years'
  : 'intro';
const savedFlow = readFlow();
const initialStep =
  savedFlow === 'battle' && battleActive.value
    ? 'battle'
    : savedFlow === 'battle-pick'
      ? 'battle-pick'
      : yearbookStep;
const step = ref(initialStep);
const battleLoading = ref(false);

const theme = ref(
  document.documentElement.dataset.theme === 'paper' ? 'paper' : 'dark',
);

function applyTheme(next) {
  theme.value = next;
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('anime-theme', next);
  } catch {
    // ignore unavailable storage
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', next === 'paper' ? '#f2efe9' : '#0b0d0f');
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'paper' : 'dark');
}

const YEARBOOK_TRAIL = [
  { key: 'years', label: '年份' },
  { key: 'picks', label: '作品' },
  { key: 'poster', label: '海报' },
];
const BATTLE_TRAIL = [
  { key: 'battle', label: '对阵' },
  { key: 'battle-poster', label: '海报' },
];

const isBattle = computed(() => step.value === 'battle' || step.value === 'battle-poster');
const trail = computed(() => (isBattle.value ? BATTLE_TRAIL : YEARBOOK_TRAIL));
const trailIndex = computed(() => trail.value.findIndex((item) => item.key === step.value));
const hasActionBar = computed(() => step.value === 'years' || step.value === 'picks');

const contribute = ref(loadContribute());
const submitState = ref('idle');

watch(step, async (next) => {
  hideToast();
  window.scrollTo({ top: 0, behavior: 'auto' });

  if (next !== 'poster' || !statsEnabled) return;
  if (!contribute.value) {
    submitState.value = 'off';
    return;
  }

  submitState.value = 'pending';
  try {
    const result = await submitPicks(orderedPicks.value);
    submitState.value = result.ok ? (result.duplicate ? 'duplicate' : 'done') : 'error';
  } catch {
    submitState.value = 'error';
  }
});

function handleContributeChange(value) {
  contribute.value = value;
  saveContribute(value);
}

function handleStart(nickname) {
  writeFlow('yearbook');
  setNickname(nickname);
  if (isComplete.value) step.value = 'poster';
  else if (draft.years.length >= MIN_YEARS) step.value = 'picks';
  else step.value = 'years';
}

function pickRandomYears(count) {
  const pool = [...ALL_YEARS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

async function handleRandomStart(nickname, count) {
  if (![10, 15, 20].includes(count)) return;
  const hasSelections =
    draft.years.length > 0 || Object.keys(draft.picks).length > 0;
  if (hasSelections) {
    const confirmed = await askConfirm({
      title: '随机替换当前番单？',
      message: '会重新抽取年份，并清空已选的年份与作品；昵称会更新。',
      confirmText: '随机开始',
      tone: 'danger',
    });
    if (!confirmed) return;
  }
  setNickname(nickname);
  writeFlow('yearbook');
  setYears(pickRandomYears(count));
  step.value = 'picks';
}

async function handleBattleStart(payload) {
  if (battleLoading.value) return;
  battleLoading.value = true;
  try {
    if (payload.nickname) setNickname(payload.nickname);
    await startBattle(payload.mode, { range: payload.range, picks: payload.picks });
    writeFlow('battle');
    step.value = 'battle';
  } catch (error) {
    console.error(error);
    showToast(error?.message || '抽签失败，请稍后再试');
  } finally {
    battleLoading.value = false;
  }
}

function handleBattlePick(nickname) {
  setNickname(nickname);
  writeFlow('battle-pick');
  step.value = 'battle-pick';
}

function handlePickedStart(picks) {
  handleBattleStart({ mode: 'picked', picks });
}

async function handleBattleReset() {
  const confirmed = await askConfirm({
    title: '重新抽签？',
    message:
      battleDecided.value > 0
        ? `当前 32 强对阵和已选的 ${battleDecided.value} 场都会被清空，无法撤销。`
        : '当前对阵会被清空，重新抽取 32 部作品。',
    confirmText: '重新抽签',
    tone: 'danger',
  });
  if (!confirmed) return;
  resetBattle();
  writeFlow('yearbook');
  step.value = 'intro';
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
  else if (step.value === 'battle-poster') step.value = 'battle';
  else if (step.value === 'battle') step.value = 'intro';
  else if (step.value === 'battle-pick') step.value = 'intro';
}
</script>

<template>
  <div class="scene-bg" aria-hidden="true"></div>

  <a class="skip-link" href="#main">跳到主要内容</a>

  <div class="site" :class="{ 'has-action': hasActionBar }">
    <header class="site-head">
      <div class="site-head-inner">
        <div class="wordmark">
          <span class="pinwheel" aria-hidden="true"></span>
          <b>二十年番单</b>
          <span>20 Best Anime</span>
        </div>

        <nav v-if="step !== 'intro' && step !== 'battle-pick'" class="trail" aria-label="填写进度">
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
          <span v-else-if="step === 'battle'" class="head-progress">
            {{ battleDecided }}<i>/{{ TOTAL_MATCHES }}</i>
          </span>
          <span v-else-if="step === 'battle-poster'" class="head-progress">
            {{ TOTAL_MATCHES }}<i>/{{ TOTAL_MATCHES }}</i>
          </span>
          <span v-else class="head-progress head-years">
            1990—2026
          </span>

          <button v-if="step !== 'intro'" class="head-back" type="button" @click="goBack">
            ← <span>返回</span>
          </button>

          <button
            class="theme-switch"
            type="button"
            :aria-label="theme === 'dark' ? '切换到纸质主题' : '切换到深色主题'"
            @click="toggleTheme"
          >
            <span class="theme-swatch" aria-hidden="true"></span>
            <span>{{ theme === 'dark' ? '深色' : '纸质' }}</span>
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
          :stats-enabled="statsEnabled"
          :contribute="contribute"
          :battle-loading="battleLoading"
          @start="handleStart"
          @random-start="handleRandomStart"
          @reset="handleReset"
          @contribute-change="handleContributeChange"
          @battle-start="handleBattleStart"
          @battle-pick="handleBattlePick"
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
          v-else-if="step === 'poster'"
          key="poster"
          :nickname="draft.nickname"
          :items="orderedPicks"
          :stats-enabled="statsEnabled"
          :submit-state="submitState"
          :focus-years="draft.years"
          @back="step = 'picks'"
          @reset="handleReset"
        />

        <BattlePickStep
          v-else-if="step === 'battle-pick'"
          key="battle-pick"
          @start="handlePickedStart"
          @back="step = 'intro'"
        />

        <BattleStep
          v-else-if="step === 'battle'"
          key="battle"
          :rounds="battleRounds"
          :current-match="battleCurrentMatch"
          :champion="battleChampion"
          :runner-up="battleRunnerUp"
          :decided-count="battleDecided"
          :mode="battleState.mode"
          :range="battleState.range"
          @pick="pickBattle"
          @undo="undoBattle"
          @reset="handleBattleReset"
          @poster="step = 'battle-poster'"
        />

        <BattlePosterStep
          v-else
          key="battle-poster"
          :nickname="draft.nickname"
          :mode="battleState.mode"
          :range="battleState.range"
          :rounds="battleRounds"
          :champion="battleChampion"
          :runner-up="battleRunnerUp"
          @back="step = 'battle'"
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
