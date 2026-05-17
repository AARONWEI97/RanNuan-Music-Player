import { useCallback } from 'react';

import { useDownloadStore, DownloadTask } from '../store/downloadStore';
import { downloadSong, deleteDownloadedSong, deleteAllDownloads, isSongDownloaded, getSongLocalUri } from '../services/downloadService';
import type { SongResult } from '../types';

export function useDownload() {
  const store = useDownloadStore();

  const download = useCallback(async (song: SongResult) => {
    await downloadSong(song);
  }, []);

  const remove = useCallback(async (songId: string | number) => {
    await deleteDownloadedSong(songId);
  }, []);

  const clearAll = useCallback(async () => {
    await deleteAllDownloads();
  }, []);

  const checkDownloaded = useCallback((songId: string | number): boolean => {
    return isSongDownloaded(songId);
  }, []);

  const getLocalUri = useCallback((songId: string | number): string | null => {
    return getSongLocalUri(songId);
  }, []);

  return {
    tasks: store.tasks,
    completedList: store.completedList,
    download,
    remove,
    clearAll,
    checkDownloaded,
    getLocalUri,
    isDownloaded: store.isDownloaded,
  };
}
