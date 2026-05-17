import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import type { AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import type { SongResult } from '../types';

type Track = {
  id: string;
  url: string;
  title: string;
  artist: string;
  album: string;
  artwork?: string;
  duration: number;
};

type ProgressUpdate = {
  position: number;   // seconds
  duration: number;   // seconds
  isPlaying: boolean;
};

let soundRef: Audio.Sound | null = null;
let currentTrackId: string | null = null;
let onPlaybackEndCallback: (() => void) | null = null;
let onProgressUpdateCallback: ((update: ProgressUpdate) => void) | null = null;
let playGeneration = 0; // 用于取消过期的播放请求

export const isPlayerAvailable = Platform.OS !== 'web';

export function setOnPlaybackEnd(callback: (() => void) | null) {
  onPlaybackEndCallback = callback;
}

export function setOnProgressUpdate(callback: ((update: ProgressUpdate) => void) | null) {
  onProgressUpdateCallback = callback;
}

export async function setupPlayer(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    console.warn('Audio mode setup error:', e);
  }
}

export function songToTrack(song: SongResult, url: string): Track {
  return {
    id: String(song.id),
    url,
    title: song.name || '未知歌曲',
    artist: song.ar?.map((a: any) => a.name).join(' / ') || '未知歌手',
    album: song.al?.name || '未知专辑',
    artwork: song.picUrl || song.al?.picUrl || undefined,
    duration: song.duration || song.dt || 0,
  };
}

function isSuccessStatus(status: AVPlaybackStatus): status is AVPlaybackStatusSuccess {
  return status.isLoaded;
}

function handlePlaybackStatusUpdate(status: AVPlaybackStatus) {
  if (!isSuccessStatus(status)) return;

  // 实时进度回调
  if (onProgressUpdateCallback && status.isPlaying) {
    const position = status.positionMillis / 1000;
    const duration = status.durationMillis ? status.durationMillis / 1000 : 0;
    onProgressUpdateCallback({ position, duration, isPlaying: true });
  }

  // 歌曲播放结束 → 自动下一首
  if (status.didJustFinish && !status.isLooping) {
    onPlaybackEndCallback?.();
  }
}

export async function playSong(song: SongResult, url: string): Promise<void> {
  const thisGeneration = ++playGeneration;
  try {
    // 同一首歌且 soundRef 存在 → 直接播放
    if (soundRef && currentTrackId === String(song.id)) {
      await soundRef.setStatusAsync({ shouldPlay: true, positionMillis: 0 });
      return;
    }

    // 卸载旧音频
    if (soundRef) {
      await soundRef.unloadAsync();
      soundRef = null;
    }

    // 检查是否有更新的播放请求
    if (thisGeneration !== playGeneration) return;

    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true },
      handlePlaybackStatusUpdate,
    );

    // 创建音频后再次检查，防止创建期间有新的播放请求
    if (thisGeneration !== playGeneration) {
      await sound.unloadAsync();
      return;
    }

    soundRef = sound;
    currentTrackId = String(song.id);
  } catch (e) {
    console.warn('playSong error:', e);
  }
}

export async function addToQueue(): Promise<void> {}

export async function playNext(): Promise<void> {}

export async function togglePlayback(): Promise<void> {
  if (!soundRef) return;
  try {
    const status = await soundRef.getStatusAsync();
    if (isSuccessStatus(status)) {
      if (status.isPlaying) {
        await soundRef.pauseAsync();
      } else {
        await soundRef.playAsync();
      }
    }
  } catch (e) {
    console.warn('togglePlayback error:', e);
  }
}

export async function seekTo(position: number): Promise<void> {
  if (!soundRef) return;
  try {
    await soundRef.setPositionAsync(position * 1000);
  } catch (e) {
    console.warn('seekTo error:', e);
  }
}

export async function setPlaybackRate(rate: number): Promise<void> {
  if (!soundRef) return;
  try {
    await soundRef.setRateAsync(rate, true);
  } catch (e) {
    console.warn('setPlaybackRate error:', e);
  }
}

export async function setVolume(volume: number): Promise<void> {
  if (!soundRef) return;
  try {
    await soundRef.setVolumeAsync(volume);
  } catch (e) {
    console.warn('setVolume error:', e);
  }
}

export async function skipToNext(): Promise<void> {}
export async function skipToPrevious(): Promise<void> {}

export async function getPlayerState(): Promise<string | undefined> {
  if (!soundRef) return undefined;
  try {
    const status = await soundRef.getStatusAsync();
    if (isSuccessStatus(status)) {
      return status.isPlaying ? 'playing' : 'paused';
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function getCurrentPosition(): Promise<number> {
  if (!soundRef) return 0;
  try {
    const status = await soundRef.getStatusAsync();
    if (isSuccessStatus(status)) {
      return status.positionMillis / 1000;
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function getBufferedPosition(): Promise<number> {
  if (!soundRef) return 0;
  try {
    const status = await soundRef.getStatusAsync();
    if (isSuccessStatus(status) && status.playableDurationMillis) {
      return status.playableDurationMillis / 1000;
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function getDuration(): Promise<number> {
  if (!soundRef) return 0;
  try {
    const status = await soundRef.getStatusAsync();
    if (isSuccessStatus(status) && status.durationMillis) {
      return status.durationMillis / 1000;
    }
    return 0;
  } catch {
    return 0;
  }
}

export function getSoundRef(): Audio.Sound | null {
  return soundRef;
}

export function hasSoundRef(): boolean {
  return soundRef !== null;
}

export async function stopPlayback(): Promise<void> {
  if (soundRef) {
    try {
      await soundRef.stopAsync();
      await soundRef.unloadAsync();
    } catch {}
    soundRef = null;
    currentTrackId = null;
  }
}

/**
 * Immediately silence the current playback (stop audio output) but keep
 * the soundRef alive so we can still check player state. Used when
 * switching songs so the user doesn't hear the old song during URL resolution.
 */
export async function fadeOutAndPause(): Promise<void> {
  if (soundRef) {
    try {
      await soundRef.stopAsync();
    } catch {}
  }
}
