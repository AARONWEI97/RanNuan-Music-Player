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

let soundRef: Audio.Sound | null = null;
let currentTrackId: string | null = null;

export const isPlayerAvailable = Platform.OS !== 'web';

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

export async function playSong(song: SongResult, url: string): Promise<void> {
  try {
    if (soundRef && currentTrackId === String(song.id)) {
      await soundRef.playAsync();
      return;
    }

    if (soundRef) {
      await soundRef.unloadAsync();
      soundRef = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true },
    );
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
