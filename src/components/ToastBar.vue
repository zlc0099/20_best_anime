<script setup>
import { toastState, runToastAction } from '../composables/useToast.js';
</script>

<template>
  <div class="toast-wrap" aria-live="polite">
    <Transition name="toast">
      <div v-if="toastState.visible" :key="toastState.id" class="toast vn-dark">
        <span class="vn-plate plate-emerald">提示</span>
        <span class="toast-message">{{ toastState.message }}</span>
        <button
          v-if="toastState.actionLabel"
          type="button"
          @click="runToastAction"
        >
          {{ toastState.actionLabel }}
        </button>
      </div>
    </Transition>
  </div>
</template>
