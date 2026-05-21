import { Platform } from 'react-native';
import TrackPlayer, {
  Event,
  Capability,
  State,
  AppKilledPlaybackBehavior,
  type Track,
} from 'react-native-track-player';
import type { SongResult } from '../types';

type ProgressUpdate = {
  position: number;
  duration: number;
  isPlaying: boolean;
};

type ActiveTrackChangedEvent = {
  track: Track | null;
  index: number | undefined;
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
let onActiveTrackChangedCallback: ((event: ActiveTrackChangedEvent) => void) | null = null;
// ★ RemotePrevious 回调：通知 JS 层处理上一首（队列中没有 previous track）
let onRemotePrevCallback: (() => void) | null = null;
// ★ ManualNext 回调：skipToNext 无可用 queue next 时的 JS fallback
let onManualNextCallback: (() => void) | null = null;

let playGeneration = 0;
let lastActiveTrackId: string | null = null;
let setupPromise: Promise<void> | null = null;
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

export function setOnActiveTrackChanged(callback: ((event: ActiveTrackChangedEvent) => void) | null) {
  console.log('[TP] setOnActiveTrackChanged:', callback ? '设置回调' : '清除回调');
  onActiveTrackChangedCallback = callback;
}

export function setOnRemotePrev(callback: (() => void) | null) {
  console.log('[TP] setOnRemotePrev:', callback ? '设置回调' : '清除回调');
  onRemotePrevCallback = callback;
}

export function setOnManualNext(callback: (() => void) | null) {
  console.log('[TP] setOnManualNext:', callback ? '设置回调' : '清除回调');
  onManualNextCallback = callback;
}

// ==================== 播放结束检测（简化版，仅作 fallback）====================
// ★ 新架构：原生队列自动切歌，Ended 事件仅在队列无下一首时触发
// 不再需要互斥锁、轮询检测等复杂机制
if (!_g.__TP_IS_HANDLING_END) _g.__TP_IS_HANDLING_END = false;
let handlingEndTimer: ReturnType<typeof setTimeout> | null = null;

function triggerPlaybackEnd(source: string) {
  if (_g.__TP_IS_HANDLING_END) {
    console.log(`[TP] 播放结束回调正在执行中，忽略来自 ${source} 的重复触发`);
    return;
  }
  _g.__TP_IS_HANDLING_END = true;
  console.log(`[TP] ★★★ 播放结束触发 (来源: ${source}) — 队列无下一首，JS fallback ★★★`);
  onPlaybackEndCallback?.();

  // ★ 60秒兜底超时
  if (handlingEndTimer) clearTimeout(handlingEndTimer);
  handlingEndTimer = setTimeout(() => {
    _g.__TP_IS_HANDLING_END = false;
    handlingEndTimer = null;
    console.log('[TP] isHandlingEnd 安全超时重置（异常兜底）');
  }, 60000);
}

/** 新歌曲开始播放时，重置播放结束检测状态 */
function resetPlaybackEndState() {
  _g.__TP_IS_HANDLING_END = false;
  if (handlingEndTimer) {
    clearTimeout(handlingEndTimer);
    handlingEndTimer = null;
  }
}

// ==================== 事件监听器 ====================

/**
 * 注册 TrackPlayer 事件监听器（主 app 上下文）
 * ★ 新架构：利用 RNTP 原生队列自动切歌，ActiveTrackChanged 是核心事件
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
  let lastKnownPlayingState = true;
  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    if (state !== lastTpState) {
      const stateName = Object.entries(State).find(([, v]) => v === state)?.[0] || String(state);
      console.log(`[TP] PlaybackState: ${stateName}`);
      lastTpState = state;
    }

    if (state === State.Ended) {
      // ★ Fallback：队列无下一首时才触发 JS 层处理
      triggerPlaybackEnd('PlaybackState.Ended');
    } else if (state === State.Loading || state === State.Playing) {
      resetPlaybackEndState();
    }

    lastKnownPlayingState = state === State.Playing;

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
    onProgressUpdateCallback?.({ position, duration, isPlaying: lastKnownPlayingState });
  });

  // ========== ActiveTrackChanged ==========
  // ★★★ 新架构核心事件：原生队列自动切歌后触发 ★★★
  // 当原生层自动播放队列中的下一首时，此事件触发
  // JS 层只需同步 zustand 状态 + 预加载下下首
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async ({ track, index }) => {
    console.log(`[TP] ActiveTrackChanged: index=${index}, track=${track ? track.title : 'null'}`);

    if (!track || index === undefined || index < 0) {
      // track 为空：队列被清空（reset/load 时会短暂触发），忽略
      return;
    }

    // ★ 去重：同一首歌的 ActiveTrackChanged 可能触发多次（reset+add+play 流程）
    if (track.id === lastActiveTrackId) {
      console.log(`[TP] ActiveTrackChanged 去重: "${track.title}" 已处理，跳过`);
      return;
    }
    lastActiveTrackId = track.id;

    // ★ 不在 ActiveTrackChanged 里异步清理队列 — 避免竞态风险
    // addNextToQueue 在添加前会基于 getActiveTrack() 位置自行管理
    // 只在 playSong(reset) 时清空整个队列

    // 通知 usePlayer 同步 zustand 状态 + 预加载下一首
    onActiveTrackChangedCallback?.({ track, index });
  });

  // ========== PlaybackError ==========
  let lastPlaybackErrorTime = 0;
  TrackPlayer.addEventListener(Event.PlaybackError, ({ message }) => {
    console.error('[TP] PlaybackError:', message);
    const now = Date.now();
    if (now - lastPlaybackErrorTime < 5000) {
      console.log('[TP] PlaybackError 防抖：距上次错误不足 5 秒，跳过 reload');
      return;
    }
    lastPlaybackErrorTime = now;
    if (onReloadAndPlayCallback) {
      console.log('[TP] PlaybackError → 触发 onReloadAndPlay 恢复');
      setTimeout(() => onReloadAndPlayCallback?.(), 500);
    }
  });

  // ========== RemotePlay ==========
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log('[TP-Remote] RemotePlay');
    try {
      await TrackPlayer.play();
    } catch (e) {
      console.error('[TP-Remote] RemotePlay 错误:', e);
    }
  });

  // ========== RemotePause ==========
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log('[TP-Remote] RemotePause');
    try {
      await TrackPlayer.pause();
    } catch (e) {
      console.error('[TP-Remote] RemotePause 错误:', e);
    }
  });

  // ========== RemoteNext ==========
  // ★ skipToNext 在队列中有下一首时零延迟生效
  // ★ 如果队列只剩当前 track（如 prev 后预加载未完成），fallback 到 JS 层手动切歌
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log('[TP-Remote] RemoteNext');
    try {
      const queue = await TrackPlayer.getQueue();
      const activeTrack = await TrackPlayer.getActiveTrack();
      const activeIdx = activeTrack ? queue.findIndex((t: Track) => t.id === activeTrack.id) : -1;

      if (activeIdx >= 0 && activeIdx < queue.length - 1) {
        // 队列有下一首，直接 skip
        await TrackPlayer.skipToNext();
      } else {
        // 队列无下一首（如 prev 后预加载未完成），交给 JS 处理
        console.log('[TP-Remote] 队列无下一首，触发 JS fallback');
        onManualNextCallback?.();
      }
    } catch (e) {
      console.error('[TP-Remote] RemoteNext 错误:', e);
      // 异常时也尝试 JS fallback
      onManualNextCallback?.();
    }
  });

  // ========== RemotePrevious ==========
  // ★ 队列中没有上一首（队列结构是 [current, next]），skipToPrevious 不适用
  // 直接通知 JS 层处理上一首逻辑
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log('[TP-Remote] RemotePrevious → 通知 JS 层处理');
    onRemotePrevCallback?.();
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

  // ★ 不再需要 endPolling — 原生队列自动处理切歌
  // PlaybackState.Ended 只在队列无下一首时触发（fallback）
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
        await TrackPlayer.setupPlayer({
          minBuffer: 30,
          maxBuffer: 120,
          backBuffer: 30,
        });
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
        color: 0x023c69,
        android: {
          appKilledPlaybackBehavior:
            AppKilledPlaybackBehavior.ContinuePlayback,
        },
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

/**
 * ★★★ 新架构核心：playSong 使用 reset()+add()+play() 替代 load() ★★★
 * reset() 清空队列 → add() 加入当前歌曲 → play() 开始播放
 * 这样原生队列里有当前歌曲，后续 addNextToQueue 可以追加下一首
 */
export async function playSong(song: SongResult, url: string): Promise<void> {
  const thisGeneration = ++playGeneration;
  console.log(`[TP] playSong: "${song.name}" (gen=${thisGeneration})`);

  // 新歌播放 → 重置播放结束检测
  resetPlaybackEndState();
  // ★ 清除去重标志，允许新歌触发 ActiveTrackChanged
  lastActiveTrackId = null;

  try {
    const track = songToTrack(song, url);
    await TrackPlayer.reset();
    if (thisGeneration !== playGeneration) return;
    await TrackPlayer.add(track);
    if (thisGeneration !== playGeneration) {
      await TrackPlayer.reset();
      return;
    }
    await TrackPlayer.play();
    console.log(`[TP] playSong 成功: "${song.name}" (gen=${thisGeneration})`);
  } catch (e) {
    console.warn(`[TP] playSong error (gen=${thisGeneration}):`, e);
  }
}

/**
 * ★★★ 新架构核心：将预加载的下一首加入原生队列 ★★★
 * 原生层会在当前歌曲结束后自动播放队列里的下一首
 * 队列始终维持 [current, next] 两个 track
 */
export async function addNextToQueue(song: SongResult, url: string): Promise<void> {
  try {
    // ★ Promise.all 并发请求，减少两次 await 之间的竞态窗口
    const [queue, currentTrack] = await Promise.all([
      TrackPlayer.getQueue(),
      TrackPlayer.getActiveTrack(),
    ]);

    // 找到当前 track 在队列中的位置
    const currentIdx = currentTrack
      ? queue.findIndex(t => t.id === currentTrack.id)
      : 0;

    // ★ LOOP 模式：如果下一首就是当前歌曲（同 ID），跳过添加
    // 队列不需要重复 track，JS fallback (onPlaybackEnd) 会处理循环重播
    const nextTrackId = String(song.id);
    if (currentTrack && nextTrackId === String(currentTrack.id)) {
      console.log(`[TP] addNextToQueue: "${song.name}" 与当前歌曲相同 (LOOP)，跳过`);
      return;
    }

    // ★ 如果新的 next track 已经在队列中，跳过（防止重复 add）
    const alreadyInQueue = queue.some((t, i) => i > currentIdx && t.id === nextTrackId);
    if (alreadyInQueue) {
      console.log(`[TP] addNextToQueue: "${song.name}" 已在队列中，跳过`);
      return;
    }

    // 移除当前播放位置之后的所有旧 track（保持队列只有 [current, next]）
    const indicesToRemove: number[] = [];
    for (let i = currentIdx + 1; i < queue.length; i++) {
      indicesToRemove.push(i);
    }
    if (indicesToRemove.length > 0) {
      await TrackPlayer.remove(indicesToRemove);
    }

    const track = songToTrack(song, url);
    await TrackPlayer.add(track);
    console.log(`[TP] addNextToQueue: "${song.name}" 已加入原生队列`);
  } catch (e) {
    console.warn('[TP] addNextToQueue error:', e);
  }
}

/** 清除原生队列中的"下一首"track（播放模式变更时使用） */
export async function clearNextInQueue(): Promise<void> {
  try {
    const [queue, currentTrack] = await Promise.all([
      TrackPlayer.getQueue(),
      TrackPlayer.getActiveTrack(),
    ]);
    const currentIdx = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : 0;
    const indicesToRemove: number[] = [];
    for (let i = currentIdx + 1; i < queue.length; i++) {
      indicesToRemove.push(i);
    }
    if (indicesToRemove.length > 0) {
      await TrackPlayer.remove(indicesToRemove);
      console.log(`[TP] clearNextInQueue: 移除 ${indicesToRemove.length} 个 next track`);
    }
  } catch (e) {
    console.warn('[TP] clearNextInQueue error:', e);
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
