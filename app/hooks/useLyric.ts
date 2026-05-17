import { useCallback, useEffect, useRef } from 'react';

import { useLyricStore } from '../store/lyricStore';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { getMusicLrc } from '../api/music';
import { parseLyric, findCurrentLineIndex } from '../utils/lyricParser';

export function useLyric() {
  const lyricStore = useLyricStore();
  const playerStore = usePlayerStore();
  const showTranslation = useSettingsStore((s) => s.showLyricTranslation);
  const prevSongIdRef = useRef<number | string | null>(null);

  const loadLyric = useCallback(async (songId: number | string) => {
    const numId = typeof songId === 'string' ? parseInt(songId, 10) : songId;
    if (isNaN(numId)) return;

    lyricStore.setIsLoading(true);
    lyricStore.setLyric(null, null);

    try {
      const res = await getMusicLrc(numId);
      const apiLyric = res?.data;
      if (apiLyric) {
        const parsed = parseLyric(apiLyric);
        lyricStore.setLyric(parsed, numId);
      } else {
        lyricStore.setLyric(null, null);
      }
    } catch (e) {
      console.warn('Failed to load lyric:', e);
      lyricStore.setLyric(null, null);
    } finally {
      lyricStore.setIsLoading(false);
    }
  }, [lyricStore]);

  useEffect(() => {
    const currentSong = playerStore.playMusic;
    const currentSongId = currentSong?.id ?? null;

    if (currentSongId !== null && currentSongId !== prevSongIdRef.current) {
      prevSongIdRef.current = currentSongId;
      loadLyric(currentSongId);
    } else if (currentSongId === null) {
      prevSongIdRef.current = null;
      lyricStore.reset();
    }
  }, [playerStore.playMusic, loadLyric, lyricStore]);

  useEffect(() => {
    const lyric = lyricStore.lyric;
    if (!lyric || lyric.lrcTimeArray.length === 0) return;

    const currentTimeMs = playerStore.currentProgress * 1000;
    const newIndex = findCurrentLineIndex(lyric.lrcTimeArray, currentTimeMs);

    if (newIndex !== lyricStore.currentLineIndex) {
      lyricStore.setCurrentLineIndex(newIndex);
    }
  }, [playerStore.currentProgress, lyricStore.lyric, lyricStore.currentLineIndex, lyricStore]);

  return {
    lyric: lyricStore.lyric,
    currentLineIndex: lyricStore.currentLineIndex,
    isLoading: lyricStore.isLoading,
    fontSize: lyricStore.fontSize,
    showTranslation,
    setFontSize: lyricStore.setFontSize,
    loadLyric,
  };
}
