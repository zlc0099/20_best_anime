import { computed, reactive, watch } from 'vue';

const STORAGE_KEY = 'anime-years.draft.v1';

export const START_YEAR = 1990;
export const END_YEAR = 2026;
export const MIN_YEARS = 10;
export const MAX_YEARS = 20;
export const MAX_NAME_LENGTH = 12;
export const ALL_YEARS = Array.from(
  { length: END_YEAR - START_YEAR + 1 },
  (_, index) => START_YEAR + index,
);

function cleanPick(pick) {
  if (!pick || typeof pick !== 'object' || pick.id == null) return null;
  if (![pick.cn, pick.jp, pick.romaji].some((title) => typeof title === 'string' && title.trim())) {
    return null;
  }
  return {
    id: pick.id,
    cn: typeof pick.cn === 'string' ? pick.cn : null,
    jp: typeof pick.jp === 'string' ? pick.jp : null,
    romaji: typeof pick.romaji === 'string' ? pick.romaji : null,
    cover: typeof pick.cover === 'string' ? pick.cover : null,
    format: typeof pick.format === 'string' ? pick.format : null,
    date: typeof pick.date === 'string' ? pick.date : null,
  };
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const nickname =
      typeof data.nickname === 'string'
        ? Array.from(data.nickname.trim()).slice(0, MAX_NAME_LENGTH).join('')
        : '';
    const years = Array.isArray(data.years)
      ? [...new Set(data.years)]
          .filter((year) => Number.isInteger(year) && year >= START_YEAR && year <= END_YEAR)
          .sort((a, b) => a - b)
          .slice(0, MAX_YEARS)
      : [];
    const picks = {};
    for (const year of years) {
      const pick = cleanPick(data.picks?.[year]);
      if (pick) picks[year] = pick;
    }
    return { nickname, years, picks };
  } catch {
    return null;
  }
}

export function toPick(anime) {
  return cleanPick(anime);
}

export function useDraft() {
  const saved = loadDraft();
  const state = reactive({
    nickname: saved?.nickname || '',
    years: saved?.years || [],
    picks: saved?.picks || {},
  });

  watch(
    state,
    (value) => {
      try {
        if (!value.nickname && value.years.length === 0) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...value }));
      } catch {
        // 隐私模式下 localStorage 不可用，不影响本次填写
      }
    },
    { deep: true },
  );

  const filledCount = computed(
    () => state.years.filter((year) => Boolean(state.picks[year])).length,
  );
  const isComplete = computed(
    () =>
      state.years.length >= MIN_YEARS &&
      state.years.length <= MAX_YEARS &&
      filledCount.value === state.years.length,
  );
  const hasDraft = computed(() => Boolean(state.nickname) || state.years.length > 0);
  const orderedPicks = computed(() =>
    state.years
      .filter((year) => state.picks[year])
      .map((year) => ({ year, anime: state.picks[year] })),
  );

  function setNickname(value) {
    state.nickname = Array.from(String(value || '').trim())
      .slice(0, MAX_NAME_LENGTH)
      .join('');
  }

  function addYear(year) {
    if (state.years.length >= MAX_YEARS || state.years.includes(year)) return false;
    state.years.push(year);
    state.years.sort((a, b) => a - b);
    return true;
  }

  function removeYear(year) {
    const index = state.years.indexOf(year);
    if (index === -1) return;
    state.years.splice(index, 1);
    delete state.picks[year];
  }

  function clearYears() {
    state.years = [];
    state.picks = {};
  }

  function setPick(year, anime) {
    if (!state.years.includes(year)) return;
    const pick = toPick(anime);
    if (!pick) return;
    state.picks[year] = pick;
  }

  function clearPick(year) {
    delete state.picks[year];
  }

  function reset() {
    state.nickname = '';
    state.years = [];
    state.picks = {};
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return {
    state,
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
  };
}
