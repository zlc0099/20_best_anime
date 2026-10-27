import { onBeforeUnmount, ref } from 'vue';

const CONCURRENCY = 5;
const TIMEOUT_MS = 20000;

function candidateUrls(anime) {
  const base = anime.cover;
  if (!base) return [];
  const medium = base.replace('/cover/small/', '/cover/medium/');
  return [...new Set([medium, base])];
}

async function fetchOne(anime, controllers) {
  let lastError = null;
  for (const url of candidateUrls(anime)) {
    const controller = new AbortController();
    controllers.push(controller);
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { mode: 'cors', cache: 'force-cache', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('返回内容不是图片');
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timer);
    }
  }
  throw lastError || new Error('没有可用封面');
}

export function useCovers(getItems) {
  const covers = ref({});
  const loading = ref(false);
  const done = ref(0);
  const failed = ref(0);
  const total = ref(0);
  let token = 0;
  let controllers = [];

  function cancel() {
    token += 1;
    controllers.forEach((controller) => controller.abort());
    controllers = [];
  }

  async function load() {
    const unique = new Map();
    for (const anime of getItems() || []) {
      if (anime && anime.id && anime.cover && !unique.has(anime.id)) unique.set(anime.id, anime);
    }
    const queue = [...unique.values()];
    const current = ++token;
    controllers = [];
    covers.value = {};
    total.value = queue.length;
    done.value = 0;
    failed.value = 0;
    loading.value = queue.length > 0;

    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length && current === token) {
        const anime = queue.shift();
        try {
          const dataUrl = await fetchOne(anime, controllers);
          if (current === token) covers.value = { ...covers.value, [anime.id]: dataUrl };
        } catch (error) {
          if (current === token) failed.value += 1;
          console.warn('封面载入失败', anime?.id, error);
        } finally {
          if (current === token) done.value += 1;
        }
      }
    });

    await Promise.all(workers);
    if (current === token) loading.value = false;
  }

  onBeforeUnmount(cancel);

  return { covers, loading, done, failed, total, load, cancel };
}
