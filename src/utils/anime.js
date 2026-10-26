export function displayTitle(anime) {
  if (!anime) return '未知作品';
  return anime.cn || anime.jp || anime.romaji || '未知作品';
}

export function formatLabel(format) {
  const labels = {
    TV: 'TV',
    TV_SHORT: 'TV短篇',
    MOVIE: '剧场版',
    OVA: 'OVA',
    ONA: 'ONA',
    SPECIAL: '特别篇',
  };
  return labels[format] || format || '';
}

export function nameFontSize(nickname) {
  const length = Array.from(nickname || '').length;
  if (length <= 4) return 136;
  if (length <= 6) return 120;
  if (length <= 9) return 104;
  return 86;
}

export function posterTitleFontSize(title) {
  const length = Array.from(title || '').length;
  if (length <= 16) return 30;
  if (length <= 22) return 27;
  if (length <= 28) return 24;
  return 22;
}

export function safeFilename(name) {
  const cleaned = (name || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
  return cleaned || '我的番单';
}
