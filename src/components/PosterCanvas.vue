<script setup>
import { computed, ref } from 'vue';
import { displayTitle, nameFontSize, posterTitleFontSize } from '../utils/anime.js';

const props = defineProps({
  nickname: { type: String, default: '' },
  items: { type: Array, default: () => [] },
});

const root = ref(null);
defineExpose({ getNode: () => root.value });

const rows = computed(() =>
  props.items.map(({ year, anime }) => ({ year, title: displayTitle(anime) })),
);
const sizedName = computed(() => nameFontSize(props.nickname));

function titleSize(title) {
  return posterTitleFontSize(title);
}

function decadeTone(year) {
  if (year < 2000) return 'tone-indigo';
  if (year < 2010) return 'tone-pink';
  if (year < 2020) return 'tone-emerald';
  return 'tone-indigo';
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

        <ol class="p-list">
          <li v-for="(row, index) in rows" :key="row.year" class="p-row">
            <span class="p-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="p-year" :class="decadeTone(row.year)">{{ row.year }}</span>
            <span
              class="p-title"
              :class="{ long: Array.from(row.title).length > 28 }"
              :style="{ fontSize: `${titleSize(row.title)}px` }"
            >
              {{ row.title }}
            </span>
          </li>
        </ol>

        <div class="p-foot">
          <span>20 部 · 37 年</span>
          <span class="p-source">数据：AniList · bangumi-data</span>
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
  width: 1080px;
  height: 1920px;
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
  position: absolute;
  top: 44px;
  right: 44px;
  bottom: 44px;
  left: 44px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background:
    radial-gradient(720px 380px at 100% 0%, rgba(99, 102, 241, 0.22), transparent 62%),
    radial-gradient(520px 320px at 0% 100%, rgba(236, 72, 153, 0.12), transparent 65%),
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
  top: -14px;
  left: 40px;
  display: inline-flex;
  align-items: center;
  padding: 4px 14px;
  border-radius: 4px;
  background: #4f46e5;
  color: #ffffff;
  font-size: 13px;
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
  height: 100%;
  padding: 62px 64px 56px;
}

.p-topline {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  color: rgba(247, 250, 252, 0.58);
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 17px;
  letter-spacing: 0.02em;
  line-height: 1.5;
}

.p-name {
  max-width: 820px;
  margin: 46px 0 0;
  color: #ffffff;
  font-family: "Noto Serif SC", "Songti SC", "Source Han Serif SC", "SimSun", serif;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.p-sub {
  margin: 18px 0 0;
  color: rgba(247, 250, 252, 0.72);
  font-family: "Noto Serif SC", "Songti SC", "Source Han Serif SC", "SimSun", serif;
  font-size: 25px;
  line-height: 1.6;
  letter-spacing: 0.06em;
}

.p-rule {
  flex: none;
  height: 2px;
  margin-top: 30px;
  background: linear-gradient(
    to right,
    #818cf8 0,
    #818cf8 128px,
    rgba(255, 255, 255, 0.14) 128px,
    rgba(255, 255, 255, 0.14) 100%
  );
}

.p-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  margin: 22px 0 12px;
  padding: 0;
  list-style: none;
}

.p-row {
  display: grid;
  flex: 1;
  grid-template-columns: 48px 92px minmax(0, 1fr);
  align-items: center;
  column-gap: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.p-row:first-child {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.p-index {
  color: rgba(247, 250, 252, 0.32);
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.p-year {
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 25px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
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

.p-title {
  overflow: hidden;
  color: #f7fafc;
  font-family: "Noto Serif SC", "Songti SC", "Source Han Serif SC", "SimSun", serif;
  font-size: 30px;
  font-weight: 500;
  line-height: 1.25;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.p-title.long {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.3;
  white-space: normal;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.p-foot {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  color: rgba(247, 250, 252, 0.52);
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 15px;
  letter-spacing: 0.02em;
}

.p-source {
  font-size: 11px;
  letter-spacing: 0.02em;
  text-align: center;
}

.p-ghost {
  position: absolute;
  z-index: 1;
  right: -8px;
  bottom: 10px;
  color: rgba(255, 255, 255, 0.04);
  font-family: "Noto Serif SC", "Songti SC", "Source Han Serif SC", "SimSun", serif;
  font-size: 420px;
  font-weight: 600;
  line-height: 0.75;
  pointer-events: none;
}
</style>
