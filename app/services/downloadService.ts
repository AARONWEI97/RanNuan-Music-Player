import * as FileSystem from 'expo-file-system/legacy';

import { useDownloadStore } from '../store/downloadStore';
import { getMusicUrl } from '../api/music';
import { parseMusicUrl } from './musicParserService';
import { useSettingsStore } from '../store/settingsStore';
import type { SongResult } from '../types';

const MUSIC_DIR = `${FileSystem.documentDirectory}music/`;

async function ensureMusicDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(MUSIC_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MUSIC_DIR, { intermediates: true });
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\s]/g, '_').substring(0, 100);
}

function getLocalPath(song: SongResult): string {
  const fileName = `${sanitizeFileName(String(song.id))}_${sanitizeFileName(song.name)}.mp3`;
  return `${MUSIC_DIR}${fileName}`;
}

export async function downloadSong(song: SongResult): Promise<void> {
  const store = useDownloadStore.getState();
  const existing = store.getTaskBySongId(song.id);
  if (existing && (existing.status === 'downloading' || existing.status === 'completed')) {
    return;
  }

  store.addTask(song);
  store.updateTaskStatus(song.id, 'downloading');

  try {
    await ensureMusicDir();

    let url: string | null = null;

    const res = await getMusicUrl(Number(song.id));
    url = res?.data?.data?.[0]?.url || null;

    if (!url) {
      const enableMusicParsing = useSettingsStore.getState().enableMusicParsing;
      const musicQuality = useSettingsStore.getState().musicQuality;
      if (enableMusicParsing) {
        url = await parseMusicUrl(song.id, song, musicQuality, true);
      }
    }

    if (!url) {
      store.updateTaskStatus(song.id, 'failed');
      return;
    }

    const localPath = getLocalPath(song);

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      localPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        store.updateTaskProgress(song.id, Math.min(progress, 1));
      }
    );

    const result = await downloadResumable.downloadAsync();

    if (result && result.uri) {
      const fileInfo = await FileSystem.getInfoAsync(result.uri);
      store.updateTaskStatus(
        song.id,
        'completed',
        result.uri,
        fileInfo.exists ? (fileInfo as any).size : undefined
      );
    } else {
      store.updateTaskStatus(song.id, 'failed');
    }
  } catch (e) {
    console.warn(`[DownloadService] Failed to download "${song.name}":`, e);
    store.updateTaskStatus(song.id, 'failed');
  }
}

export async function deleteDownloadedSong(songId: string | number): Promise<void> {
  const store = useDownloadStore.getState();
  const localUri = store.getLocalUri(songId);

  if (localUri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localUri);
      }
    } catch (e) {
      console.warn('[DownloadService] Failed to delete file:', e);
    }
  }

  store.removeTask(songId);
}

export async function deleteAllDownloads(): Promise<void> {
  const store = useDownloadStore.getState();

  try {
    const dirInfo = await FileSystem.getInfoAsync(MUSIC_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(MUSIC_DIR);
      await ensureMusicDir();
    }
  } catch (e) {
    console.warn('[DownloadService] Failed to delete music directory:', e);
  }

  store.clearCompleted();
}

export async function getDownloadedFileSize(songId: string | number): Promise<number | null> {
  const store = useDownloadStore.getState();
  const localUri = store.getLocalUri(songId);
  if (!localUri) return null;

  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      return (fileInfo as any).size || null;
    }
  } catch {}
  return null;
}

export function isSongDownloaded(songId: string | number): boolean {
  return useDownloadStore.getState().isDownloaded(songId);
}

export function getSongLocalUri(songId: string | number): string | null {
  return useDownloadStore.getState().getLocalUri(songId);
}
