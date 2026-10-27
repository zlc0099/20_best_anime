<script setup>
import { computed, ref, watch } from 'vue';
import { MAX_NAME_LENGTH } from '../composables/useDraft.js';

const props = defineProps({
  initialNickname: { type: String, default: '' },
  hasDraft: { type: Boolean, default: false },
});
const emit = defineEmits(['start', 'reset', 'random-start']);

const nickname = ref(props.initialNickname || '');
const count = computed(() => Array.from(nickname.value).length);
const trimmed = computed(() => nickname.value.trim());
const randomCounts = [10, 15, 20];
const randomCount = ref(15);

watch(
  () => props.initialNickname,
  (value) => {
    nickname.value = value || '';
  },
);

function handleInput(event) {
  const limited = Array.from(event.target.value).slice(0, MAX_NAME_LENGTH).join('');
  nickname.value = limited;
  if (event.target.value !== limited) event.target.value = limited;
}

function submit() {
  if (!trimmed.value) return;
  emit('start', trimmed.value);
}

function randomStart() {
  if (!trimmed.value) return;
  emit('random-start', trimmed.value, randomCount.value);
}
</script>

<template>
  <section class="intro">
    <div class="intro-main">
      <span class="vn-badge plate-indigo">序章</span>

      <h1>从三十七年里，<br />挑出你的<span class="accent">二十年</span>。</h1>

      <p class="lede">
        1990 到 2026，选 10–20 年，每年只留一部。像读一本只属于你的视觉小说，把散落在时间里的喜欢，排成一张番单。
      </p>

      <form class="nickname-form vn-card" @submit.prevent="submit">
        <span class="vn-plate plate-indigo">新建存档</span>

        <div class="nickname-head">
          <label for="nickname">你的昵称</label>
          <span>{{ count }} / {{ MAX_NAME_LENGTH }}</span>
        </div>

        <div class="nickname-row">
          <input
            id="nickname"
            :value="nickname"
            class="nickname-input"
            type="text"
            maxlength="12"
            autocomplete="nickname"
            placeholder="输入你的昵称"
            aria-describedby="nickname-hint"
            @input="handleInput"
          />
        </div>

        <div class="hint-row">
          <p id="nickname-hint" class="hint">
            会写在海报上：{{ trimmed || '你的昵称' }}近20年喜欢的动漫作品
          </p>
          <button v-if="hasDraft" class="text-link" type="button" @click="emit('reset')">
            清空上次记录
          </button>
        </div>

        <div class="mode-picker">
          <div class="mode-heading">
            <span>选择填写方式</span>
            <small>昵称填好后即可开始</small>
          </div>

          <div class="mode-grid">
            <div class="mode-option">
              <div class="mode-copy">
                <b>自选年份</b>
                <span>从 37 年里挑 10–20 年，逐格选择</span>
              </div>
              <button
                class="btn btn-primary mode-btn"
                type="submit"
                :disabled="!trimmed"
              >
                自选年份
                <span class="btn-arrow" aria-hidden="true">›</span>
              </button>
            </div>

            <div class="mode-option">
              <div class="mode-copy">
                <b>随机年份</b>
                <span>随机抽 10 / 15 / 20 年，直接进入选动画</span>
              </div>
              <div class="mode-random-controls">
                <div class="seg mode-seg" role="group" aria-label="随机年份数量">
                  <button
                    v-for="n in randomCounts"
                    :key="n"
                    type="button"
                    :class="{ active: randomCount === n }"
                    @click="randomCount = n"
                  >
                    {{ n }} 年
                  </button>
                </div>
                <button
                  class="btn btn-primary mode-btn"
                  type="button"
                  :disabled="!trimmed"
                  @click="randomStart"
                >
                  随机开始
                  <span class="btn-arrow" aria-hidden="true">›</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>

    <aside class="intro-aside">
      <div class="info-card vn-card">
        <span class="vn-plate plate-pink">档案</span>

        <ul class="info-list">
          <li><span>时间跨度</span><b>1990 — 2026</b></li>
          <li><span>可选年份</span><b>37 年</b></li>
          <li><span>每年候选</span><b>热度前 20</b></li>
          <li><span>选择数量</span><b>10–20 年</b></li>
        </ul>

        <div class="decade-lines">
          <div class="decade-line">
            <i class="dot dot-indigo" aria-hidden="true"></i><b>1990s</b><span>录像带</span>
          </div>
          <div class="decade-line">
            <i class="dot dot-pink" aria-hidden="true"></i><b>2000s</b><span>DVD</span>
          </div>
          <div class="decade-line">
            <i class="dot dot-emerald" aria-hidden="true"></i><b>2010s</b><span>流媒体</span>
          </div>
          <div class="decade-line">
            <i class="dot dot-indigo" aria-hidden="true"></i><b>2020s</b><span>现在</span>
          </div>
        </div>
      </div>

      <div class="vn-dialogue vn-dark">
        <span class="vn-plate plate-emerald">旁白</span>
        <p>“喜欢是私人的编年史。<br />把还记得的那一部，放回它出现的年份里。”</p>
        <span class="dialogue-hint">慢慢填，不着急。</span>
      </div>
    </aside>
  </section>
</template>
