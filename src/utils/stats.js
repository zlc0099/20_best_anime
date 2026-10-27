const BASE = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const statsEnabled = Boolean(BASE && KEY);

const VISITOR_KEY = 'anime-years.visitor.v1';
const CONTRIBUTE_KEY = 'anime-years.contribute.v1';
const SENT_KEY = 'anime-years.sent.v1';
const CACHE_MS = 60000;

function readStore(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 隐私模式下不可写，只影响去重，不影响本次填写
  }
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getVisitor() {
  let id = readStore(VISITOR_KEY);
  if (!id) {
    id = randomId();
    writeStore(VISITOR_KEY, id);
  }
  return id;
}

export function loadContribute() {
  return readStore(CONTRIBUTE_KEY) !== 'off';
}

export function saveContribute(on) {
  writeStore(CONTRIBUTE_KEY, on ? 'on' : 'off');
}

export function picksFingerprint(items) {
  return items
    .map((item) => `${item.year}:${item.anime?.id ?? ''}`)
    .sort()
    .join('|');
}

function apiHeaders() {
  return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
}

export const STATS_UPDATED = 'anime-stats:updated';

export function notifyStatsUpdated() {
  window.dispatchEvent(new CustomEvent(STATS_UPDATED));
}

export async function submitPicks(items) {
  if (!statsEnabled) return { ok: false, reason: 'disabled' };
  const fingerprint = picksFingerprint(items);
  if (readStore(SENT_KEY) === fingerprint) return { ok: true, duplicate: true };

  const res = await fetch(`${BASE}/rest/v1/rpc/submit_picks`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({
      p_visitor: getVisitor(),
      p_picks: items.map((item) => ({ year: item.year, anime_id: item.anime.id })),
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    return { ok: false, reason: data?.message || `HTTP ${res.status}` };
  }
  writeStore(SENT_KEY, fingerprint);
  if (!data.duplicate) notifyStatsUpdated();
  return data;
}

let cache = null;

export async function fetchDecadeStats(force = false) {
  if (!statsEnabled) return null;
  if (cache && !force && Date.now() - cache.at < CACHE_MS) return cache.data;

  const res = await fetch(`${BASE}/rest/v1/rpc/decade_top`, {
    method: 'POST',
    headers: apiHeaders(),
    body: '{}',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cache = { data, at: Date.now() };
  return data;
}
