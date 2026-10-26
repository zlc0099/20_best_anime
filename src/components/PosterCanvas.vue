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
    </div>
  </div>
</template>

<style scoped>
.poster {
  position: relative;
  width: 1440px;
  height: auto;
  padding: 48px;
  overflow: hidden;
  background:
    radial-gradient(900px 620px at 6% -6%, #e4f5ff 0%, transparent 62%),
    radial-gradient(900px 680px at 104% 22%, #e2fbf2 0%, transparent 64%),
    radial-gradient(760px 560px at 52% 108%, #fdeef6 0%, transparent 62%),
    linear-gradient(180deg, #f6fbff 0%, #eaf5fd 100%);
  color: #1b3550;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
}

.p-panel {
  position: relative;
  border: 1px solid #e3eef8;
  border-radius: 32px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(31, 58, 82, 0.12);
}

.p-plate {
  position: absolute;
  z-index: 3;
  top: -19px;
  left: 52px;
  display: inline-flex;
  align-items: center;
  padding: 5px 22px;
  border-radius: 999px;
  background: linear-gradient(180deg, #3f97cb, #226e9b);
  color: #ffffff;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.5;
  box-shadow: 0 8px 18px rgba(31, 58, 82, 0.18);
}

.p-body {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  padding: 56px 56px 42px;
}

.p-topline {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  color: #5c7f99;
  font-family: "Inter", -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei",
    sans-serif;
  font-size: 18px;
  letter-spacing: 0.04em;
  line-height: 1.5;
}

.p-name {
  max-width: 1180px;
  margin: 28px 0 0;
  color: #17395a;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC",
    sans-serif;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.015em;
}

.p-sub {
  margin: 12px 0 0;
  color: #2b4763;
  font-size: 27px;
  line-height: 1.6;
  letter-spacing: 0.02em;
}

.p-rule {
  flex: none;
  width: 100%;
  height: 4px;
  margin-top: 26px;
  border-radius: 2px;
  background: linear-gradient(90deg, #45a7dd 0%, #6fc6a5 58%, rgba(111, 198, 165, 0) 100%);
  opacity: 0.85;
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
  display: inline-flex;
  align-self: flex-start;
  margin-top: 8px;
  padding: 1px 12px;
  border-radius: 999px;
  background: #e6f4ff;
  color: #226b99;
  font-family: "Inter", -apple-system, "Segoe UI", "PingFang SC", sans-serif;
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  line-height: 1.7;
}

.p-year.tone-pink {
  background: #ffe9f1;
  color: #b63e6b;
}

.p-year.tone-emerald {
  background: #e3f7ee;
  color: #2c7f61;
}

.p-year.tone-indigo {
  background: #e6f4ff;
  color: #226b99;
}

.p-cover {
  position: relative;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border: 1px solid #e3eef8;
  border-radius: 12px;
  background: #eef7fd;
  box-shadow: 0 10px 24px rgba(31, 58, 82, 0.12);
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
  background: linear-gradient(160deg, #eff9ff, #d8ecfa);
  color: rgba(42, 127, 180, 0.55);
  font-size: 50px;
  font-weight: 700;
}

.p-title {
  display: -webkit-box;
  overflow: hidden;
  min-height: 2.8em;
  margin-top: 8px;
  color: #17395a;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-weight: 600;
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
  border-top: 1px solid #e6f0f8;
  color: #5c7f99;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 17px;
  letter-spacing: 0.02em;
}

.p-source {
  font-size: 12px;
  letter-spacing: 0.02em;
  text-align: center;
}
</style>
