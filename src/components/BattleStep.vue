<script setup>
import { computed } from 'vue';
import { displayTitle, formatLabel, popularityLabel } from '../utils/anime.js';
import { battleModeLabel, splitHalves, TOTAL_MATCHES } from '../composables/useBattle.js';

const props = defineProps({
  rounds: { type: Array, default: () => [] },
  currentMatch: { type: Object, default: null },
  champion: { type: Object, default: null },
  runnerUp: { type: Object, default: null },
  decidedCount: { type: Number, default: 0 },
  mode: { type: String, default: '' },
  range: { type: Array, default: null },
});
const emit = defineEmits(['pick', 'undo', 'reset', 'poster']);

const modeLabel = computed(() => battleModeLabel(props.mode, props.range));
const matchNo = computed(() => Math.min(props.decidedCount + 1, TOTAL_MATCHES));
const progress = computed(() => `${Math.round((props.decidedCount / TOTAL_MATCHES) * 100)}%`);
const sides = ['top', 'bottom'];

const columns = computed(() => {
  const halves = splitHalves(props.rounds);
  const toGroups = (column) =>
    column.matches.map((match, index) => ({ id: `${column.level}-${index}`, kind: 'match', match }));

  return [
    ...halves.left.map((column) => ({
      key: `L${column.level}`,
      label: column.label,
      groups: toGroups(column),
    })),
    {
      key: 'F',
      label: '决赛',
      groups: [
        { id: 'final', kind: 'match', match: halves.final },
        { id: 'champ', kind: 'champion' },
      ],
    },
    ...halves.right.map((column) => ({
      key: `R${column.level}`,
      label: column.label,
      groups: toGroups(column),
    })),
  ];
});

function groupEntries(group) {
  if (group.kind === 'champion') return [props.champion];
  return [group.match?.top || null, group.match?.bottom || null];
}

function cellClass(group, entry) {
  if (group.kind === 'champion') return { winner: Boolean(entry), pending: !entry };
  const match = group.match;
  return {
    winner: Boolean(match?.decided) && match.winner === entry,
    loser: Boolean(match?.decided) && match.loser === entry,
    pending: !entry,
  };
}

function isCurrent(group) {
  return Boolean(
    group.match && props.currentMatch && group.match.flat === props.currentMatch.flat,
  );
}
</script>

<template>
  <section class="step battle-step">
    <header class="battle-head">
      <span class="vn-badge plate-indigo">动漫大乱斗</span>
      <h1>32 部，一场一场<em class="accent">选到冠军</em>。</h1>
      <p class="lede">
        {{ modeLabel }} · 共 {{ TOTAL_MATCHES }} 场，每次二选一，可随时撤回。
      </p>
      <div class="battle-progress">
        <span class="bar-num">{{ decidedCount }}<i>/{{ TOTAL_MATCHES }}</i></span>
        <span class="bar-track" aria-hidden="true"><span class="bar-fill" :style="{ width: progress }"></span></span>
        <span class="bar-hint">
          <template v-if="currentMatch">第 {{ matchNo }} 场 · {{ currentMatch.label }}</template>
          <template v-else-if="champion">冠军已产生</template>
        </span>
      </div>
    </header>

    <div v-if="currentMatch" class="duel">
      <button
        v-for="side in sides"
        :key="side"
        class="duel-card"
        type="button"
        @click="emit('pick', side === 'bottom' ? 1 : 0)"
      >
        <span class="duel-slot">{{ side === 'top' ? 'A' : 'B' }}</span>
        <img
          v-if="currentMatch[side].cover"
          class="duel-cover"
          :src="currentMatch[side].cover"
          :alt="displayTitle(currentMatch[side])"
          loading="lazy"
        />
        <span v-else class="duel-cover duel-cover--empty" aria-hidden="true"></span>
        <b class="duel-title">{{ displayTitle(currentMatch[side]) }}</b>
        <span class="duel-meta">
          {{ currentMatch[side].year }} 年 · {{ formatLabel(currentMatch[side].format) }}
        </span>
        <span v-if="popularityLabel(currentMatch[side].pop)" class="duel-pop">
          {{ popularityLabel(currentMatch[side].pop) }}
        </span>
        <span class="duel-cta">选它晋级 <span class="btn-arrow" aria-hidden="true">›</span></span>
      </button>
    </div>

    <div v-else-if="champion" class="duel-final">
      <span class="vn-plate plate-pink">冠军</span>
      <img
        v-if="champion.cover"
        class="final-cover"
        :src="champion.cover"
        :alt="displayTitle(champion)"
      />
      <span v-else class="final-cover final-cover--empty" aria-hidden="true"></span>
      <h2>{{ displayTitle(champion) }}</h2>
      <p class="final-meta">
        {{ champion.year }} 年 · {{ formatLabel(champion.format) }}
        <span v-if="runnerUp"> · 决赛击败《{{ displayTitle(runnerUp) }}》</span>
      </p>
      <button class="btn btn-primary" type="button" @click="emit('poster')">
        生成冠军对阵图 <span class="btn-arrow" aria-hidden="true">›</span>
      </button>
    </div>

    <div class="battle-bar">
      <button
        class="btn btn-glass"
        type="button"
        :disabled="decidedCount === 0"
        @click="emit('undo')"
      >
        ← 撤回上一场
      </button>
      <button class="text-link danger-link" type="button" @click="emit('reset')">重新抽签</button>
    </div>

    <div class="battle-tree-wrap">
      <div class="battle-halves">
        <span class="battle-half-tag">左半区 16 签位</span>
        <span class="battle-half-tag battle-half-tag--center">决赛</span>
        <span class="battle-half-tag">右半区 16 签位</span>
      </div>
      <div class="battle-tree">
        <div v-for="column in columns" :key="column.key" class="battle-round" :class="{ 'battle-round--final': column.key === 'F' }">
          <span class="battle-round-label">{{ column.label }}</span>
          <div class="battle-matches">
            <div
              v-for="group in column.groups"
              :key="group.id"
              class="battle-match"
              :class="{ current: isCurrent(group), 'battle-match--champ': group.kind === 'champion' }"
            >
              <div
                v-for="(entry, sideIndex) in groupEntries(group)"
                :key="`${group.id}-${sideIndex}`"
                class="battle-slot"
                :class="cellClass(group, entry)"
              >
                <img v-if="entry?.cover" :src="entry.cover" :alt="displayTitle(entry)" loading="lazy" />
                <span v-else class="slot-ph" aria-hidden="true"></span>
                <b>{{ entry ? displayTitle(entry) : '待定' }}</b>
                <i v-if="entry">{{ entry.year }}</i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
