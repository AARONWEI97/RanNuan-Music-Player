import { useCallback } from 'react';

import { usePlaylistStore } from '../store/playlistStore';
import { usePlayerStore } from '../store/playerStore';
import type { SongResult } from '../types';

export function usePlaylist() {
  const playlistStore = usePlaylistStore();
  const playerStore = usePlayerStore();

  const playAll = useCallback((songs: SongResult[], startIndex: number = 0) => {
    if (songs.length === 0) return;
    playlistStore.setPlayList(songs);
    playlistStore.setPlayListIndex(startIndex);
    const song = songs[startIndex];
    if (song) {
      playerStore.setPlayMusic(song);
      playerStore.setIsPlay(true);
    }
  }, [playlistStore, playerStore]);

  const addToNext = useCallback((song: SongResult) => {
    playlistStore.addToNextPlay(song);
  }, [playlistStore]);

  const addToQueue = useCallback((songs: SongResult[]) => {
    const currentList = playlistStore.playList;
    playlistStore.setPlayList([...currentList, ...songs], true);
  }, [playlistStore]);

  const removeFromPlaylist = useCallback((index: number) => {
    const song = playlistStore.playList[index];
    if (song) {
      playlistStore.removeFromPlayList(song.id);
    }
  }, [playlistStore]);

  const clearPlaylist = useCallback(() => {
    playlistStore.clearPlayAll();
  }, [playlistStore]);

  const togglePlayMode = useCallback(() => {
    playlistStore.togglePlayMode();
  }, [playlistStore]);

  return {
    playAll,
    addToNext,
    addToQueue,
    removeFromPlaylist,
    clearPlaylist,
    togglePlayMode,
    playList: playlistStore.playList,
    playListIndex: playlistStore.playListIndex,
    playMode: playlistStore.playMode,
    showPlaylistDrawer: playlistStore.showPlaylistDrawer,
    setShowPlaylistDrawer: playlistStore.setShowPlaylistDrawer,
  };
}
