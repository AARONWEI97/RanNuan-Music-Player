import { useCallback } from 'react';

import { useFavoriteStore } from '../store/favoriteStore';
import { likeSong } from '../api/music';

export function useFavorite() {
  const favoriteStore = useFavoriteStore();

  const isFavorite = useCallback((id: number): boolean => {
    return favoriteStore.isFavorite(id);
  }, [favoriteStore]);

  const toggleFavorite = useCallback(async (id: number) => {
    const currentlyFavorite = favoriteStore.isFavorite(id);
    try {
      await likeSong(id, !currentlyFavorite);
      if (currentlyFavorite) {
        favoriteStore.removeFromFavorite(id);
      } else {
        favoriteStore.addToFavorite(id);
      }
    } catch {}
  }, [favoriteStore]);

  return {
    isFavorite,
    toggleFavorite,
    favoriteList: favoriteStore.favoriteList,
  };
}
