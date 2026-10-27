<script setup>
import { computed, ref } from 'vue';
import { displayTitle, formatLabel } from '../utils/anime.js';
import { battleModeLabel, splitHalves } from '../composables/useBattle.js';

const props = defineProps({
  nickname: { type: String, default: '' },
  mode: { type: String, default: '' },
  range: { type: Array, default: null },
  rounds: { type: Array, default: () => [] },
  champion: { type: Object, default: null },
  runnerUp: { type: Object, default: null },
  covers: { type: Object, default: () => ({}) },
});

const rootRef = ref(null);

const modeLabel = computed(() => battleModeLabel(props.mode, props.range));

const dateLabel = computed(() => {
  const now = new Date();
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
    now.getDate(),
  ).padStart(2, '0')}`;
});

const columns = computed(() => {
  const halves = splitHalves(props.rounds);
  const toGroups = (column) =>
    column.matches.map((match, index) => ({ id: `${column.level}-${index}`, kind: 'match', match }));

  return [
    ...halves.left.map((column) => ({ key: `L${column.level}`, label: column.label, groups: toGroups(column) })),
    {
      key: 'F',
      label: '决赛 · 冠军',
      groups: [
        { id: 'final', kind: 'match', match: halves.final },
        { id: 'champ', kind: 'champion' },
      ],
    },
    ...halves.right.map((column) => ({ key: `R${column.level}`, label: column.label, groups: toGroups(column) })),
  ];
});

function coverFor(anime) {
  if (!anime) return '';
  return props.covers[anime.id] || anime.cover || '';
}

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

function getNode() {
  return rootRef.value;
}

defineExpose({ getNode });
</script>

<template>
  <div ref="rootRef" class="bp">
    <header class="bp-head">
      <div class="bp-headline">
        <span class="bp-badge">动漫大乱斗 · 冠军对阵图</span>
        <h1 class="bp-title">{{ nickname }} 的三十二强之战</h1>
        <p class="bp-sub">{{ modeLabel }} · 左右半区各 16 个签位 · 共 31 场</p>
        <p class="bp-sub">生成于 {{ dateLabel }}</p>
      </div>

      <div class="bp-champion">
        <img
          v-if="champion && coverFor(champion)"
          class="bp-champ-cover"
          :src="coverFor(champion)"
          :alt="displayTitle(champion)"
        />
        <span v-else class="bp-champ-cover bp-champ-cover--empty"></span>
        <div class="bp-champ-text">
          <span class="bp-kicker">CHAMPION</span>
          <b class="bp-champ-name">{{ champion ? displayTitle(champion) : '—' }}</b>
          <span class="bp-champ-meta">
            {{ champion ? `${champion.year} 年 · ${formatLabel(champion.format)}` : '' }}
          </span>
          <span class="bp-champ-runner">
            {{ runnerUp ? `决赛击败《${displayTitle(runnerUp)}》` : '' }}
          </span>
        </div>
      </div>
    </header>

    <div class="bp-halves">
      <span class="bp-half-tag bp-half-tag--left">左半区 LEFT BRACKET</span>
      <span class="bp-half-tag bp-half-tag--center">决赛 FINAL</span>
      <span class="bp-half-tag bp-half-tag--right">右半区 RIGHT BRACKET</span>
    </div>

    <div class="bp-tree">
      <div v-for="column in columns" :key="column.key" class="bp-round" :class="{ 'bp-round--final': column.key === 'F' }">
        <span class="bp-round-label">{{ column.label }}</span>
        <div class="bp-matches">
          <div
            v-for="group in column.groups"
            :key="group.id"
            class="bp-match"
            :class="{ 'bp-match--champ': group.kind === 'champion' }"
          >
            <div
              v-for="(entry, sideIndex) in groupEntries(group)"
              :key="`${group.id}-${sideIndex}`"
              class="bp-slot"
              :class="cellClass(group, entry)"
            >
              <img v-if="entry && coverFor(entry)" :src="coverFor(entry)" :alt="displayTitle(entry)" />
              <span v-else class="bp-ph"></span>
              <div class="bp-slot-text">
                <b>{{ entry ? displayTitle(entry) : '待定' }}</b>
                <i v-if="entry">{{ entry.year }} · {{ formatLabel(entry.format) }}</i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="bp-foot">二十年番单 · 20 Best Anime · 作品数据来自 AniList</footer>
  </div>
</template>

<style scoped>
.bp {
  width: 1440px;
  padding: 56px;
  background-color: var(--bg);
  background-image: radial-gradient(var(--dot) 0.55px, transparent 0.55px);
  background-size: 4px 4px;
  color: var(--text);
  font-family: var(--body);
}

.bp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 40px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border);
}

.bp-badge {
  display: inline-block;
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--accent-text);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
}

.bp-title {
  margin: 14px 0 8px;
  font-family: var(--display);
  font-size: 54px;
  font-weight: 700;
  line-height: 1.05;
}

.bp-sub {
  margin: 4px 0 0;
  color: var(--text-3);
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.02em;
}

.bp-champion {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 20px;
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  background: var(--panel);
}

.bp-champ-cover {
  width: 120px;
  height: 168px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--panel-2);
  object-fit: cover;
}

.bp-champ-text {
  display: flex;
  min-width: 220px;
  flex-direction: column;
  gap: 4px;
}

.bp-kicker {
  color: var(--accent-text);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
}

.bp-champ-name {
  font-family: var(--display);
  font-size: 34px;
  font-weight: 700;
  line-height: 1.15;
}

.bp-champ-meta,
.bp-champ-runner {
  color: var(--text-2);
  font-size: 13px;
}

.bp-halves {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 26px;
}

.bp-half-tag {
  flex: 1;
  color: var(--text-3);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
}

.bp-half-tag--left {
  text-align: left;
}

.bp-half-tag--center {
  flex: 0 0 auto;
  color: var(--accent-text);
  text-align: center;
}

.bp-half-tag--right {
  text-align: right;
}

.bp-tree {
  display: flex;
  align-items: stretch;
  gap: 10px;
  margin-top: 10px;
}

.bp-round {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  flex-direction: column;
}

.bp-round--final {
  flex: 1.15 1 0;
}

.bp-round-label {
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--divider);
  color: var(--text-3);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-align: center;
}

.bp-matches {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-around;
  gap: 8px;
}

.bp-match {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bp-match--champ {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--divider);
}

.bp-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 7px;
  border: 1px solid var(--divider);
  border-left: 2px solid var(--divider);
  border-radius: var(--radius-sm);
  background: var(--panel);
}

.bp-slot img,
.bp-ph {
  width: 34px;
  height: 48px;
  flex: none;
  border: 1px solid var(--border);
  border-radius: 1px;
  background: var(--panel-2);
  object-fit: cover;
}

.bp-slot-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.bp-slot b {
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bp-slot i {
  color: var(--text-3);
  font-family: var(--mono);
  font-size: 10px;
  font-style: normal;
}

.bp-slot.winner {
  border-color: var(--border);
  border-left-color: var(--accent);
  background: var(--panel-2);
}

.bp-slot.winner b {
  color: var(--text);
}

.bp-slot.loser {
  border-color: var(--divider);
  opacity: 0.42;
}

.bp-slot.loser b {
  color: var(--text-3);
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

.bp-slot.pending b {
  color: var(--text-3);
  font-weight: 400;
}

.bp-match--champ .bp-slot {
  border-left: 2px solid var(--accent);
  background: var(--panel-2);
}

.bp-match--champ .bp-slot b {
  font-family: var(--display);
  font-size: 15px;
}

.bp-foot {
  margin-top: 30px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.02em;
}
</style>
