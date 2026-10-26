<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { toBlob } from 'html-to-image';
import PosterCanvas from './PosterCanvas.vue';
import { showToast } from '../composables/useToast.js';
import { safeFilename } from '../utils/anime.js';

const props = defineProps({
  nickname: { type: String, default: '' },
  items: { type: Array, default: () => [] },
});
const emit = defineEmits(['back', 'reset']);

const POSTER_WIDTH = 1440;
const stageRef = ref(null);
const posterRef = ref(null);
const scale = ref(0.3);
const posterHeight = ref(1600);
const busy = ref(false);
const covers = ref({});
const coverTotal = ref(0);
const coverDone = ref(0);
const coverFailed = ref(0);
const coversLoading = ref(false);
const COVER_CONCURRENCY = 5;
let resizeObserver = null;
let posterObserver = null;
let coverLoadToken = 0;
let coverControllers = [];

const firstYear = computed(() => props.items[0]?.year ?? '—');
const lastYear = computed(() => props.items[props.items.length - 1]?.year ?? '—');
const canShare = computed(
  () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
);
const filename = computed(() => `${safeFilename(props.nickname)}-二十年番单.png`);
const coverStatus = computed(() => {
  if (coversLoading.value) {
    return `正在载入封面 ${coverDone.value} / ${coverTotal.value}…`;
  }
  if (coverFailed.value) return `有 ${coverFailed.value} 张封面未载入，已用文字占位。`;
  return '';
});

watch(
  () => props.items,
  () => loadCovers(),
  { immediate: true },
);

onMounted(async () => {
  updateScale();
  resizeObserver = new ResizeObserver(updateScale);
  if (stageRef.value) resizeObserver.observe(stageRef.value);
  await nextTick();
  syncPosterHeight();
  const node = posterRef.value?.getNode();
  if (node) {
    posterObserver = new ResizeObserver(syncPosterHeight);
    posterObserver.observe(node);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  posterObserver?.disconnect();
  cancelCoverLoads();
});

function updateScale() {
  if (!stageRef.value) return;
  scale.value = stageRef.value.clientWidth / POSTER_WIDTH;
}

function syncPosterHeight() {
  const node = posterRef.value?.getNode();
  if (!node) return;
  const height = node.offsetHeight;
  if (height > 0) posterHeight.value = height;
}

function cancelCoverLoads() {
  coverLoadToken += 1;
  coverControllers.forEach((controller) => controller.abort());
  coverControllers = [];
}

function coverCandidateUrls(anime) {
  const base = anime.coverLarge || anime.cover;
  if (!base) return [];
  // AniList 的 small 封面放进 5 列网格会偏糊，优先取 medium
  const medium = base.replace('/cover/small/', '/cover/medium/');
  return [...new Set([medium, anime.cover].filter(Boolean))];
}

async function fetchCoverData(anime) {
  const urls = coverCandidateUrls(anime);
  if (!urls.length) throw new Error('没有封面地址');
  let lastError = null;

  for (const url of urls) {
    const controller = new AbortController();
    coverControllers.push(controller);
    const timer = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, {
        mode: 'cors',
        cache: 'force-cache',
        signal: controller.signal,
      });
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

  throw lastError || new Error('封面载入失败');
}

async function loadCovers() {
  const token = ++coverLoadToken;
  coverControllers.forEach((controller) => controller.abort());
  coverControllers = [];
  covers.value = {};
  coverTotal.value = props.items.length;
  coverDone.value = 0;
  coverFailed.value = 0;
  coversLoading.value = true;

  const queue = props.items.map((item) => item.anime);
  const workers = Array.from({ length: COVER_CONCURRENCY }, async () => {
    while (queue.length && token === coverLoadToken) {
      const anime = queue.shift();
      try {
        const dataUrl = await fetchCoverData(anime);
        if (token === coverLoadToken) covers.value[anime.id] = dataUrl;
      } catch (error) {
        if (token === coverLoadToken) {
          coverFailed.value += 1;
          console.warn('封面载入失败', anime.id, error);
        }
      } finally {
        if (token === coverLoadToken) coverDone.value += 1;
      }
    }
  });

  await Promise.all(workers);
  if (token === coverLoadToken) {
    coversLoading.value = false;
    await nextTick();
  }
}

async function makeBlob() {
  if (coversLoading.value) throw new Error('封面尚未载入完成');
  const node = posterRef.value?.getNode();
  if (!node) throw new Error('海报尚未准备好');
  if (document.fonts?.ready) await document.fonts.ready;
  const images = [...node.querySelectorAll('img')];
  await Promise.all(images.map((image) => image.decode?.().catch(() => {})));
  await nextTick();
  const height = node.offsetHeight || posterHeight.value;
  const blob = await toBlob(node, {
    width: POSTER_WIDTH,
    height,
    canvasWidth: POSTER_WIDTH,
    canvasHeight: height,
    pixelRatio: 1,
    backgroundColor: '#f7fafc',
    cacheBust: true,
  });
  if (!blob) throw new Error('图片生成失败');
  return blob;
}

function triggerDownload(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.value;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function download() {
  if (busy.value) return;
  busy.value = true;
  try {
    const blob = await makeBlob();
    triggerDownload(blob);
    showToast('海报已生成');
  } catch (error) {
    console.error(error);
    showToast('生成失败，请再试一次');
  } finally {
    busy.value = false;
  }
}

async function share() {
  if (busy.value) return;
  busy.value = true;
  try {
    const blob = await makeBlob();
    const file = new File([blob], filename.value, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `${props.nickname}的近20年动漫番单`,
      });
    } else {
      triggerDownload(blob);
      showToast('当前浏览器不支持系统分享，已改为下载');
    }
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.error(error);
      showToast('分享失败，请改用保存图片');
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="step poster-step">
    <div class="poster-layout">
      <div class="poster-stage">
        <div
          ref="stageRef"
          class="poster-frame"
          :style="{ aspectRatio: `${POSTER_WIDTH} / ${posterHeight}` }"
        >
          <div
            class="poster-scaler"
            :style="{
              width: `${POSTER_WIDTH}px`,
              height: `${posterHeight}px`,
              transform: `scale(${scale})`,
            }"
          >
            <PosterCanvas ref="posterRef" :nickname="nickname" :items="items" :covers="covers" />
          </div>
        </div>
      </div>

      <div class="poster-side vn-dark">
        <span class="vn-plate plate-emerald">存档完成</span>

        <h1>你的二十年，<br />已经排好了。</h1>
        <p class="lede">
          5 列封面表格，宽 1440 px，高度随作品数量自动调整。保存下来，或者分享给同好——这是只属于你的动漫编年史。
        </p>

        <ul class="poster-meta">
          <li><span>署名</span><b>{{ nickname }}</b></li>
          <li><span>年份</span><b>{{ firstYear }} — {{ lastYear }}</b></li>
          <li><span>作品</span><b>{{ items.length }} 部</b></li>
        </ul>

        <div class="poster-actions">
          <button
            class="btn btn-primary"
            type="button"
            :disabled="busy || coversLoading"
            @click="download"
          >
            {{ coversLoading ? '载入封面中…' : busy ? '正在生成…' : '保存图片' }}
          </button>
          <button
            v-if="canShare"
            class="btn btn-glass"
            type="button"
            :disabled="busy || coversLoading"
            @click="share"
          >
            系统分享
          </button>
          <button class="btn btn-glass" type="button" :disabled="busy" @click="emit('back')">
            返回修改
          </button>
        </div>

        <p
          v-if="coverStatus"
          class="cover-status"
          :class="{ warn: !coversLoading && coverFailed }"
        >
          {{ coverStatus }}
        </p>

        <p class="poster-note">
          手机端如果没有自动下载，可以长按海报保存。<br />
          封面来自 AniList，仅用于这张个人番单。
        </p>

        <button class="text-link danger-link" type="button" @click="emit('reset')">
          重新开始
        </button>
      </div>
    </div>
  </section>
</template>
