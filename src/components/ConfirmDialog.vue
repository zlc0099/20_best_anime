<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { confirmState, settleConfirm } from '../composables/useConfirm.js';

const cancelButton = ref(null);

function handleKeydown(event) {
  if (!confirmState.open) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    settleConfirm(false);
  }
}

watch(
  () => confirmState.open,
  (open) => {
    if (open) nextTick(() => cancelButton.value?.focus());
  },
);

onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="confirmState.open"
        class="dialog-backdrop"
        @click.self="settleConfirm(false)"
      >
        <div
          class="dialog vn-dark"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
        >
          <span class="vn-plate plate-pink">确认</span>
          <h2 id="confirm-title">{{ confirmState.title }}</h2>
          <p id="confirm-message">{{ confirmState.message }}</p>
          <div class="dialog-actions">
            <button
              ref="cancelButton"
              class="btn btn-glass"
              type="button"
              @click="settleConfirm(false)"
            >
              {{ confirmState.cancelText }}
            </button>
            <button
              class="btn"
              :class="confirmState.tone === 'danger' ? 'btn-danger' : 'btn-primary'"
              type="button"
              @click="settleConfirm(true)"
            >
              {{ confirmState.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
