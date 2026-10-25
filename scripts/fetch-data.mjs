#!/usr/bin/env node
/**
 * 拉取 1990–2026 年的动画数据并落盘。
 * 数据源：AniList（元数据/评分/封面）+ bangumi-data（简体中文名，CC BY 4.0）
 * 用法：
 *   node scripts/fetch-data.mjs               全量
 *   node scripts/fetch-data.mjs --year=1998   只刷新某一年
 *   node scripts/fetch-data.mjs --refresh     忽略缓存重新请求
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(ROOT, '.cache');
const ANILIST_CACHE = path.join(CACHE_DIR, 'anilist');
const OUT_DIR = path.join(ROOT, 'src', 'data');
const YEARS_DIR = path.join(OUT_DIR, 'years');
const BGM_CACHE = path.join(CACHE_DIR, 'bangumi-data.json');

const START_YEAR = 1990;
const END_YEAR = 2026;
const PAGE_SIZE = 50;
const THROTTLE_MS = 1200;
const FORMATS = ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'];

const args = process.argv.slice(2);
const onlyYear = Number(args.find((a) => a.startsWith('--year='))?.split('=')[1]) || null;
const refresh = args.includes('--refresh');

const QUERY = `query ($year: Int, $page: Int) {
  Page(page: $page, perPage: ${PAGE_SIZE}) {
    pageInfo { hasNextPage currentPage }
    media(
      type: ANIME
      seasonYear: $year
      isAdult: false
      format_in: [${FORMATS.join(', ')}]
      sort: POPULARITY_DESC
    ) {
      id
      idMal
      title { native romaji english }
      synonyms
      format
      episodes
      averageScore
      popularity
      coverImage { medium large }
      startDate { year month day }
      seasonYear
    }
  }
}`;

let lastRequestAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureDirs() {
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(ANILIST_CACHE, { recursive: true });
  await mkdir(YEARS_DIR, { recursive: true });
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fetchJson(url, options = {}, tries = 5) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after')) * 1000 || 30000;
        console.warn(`  429 限流，等待 ${Math.round(retryAfter / 1000)}s 后重试 (${attempt}/${tries})`);
        await sleep(retryAfter);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (attempt === tries) throw err;
      const wait = 2000 * attempt;
      console.warn(`  请求失败：${err.message}，${wait / 1000}s 后重试 (${attempt}/${tries})`);
      await sleep(wait);
    }
  }
  throw new Error(`请求最终失败: ${url}`);
}

async function downloadBangumiData() {
  if (!refresh) {
    const cached = await readJson(BGM_CACHE);
    if (cached?.items?.length) {
      console.log(`bangumi-data: 使用缓存 (${cached.items.length} 条)`);
      return cached;
    }
  }

  const sources = [
    'https://unpkg.com/bangumi-data/dist/data.json',
    'https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json',
  ];
  for (const url of sources) {
    try {
      console.log(`bangumi-data: 下载 ${url}`);
      const data = await fetchJson(url, { headers: { 'User-Agent': 'anime-years/0.1' } });
      if (!Array.isArray(data?.items) || !data.items.length) throw new Error('数据格式异常');
      await writeFile(BGM_CACHE, JSON.stringify(data));
      console.log(`bangumi-data: 已缓存 ${data.items.length} 条`);
      return data;
    } catch (err) {
      console.warn(`  ${url} 失败：${err.message}`);
    }
  }
  throw new Error('bangumi-data 下载失败，请稍后重试');
}

function normalizeTitle(text) {
  return (text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '')
    .replace(/第[0-9一二三四五六七八九十]+[期季部]/g, '');
}

function hasChinese(text) {
  return /\p{Script=Han}/u.test(text || '') && !/[\u3040-\u309f\u30a0-\u30ff]/.test(text || '');
}

function buildLookups(bgmData) {
  const byAniListId = new Map();
  const byMalId = new Map();
  const byTitle = new Map();
  const titleCandidates = new Map();

  for (const item of bgmData.items) {
    const zh = item.titleTranslate?.['zh-Hans']?.[0];
    if (!zh) continue;
    const bgmId = item.sites?.find((s) => s.site === 'bangumi')?.id || null;
    const record = { zh, bgmId };
    for (const site of item.sites || []) {
      if (site.site === 'aniList') byAniListId.set(String(site.id), record);
      if (site.site === 'mal') byMalId.set(String(site.id), record);
    }

    const titleKey = normalizeTitle(item.title);
    if (titleKey) {
      const list = titleCandidates.get(titleKey) || [];
      list.push(record);
      titleCandidates.set(titleKey, list);
    }
  }

  // 同名作品容易误配（尤其是重制版），只在标题唯一时使用标题兜底
  for (const [titleKey, records] of titleCandidates) {
    if (records.length === 1) byTitle.set(titleKey, records[0]);
  }

  return { byAniListId, byMalId, byTitle };
}

function pickChineseName(media, lookup) {
  const direct =
    lookup.byAniListId.get(String(media.id)) ||
    lookup.byMalId.get(String(media.idMal)) ||
    lookup.byTitle.get(normalizeTitle(media.title?.native));
  if (direct?.zh) return direct;

  const synonym = (media.synonyms || []).find(hasChinese);
  return synonym ? { zh: synonym, bgmId: null } : null;
}

function toEntry(media, lookup) {
  const hit = pickChineseName(media, lookup);
  const date =
    media.startDate?.year
      ? [media.startDate.year, media.startDate.month, media.startDate.day]
          .filter((n) => n != null)
          .map((n, i) => (i === 0 ? String(n) : String(n).padStart(2, '0')))
          .join('-')
      : null;

  return {
    id: media.id,
    cn: hit?.zh || null,
    jp: media.title?.native || null,
    romaji: media.title?.romaji || null,
    cover: media.coverImage?.medium || media.coverImage?.large || null,
    score: media.averageScore ?? null,
    pop: media.popularity ?? 0,
    format: media.format,
    date,
    eps: media.episodes ?? null,
    bgm: hit?.bgmId ?? null,
  };
}

async function fetchYearFromAniList(year) {
  const results = [];
  for (let page = 1; page <= 40; page++) {
    const cacheFile = path.join(ANILIST_CACHE, `${year}-${page}.json`);
    let data = refresh ? null : await readJson(cacheFile);

    if (!data) {
      const wait = Math.max(0, lastRequestAt + THROTTLE_MS - Date.now());
      if (wait > 0) await sleep(wait);
      lastRequestAt = Date.now();
      console.log(`  AniList ${year} 第 ${page} 页…`);
      data = await fetchJson(
        'https://graphql.anilist.co',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'anime-years/0.1 (fan project)',
          },
          body: JSON.stringify({ query: QUERY, variables: { year, page } }),
        },
      );
      if (data.errors?.length) throw new Error(data.errors.map((e) => e.message).join('; '));
      await writeFile(cacheFile, JSON.stringify(data));
    }

    const media = data?.data?.Page?.media || [];
    results.push(...media);
    if (!data?.data?.Page?.pageInfo?.hasNextPage || media.length < PAGE_SIZE) break;
  }
  return results;
}

function buildMeta(yearsMap) {
  const counts = {};
  let total = 0;
  for (const year of Object.keys(yearsMap).sort((a, b) => Number(a) - Number(b))) {
    const count = yearsMap[year].length;
    counts[year] = count;
    total += count;
  }
  return {
    generatedAt: new Date().toISOString(),
    start: START_YEAR,
    end: END_YEAR,
    total,
    years: counts,
    sources: ['AniList', 'bangumi-data (CC BY 4.0)'],
  };
}

async function main() {
  await ensureDirs();
  const bgmData = await downloadBangumiData();
  const lookup = buildLookups(bgmData);

  const yearsToFetch = onlyYear
    ? [onlyYear]
    : Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

  for (const year of yearsToFetch) {
    if (year < START_YEAR || year > END_YEAR) throw new Error(`年份超出范围: ${year}`);
    console.log(`\n[${year}] 拉取中…`);
    const media = await fetchYearFromAniList(year);
    const entries = [];
    const seen = new Set();
    let withCn = 0;

    for (const item of media) {
      const assignedYear = item.seasonYear || item.startDate?.year;
      if (assignedYear !== year || seen.has(item.id)) continue;
      seen.add(item.id);
      const entry = toEntry(item, lookup);
      if (entry.cn) withCn++;
      entries.push(entry);
    }

    entries.sort((a, b) => b.pop - a.pop);
    await writeFile(path.join(YEARS_DIR, `${year}.json`), JSON.stringify(entries));
    console.log(
      `[${year}] ${entries.length} 部，中文名 ${withCn} 部 (${Math.round((withCn / Math.max(entries.length, 1)) * 100)}%)`,
    );
  }

  const years = [];
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const data = await readJson(path.join(YEARS_DIR, `${year}.json`), []);
    years.push([year, data]);
  }
  const meta = buildMeta(Object.fromEntries(years));
  await writeFile(path.join(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log(`\n完成：${meta.total} 部，数据位于 src/data/years/`);
}

main().catch((err) => {
  console.error('\n生成失败：', err);
  process.exitCode = 1;
});
