import { useCallback, useEffect } from 'react';
import { Platform, Alert, AppState, type AppStateStatus } from 'react-native';
import TrackPlayer, { State } from 'react-native-track-player';

import { usePlayerStore } from '../store/playerStore';
import { usePlaylistStore } from '../store/playlistStore';
import { useSettingsStore } from '../store/settingsStore';
import { getMusicUrl } from '../api/music';
import { parseMusicUrl } from '../services/musicParserService';
import { getSongLocalUri } from '../services/downloadService';
import {
  playSong as tpPlaySong,
  togglePlayback as tpTogglePlayback,
  seekTo as tpSeekTo,
  setVolume as tpSetVolume,
  setPlaybackRate as tpSetPlaybackRate,
  isPlayerAvailable,
  setupPlayer,
  setOnPlaybackEnd,
  setOnProgressUpdate,
  setOnReloadAndPlay,
  setOnRemoteNext,
  setOnRemotePrev,
  setOnRemotePlay,
  setOnRemotePause,
} from '../services/trackPlayerService';
import { PLAY_MODE_LOOP, PLAY_MODE_SEQUENTIAL } from '../constants/config';
import type { SongResult } from '../types';

const isWeb = Platform.OS === 'web';

// ==================== 全局持久化标志 ====================
// ★ 热更新会重新执行模块，导致 module-level 变量重置
// 使用 global 对象存储标志，防止重复初始化
const _g = global as any;
if (!_g.__PLAYER_INITIALIZED) _g.__PLAYER_INITIALIZED = false;

// ==================== 模块级单例状态 ====================
// ★ 关键：所有播放逻辑的状态都在模块级别
// 多个 usePlayer() 实例共享同一份状态，避免竞态

let playGeneration = 0;
let currentPlayingSongId: number | string | null = null;
let isAutoNext = false;
let isHandlingEnd = false;
let consecutiveFailCount = 0;
const MAX_CONSECUTIVE_FAILS = 5;
let autoNextResetTimer: ReturnType<typeof setTimeout> | null = null;

// 从持久化 store 初始化 currentPlayingSongId
try {
  const saved = usePlayerStore.getState().playMusic;
  currentPlayingSongId = saved?.id ?? null;
} catch {}

/**
 * 核心：播放歌曲（模块级单例）
 * currentPlayingSongId 同步更新，确保 effect 不会重复触发
 */
async function doPlaySong(song: SongResult): Promise<boolean> {
  const thisGeneration = ++playGeneration;
  console.log(`[Player] playSong: "${song.name}" (gen=${thisGeneration})`);

  const playerStore = usePlayerStore.getState();
  const { enableMusicParsing, musicQuality } = useSettingsStore.getState();

  try {
    // ★ 立即暂停旧音频，配合下面的元数据更新实现干净切歌
    // 流程：停旧音频 → 更新通知为新歌 → URL解析(短暂静音) → 加载新音频
    try { await TrackPlayer.pause(); } catch {}

    // ★ 关键：同步更新模块级 ID — 在 store 更新之前
    // 这样 effect 检查时 ID 已经匹配，不会重复调用
    currentPlayingSongId = song.id;

    playerStore.setPlayMusic(song);
    // ★ 立即更新原生通知栏/灵动岛歌曲信息，与应用内 UI 同步
    // pause 后通知暂时静止，此时换上新歌元数据 → 灵动岛不会消失
    TrackPlayer.updateNowPlayingMetadata({
      title: song.name || '未知歌曲',
      artist: song.ar?.map((a: any) => a.name).join(' / ') || '未知歌手',
      artwork: song.picUrl || song.al?.picUrl || undefined,
    }).catch(() => {});

    playerStore.setIsLoading(true);
    playerStore.setPlayMusicUrl('');

    // 优先本地
    const localUri = getSongLocalUri(song.id);
    if (localUri) {
      if (thisGeneration !== playGeneration) return false;
      playerStore.setIsLoading(false);
      playerStore.setPlayMusicUrl(localUri);
      await tpPlaySong(song, localUri);
      isHandlingEnd = false;
      console.log(`[Player] 本地播放成功: "${song.name}"`);
      return true;
    }

    // 在线 URL
    const res = await getMusicUrl(Number(song.id));
    if (thisGeneration !== playGeneration) return false;

    let url = res?.data?.data?.[0]?.url;
    const isTrial = !!res?.data?.data?.[0]?.freeTrialInfo;

    if (isTrial) {
      console.log(`[Player] 试听 URL，尝试音源解析: "${song.name}"`);
      if (enableMusicParsing) {
        const parsedUrl = await parseMusicUrl(song.id, song, musicQuality, true);
        if (parsedUrl) {
          url = parsedUrl;
          console.log(`[Player] 音源解析替换试听 URL 成功`);
        }
        if (thisGeneration !== playGeneration) return false;
      }
    }

    if (!url && enableMusicParsing) {
      console.log(`[Player] 官方 API 无 URL，尝试音源解析: "${song.name}"`);
      const parsedUrl = await parseMusicUrl(song.id, song, musicQuality, true);
      if (parsedUrl) {
        url = parsedUrl;
        console.log(`[Player] 音源解析找到替代 URL`);
      }
      if (thisGeneration !== playGeneration) return false;
    }

    if (!url) {
      if (thisGeneration === playGeneration) {
        playerStore.setIsPlay(false);
        playerStore.setIsLoading(false);
        if (!isAutoNext) {
          Alert.alert('无法播放', `歌曲「${song.name}」暂无可用音源，可能为版权限制`);
        } else {
          console.log(`[Player] 自动下一首: 跳过 "${song.name}"（无URL）`);
        }
      }
      return false;
    }

    if (thisGeneration !== playGeneration) return false;

    playerStore.setIsLoading(false);
    playerStore.setPlayMusicUrl(url);
    await tpPlaySong(song, url);
    // ★ 新歌播放成功 → 重置 isHandlingEnd，允许下次播放结束检测
    isHandlingEnd = false;
    console.log(`[Player] 在线播放成功: "${song.name}"`);
    return true;
  } catch (e) {
    console.error(`[Player] playSong 异常:`, e);
    if (thisGeneration === playGeneration) {
      playerStore.setIsPlay(false);
      playerStore.setIsLoading(false);
    }
    return false;
  }
}

/**
 * 设置 autoNext 标记，带安全自动重置
 */
function setAutoNextFlag() {
  isAutoNext = true;
  if (autoNextResetTimer) clearTimeout(autoNextResetTimer);
  // 8秒后自动重置，防止卡住
  autoNextResetTimer = setTimeout(() => {
    if (isAutoNext) {
      console.log('[Player] isAutoNext 安全重置（超时）');
      isAutoNext = false;
    }
  }, 8000);
}

function clearAutoNextFlag() {
  isAutoNext = false;
  if (autoNextResetTimer) {
    clearTimeout(autoNextResetTimer);
    autoNextResetTimer = null;
  }
}

// 单曲循环重播
async function replayMusic(retryCount = 0): Promise<void> {
  const MAX_REPLAY_RETRIES = 3;
  const currentSong = usePlaylistStore.getState().getCurrentSong();
  if (!currentSong) return;

  console.log(`[Player] 单曲循环重播: "${currentSong.name}" (重试=${retryCount})`);

  try {
    const success = await doPlaySong(currentSong);
    if (!success && retryCount < MAX_REPLAY_RETRIES) {
      setTimeout(() => replayMusic(retryCount + 1), 1000 * (retryCount + 1));
    } else if (!success) {
      console.log('[Player] 单曲循环重试耗尽，跳到下一首');
      doNextPlayOnEnd();
    }
  } catch {
    if (retryCount < MAX_REPLAY_RETRIES) {
      setTimeout(() => replayMusic(retryCount + 1), 1000 * (retryCount + 1));
    } else {
      doNextPlayOnEnd();
    }
  }
}

// 下一首核心逻辑
async function _doNextPlay(retryCount: number = 0, autoEnd: boolean = false): Promise<void> {
  const store = usePlaylistStore.getState();
  const playerCore = usePlayerStore.getState();

  if (store.playList.length === 0) {
    console.log('[Player] _nextPlay: 播放列表为空');
    clearAutoNextFlag();
    return;
  }

  if (retryCount === 0) {
    consecutiveFailCount = 0;
  }

  if (consecutiveFailCount >= MAX_CONSECUTIVE_FAILS) {
    console.error(`[Player] _nextPlay: 连续${MAX_CONSECUTIVE_FAILS}首播放失败，停止`);
    consecutiveFailCount = 0;
    playerCore.setIsPlay(false);
    clearAutoNextFlag();
    return;
  }

  const playMode = usePlaylistStore.getState().playMode;

  if (playMode === PLAY_MODE_SEQUENTIAL && store.playListIndex >= store.playList.length - 1) {
    if (autoEnd) {
      console.log('[Player] _nextPlay: 顺序播放到末尾，停止');
      playerCore.setIsPlay(false);
      clearAutoNextFlag();
    } else {
      console.log('[Player] _nextPlay: 顺序播放到末尾，回到第一首');
      store.setPlayListIndex(0);
      const firstSong = store.getCurrentSong();
      if (firstSong) {
        const success = await doPlaySong(firstSong);
        if (success) {
          consecutiveFailCount = 0;
        }
      }
      clearAutoNextFlag();
    }
    return;
  }

  const nextIndex = (store.playListIndex + 1) % store.playList.length;
  const nextSong = store.playList[nextIndex];
  if (!nextSong) {
    clearAutoNextFlag();
    return;
  }

  console.log(`[Player] _nextPlay: "${nextSong.name}" (${store.playListIndex} -> ${nextIndex}, 重试=${retryCount})`);

  // 先更新索引（doPlaySong 会同步更新 currentPlayingSongId）
  store.setPlayListIndex(nextIndex);

  const success = await doPlaySong(nextSong);

  if (!success) {
    if (retryCount < 1) {
      console.log(`[Player] _nextPlay: 播放失败，1秒后重试`);
      setTimeout(() => _doNextPlay(retryCount + 1, autoEnd), 1000);
      return; // 保持 isAutoNext
    } else {
      consecutiveFailCount++;
      console.log(`[Player] _nextPlay: 重试用尽，连续失败=${consecutiveFailCount}/${MAX_CONSECUTIVE_FAILS}`);
      if (store.playList.length > 1) {
        setTimeout(() => _doNextPlay(0, autoEnd), 500);
        return; // 保持 isAutoNext
      } else {
        playerCore.setIsPlay(false);
        clearAutoNextFlag();
      }
    }
  } else {
    consecutiveFailCount = 0;
  }

  clearAutoNextFlag();
}

function doNextPlayOnEnd() {
  console.log('[Player] nextPlayOnEnd (自动下一首)');
  setAutoNextFlag();
  _doNextPlay(0, true);
}

// 播放结束回调
function onPlaybackEnd() {
  if (isHandlingEnd) {
    return;
  }
  isHandlingEnd = true;
  // ★ 10s 后重置 — 必须大于自动下一首的整个流程时间
  // 流程: triggerPlaybackEnd → onPlaybackEnd → setAutoNext → _doNextPlay →
  //       doPlaySong → getMusicUrl → parseMusicUrl → tpPlaySong
  // 如果超时太短，isHandlingEnd 提前重置，轮询检测到 State.Ended 再次触发
  setTimeout(() => { isHandlingEnd = false; }, 10000);

  console.log('[Player] ★ 音频播放结束，触发自动下一首逻辑 ★');
  const playMode = usePlaylistStore.getState().playMode;

  if (playMode === PLAY_MODE_LOOP) {
    console.log('[Player] 单曲循环模式，重播当前歌曲');
    setAutoNextFlag();
    replayMusic();
    return;
  }

  doNextPlayOnEnd();
}

// 重载并播放（TrackPlayer 无 track 时使用）
async function reloadAndPlay() {
  const store = usePlaylistStore.getState();
  const pStore = usePlayerStore.getState();
  const currentSong = store.getCurrentSong() || pStore.playMusic;
  if (currentSong) {
    console.log(`[Player] reloadAndPlay: 重新加载 "${currentSong.name}"`);
    await doPlaySong(currentSong);
  } else {
    console.log('[Player] reloadAndPlay: 无歌曲可播放');
  }
}

/**
 * 同步 TrackPlayer 实际播放状态到 zustand store
 */
async function syncPlaybackState() {
  try {
    const state = await TrackPlayer.getPlaybackState();
    const isActuallyPlaying = state.state === State.Playing;
    usePlayerStore.getState().setIsPlay(isActuallyPlaying);
  } catch (e) {
    console.warn('[Player] 状态同步失败:', e);
  }
}

/**
 * 初始化播放器（模块级，只执行一次）
 */
async function initializePlayer() {
  if (isWeb || !isPlayerAvailable || _g.__PLAYER_INITIALIZED) return;
  _g.__PLAYER_INITIALIZED = true;

  console.log('[Player] 初始化播放器');

  // 设置播放结束回调
  setOnPlaybackEnd(() => {
    console.log('[Player] onPlaybackEnd 回调触发');
    onPlaybackEnd();
  });

  // 设置进度更新回调
  setOnProgressUpdate((update) => {
    const store = usePlayerStore.getState();
    store.setCurrentProgress(update.position);
    if (update.duration > 0) store.setDuration(update.duration);
    store.setIsPlay(update.isPlaying);
  });

  // 设置重载播放回调
  setOnReloadAndPlay(reloadAndPlay);

  // ★ 设置 Remote 事件回调（通知栏/灵动岛按钮）
  setOnRemoteNext(() => {
    console.log('[Player] RemoteNext 回调触发');
    const store = usePlaylistStore.getState();
    if (store.playList.length === 0) return;
    setAutoNextFlag();
    if (store.playMode === PLAY_MODE_SEQUENTIAL && store.playListIndex >= store.playList.length - 1) {
      store.setPlayListIndex(0);
    } else {
      store.nextPlay();
    }
    const song = usePlaylistStore.getState().getCurrentSong();
    if (song) doPlaySong(song);
  });

  setOnRemotePrev(() => {
    console.log('[Player] RemotePrev 回调触发');
    const store = usePlaylistStore.getState();
    if (store.playList.length === 0) return;
    setAutoNextFlag();
    store.prevPlay();
    const song = usePlaylistStore.getState().getCurrentSong();
    if (song) doPlaySong(song);
  });

  // ★ RemotePlay/Pause 回调不再调用 syncPlaybackState()
  // PlaybackService 已直接调用 TrackPlayer.play()/pause()（零延迟）
  // 播放状态会通过 PlaybackState 事件自然同步到 zustand
  setOnRemotePlay(() => {
    console.log('[Player] RemotePlay');
    // ★ 无 track 时触发重载（读 zustand 内存状态，无需 bridge 调用）
    const { playMusic, playMusicUrl } = usePlayerStore.getState();
    if (playMusic && !playMusicUrl) {
      console.log('[Player] RemotePlay: 无播放 URL，触发重载');
      reloadAndPlay();
    }
  });

  setOnRemotePause(() => {
    console.log('[Player] RemotePause');
  });

  await setupPlayer();

  // ★ 关键：同步 TrackPlayer 实际状态到 store
  try {
    const state = await TrackPlayer.getPlaybackState();
    const isActuallyPlaying = state.state === State.Playing;
    const pStore = usePlayerStore.getState();
    if (isActuallyPlaying) {
      pStore.setIsPlay(true);
    } else {
      pStore.setIsPlay(false);
    }
    const progress = await TrackPlayer.getProgress();
    if (progress.duration > 0) pStore.setDuration(progress.duration);
    if (progress.position > 0) pStore.setCurrentProgress(progress.position);
  } catch (e) {
    console.warn('[Player] 状态同步失败:', e);
  }
}

// ==================== React Hook ====================

export function usePlayer() {
  const playerStore = usePlayerStore();
  const playlistStore = usePlaylistStore();

  const playSong = useCallback(async (song: SongResult): Promise<boolean> => {
    return doPlaySong(song);
  }, []);

  const togglePlayback = useCallback(async () => {
    if (isWeb || !isPlayerAvailable) return;
    try {
      console.log('[Player] togglePlayback');
      await tpTogglePlayback();
      await syncPlaybackState();
    } catch (e) {
      console.error('[Player] togglePlayback 错误:', e);
    }
  }, []);

  const next = useCallback(() => {
    console.log('[Player] next (手动下一首)');
    const store = usePlaylistStore.getState();
    if (store.playList.length === 0) return;

    setAutoNextFlag();

    if (store.playMode === PLAY_MODE_SEQUENTIAL && store.playListIndex >= store.playList.length - 1) {
      store.setPlayListIndex(0);
    } else {
      store.nextPlay();
    }
    const currentSong = usePlaylistStore.getState().getCurrentSong();
    if (currentSong) {
      doPlaySong(currentSong);
    }
  }, []);

  const prev = useCallback(() => {
    console.log('[Player] prev (手动上一首)');
    const store = usePlaylistStore.getState();
    if (store.playList.length === 0) return;

    setAutoNextFlag();
    store.prevPlay();

    const currentSong = usePlaylistStore.getState().getCurrentSong();
    if (currentSong) {
      doPlaySong(currentSong);
    }
  }, []);

  const seekTo = useCallback(async (position: number) => {
    try {
      console.log(`[Player] seekTo: ${position}s`);
      await tpSeekTo(position);
      usePlayerStore.getState().setCurrentProgress(position);
    } catch (e) {
      console.error('[Player] seekTo 错误:', e);
    }
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    try {
      await tpSetVolume(volume);
      usePlayerStore.getState().setVolume(volume);
    } catch {}
  }, []);

  const setPlaybackRate = useCallback(async (rate: number) => {
    try {
      await tpSetPlaybackRate(rate);
      usePlayerStore.getState().setPlaybackRate(rate);
    } catch {}
  }, []);

  // 初始化（只执行一次）
  useEffect(() => {
    initializePlayer();

    // ★ 进度轮询：使用 getProgress() 一步到位（1个 bridge 调用）
    // 不再额外调 getPlaybackState() — 状态由 PlaybackState 事件驱动
    const progressPollTimer = setInterval(async () => {
      try {
        const progress = await TrackPlayer.getProgress();
        if (progress.position > 0) usePlayerStore.getState().setCurrentProgress(progress.position);
        if (progress.duration > 0) usePlayerStore.getState().setDuration(progress.duration);
      } catch {}
    }, 1000);

    // ★ App 回到前台时，同步 TrackPlayer 实际状态到 zustand
    const appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        syncPlaybackState();
      }
    });

    return () => {
      clearInterval(progressPollTimer);
      appStateSubscription.remove();
    };
  }, []);

  // ★ 监听播放列表索引变化
  // 只在 isAutoNext=false 且 currentPlayingSongId 不匹配时触发
  // 模块级状态确保所有 hook 实例共享同一份判断
  useEffect(() => {
    const currentSong = playlistStore.getCurrentSong();
    if (!currentSong) return;

    // ID 已匹配 → 无变化，跳过
    if (currentSong.id === currentPlayingSongId) return;

    // 自动下一首进行中 → 跳过（_doNextPlay 已自行调用 doPlaySong）
    if (isAutoNext) {
      console.log('[Player] 索引变化: 自动下一首进行中，跳过');
      return;
    }

    console.log(`[Player] ★ 检测到索引变化: ID ${currentPlayingSongId} -> ${currentSong.id}, "${currentSong.name}" ★`);
    doPlaySong(currentSong);
  }, [playlistStore.playListIndex]);

  return {
    playSong,
    togglePlayback,
    next,
    prev,
    seekTo,
    setVolume,
    setPlaybackRate,
    isPlay: playerStore.isPlay,
    isLoading: playerStore.isLoading,
    playMusic: playerStore.playMusic,
    playMusicUrl: playerStore.playMusicUrl,
    currentProgress: playerStore.currentProgress,
    duration: playerStore.duration,
    volume: playerStore.volume,
    playbackRate: playerStore.playbackRate,
  };
}
