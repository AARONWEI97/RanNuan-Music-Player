import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FavoriteState {
  favoriteList: number[];
  dislikeList: number[];
}

interface FavoriteActions {
  addToFavorite: (id: number) => void;
  removeFromFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
  addToDislikeList: (id: number) => void;
  removeFromDislikeList: (id: number) => void;
  isDisliked: (id: number) => boolean;
  initializeFavoriteList: (ids: number[]) => void;
}

export const useFavoriteStore = create<FavoriteState & FavoriteActions>()(
  persist(
    (set, get) => ({
      favoriteList: [],
      dislikeList: [],

      addToFavorite: (id) => {
        const { favoriteList } = get();
        if (!favoriteList.includes(id)) {
          set({ favoriteList: [...favoriteList, id] });
        }
      },

      removeFromFavorite: (id) => {
        set({ favoriteList: get().favoriteList.filter((existingId) => existingId !== id) });
      },

      isFavorite: (id) => get().favoriteList.includes(id),

      addToDislikeList: (id) => {
        const { dislikeList } = get();
        if (!dislikeList.includes(id)) {
          set({ dislikeList: [...dislikeList, id] });
        }
      },

      removeFromDislikeList: (id) => {
        set({ dislikeList: get().dislikeList.filter((existingId) => existingId !== id) });
      },

      isDisliked: (id) => get().dislikeList.includes(id),

      initializeFavoriteList: (ids) => {
        const { favoriteList } = get();
        const merged = Array.from(new Set([...favoriteList, ...ids]));
        set({ favoriteList: merged });
      },
    }),
    {
      name: 'favorite-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
