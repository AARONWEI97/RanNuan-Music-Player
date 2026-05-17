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
  getSoundRef,
} from '../services/trackPlayerService';
import type { SongResult } from '../types';

const isWeb = Platform.OS === 'web';

export function usePlayer() {
  const playerStore = usePlayerStore();
  const playlistStore = usePlaylistStore();
  const enableMusicParsing = useSettingsStore((s) => s.enableMusicParsing);
  const musicQuality = useSettingsStore((s) => s.musicQuality);
  const isInitializedRef = useRef(false);

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

  const togglePlayback = useCallback(async () => {
    if (isWeb || !isPlayerAvailable) return;
    try {
      await tpTogglePlayback();
      const state = await getPlayerState();
      playerStore.setIsPlay(state === 'playing');
    } catch {}
  }, [playerStore]);

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

  useEffect(() => {
    if (isWeb || !isPlayerAvailable) return;
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    setupPlayer();

    const progressInterval = setInterval(async () => {
      try {
        const position = await getCurrentPosition();
        const duration = await tpGetDuration();
        if (position > 0) playerStore.setCurrentProgress(position);
        if (duration > 0) playerStore.setDuration(duration);
      } catch {}
    }, 1000);

    return () => {
      clearInterval(progressInterval);
    };
  }, [playerStore]);

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
