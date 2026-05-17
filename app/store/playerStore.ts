import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SongResult } from '../types';

interface PlayerState {
  isPlay: boolean;
  playMusic: SongResult | null;
  playMusicUrl: string;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  currentProgress: number;
  duration: number;
}

interface PlayerActions {
  setIsPlay: (value: boolean) => void;
  setPlayMusic: (music: SongResult | null) => void;
  setPlayMusicUrl: (url: string) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  setCurrentProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
}

export const usePlayerStore = create<PlayerState & PlayerActions>()(
  persist(
    (set, get) => ({
      isPlay: false,
      playMusic: null,
      playMusicUrl: '',
      volume: 1,
      isMuted: false,
      playbackRate: 1,
      currentProgress: 0,
      duration: 0,

      setIsPlay: (value) => set({ isPlay: value }),
      setPlayMusic: (music) => set({ playMusic: music }),
      setPlayMusicUrl: (url) => set({ playMusicUrl: url }),
      setVolume: (volume) => {
        const normalized = Math.max(0, Math.min(1, volume));
        const updates: Partial<PlayerState> = { volume: normalized };
        if (get().isMuted && normalized > 0) {
          updates.isMuted = false;
        }
        set(updates);
      },
      setMuted: (muted) => {
        if (get().isMuted === muted) return;
        set({ isMuted: muted });
      },
      toggleMute: () => set({ isMuted: !get().isMuted }),
      setPlaybackRate: (rate) => set({ playbackRate: rate }),
      setCurrentProgress: (progress) => set({ currentProgress: progress }),
      setDuration: (duration) => set({ duration }),
    }),
    {
      name: 'player-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        playMusic: state.playMusic
          ? {
              id: state.playMusic.id,
              name: state.playMusic.name,
              picUrl: state.playMusic.picUrl,
              ar: state.playMusic.ar,
              al: state.playMusic.al,
              dt: state.playMusic.dt,
              duration: state.playMusic.duration,
              source: state.playMusic.source,
            }
          : null,
        volume: state.volume,
        isMuted: state.isMuted,
        playbackRate: state.playbackRate,
      }),
    }
  )
);
