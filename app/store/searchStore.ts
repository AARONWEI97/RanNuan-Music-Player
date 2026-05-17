import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SearchState {
  searchValue: string;
  searchType: number;
}

interface SearchActions {
  setSearchValue: (value: string) => void;
  setSearchType: (type: number) => void;
}

export const useSearchStore = create<SearchState & SearchActions>()(
  persist(
    (set) => ({
      searchValue: '',
      searchType: 1,

      setSearchValue: (value) => set({ searchValue: value }),
      setSearchType: (type) => set({ searchType: type }),
    }),
    {
      name: 'search-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ searchValue: state.searchValue }),
    }
  )
);
