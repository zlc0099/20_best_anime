<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { toBlob } from 'html-to-image';
import PosterCanvas from './PosterCanvas.vue';
import { showToast } from '../composables/useToast.js';
import { safeFilename } from '../utils/anime.js';

const props = defineProps({
  nickname: { type: String, default: '' },
  items: { type: Array, default: () => [] },
});
const emit = defineEmits(['back', 'reset']);

const stageRef = ref(null);
const posterRef = ref(null);
const scale = ref(0.4);
const busy = ref(false);
let resizeObserver = null;

const firstYear = computed(() => props.items[0]?.year ?? '—');
const lastYear = computed(() => props.items[props.items.length - 1]?.year ?? '—');
const canShare = computed(
  () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
);
const filename = computed(() => `${safeFilename(props.nickname)}-二十年番单.png`);

onMounted(() => {
  updateScale();
  resizeObserver = new ResizeObserver(updateScale);
  if (stageRef.value) resizeObserver.observe(stageRef.value);
});

onBeforeUnmount(() => resizeObserver?.disconnect());

function updateScale() {
  if (!stageRef.value) return;
  scale.value = stageRef.value.clientWidth / 1080;
}

async function makeBlob() {
  const node = posterRef.value?.getNode();
  if (!node) throw new Error('海报尚未准备好');
  if (document.fonts?.ready) await document.fonts.ready;
  await nextTick();
  const blob = await toBlob(node, {
    width: 1080,
    height: 1920,
    canvasWidth: 1080,
    canvasHeight: 1920,
    pixelRatio: 1,
    backgroundColor: '#f4efe4',
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
        <div ref="stageRef" class="poster-frame">
          <div class="poster-scaler" :style="{ transform: `scale(${scale})` }">
            <PosterCanvas ref="posterRef" :nickname="nickname" :items="items" />
          </div>
        </div>
      </div>

      <div class="poster-side vn-dark">
        <span class="vn-plate plate-emerald">存档完成</span>

        <h1>你的二十年，<br />已经排好了。</h1>
        <p class="lede">
          纯文字排版，1080 × 1920。保存下来，或者分享给同好——这是只属于你的动漫编年史。
        </p>

        <ul class="poster-meta">
          <li><span>署名</span><b>{{ nickname }}</b></li>
          <li><span>年份</span><b>{{ firstYear }} — {{ lastYear }}</b></li>
          <li><span>作品</span><b>{{ items.length }} 部</b></li>
        </ul>

        <div class="poster-actions">
          <button class="btn btn-primary" type="button" :disabled="busy" @click="download">
            {{ busy ? '正在生成…' : '保存图片' }}
          </button>
          <button
            v-if="canShare"
            class="btn btn-glass"
            type="button"
            :disabled="busy"
            @click="share"
          >
            系统分享
          </button>
          <button class="btn btn-glass" type="button" :disabled="busy" @click="emit('back')">
            返回修改
          </button>
        </div>

        <p class="poster-note">
          手机端如果没有自动下载，可以长按海报保存。<br />
          海报不含封面图，只记录你的选择。
        </p>

        <button class="text-link danger-link" type="button" @click="emit('reset')">
          重新开始
        </button>
      </div>
    </div>
  </section>
</template>
