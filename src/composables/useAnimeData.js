import meta from '../data/meta.json';

const modules = import.meta.glob('../data/years/*.json');
const cache = new Map();

export function useAnimeData() {
  const yearCounts = meta.years || {};

  async function loadYear(year) {
    if (cache.has(year)) return cache.get(year);
    const key = `../data/years/${year}.json`;
    const loader = modules[key];
    if (!loader) throw new Error(`缺少 ${year} 年的数据文件`);
    const module = await loader();
    const list = (module.default || module).map((item) => ({
      ...item,
      search: [item.cn, item.jp, item.romaji].filter(Boolean).join(' ').toLowerCase(),
    }));
    cache.set(year, list);
    return list;
  }

  return { loadYear, yearCounts, total: meta.total };
}
