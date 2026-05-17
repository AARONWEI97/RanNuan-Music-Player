import { useState, useCallback } from 'react';

import { useSearchStore } from '../store/searchStore';
import { getSearch } from '../api/search';
import { getSearchSuggestions } from '../api/search';
import { getHotSearch } from '../api/home';
import type { SongResult } from '../types';

export function useSearch() {
  const searchStore = useSearchStore();
  const [searchResults, setSearchResults] = useState<SongResult[]>([]);
  const [hotSearch, setHotSearch] = useState<{ searchWord: string; content: string }[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (keyword: string, type: number = 1) => {
    if (!keyword.trim()) return;
    searchStore.setSearchValue(keyword);
    searchStore.setSearchType(type);
    setLoading(true);
    try {
      const res = await getSearch({ keywords: keyword, type });
      const songs = res?.data?.result?.songs;
      if (Array.isArray(songs)) {
        setSearchResults(
          songs.map((s: any) => ({
            id: s.id,
            name: s.name,
            picUrl: s.al?.picUrl || '',
            ar: s.ar || [],
            al: s.al || { name: '', id: 0, picUrl: '' },
            dt: s.dt || 0,
            duration: s.dt || 0,
            count: 0,
          }))
        );
      }
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchStore]);

  const fetchHotSearch = useCallback(async () => {
    try {
      const res = await getHotSearch();
      const data = res?.data?.data;
      if (Array.isArray(data)) {
        setHotSearch(
          data.map((item: any) => ({
            searchWord: item.searchWord,
            content: item.content,
          }))
        );
      }
    } catch {}
  }, []);

  const fetchSearchSuggestions = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const result = await getSearchSuggestions(keyword);
      setSuggestions(result);
    } catch {
      setSuggestions([]);
    }
  }, []);

  return {
    search,
    getHotSearch: fetchHotSearch,
    getSearchSuggestions: fetchSearchSuggestions,
    searchResults,
    hotSearch,
    suggestions,
    loading,
    searchValue: searchStore.searchValue,
    searchType: searchStore.searchType,
  };
}
