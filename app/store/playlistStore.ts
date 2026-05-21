import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SongResult } from '../types';
import { usePlayerStore } from './playerStore';
import { stopPlayback, clearNextInQueue } from '../services/trackPlayerService';

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
  setPlayMode: (mode: number) => void;
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
        stopPlayback();
        usePlayerStore.setState({ playMusic: null, playMusicUrl: '', isPlay: false, currentProgress: 0, duration: 0 });
        set({ playList: [], playListIndex: 0 });
      },

      togglePlayMode: () => {
        const { playMode } = get();
        set({ playMode: (playMode + 1) % 3 });
        // ★ 清除原生队列中的 next track，让新模式重新预加载
        clearNextInQueue().catch(() => {});
        // ★ 重置随机索引和预加载缓存
        const _g = global as any;
        _g.__nextShuffleIndex = null;
        _g.__preloadedNextSong = null;
      },
      setPlayMode: (mode: number) => {
        set({ playMode: mode });
        clearNextInQueue().catch(() => {});
        const _g = global as any;
        _g.__nextShuffleIndex = null;
        _g.__preloadedNextSong = null;
      },

      nextPlay: () => {
        const { playList, playListIndex, playMode } = get();
        if (playList.length === 0) return;

        // 顺序模式：到末尾停止，不循环
        if (playMode === 0 && playListIndex >= playList.length - 1) {
          return;
        }

        let nextIndex: number;
        if (playMode === 2) {
          // ★ 随机模式：使用"确定性下一首"策略
          // 如果 usePlayer 已经预选了 __nextShuffleIndex，直接消费它
          // 否则 fallback 到纯随机
          const _g = global as any;
          if (_g.__nextShuffleIndex !== null && _g.__nextShuffleIndex !== undefined
              && _g.__nextShuffleIndex < playList.length) {
            nextIndex = _g.__nextShuffleIndex;
            // 消费后立即生成下一个随机索引，供预加载使用
            do {
              _g.__nextShuffleIndex = Math.floor(Math.random() * playList.length);
            } while (_g.__nextShuffleIndex === nextIndex && playList.length > 1);
          } else {
            nextIndex = Math.floor(Math.random() * playList.length);
            // 生成下一个
            do {
              _g.__nextShuffleIndex = Math.floor(Math.random() * playList.length);
            } while (_g.__nextShuffleIndex === nextIndex && playList.length > 1);
          }
        } else {
          // 顺序 / 心动 / 单曲循环（单曲循环在上层处理，这里不会走到）
          nextIndex = (playListIndex + 1) % playList.length;
        }

        set({ playListIndex: nextIndex });
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
        // 不再在这里设置 playMusic/isPlay，由 usePlayer.playSong 统一处理
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
