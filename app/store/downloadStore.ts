import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SongResult } from '../types';

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';

export interface DownloadTask {
  song: SongResult;
  status: DownloadStatus;
  progress: number;
  localUri: string;
  createdAt: number;
  fileSize?: number;
}

interface DownloadState {
  tasks: DownloadTask[];
  completedList: DownloadTask[];
}

interface DownloadActions {
  addTask: (song: SongResult) => void;
  updateTaskProgress: (songId: string | number, progress: number) => void;
  updateTaskStatus: (songId: string | number, status: DownloadStatus, localUri?: string, fileSize?: number) => void;
  removeTask: (songId: string | number) => void;
  clearCompleted: () => void;
  getTaskBySongId: (songId: string | number) => DownloadTask | undefined;
  isDownloaded: (songId: string | number) => boolean;
  getLocalUri: (songId: string | number) => string | null;
}

export const useDownloadStore = create<DownloadState & DownloadActions>()(
  persist(
    (set, get) => ({
      tasks: [],
      completedList: [],

      addTask: (song) =>
        set((state) => {
          const existing = state.tasks.find(
            (t) => String(t.song.id) === String(song.id)
          );
          if (existing) return state;

          return {
            tasks: [
              ...state.tasks,
              {
                song,
                status: 'pending',
                progress: 0,
                localUri: '',
                createdAt: Date.now(),
              },
            ],
          };
        }),

      updateTaskProgress: (songId, progress) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            String(t.song.id) === String(songId)
              ? { ...t, progress }
              : t
          ),
        })),

      updateTaskStatus: (songId, status, localUri, fileSize) =>
        set((state) => {
          const updatedTasks = state.tasks.map((t) =>
            String(t.song.id) === String(songId)
              ? { ...t, status, localUri: localUri || t.localUri, fileSize: fileSize || t.fileSize }
              : t
          );

          let updatedCompleted = state.completedList;
          if (status === 'completed') {
            const completedTask = updatedTasks.find(
              (t) => String(t.song.id) === String(songId)
            );
            if (completedTask) {
              const alreadyInCompleted = state.completedList.some(
                (c) => String(c.song.id) === String(songId)
              );
              if (!alreadyInCompleted) {
                updatedCompleted = [...state.completedList, { ...completedTask, status: 'completed' as const, progress: 1 }];
              }
            }
          }

          return { tasks: updatedTasks, completedList: updatedCompleted };
        }),

      removeTask: (songId) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => String(t.song.id) !== String(songId)),
          completedList: state.completedList.filter(
            (c) => String(c.song.id) !== String(songId)
          ),
        })),

      clearCompleted: () =>
        set((state) => ({
          completedList: [],
          tasks: state.tasks.filter((t) => t.status !== 'completed'),
        })),

      getTaskBySongId: (songId) => {
        const state = get();
        return state.tasks.find((t) => String(t.song.id) === String(songId));
      },

      isDownloaded: (songId) => {
        const state = get();
        return state.completedList.some(
          (c) => String(c.song.id) === String(songId) && c.status === 'completed'
        );
      },

      getLocalUri: (songId) => {
        const state = get();
        const completed = state.completedList.find(
          (c) => String(c.song.id) === String(songId) && c.status === 'completed'
        );
        return completed?.localUri || null;
      },
    }),
    {
      name: 'download-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        completedList: state.completedList.map((t) => ({
          song: {
            id: t.song.id,
            name: t.song.name,
            picUrl: t.song.picUrl,
            ar: t.song.ar,
            al: t.song.al,
            dt: t.song.dt,
            duration: t.song.duration,
          },
          status: t.status,
          localUri: t.localUri,
          createdAt: t.createdAt,
          fileSize: t.fileSize,
          progress: 1,
        })),
      }),
    }
  )
);
