import { Platform } from 'react-native';
import TrackPlayer, {
  Event,
  Capability,
  State,
  type Track,
} from 'react-native-track-player';
import type { SongResult } from '../types';

type ProgressUpdate = {
  position: number;
  duration: number;
  isPlaying: boolean;
};

// ==================== 全局持久化标志 ====================
// ★ 热更新会重新执行模块，导致 module-level 变量重置
// 使用 global 对象存储标志，防止事件监听器重复注册
const _g = global as any;
if (!_g.__TP_LISTENERS_REGISTERED) _g.__TP_LISTENERS_REGISTERED = false;
if (!_g.__TP_IS_SETUP) _g.__TP_IS_SETUP = false;

// ==================== 回调注册 ====================
let onPlaybackEndCallback: (() => void) | null = null;
let onProgressUpdateCallback: ((update: ProgressUpdate) => void) | null = null;
let onReloadAndPlayCallback: (() => Promise<void>) | null = null;
let onRemoteNextCallback: (() => void) | null = null;
let onRemotePrevCallback: (() => void) | null = null;
let onRemotePlayCallback: (() => void) | null = null;
let onRemotePauseCallback: (() => void) | null = null;

let playGeneration = 0;
let setupPromise: Promise<void> | null = null;
let endPollTimer: ReturnType<typeof setInterval> | null = null;
let lastKnownPosition = 0;
let lastKnownDuration = 0;

export const isPlayerAvailable = Platform.OS !== 'web';

export function setOnPlaybackEnd(callback: (() => void) | null) {
  console.log('[TP] setOnPlaybackEnd:', callback ? '设置回调' : '清除回调');
  onPlaybackEndCallback = callback;
}

export function setOnProgressUpdate(callback: ((update: ProgressUpdate) => void) | null) {
  onProgressUpdateCallback = callback;
}

export function setOnReloadAndPlay(callback: (() => Promise<void>) | null) {
  console.log('[TP] setOnReloadAndPlay:', callback ? '设置回调' : '清除回调');
  onReloadAndPlayCallback = callback;
}

export function setOnRemoteNext(callback: (() => void) | null) {
  console.log('[TP] setOnRemoteNext:', callback ? '设置回调' : '清除回调');
  onRemoteNextCallback = callback;
}

export function setOnRemotePrev(callback: (() => void) | null) {
  console.log('[TP] setOnRemotePrev:', callback ? '设置回调' : '清除回调');
  onRemotePrevCallback = callback;
}

export function setOnRemotePlay(callback: (() => void) | null) {
  console.log('[TP] setOnRemotePlay:', callback ? '设置回调' : '清除回调');
  onRemotePlayCallback = callback;
}

export function setOnRemotePause(callback: (() => void) | null) {
  console.log('[TP] setOnRemotePause:', callback ? '设置回调' : '清除回调');
  onRemotePauseCallback = callback;
}

// ==================== 播放结束检测 ====================

let isHandlingEnd = false;
let handlingEndTimer: ReturnType<typeof setTimeout> | null = null;

function triggerPlaybackEnd(source: string) {
  if (isHandlingEnd) {
    console.log(`[TP] 播放结束回调正在执行中，忽略来自 ${source} 的重复触发`);
    return;
  }
  isHandlingEnd = true;
  console.log(`[TP] ★★★ 播放结束触发 (来源: ${source}) ★★★`);
  onPlaybackEndCallback?.();

  // ★ 60秒兜底超时 — 正常情况下 resetPlaybackEndState() 会在新 track 加载时立即重置
  // 之前 8s：后台播放时 GDMusic/joox 网络请求可能超过 8s，超时后
  //   isHandlingEnd 提前重置 → 轮询再次触发 triggerPlaybackEnd → 级联切歌
  // 使用 60s 长超时作为异常兜底，正常流程由 resetPlaybackEndState() 驱动
  if (handlingEndTimer) clearTimeout(handlingEndTimer);
  handlingEndTimer = setTimeout(() => {
    isHandlingEnd = false;
    handlingEndTimer = null;
    console.log('[TP] isHandlingEnd 安全超时重置（异常兜底）');
  }, 60000);
}

/** 新歌曲开始播放时，重置播放结束检测状态 */
function resetPlaybackEndState() {
  isHandlingEnd = false;
  if (handlingEndTimer) {
    clearTimeout(handlingEndTimer);
    handlingEndTimer = null;
  }
}

// ==================== 事件监听器 ====================

/**
 * 注册 TrackPlayer 事件监听器（主 app 上下文）
 * ★ 包含 Remote 事件监听 — 这是通知栏/灵动岛/锁屏按钮的主要处理点
 * ★ 使用 global 标志防止热更新后重复注册
 */
function registerEventListeners() {
  if (_g.__TP_LISTENERS_REGISTERED) {
    console.log('[TP] 事件监听已注册，跳过');
    return;
  }
  _g.__TP_LISTENERS_REGISTERED = true;
  console.log('[TP] 注册事件监听器');

  // ========== PlaybackState ==========
  let lastTpState: State | null = null;
  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    // ★ 精简日志：只在状态变化时输出
    if (state !== lastTpState) {
      const stateName = Object.entries(State).find(([, v]) => v === state)?.[0] || String(state);
      console.log(`[TP] PlaybackState: ${stateName}`);
      lastTpState = state;
    }

    if (state === State.Ended) {
      triggerPlaybackEnd('PlaybackState.Ended');
    } else if (state === State.Loading || state === State.Playing) {
      // ★ 新歌曲开始加载/播放 → 重置播放结束检测状态
      // 防止轮询残留的 Ended 状态在新歌播放后再次触发
      resetPlaybackEndState();
    }

    onProgressUpdateCallback?.({
      position: lastKnownPosition,
      duration: lastKnownDuration,
      isPlaying: state === State.Playing,
    });
  });

  // ========== PlaybackProgressUpdated ==========
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, ({ position, duration }) => {
    lastKnownPosition = position;
    lastKnownDuration = duration;
    onProgressUpdateCallback?.({ position, duration, isPlaying: true });
  });

  // ========== ActiveTrackChanged ==========
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, ({ track, index }) => {
    console.log(`[TP] ActiveTrackChanged: index=${index}, track=${track ? track.title : 'null'}`);
    if (!track && index === undefined) {
      triggerPlaybackEnd('ActiveTrackChanged(track=null)');
    }
  });

  // ========== PlaybackError ==========
  TrackPlayer.addEventListener(Event.PlaybackError, ({ message }) => {
    console.error('[TP] PlaybackError:', message);
  });

  // ========== RemotePlay ==========
  // ★★★ PlaybackService 已直接调用 play()（零延迟）★★★
  // 这里只处理「无 track 需要重载」的特殊情况
  // 不做 getPlaybackState() 预检查，避免 bridge 竞争
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log('[TP-Remote] RemotePlay');
    try {
      onRemotePlayCallback?.();
    } catch (e) {
      console.error('[TP-Remote] RemotePlay 错误:', e);
    }
  });

  // ========== RemotePause ==========
  // ★★★ PlaybackService 已直接调用 pause()（零延迟）★★★
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log('[TP-Remote] RemotePause');
    try {
      onRemotePauseCallback?.();
    } catch (e) {
      console.error('[TP-Remote] RemotePause 错误:', e);
    }
  });

  // ========== RemoteNext ==========
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log('[TP-Remote] RemoteNext');
    try {
      if (onRemoteNextCallback) {
        onRemoteNextCallback();
      } else {
        await TrackPlayer.skipToNext();
      }
    } catch (e) {
      console.error('[TP-Remote] RemoteNext 错误:', e);
      try { await TrackPlayer.skipToNext(); } catch {}
    }
  });

  // ========== RemotePrevious ==========
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log('[TP-Remote] RemotePrevious');
    try {
      if (onRemotePrevCallback) {
        onRemotePrevCallback();
      } else {
        await TrackPlayer.skipToPrevious();
      }
    } catch (e) {
      console.error('[TP-Remote] RemotePrevious 错误:', e);
      try { await TrackPlayer.skipToPrevious(); } catch {}
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

  startEndPolling();
}

function startEndPolling() {
  stopEndPolling();
  console.log('[TP] 启动播放结束轮询检测 (5秒间隔)');

  endPollTimer = setInterval(async () => {
    try {
      // ★ 合并为一次 bridge 调用：先 getProgress（轻量），
      // 再根据 progress 判断是否需要 getPlaybackState
      const progress = await TrackPlayer.getProgress();

      // 快速路径：进度未接近结束，不需要检查状态
      if (progress.duration <= 0 || progress.position < progress.duration - 2) {
        return;
      }

      // 进度接近结束，检查播放状态
      const state = await TrackPlayer.getPlaybackState();

      if (state.state === State.Ended) {
        triggerPlaybackEnd('轮询-State.Ended');
        return;
      }

      if (
        progress.position >= progress.duration - 0.5 &&
        state.state !== State.Buffering &&
        state.state !== State.Paused
      ) {
        console.log(`[TP] 轮询检测到播放接近结束: pos=${progress.position.toFixed(1)}, dur=${progress.duration.toFixed(1)}`);
        triggerPlaybackEnd('轮询-position>=duration');
      }
    } catch {}
  }, 5000);
}

function stopEndPolling() {
  if (endPollTimer) {
    clearInterval(endPollTimer);
    endPollTimer = null;
  }
}

// ==================== 播放器生命周期 ====================

export async function setupPlayer(): Promise<void> {
  console.log(`[TP] setupPlayer 调用, isSetup=${_g.__TP_IS_SETUP}`);

  if (_g.__TP_IS_SETUP) {
    registerEventListeners();
    return;
  }

  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    try {
      try {
        await TrackPlayer.setupPlayer();
        console.log('[TP] setupPlayer 成功');
      } catch (setupError: any) {
        if (setupError?.message?.includes('already been initialized')) {
          console.log('[TP] 播放器已初始化，跳过');
        } else {
          console.error('[TP] setupPlayer 错误:', setupError);
          throw setupError;
        }
      }

      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        // ★ 紧凑通知/Now Bar(灵动岛) 显示的按钮
        // 最多3个：上一首 + 播放/暂停 + 下一首
        compactCapabilities: [
          Capability.SkipToPrevious,
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        progressUpdateEventInterval: 1,
        // ★ Android 通知栏主题色（与应用主色 #023c69 一致）
        color: 0x023c69,
      });
      console.log('[TP] updateOptions 完成');

      _g.__TP_IS_SETUP = true;
      registerEventListeners();
      console.log('[TP] 初始化完成');
    } catch (e) {
      console.error('[TP] setup error:', e);
      setupPromise = null;
    }
  })();

  return setupPromise;
}

// ==================== 播放控制 ====================

export function songToTrack(song: SongResult, url: string): Track {
  return {
    id: String(song.id),
    url,
    title: song.name || '未知歌曲',
    artist: song.ar?.map((a: any) => a.name).join(' / ') || '未知歌手',
    album: song.al?.name || '未知专辑',
    artwork: song.picUrl || song.al?.picUrl || undefined,
    duration: (song.duration || song.dt || 0) / 1000,
  };
}

export async function playSong(song: SongResult, url: string): Promise<void> {
  const thisGeneration = ++playGeneration;
  console.log(`[TP] playSong: "${song.name}" (gen=${thisGeneration})`);

  // ★ 新歌播放 → 立即重置播放结束检测，防止级联触发
  resetPlaybackEndState();

  try {
    // ★ 使用 load() 替代 reset()+add()+play()
    // load() 是 RNTP v4 提供的替换单曲 API：
    //   - 不需要 reset，直接替换当前 track
    //   - 自动开始播放（playWhenReady 默认 true）
    //   - 在后台也能正常工作
    //   - 避免了 reset 后需要重新 prepare 的问题
    const track = songToTrack(song, url);
    await TrackPlayer.load(track);
    if (thisGeneration !== playGeneration) {
      await TrackPlayer.reset();
      return;
    }

    // 确保 playWhenReady = true，使播放器准备就绪后自动播放
    await TrackPlayer.setPlayWhenReady(true);
    console.log(`[TP] playSong 成功: "${song.name}" (gen=${thisGeneration})`);
  } catch (e) {
    console.warn(`[TP] playSong error (gen=${thisGeneration}):`, e);
    // 回退方案：如果 load() 失败，尝试 reset+add+play
    try {
      await TrackPlayer.reset();
      if (thisGeneration !== playGeneration) return;
      const track = songToTrack(song, url);
      await TrackPlayer.add(track);
      if (thisGeneration !== playGeneration) {
        await TrackPlayer.reset();
        return;
      }
      await TrackPlayer.play();
      console.log(`[TP] playSong 回退成功: "${song.name}" (gen=${thisGeneration})`);
    } catch (e2) {
      console.warn(`[TP] playSong fallback error (gen=${thisGeneration}):`, e2);
    }
  }
}

export async function togglePlayback(): Promise<void> {
  try {
    const state = await TrackPlayer.getPlaybackState();
    const stateName = Object.entries(State).find(([, v]) => v === state.state)?.[0] || String(state.state);
    console.log(`[TP] togglePlayback, 当前状态: ${stateName}`);

    if (state.state === State.None || state.state === State.Stopped || state.state === State.Ended) {
      console.log('[TP] togglePlayback: 无 track/已停止/已结束，调用 onReloadAndPlay');
      await onReloadAndPlayCallback?.();
      return;
    }

    if (state.state === State.Playing) {
      await TrackPlayer.pause();
      console.log('[TP] → pause');
    } else {
      await TrackPlayer.play();
      console.log('[TP] → play');
    }
  } catch (e) {
    console.warn('[TP] togglePlayback error:', e);
  }
}

export async function seekTo(position: number): Promise<void> {
  try {
    const state = await TrackPlayer.getPlaybackState();
    if (state.state === State.None || state.state === State.Stopped) {
      console.log('[TP] seekTo: 无 track，先调用 onReloadAndPlay');
      await onReloadAndPlayCallback?.();
      await TrackPlayer.seekTo(position);
      return;
    }
    console.log(`[TP] seekTo: ${position}s`);
    await TrackPlayer.seekTo(position);
  } catch (e) {
    console.warn('[TP] seekTo error:', e);
  }
}

export async function setPlaybackRate(rate: number): Promise<void> {
  try { await TrackPlayer.setRate(rate); } catch (e) { console.warn('[TP] setPlaybackRate error:', e); }
}

export async function setVolume(volume: number): Promise<void> {
  try { await TrackPlayer.setVolume(volume); } catch (e) { console.warn('[TP] setVolume error:', e); }
}

export async function skipToNext(): Promise<void> {
  try { await TrackPlayer.skipToNext(); } catch (e) { console.warn('[TP] skipToNext error:', e); }
}

export async function skipToPrevious(): Promise<void> {
  try { await TrackPlayer.skipToPrevious(); } catch (e) { console.warn('[TP] skipToPrevious error:', e); }
}

export async function stopPlayback(): Promise<void> {
  try { await TrackPlayer.reset(); } catch (e) { console.warn('[TP] stopPlayback error:', e); }
}

export async function getPlayerState(): Promise<string | undefined> {
  try {
    const state = await TrackPlayer.getPlaybackState();
    if (state.state === State.Playing) return 'playing';
    if (state.state === State.Paused) return 'paused';
    if (state.state === State.Stopped) return 'stopped';
    if (state.state === State.Buffering) return 'buffering';
    if (state.state === State.Ended) return 'ended';
    return undefined;
  } catch { return undefined; }
}

export async function getCurrentPosition(): Promise<number> {
  try { return await TrackPlayer.getProgress().then(p => p.position); } catch { return 0; }
}

export async function getDuration(): Promise<number> {
  try { return await TrackPlayer.getProgress().then(p => p.duration); } catch { return 0; }
}

export function hasSoundRef(): boolean { return _g.__TP_IS_SETUP; }
