import TrackPlayer, { Event, State } from 'react-native-track-player';

/**
 * TrackPlayer 后台播放服务
 *
 * ★ 在 Android 上，此服务运行在独立的 headless JS 上下文
 * ★ zustand store 在这里是独立实例，无法与主 app 共享状态
 * ★ 因此只使用 TrackPlayer 原生方法，不操作 zustand
 *
 * ★★★ 关键设计：Remote 事件直接调用 TrackPlayer 原生方法 ★★★
 * 不依赖主 app 的 JS 回调，确保通知栏/锁屏/灵动岛按钮
 * 在 app 后台时也能正常响应。
 *
 * ★★★ 性能关键：所有 Remote 处理器必须「零延迟」★★★
 * - 不做 getPlaybackState() 预检查（bridge 调用 200-500ms）
 * - 不做 setTimeout 安全验证（800ms+ 延迟）
 * - 直接调用原生方法，让原生层处理幂等性
 * - TrackPlayer.play()/pause() 本身就是幂等的，重复调用无副作用
 */

// ★ 使用 global 标志防止热更新后重复注册
const _g = global as any;
if (!_g.__PB_LISTENERS_REGISTERED) _g.__PB_LISTENERS_REGISTERED = false;

export const PlaybackService = async function () {
  console.log('[PB] PlaybackService 初始化');

  if (_g.__PB_LISTENERS_REGISTERED) {
    console.log('[PB] 监听已注册，跳过');
    return new Promise(() => {});
  }
  _g.__PB_LISTENERS_REGISTERED = true;

  // ========== RemotePlay ==========
  // ★★★ 性能关键：直接调用 play()，不做任何预检查 ★★★
  // - 移除 getPlaybackState() 预检查：省 200-500ms bridge 延迟
  // - 移除 800ms 安全验证：省 800ms+ 等待
  // - play() 本身是幂等的，已在播放时调用无副作用
  // - 无 track 时 play() 会安全失败（catch 兜底）
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log('[PB] RemotePlay');
    try {
      await TrackPlayer.play();
      console.log('[PB] play 完成');
    } catch (e) {
      console.error('[PB] RemotePlay 错误:', e);
    }
  });

  // ========== RemotePause ==========
  // ★★★ 性能关键：直接调用 pause()，不做预检查 ★★★
  // - pause() 本身幂等，已暂停时调用无副作用
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log('[PB] RemotePause');
    try {
      await TrackPlayer.pause();
      console.log('[PB] pause 完成');
    } catch (e) {
      console.error('[PB] RemotePause 错误:', e);
    }
  });

  // ========== RemoteNext ==========
  // ★ 主 app 的 trackPlayerService 回调已完整处理切歌逻辑
  // ★ headless 不应调用 skipToNext() — 队列只有 1 首单曲，
  //    skipToNext 必然失败且会导致 PlaybackState → Paused，
  //    打断主 app 正在进行中的 URL 解析，造成"锁屏切歌不动"的问题
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log('[PB] RemoteNext - 由主 app 处理');
  });

  // ========== RemotePrevious ==========
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('[PB] RemotePrevious - 由主 app 处理');
  });

  // ========== RemoteSeek ==========
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
    TrackPlayer.seekTo(position);
  });

  // ========== RemoteStop ==========
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.reset();
  });

  // ========== RemoteDuck ==========
  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ paused }) => {
    if (paused) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  });

  // ========== PlaybackState ==========
  // ★ 精简日志：只在关键状态变化时输出
  let lastPbState: State | null = null;
  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    if (state !== lastPbState) {
      const stateName = Object.entries(State).find(([, v]) => v === state)?.[0] || String(state);
      console.log(`[PB] PlaybackState: ${stateName}`);
      lastPbState = state;
    }
  });

  // ========== PlaybackError ==========
  TrackPlayer.addEventListener(Event.PlaybackError, ({ message }) => {
    console.error('[PB] PlaybackError:', message);
  });

  console.log('[PB] ★ PlaybackService 事件监听注册完成 ★');

  // ★ 关键：返回永不 resolve 的 Promise，保持服务存活
  // 如果 Promise resolve 了，Android 可能会停止 headless JS 任务
  return new Promise(() => {});
};
