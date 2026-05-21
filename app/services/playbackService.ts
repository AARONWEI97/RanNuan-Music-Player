import TrackPlayer, { Event, State } from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_REMOTE_ACTION_KEY = 'pending_remote_action';

/**
 * TrackPlayer 后台播放服务
 *
 * ★★★ 新架构：切歌完全由原生队列自动处理 ★★★
 * - 不再监听 PlaybackState.Ended 做自动切歌
 * - 不再使用 AsyncStorage 跨上下文通信
 * - RemoteNext/RemotePrev 直接调用原生 skipToNext/skipToPrevious
 * - 原生队列有下一首时，skipToNext() 零延迟生效
 * - 原生队列无下一首时，歌曲结束后进入 Ended 状态，主 app 恢复后 JS fallback 处理
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
  // ★ 队列结构是 [current, next]，没有 previous track
  // 直接写入 pending action，主 app 恢复后处理
  // 不调用 skipToPrevious()——它不会抛异常，而是跳到当前歌曲开头重新缓冲
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log('[PB] RemotePrevious → 写入 pending_prev');
    try {
      await AsyncStorage.setItem(PENDING_REMOTE_ACTION_KEY, JSON.stringify({
        action: 'prev',
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error('[PB] 写入 pending_prev 失败:', e);
    }
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

  // ========== PlaybackState（仅日志）==========
  // ★ 不再处理 State.Ended — 切歌由原生队列自动完成
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
  return new Promise(() => {});
};
