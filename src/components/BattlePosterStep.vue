<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { toBlob } from 'html-to-image';
import BattlePosterCanvas from './BattlePosterCanvas.vue';
import { useCovers } from '../composables/useCovers.js';
import { showToast } from '../composables/useToast.js';
import { battleModeLabel } from '../composables/useBattle.js';
import { displayTitle, formatLabel, safeFilename } from '../utils/anime.js';

const props = defineProps({
  nickname: { type: String, default: '' },
  mode: { type: String, default: '' },
  range: { type: Array, default: null },
  rounds: { type: Array, default: () => [] },
  champion: { type: Object, default: null },
  runnerUp: { type: Object, default: null },
});
const emit = defineEmits(['back']);

const POSTER_WIDTH = 1440;
const stageRef = ref(null);
const canvasRef = ref(null);
const scale = ref(0.4);
const posterHeight = ref(2400);
const busy = ref(false);
let resizeObserver = null;
let posterObserver = null;

const entries = computed(() => {
  const map = new Map();
  for (const round of props.rounds) {
    for (const match of round.matches) {
      if (match.top) map.set(match.top.id, match.top);
      if (match.bottom) map.set(match.bottom.id, match.bottom);
    }
  }
  return [...map.values()];
});

const {
  covers,
  loading: coversLoading,
  failed: coverFailed,
  load: loadCovers,
} = useCovers(() => entries.value);
const modeLabel = computed(() => battleModeLabel(props.mode, props.range));
const filename = computed(() => `${safeFilename(props.nickname)}-动漫大乱斗.png`);
const canShare = computed(
  () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
);
const coverStatus = computed(() => {
  if (coversLoading.value) return '正在把 32 张封面写入海报…';
  if (coverFailed.value) return `有 ${coverFailed.value} 张封面未载入，海报里用文字占位。`;
  return '';
});

onMounted(async () => {
  loadCovers();
  updateScale();
  resizeObserver = new ResizeObserver(updateScale);
  if (stageRef.value) resizeObserver.observe(stageRef.value);
  await nextTick();
  syncPosterHeight();
  const node = canvasRef.value?.getNode();
  if (node) {
    posterObserver = new ResizeObserver(syncPosterHeight);
    posterObserver.observe(node);
  }
});

function updateScale() {
  if (!stageRef.value) return;
  scale.value = stageRef.value.clientWidth / POSTER_WIDTH;
}

function syncPosterHeight() {
  const node = canvasRef.value?.getNode();
  if (!node) return;
  const height = node.offsetHeight;
  if (height > 0) posterHeight.value = height;
}

async function makeBlob() {
  const node = canvasRef.value?.getNode();
  if (!node) throw new Error('海报尚未准备好');
  if (document.fonts?.ready) await document.fonts.ready;
  const images = [...node.querySelectorAll('img')];
  await Promise.all(images.map((image) => image.decode?.().catch(() => {})));
  await nextTick();
  const height = node.offsetHeight || posterHeight.value;
  const background =
    getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0b0d0f';
  const blob = await toBlob(node, {
    width: POSTER_WIDTH,
    height,
    canvasWidth: POSTER_WIDTH,
    canvasHeight: height,
    pixelRatio: 1,
    backgroundColor: background,
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
    showToast('对阵图已生成');
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
      await navigator.share({ files: [file], title: `${props.nickname}的动漫大乱斗冠军` });
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
  <section class="step battle-poster-step">
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
            <BattlePosterCanvas
              ref="canvasRef"
              :nickname="nickname"
              :mode="mode"
              :range="range"
              :rounds="rounds"
              :champion="champion"
              :runner-up="runnerUp"
              :covers="covers"
            />
          </div>
        </div>
      </div>

      <div class="poster-side vn-dark">
        <span class="vn-plate plate-emerald">对阵图完成</span>

        <h1>三十二强，<br />打到最后一部。</h1>
        <p class="lede">
          完整对阵图 1440 px 宽，六列逐轮收窄，胜者描橙线、负者灰显。保存下来，或者拿去和同好争。
        </p>

        <ul class="poster-meta">
          <li><span>署名</span><b>{{ nickname }}</b></li>
          <li><span>池子</span><b>{{ modeLabel }}</b></li>
          <li><span>冠军</span><b>{{ champion ? displayTitle(champion) : '—' }}</b></li>
          <li>
            <span>亚军</span>
            <b>{{ runnerUp ? displayTitle(runnerUp) : '—' }}</b>
          </li>
          <li v-if="champion">
            <span>年份</span><b>{{ champion.year }} · {{ formatLabel(champion.format) }}</b>
          </li>
        </ul>

        <div class="poster-actions">
          <button
            class="btn btn-primary"
            type="button"
            :disabled="busy || coversLoading"
            @click="download"
          >
            {{ coversLoading ? '载入封面中…' : busy ? '正在生成…' : '保存对阵图' }}
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
            返回对阵
          </button>
        </div>

        <p v-if="coverStatus" class="cover-status" :class="{ warn: !coversLoading && coverFailed }">
          {{ coverStatus }}
        </p>

        <p class="poster-note">
          海报里每格都是当时的封面与名字；<br />
          封面来自 AniList，仅用于这张个人对阵图。
        </p>
      </div>
    </div>
  </section>
</template>
