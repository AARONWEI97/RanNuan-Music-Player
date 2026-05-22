import { useState, useCallback, useRef } from 'react';

import { useSearchStore } from '../store/searchStore';
import { getSearch } from '../api/search';
import { getSearchSuggestions } from '../api/search';
import { getHotSearch } from '../api/home';
import type { SongResult } from '../types';

const SONG_PAGE_SIZE = 100;

function mapSongToResult(s: any): SongResult {
  return {
    id: s.id,
    name: s.name,
    picUrl: s.al?.picUrl || '',
    ar: s.ar || [],
    al: s.al || { name: '', id: 0, picUrl: '' },
    dt: s.dt || 0,
    duration: s.dt || 0,
    count: 0,
  };
}

export function useSearch() {
  const searchStore = useSearchStore();
  const [searchResults, setSearchResults] = useState<SongResult[]>([]);
  const [hotSearch, setHotSearch] = useState<{ searchWord: string; content: string }[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreSong, setHasMoreSong] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const songOffsetRef = useRef(0);

  const search = useCallback(async (keyword: string, type: number = 1) => {
    if (!keyword.trim()) return;
    searchStore.setSearchValue(keyword);
    searchStore.setSearchType(type);
    setLoading(true);
    try {
      const res = await getSearch({ keywords: keyword, type, limit: SONG_PAGE_SIZE, offset: 0 });
      const result = res?.data?.result;

      // song data lives under result.songs (array) or result.song.songs
      const songResult = result?.song || result;
      const songs = songResult?.songs || result?.songs;
      const more = songResult?.more ?? result?.more ?? false;

      if (Array.isArray(songs)) {
        setSearchResults(songs.map(mapSongToResult));
        setHasMoreSong(more);
        songOffsetRef.current = 0;
      } else {
        setSearchResults([]);
        setHasMoreSong(false);
      }
    } catch {
      setSearchResults([]);
      setHasMoreSong(false);
    } finally {
      setLoading(false);
    }
  }, [searchStore]);

  const loadMoreSongs = useCallback(async (keyword: string) => {
    if (loadingMore || !hasMoreSong || !keyword.trim()) return;
    setLoadingMore(true);
    try {
      const nextOffset = songOffsetRef.current + SONG_PAGE_SIZE;
      const res = await getSearch({
        keywords: keyword,
        type: 1,
        limit: SONG_PAGE_SIZE,
        offset: nextOffset,
      });
      const result = res?.data?.result;
      const songResult = result?.song || result;
      const songs = songResult?.songs || result?.songs;
      const more = songResult?.more ?? result?.more ?? false;

      if (Array.isArray(songs) && songs.length > 0) {
        setSearchResults((prev) => [...prev, ...songs.map(mapSongToResult)]);
        setHasMoreSong(more);
        songOffsetRef.current = nextOffset;
      } else {
        setHasMoreSong(false);
      }
    } catch {} finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreSong]);

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
    loadMoreSongs,
    searchResults,
    hotSearch,
    suggestions,
    loading,
    loadingMore,
    hasMoreSong,
    searchValue: searchStore.searchValue,
    searchType: searchStore.searchType,
  };
}
