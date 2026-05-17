import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SongResult } from '../types';
import { usePlayerStore } from './playerStore';

type MinifiedSong = Pick<SongResult, 'id' | 'name' | 'picUrl' | 'dt' | 'duration' | 'source'> & {
  ar: { id: number; name: string }[] | undefined;
  al: { id: number; name: string; picUrl?: string } | undefined;
};

const minifySong = (s: SongResult): MinifiedSong => ({
  id: s.id,
  name: s.name,
  picUrl: s.picUrl,
  ar: s.ar?.map((a) => ({ id: a.id, name: a.name })),
  al: s.al ? { id: s.al.id, name: s.al.name, picUrl: s.al.picUrl } : undefined,
  source: s.source,
  dt: s.dt,
  duration: s.duration,
});

const minifySongList = (list: SongResult[]): MinifiedSong[] => list.map(minifySong);

interface PlaylistState {
  playList: SongResult[];
  playListIndex: number;
  playMode: number;
  showPlaylistDrawer: boolean;
}

interface PlaylistActions {
  setPlayList: (list: SongResult[], keepIndex?: boolean) => void;
  addToNextPlay: (song: SongResult) => void;
  removeFromPlayList: (id: number | string) => void;
  clearPlayAll: () => void;
  togglePlayMode: () => void;
  nextPlay: () => void;
  prevPlay: () => void;
  setPlayListIndex: (index: number) => void;
  setShowPlaylistDrawer: (show: boolean) => void;
  getCurrentSong: () => SongResult | undefined;
}

export const usePlaylistStore = create<PlaylistState & PlaylistActions>()(
  persist(
    (set, get) => ({
      playList: [],
      playListIndex: 0,
      playMode: 0,
      showPlaylistDrawer: false,

      setPlayList: (list, keepIndex = false) => {
        if (list.length === 0) {
          set({ playList: [], playListIndex: 0 });
          return;
        }
        const playMusic = usePlayerStore.getState().playMusic;

        if (!keepIndex && playMusic) {
          const foundIndex = list.findIndex((item) => item.id === playMusic.id);
          set({ playList: list, playListIndex: foundIndex !== -1 ? foundIndex : 0 });
        } else if (!keepIndex) {
          set({ playList: list, playListIndex: 0 });
        } else {
          set({ playList: list });
        }
      },

      addToNextPlay: (song) => {
        const { playList, playListIndex } = get();
        const list = [...playList];
        const currentIndex = playListIndex;

        const existingIndex = list.findIndex((item) => item.id === song.id);
        if (existingIndex !== -1) {
          list.splice(existingIndex, 1);
          const newIndex = existingIndex <= currentIndex ? currentIndex - 1 : currentIndex;
          list.splice(newIndex + 1, 0, song);
          set({ playList: list, playListIndex: Math.max(0, newIndex) });
        } else {
          list.splice(currentIndex + 1, 0, song);
          set({ playList: list });
        }
      },

      removeFromPlayList: (id) => {
        const { playList } = get();
        const index = playList.findIndex((item) => item.id === id);
        if (index === -1) return;

        if (id === usePlayerStore.getState().playMusic?.id) {
          get().nextPlay();
        }

        const newPlayList = [...playList];
        newPlayList.splice(index, 1);
        set({ playList: newPlayList });
      },

      clearPlayAll: () => {
        usePlayerStore.setState({ playMusic: null, playMusicUrl: '', isPlay: false });
        set({ playList: [], playListIndex: 0 });
      },

      togglePlayMode: () => {
        const { playMode } = get();
        set({ playMode: (playMode + 1) % 4 });
      },

      nextPlay: () => {
        const { playList, playListIndex, playMode } = get();
        if (playList.length === 0) return;

        if (playMode === 0 && playListIndex >= playList.length - 1) {
          return;
        }

        let nextIndex: number;
        if (playMode === 2) {
          nextIndex = Math.floor(Math.random() * playList.length);
        } else {
          nextIndex = (playListIndex + 1) % playList.length;
        }

        set({ playListIndex: nextIndex });
        const nextSong = playList[nextIndex];
        if (nextSong) {
          usePlayerStore.setState({ playMusic: nextSong, isPlay: true });
        }
      },

      prevPlay: () => {
        const { playList, playListIndex, playMode } = get();
        if (playList.length === 0) return;

        let prevIndex: number;
        if (playMode === 2) {
          prevIndex = Math.floor(Math.random() * playList.length);
        } else {
          prevIndex = (playListIndex - 1 + playList.length) % playList.length;
        }

        set({ playListIndex: prevIndex });
        const prevSong = playList[prevIndex];
        if (prevSong) {
          usePlayerStore.setState({ playMusic: prevSong, isPlay: true });
        }
      },

      setPlayListIndex: (index) => set({ playListIndex: index }),
      setShowPlaylistDrawer: (show) => set({ showPlaylistDrawer: show }),

      getCurrentSong: () => {
        const { playList, playListIndex } = get();
        return playList[playListIndex];
      },
    }),
    {
      name: 'playlist-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        playList: minifySongList(state.playList),
        playListIndex: state.playListIndex,
        playMode: state.playMode,
      }),
    }
  )
);
