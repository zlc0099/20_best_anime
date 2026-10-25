import { reactive } from 'vue';

export const toastState = reactive({
  visible: false,
  message: '',
  actionLabel: '',
  action: null,
  id: 0,
});

let hideTimer = null;

export function showToast(message, options = {}) {
  const { actionLabel = '', action = null, duration = 2800 } = options;
  if (hideTimer) window.clearTimeout(hideTimer);
  Object.assign(toastState, {
    visible: true,
    message,
    actionLabel,
    action,
    id: toastState.id + 1,
  });
  hideTimer = window.setTimeout(() => {
    toastState.visible = false;
    toastState.action = null;
  }, action ? Math.max(duration, 4600) : duration);
}

export function hideToast() {
  if (hideTimer) window.clearTimeout(hideTimer);
  toastState.visible = false;
  toastState.action = null;
}

export function runToastAction() {
  const action = toastState.action;
  hideToast();
  if (typeof action === 'function') action();
}
