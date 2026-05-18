import { useCallback, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';

import { usePlayerStore } from '../store/playerStore';
import { usePlaylistStore } from '../store/playlistStore';
import { useSettingsStore } from '../store/settingsStore';
import { getMusicUrl, getMusicDetail } from '../api/music';
import { parseMusicUrl } from '../services/musicParserService';
import { getSongLocalUri } from '../services/downloadService';
import {
  playSong as tpPlaySong,
  togglePlayback as tpTogglePlayback,
  seekTo as tpSeekTo,
  setVolume as tpSetVolume,
  setPlaybackRate as tpSetPlaybackRate,
  isPlayerAvailable,
  getPlayerState,
  getCurrentPosition,
  getDuration as tpGetDuration,
  setupPlayer,
  setOnPlaybackEnd,
  setOnProgressUpdate,
  hasSoundRef,
  fadeOutAndPause,
} from '../services/trackPlayerService';
import { PLAY_MODE_LOOP, PLAY_MODE_SEQUENTIAL } from '../constants/config';
import type { SongResult } from '../types';

const isWeb = Platform.OS === 'web';

export function usePlayer() {
  const playerStore = usePlayerStore();
  const playlistStore = usePlaylistStore();
  const enableMusicParsing = useSettingsStore((s) => s.enableMusicParsing);
  const musicQuality = useSettingsStore((s) => s.musicQuality);
  const isInitializedRef = useRef(false);

  // 用 ref 持有 playSong 引用，避免 onPlaybackEnd 闭包过期
  const playSongRef = useRef<(song: SongResult) => Promise<void>>();
  const playModeRef = useRef(playlistStore.playMode);
  playModeRef.current = playlistStore.playMode;

  // 播放代际计数器，用于取消过期的播放请求（防止快速切歌导致两首歌同时播放）
  const playGenerationRef = useRef(0);

  // 自动下一首标记：自动切歌时不弹 Alert，静默跳过失败歌曲
  const isAutoNextRef = useRef(false);

  /**
   * 核心播放函数（参照桌面端 playbackController.playTrack）
   * @returns 是否成功播放
   */
  const playSong = useCallback(async (song: SongResult): Promise<boolean> => {
    const thisGeneration = ++playGenerationRef.current;
    try {
      // 立即更新 UI 状态并停止当前播放（让用户感觉响应即时）
      playerStore.setPlayMusic(song);
      playerStore.setIsPlay(true);
      playerStore.setIsLoading(true);
      playerStore.setPlayMusicUrl(''); // 清空旧 URL，触发加载状态

      // 立即停止旧音频输出（不等解析完成）
      await fadeOutAndPause();

      const localUri = getSongLocalUri(song.id);
      if (localUri) {
        if (thisGeneration !== playGenerationRef.current) return false;
        playerStore.setIsLoading(false);
        playerStore.setPlayMusicUrl(localUri);
        await tpPlaySong(song, localUri);
        return true;
      }

      const res = await getMusicUrl(Number(song.id));
      if (thisGeneration !== playGenerationRef.current) return false;

      let url = res?.data?.data?.[0]?.url;
      const isTrial = !!res?.data?.data?.[0]?.freeTrialInfo;

      // Trial detected — fall back to music parser (same as desktop)
      if (isTrial) {
        console.log(`[Player] Trial URL detected for "${song.name}", trying music parser...`);
        if (enableMusicParsing) {
          const parsedUrl = await parseMusicUrl(
            song.id,
            song,
            musicQuality,
            true
          );
          if (parsedUrl) {
            url = parsedUrl;
            console.log(`[Player] Music parser replaced trial URL`);
          } else {
            console.warn(`[Player] Music parser could not replace trial URL, playing trial version`);
          }
        }
        if (thisGeneration !== playGenerationRef.current) return false;
      }

      if (!url && enableMusicParsing) {
        console.log(`[Player] Official API returned no URL for "${song.name}", trying music parser...`);
        const parsedUrl = await parseMusicUrl(
          song.id,
          song,
          musicQuality,
          true
        );
        if (parsedUrl) {
          url = parsedUrl;
          console.log(`[Player] Music parser found URL via alternative source`);
        }
        if (thisGeneration !== playGenerationRef.current) return false;
      }

      if (!url) {
        if (thisGeneration === playGenerationRef.current) {
          playerStore.setIsPlay(false);
          playerStore.setIsLoading(false);
          playerStore.setPlayMusic(null);
          // 自动下一首时静默跳过，不弹 Alert
          if (!isAutoNextRef.current) {
            Alert.alert('无法播放', `歌曲「${song.name}」暂无可用音源，可能为版权限制`);
          } else {
            console.log(`[Player] Auto-next: skipping "${song.name}" — no URL available`);
          }
        }
        return false;
      }

      if (thisGeneration !== playGenerationRef.current) return false;

      playerStore.setIsLoading(false);
      playerStore.setPlayMusicUrl(url);
      await tpPlaySong(song, url);
      return true;
    } catch {
      if (thisGeneration === playGenerationRef.current) {
        playerStore.setIsPlay(false);
        playerStore.setIsLoading(false);
      }
      return false;
    }
  }, [playerStore, enableMusicParsing, musicQuality]);

  // 保持 ref 同步
  playSongRef.current = playSong;

  const togglePlayback = useCallback(async () => {
    if (isWeb || !isPlayerAvailable) return;

    // 情况1：soundRef 存在 → 正常切换播放/暂停
    if (hasSoundRef()) {
      try {
        await tpTogglePlayback();
        const state = await getPlayerState();
        playerStore.setIsPlay(state === 'playing');
      } catch {}
      return;
    }

    // 情况2：soundRef 不存在（App重启后），但 playMusic 存在 → 重新加载播放
    const currentSong = playerStore.playMusic;
    if (currentSong) {
      playerStore.setCurrentProgress(0);
      await playSong(currentSong);
    }
  }, [playerStore, playSong]);

  const next = useCallback(() => {
    const store = usePlaylistStore.getState();
    const { playList, playListIndex, playMode } = store;
    // 手动点下一首时，顺序模式到末尾也循环回第一首
    if (playMode === PLAY_MODE_SEQUENTIAL && playListIndex >= playList.length - 1) {
      store.setPlayListIndex(0);
    } else {
      store.nextPlay();
    }
    const currentSong = usePlaylistStore.getState().getCurrentSong();
    if (currentSong) {
      playSong(currentSong);
    }
  }, [playSong]);

  const prev = useCallback(() => {
    playlistStore.prevPlay();
    const currentSong = playlistStore.getCurrentSong();
    if (currentSong) {
      playSong(currentSong);
    }
  }, [playlistStore, playSong]);

  const seekTo = useCallback(async (position: number) => {
    try {
      await tpSeekTo(position);
      playerStore.setCurrentProgress(position);
    } catch {}
  }, [playerStore]);

  const setVolume = useCallback(async (volume: number) => {
    try {
      await tpSetVolume(volume);
      playerStore.setVolume(volume);
    } catch {}
  }, [playerStore]);

  const setPlaybackRate = useCallback(async (rate: number) => {
    try {
      await tpSetPlaybackRate(rate);
      playerStore.setPlaybackRate(rate);
    } catch {}
  }, [playerStore]);

  // 初始化播放器 + 注册实时进度回调
  useEffect(() => {
    if (isWeb || !isPlayerAvailable) return;
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    setupPlayer();

    // 注册实时进度更新回调（由 expo-av 的 onPlaybackStatusUpdate 驱动）
    setOnProgressUpdate((update) => {
      if (update.position >= 0) {
        usePlayerStore.getState().setCurrentProgress(update.position);
      }
      if (update.duration > 0) {
        usePlayerStore.getState().setDuration(update.duration);
      }
    });
  }, []);

  // ==================== 自动下一首逻辑（参照桌面端 MusicHook + playlist.ts _nextPlay） ====================

  // 连续失败计数器（防止无限循环）
  const consecutiveFailCountRef = useRef(0);
  const MAX_CONSECUTIVE_FAILS = 5;

  /**
   * 单曲循环重播（参照桌面端 MusicHook.replayMusic）
   * 最多重试 3 次，失败则跳到下一首
   */
  const replayMusic = useCallback(async (retryCount = 0): Promise<void> => {
    const MAX_REPLAY_RETRIES = 3;
    const currentSong = usePlaylistStore.getState().getCurrentSong();
    if (!currentSong) return;

    try {
      isAutoNextRef.current = true;
      const success = await playSongRef.current?.(currentSong);
      isAutoNextRef.current = false;

      if (!success && retryCount < MAX_REPLAY_RETRIES) {
        console.log(`[Player] 单曲循环重播失败，${retryCount + 1}秒后重试 (${retryCount + 1}/${MAX_REPLAY_RETRIES})`);
        setTimeout(() => replayMusic(retryCount + 1), 1000 * (retryCount + 1));
      } else if (!success) {
        console.log('[Player] 单曲循环重试耗尽，跳到下一首');
        nextPlayOnEnd();
      }
    } catch (error) {
      isAutoNextRef.current = false;
      if (retryCount < MAX_REPLAY_RETRIES) {
        setTimeout(() => replayMusic(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        nextPlayOnEnd();
      }
    }
  }, []);

  /**
   * 自动下一首（参照桌面端 playlist.ts _nextPlay）
   * @param retryCount 重试次数（播放失败时自动重试 1 次）
   * @param autoEnd 是否为歌曲自然播放结束（true: 顺序模式末尾停住; false: 手动点击）
   */
  const _nextPlay = useCallback(async (retryCount: number = 0, autoEnd: boolean = false): Promise<void> => {
    const store = usePlaylistStore.getState();
    const playerCore = usePlayerStore.getState();

    if (store.playList.length === 0) return;

    // 用户手动点击时重置计数器
    if (retryCount === 0) {
      consecutiveFailCountRef.current = 0;
    }

    // 连续失败保护
    if (consecutiveFailCountRef.current >= MAX_CONSECUTIVE_FAILS) {
      console.error(`[nextPlay] 连续${MAX_CONSECUTIVE_FAILS}首播放失败，停止`);
      consecutiveFailCountRef.current = 0;
      playerCore.setIsPlay(false);
      return;
    }

    // 顺序模式：最后一首
    if (playModeRef.current === PLAY_MODE_SEQUENTIAL && store.playListIndex >= store.playList.length - 1) {
      if (autoEnd) {
        // 歌曲自然播放结束：停止播放
        console.log('[nextPlay] 顺序播放：最后一首播放完毕，停止');
        playerCore.setIsPlay(false);
      } else {
        // 用户手动点击下一首：循环回第一首
        console.log('[nextPlay] 顺序播放：已是最后一首，回到第一首');
        store.setPlayListIndex(0);
        const firstSong = store.getCurrentSong();
        if (firstSong) {
          isAutoNextRef.current = true;
          const success = await playSongRef.current?.(firstSong);
          isAutoNextRef.current = false;
          if (success) {
            consecutiveFailCountRef.current = 0;
          }
        }
      }
      return;
    }

    const nowPlayListIndex = (store.playListIndex + 1) % store.playList.length;
    const nextSong = store.playList[nowPlayListIndex];

    if (!nextSong) return;

    console.log(`[nextPlay] ${nextSong.name}, 索引: ${store.playListIndex} -> ${nowPlayListIndex}, 重试: ${retryCount}`);

    isAutoNextRef.current = true;
    const success = await playSongRef.current?.(nextSong);
    isAutoNextRef.current = false;

    // 检查是否被更新的操作取代
    const currentPlayMusic = usePlayerStore.getState().playMusic;
    if (currentPlayMusic?.id !== nextSong.id) {
      console.log('[nextPlay] 被新操作取代，静默退出');
      return;
    }

    if (success) {
      consecutiveFailCountRef.current = 0;
      store.setPlayListIndex(nowPlayListIndex);
      console.log(`[nextPlay] 播放成功，索引: ${nowPlayListIndex}`);
    } else {
      // 重试一次
      if (retryCount < 1) {
        console.log(`[nextPlay] 播放失败，1秒后重试`);
        setTimeout(() => _nextPlay(retryCount + 1, autoEnd), 1000);
      } else {
        // 重试耗尽，跳到下一首
        consecutiveFailCountRef.current++;
        console.log(`[nextPlay] 重试用尽，连续失败: ${consecutiveFailCountRef.current}/${MAX_CONSECUTIVE_FAILS}`);
        store.setPlayListIndex(nowPlayListIndex);
        if (store.playList.length > 1) {
          setTimeout(() => _nextPlay(0, autoEnd), 500);
        } else {
          playerCore.setIsPlay(false);
        }
      }
    }
  }, []);

  /** 歌曲自然播放结束时调用 */
  const nextPlayOnEnd = useCallback(() => {
    _nextPlay(0, true);
  }, [_nextPlay]);

  // 歌曲播放结束 → 自动下一首（参照桌面端 MusicHook audioService.on('end')）
  // 使用 ref 模式：注册一次永久回调，永不清理，避免多组件实例互相覆盖/清除
  const onPlaybackEndHandlerRef = useRef<(() => void) | null>(null);

  // 每次渲染更新 handler ref（保持逻辑最新）
  onPlaybackEndHandlerRef.current = () => {
    console.log('[Player] 音频播放结束事件触发');
    const playMode = playModeRef.current;

    if (playMode === PLAY_MODE_LOOP) {
      replayMusic();
      return;
    }

    nextPlayOnEnd();
  };

  // 只注册一次，永不清理
  useEffect(() => {
    if (isWeb || !isPlayerAvailable) return;
    setOnPlaybackEnd(() => {
      onPlaybackEndHandlerRef.current?.();
    });
    // 故意不返回清理函数——回调必须一直存在
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    playSong,
    togglePlayback,
    next,
    prev,
    seekTo,
    setVolume,
    setPlaybackRate,
    isPlay: playerStore.isPlay,
    playMusic: playerStore.playMusic,
    playMusicUrl: playerStore.playMusicUrl,
    currentProgress: playerStore.currentProgress,
    duration: playerStore.duration,
    volume: playerStore.volume,
    playbackRate: playerStore.playbackRate,
  };
}
