import { computed, reactive, watch } from 'vue';
import battleMeta from '../data/battle/meta.json';

const STORAGE_KEY = 'anime-years.battle.v1';

export const BRACKET_SIZE = 32;
export const TOTAL_MATCHES = 31;
export const ROUND_MATCHES = [16, 8, 4, 2, 1];
export const ROUND_OFFSETS = [0, 16, 24, 28, 30];
export const ROUND_LABELS = ['32 强', '16 强', '8 强', '半决赛', '决赛'];
export const CHAMPION_LEVEL = 5;
export const HALF_LEVELS = [0, 1, 2, 3];

// 把逐轮对阵拆成世界杯式左右半区：每半区 16 个签位，决赛居中
export function splitHalves(rounds) {
  const left = [];
  const right = [];

  for (const level of HALF_LEVELS) {
    const round = rounds[level];
    if (!round) continue;
    const perHalf = ROUND_MATCHES[level] / 2;
    left.push({ level, label: round.label, matches: round.matches.slice(0, perHalf) });
    right.push({ level, label: round.label, matches: round.matches.slice(perHalf) });
  }

  return {
    left,
    right: right.reverse(),
    final: rounds[4] ? rounds[4].matches[0] : null,
  };
}

export const BATTLE_YEARS = Object.keys(battleMeta.perYear)
  .map(Number)
  .sort((a, b) => a - b);

let poolPromise = null;

export function loadBattlePool() {
  if (!poolPromise) {
    poolPromise = import('../data/battle/all.json').then((mod) => mod.default || mod);
  }
  return poolPromise;
}

export function rangePoolSize(range) {
  if (!range) return battleMeta.total;
  const [from, to] = range;
  let total = 0;
  for (let year = from; year <= to; year += 1) total += battleMeta.perYear[year] || 0;
  return total;
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function emptyPicks() {
  return Array.from({ length: TOTAL_MATCHES }, () => null);
}

function sanitizePicks(raw) {
  const picks = emptyPicks();
  if (!Array.isArray(raw)) return picks;
  for (let i = 0; i < TOTAL_MATCHES; i += 1) {
    if (raw[i] !== 0 && raw[i] !== 1) break;
    picks[i] = raw[i];
  }
  return picks;
}

function sanitizeField(raw) {
  if (!Array.isArray(raw) || raw.length !== BRACKET_SIZE) return null;
  const ids = new Set();
  const field = [];
  for (const item of raw) {
    if (!item || typeof item.id !== 'number' || ids.has(item.id)) return null;
    if (![item.cn, item.jp, item.romaji].some((title) => title && String(title).trim())) {
      return null;
    }
    ids.add(item.id);
    field.push({
      id: item.id,
      cn: typeof item.cn === 'string' ? item.cn : null,
      jp: typeof item.jp === 'string' ? item.jp : null,
      romaji: typeof item.romaji === 'string' ? item.romaji : null,
      cover: typeof item.cover === 'string' ? item.cover : null,
      format: typeof item.format === 'string' ? item.format : null,
      date: typeof item.date === 'string' ? item.date : null,
      pop: Number(item.pop) || 0,
      year: Number(item.year) || null,
    });
  }
  return field;
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const field = sanitizeField(data.field);
    if (!field) return null;
    return {
      mode: data.mode === 'range' ? 'range' : 'random',
      range: Array.isArray(data.range) && data.range.length === 2 ? data.range : null,
      field,
      picks: sanitizePicks(data.picks),
    };
  } catch {
    return null;
  }
}

function entryAt(field, picks, level, slot) {
  if (!field.length) return null;
  if (level === 0) return field[slot] || null;
  const top = entryAt(field, picks, level - 1, slot * 2);
  const bottom = entryAt(field, picks, level - 1, slot * 2 + 1);
  if (!top || !bottom) return null;
  const pick = picks[ROUND_OFFSETS[level - 1] + slot];
  if (pick === null || pick === undefined) return null;
  return pick === 1 ? bottom : top;
}

export function useBattle() {
  const saved = loadSaved();
  const state = reactive({
    mode: saved?.mode || '',
    range: saved?.range || null,
    field: saved?.field || [],
    picks: saved?.picks || emptyPicks(),
  });

  const active = computed(() => state.field.length === BRACKET_SIZE);
  const currentFlat = computed(() => state.picks.indexOf(null));
  const decidedCount = computed(() => state.picks.filter((pick) => pick !== null).length);
  const isDone = computed(() => active.value && currentFlat.value === -1);

  const rounds = computed(() =>
    ROUND_MATCHES.map((count, level) => ({
      level,
      label: ROUND_LABELS[level],
      matches: Array.from({ length: count }, (_, index) => {
        const flat = ROUND_OFFSETS[level] + index;
        const top = entryAt(state.field, state.picks, level, index * 2);
        const bottom = entryAt(state.field, state.picks, level, index * 2 + 1);
        const pick = state.picks[flat];
        return {
          flat,
          level,
          top,
          bottom,
          pick,
          ready: Boolean(top) && Boolean(bottom),
          decided: pick !== null && Boolean(top) && Boolean(bottom),
          winner: pick === null ? null : pick === 1 ? bottom : top,
          loser: pick === null ? null : pick === 1 ? top : bottom,
        };
      }),
    })),
  );

  const currentMatch = computed(() => {
    if (!active.value || currentFlat.value === -1) return null;
    for (const round of rounds.value) {
      const hit = round.matches.find((match) => match.flat === currentFlat.value);
      if (hit) return { ...hit, label: round.label };
    }
    return null;
  });

  const champion = computed(() =>
    isDone.value ? entryAt(state.field, state.picks, CHAMPION_LEVEL, 0) : null,
  );

  const runnerUp = computed(() => {
    if (!isDone.value) return null;
    const final = rounds.value[4].matches[0];
    if (final.pick === null) return null;
    return final.pick === 1 ? final.top : final.bottom;
  });

  watch(
    state,
    () => {
      if (state.field.length !== BRACKET_SIZE) return;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            version: 1,
            mode: state.mode,
            range: state.range,
            field: state.field,
            picks: state.picks,
          }),
        );
      } catch {
        // 隐私模式下不可写，本次对阵仍在内存里
      }
    },
    { deep: true },
  );

  async function start(mode, options = {}) {
    const pool = await loadBattlePool();
    let candidates = pool;
    let range = null;

    if (mode === 'range') {
      const [from, to] = options.range || [];
      if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
        throw new Error('年份范围不合法');
      }
      range = [from, to];
      candidates = pool.filter((item) => item.year >= from && item.year <= to);
    }

    if (candidates.length < BRACKET_SIZE) {
      throw new Error(`这个范围只有 ${candidates.length} 部候选，至少需要 ${BRACKET_SIZE} 部`);
    }

    state.mode = mode;
    state.range = range;
    state.field = shuffle(candidates).slice(0, BRACKET_SIZE);
    state.picks = emptyPicks();
    return state.field;
  }

  function pick(winnerIndex) {
    if (!active.value) return;
    const flat = currentFlat.value;
    if (flat === -1) return;
    state.picks[flat] = winnerIndex === 1 ? 1 : 0;
  }

  function undo() {
    const flat = currentFlat.value;
    const target = flat === -1 ? TOTAL_MATCHES - 1 : flat - 1;
    if (target < 0) return;
    state.picks[target] = null;
  }

  function reset() {
    state.mode = '';
    state.range = null;
    state.field = [];
    state.picks = emptyPicks();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return {
    state,
    active,
    currentFlat,
    currentMatch,
    decidedCount,
    isDone,
    rounds,
    champion,
    runnerUp,
    start,
    pick,
    undo,
    reset,
  };
}
