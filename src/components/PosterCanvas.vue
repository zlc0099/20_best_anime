<script setup>
import { computed, ref } from 'vue';
import { displayTitle, nameFontSize } from '../utils/anime.js';

const props = defineProps({
  nickname: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  covers: { type: Object, default: () => ({}) },
});

const root = ref(null);
defineExpose({ getNode: () => root.value });

const rows = computed(() =>
  props.items.map(({ year, anime }) => {
    const title = displayTitle(anime);
    return {
      year,
      title,
      initial: Array.from(title)[0] || '番',
      cover: props.covers?.[anime.id] || null,
      tone: decadeTone(year),
    };
  }),
);
const sizedName = computed(() => nameFontSize(props.nickname));

function decadeTone(year) {
  if (year < 2000) return 'tone-indigo';
  if (year < 2010) return 'tone-pink';
  if (year < 2020) return 'tone-emerald';
  return 'tone-indigo';
}

function titleSize(title) {
  const length = Array.from(title || '').length;
  if (length <= 12) return 19;
  if (length <= 18) return 17;
  if (length <= 24) return 15.5;
  return 14;
}
</script>

<template>
  <div ref="root" class="poster" role="group" aria-label="番单海报">
    <div class="p-scene" aria-hidden="true">
      <span class="p-orb"></span>
      <span class="p-silhouette p-s1"></span>
      <span class="p-silhouette p-s2"></span>
      <span class="p-silhouette p-s3"></span>
    </div>

    <div class="p-panel">
      <span class="p-plate">番单</span>

      <div class="p-body">
        <div class="p-topline">
          <span>我的二十年 · 1990—2026</span>
          <span>20 Best Anime</span>
        </div>

        <h1 class="p-name" :style="{ fontSize: `${sizedName}px` }">{{ nickname }}</h1>
        <p class="p-sub">近20年喜欢的动漫作品</p>
        <div class="p-rule" aria-hidden="true"></div>

        <div class="p-grid">
          <figure v-for="row in rows" :key="row.year" class="p-cell">
            <div class="p-cover">
              <img v-if="row.cover" :src="row.cover" alt="" />
              <span v-else class="p-cover-fallback" aria-hidden="true">{{ row.initial }}</span>
            </div>
            <figcaption
              class="p-title"
              :style="{ fontSize: `${titleSize(row.title)}px` }"
            >
              {{ row.title }}
            </figcaption>
            <span class="p-year" :class="row.tone">{{ row.year }}</span>
          </figure>
        </div>

        <div class="p-foot">
          <span>{{ items.length }} 部 · 37 年</span>
          <span class="p-source">封面与数据：AniList · bangumi-data</span>
          <span>二十年番单</span>
        </div>
      </div>

      <div class="p-ghost" aria-hidden="true">20</div>
    </div>
  </div>
</template>

<style scoped>
.poster {
  position: relative;
  width: 1440px;
  height: auto;
  padding: 36px;
  overflow: hidden;
  background:
    linear-gradient(180deg, #eef2ff 0%, #f7fafc 52%, #fdf2f8 100%);
  color: #f7fafc;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
}

.p-scene {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.p-orb {
  position: absolute;
  top: 90px;
  right: 110px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 32%,
    rgba(255, 255, 255, 0.95),
    rgba(165, 180, 252, 0.38) 58%,
    rgba(165, 180, 252, 0) 72%
  );
  filter: blur(1px);
}

.p-silhouette {
  position: absolute;
  bottom: -140px;
  border-radius: 50% 50% 0 0 / 82% 82% 0 0;
  background: rgba(74, 85, 104, 0.1);
}

.p-s1 {
  left: -90px;
  width: 560px;
  height: 680px;
}

.p-s2 {
  right: -80px;
  width: 460px;
  height: 560px;
  background: rgba(236, 72, 153, 0.08);
}

.p-s3 {
  left: 400px;
  width: 260px;
  height: 340px;
  background: rgba(99, 102, 241, 0.1);
}

.p-panel {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background:
    radial-gradient(800px 420px at 100% 0%, rgba(99, 102, 241, 0.22), transparent 62%),
    radial-gradient(600px 360px at 0% 100%, rgba(236, 72, 153, 0.12), transparent 65%),
    rgba(26, 32, 44, 0.94);
  box-shadow: 0 30px 80px -40px rgba(26, 32, 44, 0.65);
}

.p-panel::before,
.p-panel::after {
  position: absolute;
  width: 26px;
  height: 26px;
  border-color: rgba(165, 180, 252, 0.55);
  border-style: solid;
  border-width: 0;
  content: "";
  pointer-events: none;
}

.p-panel::before {
  top: 16px;
  left: 16px;
  border-top-width: 2px;
  border-left-width: 2px;
  border-top-left-radius: 3px;
}

.p-panel::after {
  right: 16px;
  bottom: 16px;
  border-right-width: 2px;
  border-bottom-width: 2px;
  border-bottom-right-radius: 3px;
}

.p-plate {
  position: absolute;
  z-index: 3;
  top: -16px;
  left: 44px;
  display: inline-flex;
  align-items: center;
  padding: 4px 16px;
  border-radius: 4px;
  background: #4f46e5;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.5;
  box-shadow: 0 8px 18px -10px rgba(79, 70, 229, 0.7);
}

.p-body {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  padding: 48px 52px 40px;
}

.p-topline {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  color: rgba(247, 250, 252, 0.58);
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 20px;
  letter-spacing: 0.02em;
  line-height: 1.5;
}

.p-name {
  max-width: 1180px;
  margin: 32px 0 0;
  color: #ffffff;
  font-family: "Noto Serif SC", "Songti SC", "Source Han Serif SC", "SimSun", serif;
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: 0.02em;
}

.p-sub {
  margin: 16px 0 0;
  color: rgba(247, 250, 252, 0.72);
  font-family: "Noto Serif SC", "Songti SC", "Source Han Serif SC", "SimSun", serif;
  font-size: 28px;
  line-height: 1.6;
  letter-spacing: 0.06em;
}

.p-rule {
  flex: none;
  height: 2px;
  margin-top: 26px;
  background: linear-gradient(
    to right,
    #818cf8 0,
    #818cf8 150px,
    rgba(255, 255, 255, 0.14) 150px,
    rgba(255, 255, 255, 0.14) 100%
  );
}

.p-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-content: start;
  column-gap: 16px;
  row-gap: 26px;
  margin-top: 28px;
}

.p-cell {
  display: flex;
  position: relative;
  flex-direction: column;
  min-width: 0;
}

.p-year {
  margin-top: 4px;
  color: #a5b4fc;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 17px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  line-height: 1.5;
}

.p-year.tone-indigo {
  color: #a5b4fc;
}

.p-year.tone-pink {
  color: #f9a8d4;
}

.p-year.tone-emerald {
  color: #6ee7b7;
}

.p-cover {
  position: relative;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 16px 26px -22px rgba(0, 0, 0, 0.8);
}

.p-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.p-cover-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, rgba(99, 102, 241, 0.3), rgba(26, 32, 44, 0.4));
  color: rgba(199, 210, 254, 0.7);
  font-family: "Noto Serif SC", "Songti SC", "Source Han Serif SC", "SimSun", serif;
  font-size: 48px;
  font-weight: 500;
}

.p-title {
  display: -webkit-box;
  overflow: hidden;
  min-height: 2.8em;
  margin-top: 8px;
  color: #f7fafc;
  font-family: "Noto Serif SC", "Songti SC", "Source Han Serif SC", "SimSun", serif;
  font-weight: 500;
  line-height: 1.4;
  text-overflow: ellipsis;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.p-foot {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 30px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  color: rgba(247, 250, 252, 0.52);
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 18px;
  letter-spacing: 0.02em;
}

.p-source {
  font-size: 12px;
  letter-spacing: 0.02em;
  text-align: center;
}

.p-ghost {
  position: absolute;
  z-index: 1;
  right: -8px;
  bottom: 10px;
  color: rgba(255, 255, 255, 0.035);
  font-family: "Noto Serif SC", "Songti SC", "Source Han Serif SC", "SimSun", serif;
  font-size: 500px;
  font-weight: 600;
  line-height: 0.75;
  pointer-events: none;
}
</style>
