import { Alert } from 'react-native';

interface ToastOptions {
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  buttons?: { text: string; onPress?: () => void }[];
}

export function showToast({ title, message, type = 'info', buttons }: ToastOptions) {
  const buttonConfig = buttons && buttons.length > 0
    ? buttons.map((b) => ({
        text: b.text,
        onPress: b.onPress,
      }))
    : [{ text: 'OK' }];

  Alert.alert(title, message, buttonConfig);
}

export function showConfirm({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '确定',
  cancelText = '取消',
}: {
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}) {
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    { text: confirmText, onPress: onConfirm },
  ]);
}

export function showNetworkError(retry?: () => void) {
  showToast({
    title: '网络错误',
    message: '网络连接失败，请检查网络设置',
    type: 'error',
    buttons: retry ? [{ text: '取消' }, { text: '重试', onPress: retry }] : undefined,
  });
}

export function showPlayError(songName?: string, retry?: () => void) {
  showToast({
    title: '播放失败',
    message: songName ? `"${songName}" 播放失败，请重试` : '播放失败，请重试',
    type: 'error',
    buttons: retry ? [{ text: '取消' }, { text: '重试', onPress: retry }] : undefined,
  });
}

export function showLoginExpired() {
  showToast({
    title: '登录过期',
    message: '登录已过期，请重新登录',
    type: 'warning',
  });
}

export function showDownloadSuccess(songName: string, onViewDownloads?: () => void) {
  showToast({
    title: '下载完成 ✅',
    message: `「${songName}」已保存到本地，详情请去往「我的」页面「下载管理」模块查看`,
    type: 'success',
    buttons: [
      { text: '知道了' },
      ...(onViewDownloads ? [{ text: '查看下载', onPress: onViewDownloads }] : []),
    ],
  });
}

export function showDownloadError(songName: string, onViewDownloads?: () => void) {
  showToast({
    title: '下载失败 ❌',
    message: `「${songName}」下载失败，请检查网络`,
    type: 'error',
    buttons: [
      { text: '知道了' },
      ...(onViewDownloads ? [{ text: '查看下载', onPress: onViewDownloads }] : []),
    ],
  });
}
