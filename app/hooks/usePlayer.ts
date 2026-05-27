import { useCallback, useEffect } from 'react';
import { Platform, Alert, AppState, type AppStateStatus } from 'react-native';
import TrackPlayer, { State } from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { usePlayerStore } from '../store/playerStore';
import { usePlaylistStore } from '../store/playlistStore';
import { useSettingsStore } from '../store/settingsStore';
import { getMusicUrl } from '../api/music';
import { parseMusicUrl, musicParser } from '../services/musicParserService';
import { getSongLocalUri } from '../services/downloadService';
import {
  playSong as tpPlaySong,
  addNextToQueue as tpAddNextToQueue,
  togglePlayback as tpTogglePlayback,
  seekTo as tpSeekTo,
  setVolume as tpSetVolume,
  setPlaybackRate as tpSetPlaybackRate,
  isPlayerAvailable,
  setupPlayer,
  setOnPlaybackEnd,
  setOnProgressUpdate,
  setOnReloadAndPlay,
  setOnActiveTrackChanged,
  setOnRemotePrev,
  setOnManualNext,
} from '../services/trackPlayerService';
import { PLAY_MODE_LOOP, PLAY_MODE_SEQUENTIAL, PLAY_MODE_SHUFFLE } from '../constants/config';
import type { SongResult } from '../types';

const isWeb = Platform.OS === 'web';

// ==================== 全局持久化标志 ====================
const _g = global as any;
if (!_g.__PLAYER_INITIALIZED) _g.__PLAYER_INITIALIZED = false;

// ==================== 模块级单例状态 ====================
if (_g.__playGeneration === undefined) _g.__playGeneration = 0;
if (_g.__currentPlayingSongId === undefined) _g.__currentPlayingSongId = null;
if (_g.__preloadedNextSong === undefined) _g.__preloadedNextSong = null;
if (_g.__isPreloading === undefined) _g.__isPreloading = false;
// ★ 随机模式下的"确定性下一首"索引
if (_g.__nextShuffleIndex === undefined) _g.__nextShuffleIndex = null;
// ★ 标记是否正在同步 ActiveTrackChanged，防止 useEffect 重复触发
if (_g.__isActiveTrackSyncing === undefined) _g.__isActiveTrackSyncing = false;
// ★ 标记 ManualNext 是否正在执行，防止并发调用 + useEffect 双重播放
if (_g.__isManualNextSyncing === undefined) _g.__isManualNextSyncing = false;
// ★ 连续播放失败计数器（防止无限循环重试）
if (_g.__consecutiveFailCount === undefined) _g.__consecutiveFailCount = 0;
const MAX_CONSECUTIVE_FAILS = 5;

// 从持久化 store 初始化 currentPlayingSongId
try {
  if (!_g.__currentPlayingSongId) {
    const saved = usePlayerStore.getState().playMusic;
    _g.__currentPlayingSongId = saved?.id ?? null;
  }
} catch {}

/**
 * ★★★ 新架构核心：确定下一首要播放的歌曲 ★★★
 * 统一的"下一首"逻辑，供预加载和手动切歌共用
 */
function getNextSongInfo(): { song: SongResult; index: number } | null {
  const store = usePlaylistStore.getState();
  if (store.playList.length === 0) return null;

  const playMode = store.playMode;

  if (playMode === PLAY_MODE_LOOP) {
    const song = store.getCurrentSong();
    return song ? { song, index: store.playListIndex } : null;
  }

  if (playMode === PLAY_MODE_SHUFFLE) {
    if (store.playList.length <= 1) {
      const song = store.getCurrentSong();
      return song ? { song, index: store.playListIndex } : null;
    }
    // 使用"确定性下一首"策略
    if (_g.__nextShuffleIndex === undefined || _g.__nextShuffleIndex === null
        || _g.__nextShuffleIndex >= store.playList.length
        || _g.__nextShuffleIndex === store.playListIndex) {
      do {
        _g.__nextShuffleIndex = Math.floor(Math.random() * store.playList.length);
      } while (_g.__nextShuffleIndex === store.playListIndex && store.playList.length > 1);
    }
    const idx = _g.__nextShuffleIndex;
    return { song: store.playList[idx], index: idx };
  }

  // 顺序/列表循环
  if (store.playList.length === 0) return null;

  let nextIndex = store.playListIndex + 1;
  if (nextIndex >= store.playList.length) {
    if (playMode === PLAY_MODE_SEQUENTIAL) return null;
    nextIndex = 0;
  }
  return { song: store.playList[nextIndex], index: nextIndex };
}

/** 消费随机模式的 nextShuffleIndex（切歌后生成新的） */
function consumeShuffleIndex(usedIndex: number) {
  const store = usePlaylistStore.getState();
  do {
    _g.__nextShuffleIndex = Math.floor(Math.random() * store.playList.length);
  } while (_g.__nextShuffleIndex === usedIndex && store.playList.length > 1);
}

/**
 * ★★★ 新架构核心：预加载下一首并加入原生队列 ★★★
 * 替代旧的 AsyncStorage 跨上下文通信——预加载完成后直接 addNextToQueue
 * 原生层会在当前歌曲结束后自动播放队列里的下一首
 */
async function preloadNextSongIfNeeded(currentPosition: number, currentDuration: number, force: boolean = false) {
  if (currentDuration <= 0 || currentPosition <= 0) return;
  if (!force && currentDuration - currentPosition > 60) return;
  if (_g.__isPreloading) return;
  if (!_g.__currentPlayingSongId) return;

  const nextInfo = getNextSongInfo();
  if (!nextInfo) return;

  const nextSong = nextInfo.song;
  // 如果已经预加载过该歌曲，跳过
  if (_g.__preloadedNextSong?.songId === nextSong.id) return;

  _g.__isPreloading = true;
  console.log(`[Player] ⏳ 触发预加载 (剩余${(currentDuration - currentPosition).toFixed(1)}s): "${nextSong.name}"`);

  try {
    // 1. 本地检查
    const localUri = getSongLocalUri(nextSong.id);
    if (localUri) {
      _g.__preloadedNextSong = { songId: nextSong.id, url: localUri };
      console.log(`[Player] ✅ 预加载完成 (本地): "${nextSong.name}"`);
      // ★ 直接加入原生队列
      await tpAddNextToQueue(nextSong, localUri);
      return;
    }

    // 2. 在线请求与VIP解析
    const res = await getMusicUrl(Number(nextSong.id));
    let url = res?.data?.data?.[0]?.url;
    const isTrial = !!res?.data?.data?.[0]?.freeTrialInfo;
    const { enableMusicParsing, musicQuality } = useSettingsStore.getState();

    if ((isTrial || !url) && enableMusicParsing) {
      url = await parseMusicUrl(nextSong.id, nextSong, musicQuality, true);
    }

    if (url) {
      _g.__preloadedNextSong = { songId: nextSong.id, url };
      console.log(`[Player] ✅ 预加载完成 (在线/解析): "${nextSong.name}"`);
      // ★ 直接加入原生队列
      await tpAddNextToQueue(nextSong, url);
    } else {
      console.log(`[Player] ❌ 预加载失败: 无可用 URL`);
    }
  } catch (e) {
    console.error(`[Player] ❌ 预加载异常:`, e);
  } finally {
    _g.__isPreloading = false;
  }
}

/**
 * 核心：播放歌曲（模块级单例）
 * ★ 新架构：tpPlaySong 使用 reset()+add()+play()，将歌曲加入原生队列
 * 播放成功后，如果有预加载的下一首，也加入队列
 */
async function doPlaySong(song: SongResult): Promise<boolean> {
  // ★ 立即同步更新模块级 ID，阻断其他组件实例的并发 useEffect 触发
  // 同时作为 handleActiveTrackChanged 的判断依据：
  // 若 ActiveTrackChanged 的 track.id === __currentPlayingSongId，说明是主动播放触发，不需要重复同步状态
  _g.__currentPlayingSongId = song.id;

  const thisGeneration = ++_g.__playGeneration;
  console.log(`[Player] playSong: "${song.name}" (gen=${thisGeneration})`);

  const playerStore = usePlayerStore.getState();
  const { enableMusicParsing, musicQuality } = useSettingsStore.getState();

  try {
    try { await TrackPlayer.pause(); } catch {}

    playerStore.setPlayMusic(song);
    playerStore.setIsLoading(true);
    playerStore.setPlayMusicUrl('');

    // ★ 检查预加载缓存
    if (_g.__preloadedNextSong && _g.__preloadedNextSong.songId === song.id) {
      console.log(`[Player] ⚡ 命中预加载缓存，秒切歌曲: "${song.name}"`);
      const url = _g.__preloadedNextSong.url;
      _g.__preloadedNextSong = null;

      playerStore.setIsLoading(false);
      playerStore.setPlayMusicUrl(url);

      if (thisGeneration === _g.__playGeneration) {
        playerStore.setIsPlay(true); // ★ 立即更新 UI 状态，不等 PlaybackState.Playing 事件
        await tpPlaySong(song, url);
        // ★ 播放成功后，预加载并加入下一首到原生队列
        preloadAndEnqueueNext();
      }
      return true;
    }

    // 未命中缓存，清空无效缓存
    _g.__preloadedNextSong = null;

    // 优先本地
    const localUri = getSongLocalUri(song.id);
    if (localUri) {
      if (thisGeneration !== _g.__playGeneration) return false;
      playerStore.setIsLoading(false);
      playerStore.setPlayMusicUrl(localUri);
      playerStore.setIsPlay(true); // ★ 立即更新 UI 状态
      await tpPlaySong(song, localUri);
      console.log(`[Player] 本地播放成功: "${song.name}"`);
      preloadAndEnqueueNext();
      return true;
    }

    // ★ 先查音源解析缓存（用户手动重新解析的结果优先级最高）
    const cachedUrl = await musicParser.getCachedUrl(song.id);
    if (cachedUrl) {
      console.log(`[Player] 命中音源缓存: "${song.name}"`);
      if (thisGeneration !== _g.__playGeneration) return false;
      playerStore.setIsLoading(false);
      playerStore.setPlayMusicUrl(cachedUrl);
      playerStore.setIsPlay(true);
      await tpPlaySong(song, cachedUrl);
      console.log(`[Player] 缓存 URL 播放成功: "${song.name}"`);
      preloadAndEnqueueNext();
      return true;
    }

    // 在线 URL — getMusicUrl 已带 unblock=true，大部分歌曲直接拿到国内 CDN URL
    const res = await getMusicUrl(Number(song.id));
    if (thisGeneration !== _g.__playGeneration) return false;

    let url = res?.data?.data?.[0]?.url;
    const isTrial = !!res?.data?.data?.[0]?.freeTrialInfo;

    // ★ getMusicUrl 已带 unblock=true，如果仍然返回试听/空，说明 API 服务端可能不支持解灰
    // 此时跳过 OfficialApi（已请求过同一接口），直接走替代音源
    if ((isTrial || !url) && enableMusicParsing) {
      if (isTrial) {
        console.log(`[Player] 试听 URL (unblock 未生效)，尝试音源解析: "${song.name}"`);
      } else {
        console.log(`[Player] 官方 API 无 URL，尝试音源解析: "${song.name}"`);
      }
      const parsedUrl = await parseMusicUrl(song.id, song, musicQuality, true);
      if (parsedUrl) {
        url = parsedUrl;
        console.log(`[Player] 音源解析${isTrial ? '替换试听' : '找到替代'} URL 成功`);
      }
      if (thisGeneration !== _g.__playGeneration) return false;
    }

    if (!url) {
      if (thisGeneration === _g.__playGeneration) {
        playerStore.setIsPlay(false);
        playerStore.setIsLoading(false);
        Alert.alert('无法播放', `歌曲「${song.name}」暂无可用音源，可能为版权限制`);
      }
      return false;
    }

    if (thisGeneration !== _g.__playGeneration) return false;

    playerStore.setIsLoading(false);
    playerStore.setPlayMusicUrl(url);
    playerStore.setIsPlay(true); // ★ 立即更新 UI 状态，不等 PlaybackState.Playing 事件
    await tpPlaySong(song, url);
    console.log(`[Player] 在线播放成功: "${song.name}"`);
    preloadAndEnqueueNext();
    return true;
  } catch (e) {
    console.error(`[Player] playSong 异常:`, e);
    if (thisGeneration === _g.__playGeneration) {
      playerStore.setIsPlay(false);
      playerStore.setIsLoading(false);
    }
    return false;
  }
}

/**
 * ★ 预加载下一首并加入原生队列
 * 播放新歌后调用，确保原生队列里有 next track
 */
function preloadAndEnqueueNext() {
  // ★ 先清除旧缓存，确保预加载的是当前歌曲的下一首（而非上一首的）
  _g.__preloadedNextSong = null;
  // 使用 setTimeout 避免阻塞 doPlaySong 的返回
  setTimeout(async () => {
    try {
      const progress = await TrackPlayer.getProgress();
      if (progress.duration > 0) {
        await preloadNextSongIfNeeded(progress.position, progress.duration, true);
      }
    } catch {}
  }, 100);
}

/**
 * ★★★ 新架构核心：原生队列自动切歌回调 ★★★
 * ActiveTrackChanged 触发时：
 * 1. 同步 zustand 状态（playMusic, playListIndex）
 * 2. 触发预加载下下首
 */
function handleActiveTrackChanged(track: any) {
  if (!track) return;

  const songId = track.id;
  const plStore = usePlaylistStore.getState();
  const idx = plStore.playList.findIndex((s: SongResult) => String(s.id) === String(songId));

  if (idx === -1) {
    console.log(`[Player] ActiveTrackChanged: songId=${songId} 不在播放列表中`);
    return;
  }

  const song = plStore.playList[idx];

  // ★ 区分"主动播放"和"原生队列自动切歌"：
  // doPlaySong 第一行就设置了 __currentPlayingSongId = song.id
  // 所以如果 track.id 等于 __currentPlayingSongId，说明是 doPlaySong 主动播放触发的
  // zustand 状态已由 doPlaySong 自己设置，这里只需触发预加载，不重复同步
  if (String(songId) === String(_g.__currentPlayingSongId)) {
    console.log(`[Player] ActiveTrackChanged (主动播放确认): "${song.name}"，只触发预加载`);
    preloadAndEnqueueNext();
    return;
  }

  console.log(`[Player] ★ 原生队列自动切歌: "${song.name}" (index=${idx}) ★`);

  // ★ 原生切歌成功，重置失败计数器
  _g.__consecutiveFailCount = 0;

  // ★ 关键：先设置标志和 ID，再 setPlayListIndex
  // setPlayListIndex 会触发 useEffect([playListIndex])
  // __isActiveTrackSyncing 标志让 useEffect 知道这是原生切歌，不需要 doPlaySong
  _g.__isActiveTrackSyncing = true;
  _g.__currentPlayingSongId = song.id;
  usePlayerStore.getState().setPlayMusic(song);
  plStore.setPlayListIndex(idx);

  // 消费随机索引
  if (plStore.playMode === PLAY_MODE_SHUFFLE && _g.__nextShuffleIndex === idx) {
    consumeShuffleIndex(idx);
  }

  // ★ 清除过时的预加载缓存（切到的新歌不一定是之前预加载的）
  _g.__preloadedNextSong = null;

  // ★ 在预加载前同步清除标志（而非 setTimeout 500ms）
  // 标志只在 setPlayListIndex 到此处之间有效，时间窗口极短（同步代码）
  // 不会影响用户手动切歌，同时避免 setTimeout 在 JS 冻结时失效
  _g.__isActiveTrackSyncing = false;

  // 触发预加载下下首
  preloadAndEnqueueNext();
}

/**
 * ★ 播放结束 fallback：队列无下一首时的 JS 层处理
 * 正常情况下原生队列自动切歌，此回调只在预加载未完成时触发
 */
function onPlaybackEnd() {
  console.log('[Player] ★ 音频播放结束（队列无下一首，JS fallback） ★');
  const store = usePlaylistStore.getState();
  const playMode = store.playMode;

  // ★ 连续失败保护：防止某首歌持续无法播放导致无限循环
  if (_g.__consecutiveFailCount >= MAX_CONSECUTIVE_FAILS) {
    console.log(`[Player] 连续 ${MAX_CONSECUTIVE_FAILS} 次播放失败，停止自动切歌`);
    usePlayerStore.getState().setIsPlay(false);
    _g.__consecutiveFailCount = 0;
    return;
  }

  if (playMode === PLAY_MODE_LOOP) {
    console.log('[Player] 单曲循环模式，重播当前歌曲');
    const currentSong = store.getCurrentSong();
    if (currentSong) {
      const success = doPlaySong(currentSong);
      // doPlaySong 是 async，用 then 检查结果
      success.then(ok => {
        _g.__consecutiveFailCount = ok ? 0 : _g.__consecutiveFailCount + 1;
      });
    }
    return;
  }

  if (playMode === PLAY_MODE_SEQUENTIAL && store.playListIndex >= store.playList.length - 1) {
    console.log('[Player] 顺序播放到末尾，停止');
    usePlayerStore.getState().setIsPlay(false);
    return;
  }

  // 获取下一首并播放
  const nextInfo = getNextSongInfo();
  if (!nextInfo) return;

  if (store.playMode === PLAY_MODE_SHUFFLE) {
    consumeShuffleIndex(nextInfo.index);
  }

  // ★ 先更新 ID 再 setPlayListIndex，避免 useEffect 误判为手动切歌
  _g.__currentPlayingSongId = nextInfo.song.id;
  store.setPlayListIndex(nextInfo.index);
  doPlaySong(nextInfo.song).then(ok => {
    _g.__consecutiveFailCount = ok ? 0 : _g.__consecutiveFailCount + 1;
  });
}

// 重载并播放（TrackPlayer 无 track 或 Source error 时使用）
async function reloadAndPlay() {
  // ★ 防止无限重试：超过上限后停止
  if (_g.__consecutiveFailCount >= MAX_CONSECUTIVE_FAILS) {
    console.log(`[Player] reloadAndPlay: 连续 ${MAX_CONSECUTIVE_FAILS} 次失败，停止重试`);
    usePlayerStore.getState().setIsPlay(false);
    _g.__consecutiveFailCount = 0;
    return;
  }

  const store = usePlaylistStore.getState();
  const pStore = usePlayerStore.getState();
  const currentSong = store.getCurrentSong() || pStore.playMusic;
  if (currentSong) {
    console.log(`[Player] reloadAndPlay: 重新加载 "${currentSong.name}"`);
    // ★ 清除该歌曲的 URL 缓存，避免复用刚失败的同一个坏 URL
    // 这样 parseMusicUrl 会重新走所有策略（可能换一个不同的音源）
    const { musicParser } = require('../services/musicParserService');
    await musicParser.invalidateCache(currentSong.id);
    const ok = await doPlaySong(currentSong);
    _g.__consecutiveFailCount = ok ? 0 : _g.__consecutiveFailCount + 1;
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

  // ★ 设置原生队列自动切歌回调
  setOnActiveTrackChanged(({ track }) => {
    handleActiveTrackChanged(track);
  });

  // ★ 设置播放结束 fallback 回调（队列无下一首时触发）
  setOnPlaybackEnd(() => {
    onPlaybackEnd();
  });

  // 设置进度更新回调
  setOnProgressUpdate((update) => {
    const store = usePlayerStore.getState();
    store.setCurrentProgress(update.position);
    if (update.duration > 0) store.setDuration(update.duration);
    store.setIsPlay(update.isPlaying);
    preloadNextSongIfNeeded(update.position, update.duration);
  });

  // 设置重载播放回调
  setOnReloadAndPlay(reloadAndPlay);

  // ★ 设置 RemotePrevious 回调（通知栏/锁屏"上一首"按钮）
  // 队列中没有 previous track，由 JS 层直接处理
  setOnRemotePrev(() => {
    console.log('[Player] RemotePrev 回调触发');
    // ★ 立即清除 AsyncStorage pending action，防止 AppState handler 重复处理
    AsyncStorage.removeItem('pending_remote_action').catch(() => {});
    const store = usePlaylistStore.getState();
    if (store.playList.length === 0) return;
    store.prevPlay();
    const song = usePlaylistStore.getState().getCurrentSong();
    if (song) doPlaySong(song);
  });

  // ★ 设置 ManualNext 回调（队列无下一首时的 JS fallback）
  // 典型场景：prev 后预加载未完成时按 next
  // ★ 使用 __isManualNextSyncing 标志让 useEffect 跳过本次索引变化
  // 避免 ManualNext 的 nextPlay() + doPlaySong() 与 useEffect 双重播放
  setOnManualNext(() => {
    // ★ 防重入：如果上一个 ManualNext 还没处理完，直接跳过
    if (_g.__isManualNextSyncing) {
      console.log('[Player] ManualNext 正在执行中，跳过重复调用');
      return;
    }
    _g.__isManualNextSyncing = true;

    try {
      console.log('[Player] ManualNext fallback 触发');
      const store = usePlaylistStore.getState();
      if (store.playList.length === 0) { _g.__isManualNextSyncing = false; return; }

      if (store.playMode === PLAY_MODE_SEQUENTIAL && store.playListIndex >= store.playList.length - 1) {
        const nextSong = store.playList[0];
        _g.__currentPlayingSongId = nextSong?.id ?? null;
        store.setPlayListIndex(0);
      } else if (store.playMode === PLAY_MODE_SHUFFLE) {
        if (_g.__nextShuffleIndex !== null && _g.__nextShuffleIndex !== undefined
            && _g.__nextShuffleIndex < store.playList.length) {
          const idx = _g.__nextShuffleIndex;
          const nextSong = store.playList[idx];
          _g.__currentPlayingSongId = nextSong?.id ?? null;
          _g.__nextShuffleIndex = null;
          store.setPlayListIndex(idx);
        } else {
          let idx: number;
          do {
            idx = Math.floor(Math.random() * store.playList.length);
          } while (idx === store.playListIndex && store.playList.length > 1);
          const nextSong = store.playList[idx];
          _g.__currentPlayingSongId = nextSong?.id ?? null;
          store.setPlayListIndex(idx);
          _g.__nextShuffleIndex = null;
        }
      } else {
        const nextIdx = store.playListIndex + 1;
        const nextSong = store.playList[nextIdx];
        _g.__currentPlayingSongId = nextSong?.id ?? null;
        store.nextPlay();
      }

      // ★ 在 doPlaySong 执行前清除标志
      // doPlaySong 是异步的，但 setPlayListIndex 是同步的
      // useEffect([playListIndex]) 在 React 批处理后触发
      // 此时 __isManualNextSyncing 仍为 true，useEffect 会跳过
      const song = usePlaylistStore.getState().getCurrentSong();
      if (song) {
        doPlaySong(song).finally(() => {
          // doPlaySong 完成后清除标志
          _g.__isManualNextSyncing = false;
        });
      } else {
        _g.__isManualNextSyncing = false;
      }
    } catch (e) {
      _g.__isManualNextSyncing = false;
      throw e;
    }
  });

  await setupPlayer();

  // ★ 同步 TrackPlayer 实际状态到 store
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

    const settingsVolume = useSettingsStore.getState().volume;
    await tpSetVolume(settingsVolume);
    pStore.setVolume(settingsVolume);
  } catch (e) {
    console.warn('[Player] 状态同步失败:', e);
  }
}

// ==================== React Hook ====================

export function usePlayer() {
  const playerStore = usePlayerStore();
  const { playListIndex } = usePlaylistStore();

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

  const next = useCallback(async () => {
    console.log('[Player] next (手动下一首)');
    const store = usePlaylistStore.getState();
    if (store.playList.length === 0) return;

    // ★ 优先尝试原生队列 skipToNext（零延迟）
    try {
      const queue = await TrackPlayer.getQueue();
      const activeTrack = await TrackPlayer.getActiveTrack();
      const activeIdx = activeTrack ? queue.findIndex(t => t.id === activeTrack.id) : -1;
      if (activeIdx >= 0 && activeIdx < queue.length - 1) {
        // 队列有下一首，直接 skip
        await TrackPlayer.skipToNext();
        // ActiveTrackChanged 回调会同步 zustand 状态
        return;
      }
    } catch {}

    // ★ Fallback：队列无下一首，手动切歌
    if (store.playMode === PLAY_MODE_SEQUENTIAL && store.playListIndex >= store.playList.length - 1) {
      const nextSong = store.playList[0];
      _g.__currentPlayingSongId = nextSong?.id ?? null;
      store.setPlayListIndex(0);
    } else if (store.playMode === PLAY_MODE_SHUFFLE) {
      if (_g.__nextShuffleIndex !== null && _g.__nextShuffleIndex !== undefined
          && _g.__nextShuffleIndex < store.playList.length) {
        const idx = _g.__nextShuffleIndex;
        const nextSong = store.playList[idx];
        _g.__currentPlayingSongId = nextSong?.id ?? null;
        consumeShuffleIndex(idx);
        store.setPlayListIndex(idx);
      } else {
        let idx: number;
        do {
          idx = Math.floor(Math.random() * store.playList.length);
        } while (idx === store.playListIndex && store.playList.length > 1);
        const nextSong = store.playList[idx];
        _g.__currentPlayingSongId = nextSong?.id ?? null;
        store.setPlayListIndex(idx);
        consumeShuffleIndex(idx);
      }
    } else {
      const nextIdx = store.playListIndex + 1;
      const nextSong = store.playList[nextIdx];
      _g.__currentPlayingSongId = nextSong?.id ?? null;
      store.nextPlay();
    }
    const song = usePlaylistStore.getState().getCurrentSong();
    if (song) doPlaySong(song);
  }, []);

  const prev = useCallback(() => {
    console.log('[Player] prev (手动上一首)');
    // ★ 上一首无法放入原生队列，始终手动处理
    const store = usePlaylistStore.getState();
    if (store.playList.length === 0) return;

    store.prevPlay();
    const song = usePlaylistStore.getState().getCurrentSong();
    if (song) doPlaySong(song);
  }, []);

  const seekTo = useCallback(async (position: number) => {
    try {
      console.log(`[Player] seekTo: ${position}s`);
      await tpSeekTo(position);
      usePlayerStore.getState().setCurrentProgress(position);

      const duration = usePlayerStore.getState().duration;
      if (duration > 0) {
        preloadNextSongIfNeeded(position, duration);
      }
    } catch (e) {
      console.error('[Player] seekTo 错误:', e);
    }
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    try {
      await tpSetVolume(volume);
      usePlayerStore.getState().setVolume(volume);
      useSettingsStore.getState().setVolume(volume);
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

    // ★ 进度轮询：触发预加载检查
    const progressPollTimer = setInterval(async () => {
      try {
        const progress = await TrackPlayer.getProgress();
        preloadNextSongIfNeeded(progress.position, progress.duration);
      } catch {}
    }, 2000);

    // ★ App 回到前台时，同步状态 + 检查 pending action
    const appStateSubscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        syncPlaybackState();
        // ★ 检查 PlaybackService 写入的 pending action（如锁屏按"上一首"）
        try {
          const raw = await AsyncStorage.getItem('pending_remote_action');
          if (raw) {
            const { action, timestamp } = JSON.parse(raw);
            // 只处理 10 秒内的 action，过期忽略
            if (Date.now() - timestamp < 10000) {
              await AsyncStorage.removeItem('pending_remote_action');
              if (action === 'prev') {
                console.log('[Player] 处理锁屏 pending_prev');
                // 内联 prev 逻辑，因为 prev callback 还未创建
                const store = usePlaylistStore.getState();
                if (store.playList.length > 0) {
                  store.prevPlay();
                  const song = store.getCurrentSong();
                  if (song) doPlaySong(song);
                }
              }
            } else {
              await AsyncStorage.removeItem('pending_remote_action');
            }
          }
        } catch (e) {
          console.warn('[Player] 检查 pending action 失败:', e);
        }
      } else if (nextState === 'background') {
        // ★ 进入后台时主动触发预加载 + 加入原生队列
        try {
          const progress = await TrackPlayer.getProgress();
          if (progress.duration > 0 && progress.position > 0) {
            preloadNextSongIfNeeded(progress.position, progress.duration, true);
          }
        } catch {}
      }
    });

    return () => {
      clearInterval(progressPollTimer);
      appStateSubscription.remove();
    };
  }, []);

  // ★ 监听播放列表索引变化（用户手动选歌等）
  // ★ 不再需要 isAutoNext、isHandlingEnd 等标志
  useEffect(() => {
    // 原生队列自动切歌进行中 → 跳过
    if (_g.__isActiveTrackSyncing) {
      console.log('[Player] 索引变化: 原生队列切歌同步中，跳过');
      return;
    }
    // ManualNext fallback 进行中 → 跳过（ManualNext 自己会调用 doPlaySong）
    if (_g.__isManualNextSyncing) {
      console.log('[Player] 索引变化: ManualNext 同步中，跳过');
      return;
    }

    const playlistStore = usePlaylistStore.getState();
    const currentSong = playlistStore.getCurrentSong();
    if (!currentSong) return;

    // ID 已匹配 → 无变化，跳过
    if (currentSong.id === _g.__currentPlayingSongId) return;

    console.log(`[Player] ★ 检测到索引变化: ID ${_g.__currentPlayingSongId} -> ${currentSong.id}, "${currentSong.name}" ★`);
    doPlaySong(currentSong);
  }, [playListIndex]);

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
