import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

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
} from '../services/trackPlayerService';
import { PLAY_MODE_LOOP } from '../constants/config';
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

  const playSong = useCallback(async (song: SongResult) => {
    try {
      playerStore.setPlayMusic(song);
      playerStore.setIsPlay(true);

      const localUri = getSongLocalUri(song.id);
      if (localUri) {
        playerStore.setPlayMusicUrl(localUri);
        await tpPlaySong(song, localUri);
        return;
      }

      const res = await getMusicUrl(Number(song.id));
      let url = res?.data?.data?.[0]?.url;

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
      }

      if (!url) {
        playerStore.setIsPlay(false);
        return;
      }

      playerStore.setPlayMusicUrl(url);
      await tpPlaySong(song, url);
    } catch {
      playerStore.setIsPlay(false);
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
    playlistStore.nextPlay();
    const currentSong = playlistStore.getCurrentSong();
    if (currentSong) {
      playSong(currentSong);
    }
  }, [playlistStore, playSong]);

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
    setOnPlaybackEnd(() => {
      // 单曲循环模式：重放当前歌曲
      if (playModeRef.current === PLAY_MODE_LOOP) {
        const currentSong = usePlaylistStore.getState().getCurrentSong();
        if (currentSong) {
          playSongRef.current?.(currentSong);
        }
        return;
      }
      // 其他模式：播放下一首
      const store = usePlaylistStore.getState();
      store.nextPlay();
      const nextSong = store.getCurrentSong();
      if (nextSong) {
        playSongRef.current?.(nextSong);
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
