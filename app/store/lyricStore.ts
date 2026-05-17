import { create } from 'zustand';
import type { MusicILyric } from '../types';

interface LyricState {
  lyric: MusicILyric | null;
  currentLineIndex: number;
  isLoading: boolean;
  songId: number | null;
  fontSize: number;
}

interface LyricActions {
  setLyric: (lyric: MusicILyric | null, songId: number | null) => void;
  setCurrentLineIndex: (index: number) => void;
  setIsLoading: (loading: boolean) => void;
  setFontSize: (size: number) => void;
  reset: () => void;
}

const initialState: LyricState = {
  lyric: null,
  currentLineIndex: -1,
  isLoading: false,
  songId: null,
  fontSize: 16,
};

export const useLyricStore = create<LyricState & LyricActions>()((set) => ({
  ...initialState,

  setLyric: (lyric, songId) =>
    set({ lyric, songId, currentLineIndex: -1 }),

  setCurrentLineIndex: (index) =>
    set({ currentLineIndex: index }),

  setIsLoading: (loading) =>
    set({ isLoading: loading }),

  setFontSize: (size) =>
    set({ fontSize: Math.max(12, Math.min(28, size)) }),

  reset: () => set(initialState),
}));
