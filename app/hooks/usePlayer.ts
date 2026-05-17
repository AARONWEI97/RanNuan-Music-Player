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

  const playSong = useCallback(async (song: SongResult) => {
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
        if (thisGeneration !== playGenerationRef.current) return;
        playerStore.setIsLoading(false);
        playerStore.setPlayMusicUrl(localUri);
        await tpPlaySong(song, localUri);
        return;
      }

      const res = await getMusicUrl(Number(song.id));
      if (thisGeneration !== playGenerationRef.current) return;

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
        if (thisGeneration !== playGenerationRef.current) return;
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
        if (thisGeneration !== playGenerationRef.current) return;
      }

      if (!url) {
        if (thisGeneration === playGenerationRef.current) {
          playerStore.setIsPlay(false);
          playerStore.setIsLoading(false);
          playerStore.setPlayMusic(null);
          Alert.alert('无法播放', `歌曲「${song.name}」暂无可用音源，可能为版权限制`);
        }
        return;
      }

      if (thisGeneration !== playGenerationRef.current) return;

      playerStore.setIsLoading(false);
      playerStore.setPlayMusicUrl(url);
      await tpPlaySong(song, url);
    } catch {
      if (thisGeneration === playGenerationRef.current) {
        playerStore.setIsPlay(false);
        playerStore.setIsLoading(false);
      }
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

  // 歌曲播放结束 → 自动下一首
  useEffect(() => {
    setOnPlaybackEnd(async () => {
      const playMode = playModeRef.current;

      // 单曲循环模式：重放当前歌曲
      if (playMode === PLAY_MODE_LOOP) {
        const currentSong = usePlaylistStore.getState().getCurrentSong();
        if (currentSong) {
          playSongRef.current?.(currentSong);
        }
        return;
      }

      // 顺序模式：到末尾停住，不循环
      if (playMode === PLAY_MODE_SEQUENTIAL) {
        const { playList, playListIndex } = usePlaylistStore.getState();
        if (playListIndex >= playList.length - 1) {
          // 已是最后一首，停止播放
          usePlayerStore.getState().setIsPlay(false);
          return;
        }
      }

      // 播放下一首（含失败自动跳过）
      const MAX_SKIP = 5; // 最多跳过5首，避免死循环
      for (let i = 0; i < MAX_SKIP; i++) {
        const store = usePlaylistStore.getState();
        store.nextPlay();
        const nextSong = store.getCurrentSong();
        if (!nextSong) break;

        // 检查是否有本地文件或 URL（不实际请求，只做基本检查）
        const localUri = getSongLocalUri(nextSong.id);
        if (localUri) {
          // 本地文件一定可播放
          playSongRef.current?.(nextSong);
          return;
        }

        // 尝试播放，如果失败则跳到下一首
        try {
          await playSongRef.current?.(nextSong);
          // 检查是否真正开始播放（URL 可能获取失败导致 isPlay 为 false）
          const isPlaying = usePlayerStore.getState().isPlay;
          if (isPlaying) return; // 播放成功，退出循环
        } catch {
          // 播放失败，继续尝试下一首
        }
      }
    });

    return () => {
      setOnPlaybackEnd(null);
    };
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
