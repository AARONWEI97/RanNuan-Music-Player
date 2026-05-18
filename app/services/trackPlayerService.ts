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
let playGeneration = 0;
let hasEndedFlag = false;
let lastKnownDuration = 0;
let endCheckTimer: ReturnType<typeof setInterval> | null = null;
let isHighFreq = false;

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

/**
 * 启动定时轮询检测歌曲结束（expo-av 的 didJustFinish 在部分设备上不可靠）
 * 智能频率：歌曲前 80% 每 3 秒检查一次，接近末尾时每 1 秒检查一次
 */
function startEndCheck() {
  stopEndCheck();
  isHighFreq = false;
  endCheckTimer = setInterval(async () => {
    if (!soundRef || hasEndedFlag) return;
    try {
      const status = await soundRef.getStatusAsync();

      if (!status.isLoaded) {
        hasEndedFlag = true;
        onPlaybackEndCallback?.();
        stopEndCheck();
        return;
      }

      if (!status.durationMillis || status.isLooping) return;

      if (status.durationMillis > 0) {
        lastKnownDuration = status.durationMillis / 1000;
      }

      if (status.positionMillis >= status.durationMillis - 200) {
        hasEndedFlag = true;
        onPlaybackEndCallback?.();
        stopEndCheck();
      }
    } catch {}
  }, 3000);
}

/** 接近歌曲末尾时切换到高频检测 */
function speedUpEndCheck() {
  if (!endCheckTimer || !soundRef || hasEndedFlag || isHighFreq) return;
  isHighFreq = true;
  stopEndCheck();
  endCheckTimer = setInterval(async () => {
    if (!soundRef || hasEndedFlag) return;
    try {
      const status = await soundRef.getStatusAsync();

      if (!status.isLoaded) {
        hasEndedFlag = true;
        onPlaybackEndCallback?.();
        stopEndCheck();
        return;
      }

      if (!status.durationMillis || status.isLooping) return;
      if (status.positionMillis >= status.durationMillis - 200) {
        hasEndedFlag = true;
        onPlaybackEndCallback?.();
        stopEndCheck();
      }
    } catch {}
  }, 1000);
}

function stopEndCheck() {
  if (endCheckTimer) {
    clearInterval(endCheckTimer);
    endCheckTimer = null;
  }
}

function handlePlaybackStatusUpdate(status: AVPlaybackStatus) {
  if (!isSuccessStatus(status)) return;

  // 实时进度回调
  if (onProgressUpdateCallback && status.isPlaying) {
    const position = status.positionMillis / 1000;
    const duration = status.durationMillis ? status.durationMillis / 1000 : 0;
    if (duration > 0) lastKnownDuration = duration;
    onProgressUpdateCallback({ position, duration, isPlaying: true });

    // 智能提速：播放进度超过 80% 时切换到 1 秒高频检测
    if (status.durationMillis && status.positionMillis >= status.durationMillis * 0.8) {
      speedUpEndCheck();
    }
  } else if (status.durationMillis && status.durationMillis > 0) {
    lastKnownDuration = status.durationMillis / 1000;
  }

  if (hasEndedFlag) return;

  // 检测1: didJustFinish
  if (status.didJustFinish && !status.isLooping) {
    hasEndedFlag = true;
    onPlaybackEndCallback?.();
    return;
  }

  // 检测2: 进度到达末尾 + 不在播放
  if (
    status.durationMillis &&
    status.durationMillis > 0 &&
    status.positionMillis >= status.durationMillis - 300 &&
    !status.isPlaying &&
    !status.isLooping
  ) {
    hasEndedFlag = true;
    onPlaybackEndCallback?.();
    return;
  }

  // 检测3: position >= duration
  if (
    status.durationMillis &&
    status.durationMillis > 0 &&
    status.positionMillis >= status.durationMillis &&
    !status.isLooping
  ) {
    hasEndedFlag = true;
    onPlaybackEndCallback?.();
    return;
  }
}

export async function playSong(song: SongResult, url: string): Promise<void> {
  const thisGeneration = ++playGeneration;
  hasEndedFlag = false;
  lastKnownDuration = 0;
  try {
    // 同一首歌且 soundRef 存在 → 直接播放
    if (soundRef && currentTrackId === String(song.id)) {
      hasEndedFlag = false;
      await soundRef.setStatusAsync({ shouldPlay: true, positionMillis: 0 });
      startEndCheck();
      return;
    }

    // 卸载旧音频 + 停止旧轮询
    stopEndCheck();
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

    if (thisGeneration !== playGeneration) {
      await sound.unloadAsync();
      return;
    }

    soundRef = sound;
    currentTrackId = String(song.id);
    startEndCheck();
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
  stopEndCheck();
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
  stopEndCheck();
  if (soundRef) {
    try {
      await soundRef.stopAsync();
    } catch {}
  }
}
