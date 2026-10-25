import { reactive } from 'vue';

export const confirmState = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  tone: 'default',
});

let resolveCurrent = null;

export function askConfirm(options = {}) {
  Object.assign(confirmState, {
    open: true,
    title: '确认操作',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
    tone: 'default',
    ...options,
  });
  return new Promise((resolve) => {
    resolveCurrent = resolve;
  });
}

export function settleConfirm(value) {
  confirmState.open = false;
  const resolve = resolveCurrent;
  resolveCurrent = null;
  if (resolve) resolve(value);
}
