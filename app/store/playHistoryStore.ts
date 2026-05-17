import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SongResult } from '../types';

const MAX_MUSIC_HISTORY = 200;
const MAX_PLAYLIST_HISTORY = 50;
const MAX_ALBUM_HISTORY = 50;

interface PlayHistoryState {
  musicHistory: SongResult[];
  playlistHistory: any[];
  albumHistory: any[];
}

interface PlayHistoryActions {
  addToMusicHistory: (music: SongResult) => void;
  removeFromMusicHistory: (id: number | string) => void;
  clearMusicHistory: () => void;
  addToPlaylistHistory: (playlist: any) => void;
  addToAlbumHistory: (album: any) => void;
  clearAll: () => void;
}

export const usePlayHistoryStore = create<PlayHistoryState & PlayHistoryActions>()(
  persist(
    (set, get) => ({
      musicHistory: [],
      playlistHistory: [],
      albumHistory: [],

      addToMusicHistory: (music) => {
        const { musicHistory } = get();
        const index = musicHistory.findIndex((item) => item.id === music.id);
        let newHistory: SongResult[];

        if (index !== -1) {
          newHistory = [...musicHistory];
          const [existing] = newHistory.splice(index, 1);
          newHistory.unshift({ ...existing, count: (existing.count || 0) + 1 });
        } else {
          newHistory = [{ ...music, count: 1 }, ...musicHistory];
        }

        if (newHistory.length > MAX_MUSIC_HISTORY) {
          newHistory = newHistory.slice(0, MAX_MUSIC_HISTORY);
        }

        set({ musicHistory: newHistory });
      },

      removeFromMusicHistory: (id) => {
        set({ musicHistory: get().musicHistory.filter((item) => item.id !== id) });
      },

      clearMusicHistory: () => set({ musicHistory: [] }),

      addToPlaylistHistory: (playlist) => {
        const { playlistHistory } = get();
        const index = playlistHistory.findIndex((item) => item.id === playlist.id);
        const now = Date.now();
        let newHistory: any[];

        if (index !== -1) {
          newHistory = [...playlistHistory];
          const [existing] = newHistory.splice(index, 1);
          newHistory.unshift({
            ...existing,
            count: (existing.count || 0) + 1,
            lastPlayTime: now,
          });
        } else {
          newHistory = [{ ...playlist, count: 1, lastPlayTime: now }, ...playlistHistory];
        }

        if (newHistory.length > MAX_PLAYLIST_HISTORY) {
          newHistory = newHistory.slice(0, MAX_PLAYLIST_HISTORY);
        }

        set({ playlistHistory: newHistory });
      },

      addToAlbumHistory: (album) => {
        const { albumHistory } = get();
        const index = albumHistory.findIndex((item) => item.id === album.id);
        const now = Date.now();
        let newHistory: any[];

        if (index !== -1) {
          newHistory = [...albumHistory];
          const [existing] = newHistory.splice(index, 1);
          newHistory.unshift({
            ...existing,
            count: (existing.count || 0) + 1,
            lastPlayTime: now,
          });
        } else {
          newHistory = [{ ...album, count: 1, lastPlayTime: now }, ...albumHistory];
        }

        if (newHistory.length > MAX_ALBUM_HISTORY) {
          newHistory = newHistory.slice(0, MAX_ALBUM_HISTORY);
        }

        set({ albumHistory: newHistory });
      },

      clearAll: () => {
        set({
          musicHistory: [],
          playlistHistory: [],
          albumHistory: [],
        });
      },
    }),
    {
      name: 'play-history-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
