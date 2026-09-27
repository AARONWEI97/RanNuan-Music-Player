import TrackPlayer, { Event, State } from 'react-native-track-player';

import { ensureNativeQueue, playRemotePrevious } from './queueKeeper';

/**
 * TrackPlayer 后台播放服务
 *
 * 锁屏后主界面 JS 会冻结。这里继续把「下下首」补进原生队列，
 * 歌曲已经结束但队列刚补上时，负责 skip 续播。
 * 「上一首」和主界面共用 playRemotePrevious，跨上下文只切一次。
 */

// ★ 使用 global 标志防止热更新后重复注册
const _g = global as any;
if (!_g.__PB_LISTENERS_REGISTERED) _g.__PB_LISTENERS_REGISTERED = false;

export const PlaybackService = async function (): Promise<void> {
  // 这个函数只在 headless 上下文里被原生调用。主 bundle import 它不会走到这里。
  (global as any).__PB_HEADLESS = true;
  console.log('[PB] PlaybackService 初始化');

  if (_g.__PB_LISTENERS_REGISTERED) {
    console.log('[PB] 监听已注册，跳过');
    return new Promise<void>(() => {});
  }
  _g.__PB_LISTENERS_REGISTERED = true;

  // ========== RemotePlay ==========
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log('[PB] RemotePlay');
    try {
      await TrackPlayer.play();
    } catch (e) {
      console.error('[PB] RemotePlay 错误:', e);
    }
  });

  // ========== RemotePause ==========
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log('[PB] RemotePause');
    try {
      await TrackPlayer.pause();
    } catch (e) {
      console.error('[PB] RemotePause 错误:', e);
    }
  });

  // ========== RemoteNext ==========
  // ★ 已迁移到 trackPlayerService.ts，由 setOnManualNext 回调处理 fallback
  // 此处不再重复注册，避免两个 handler 同时 skipToNext 造成竞态

  // ========== RemotePrevious ==========
  // 与主界面监听器都会收到事件。playRemotePrevious 内部去重，避免亮屏连跳两首。
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('[PB] RemotePrevious');
    playRemotePrevious().catch((e) => console.error('[PB] RemotePrevious 失败:', e));
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
  // 锁屏时主界面 JS 会被冻住。队列里没有下一首时，在这里补队并续播。
  let lastPbState: State | null = null;
  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    if (state !== lastPbState) {
      const stateName = Object.entries(State).find(([, v]) => v === state)?.[0] || String(state);
      console.log(`[PB] PlaybackState: ${stateName}`);
      lastPbState = state;
    }
    if (state === State.Ended) {
      ensureNativeQueue('pb-ended').catch(() => {});
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, () => {
    ensureNativeQueue('pb-active').catch(() => {});
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    ensureNativeQueue('pb-queue-ended').catch(() => {});
  });

  let lastEnsureAt = 0;
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, () => {
    const now = Date.now();
    if (now - lastEnsureAt < 8000) return;
    lastEnsureAt = now;
    ensureNativeQueue('pb-progress').catch(() => {});
  });

  // ========== PlaybackError ==========
  TrackPlayer.addEventListener(Event.PlaybackError, ({ message }) => {
    console.error('[PB] PlaybackError:', message);
  });

  console.log('[PB] ★ PlaybackService 事件监听注册完成 ★');

  // ★ 关键：返回永不 resolve 的 Promise，保持服务存活
  return new Promise<void>(() => {});
};
