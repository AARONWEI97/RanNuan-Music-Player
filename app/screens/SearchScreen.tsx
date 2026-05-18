import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useSearch } from '../hooks/useSearch';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useSearchStore } from '../store/searchStore';
import { getSearch } from '../api/search';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { SEARCH_TYPE_SONG, SEARCH_TYPE_ALBUM, SEARCH_TYPE_ARTIST, SEARCH_TYPE_PLAYLIST } from '../constants/config';
import type { SongResult, RootStackScreenProps } from '../types';
import SongList from '../components/music/SongList';
import NetworkImage from '../components/common/NetworkImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3;
const MAX_HISTORY = 20;
const DEBOUNCE_MS = 300;

interface ArtistResult {
  id: number;
  name: string;
  picUrl: string;
  img1v1Url: string;
  albumSize: number;
}

interface AlbumResult {
  id: number;
  name: string;
  picUrl: string;
  artist: { name: string; id: number };
}

interface PlaylistResult {
  id: number;
  name: string;
  coverImgUrl: string;
  trackCount: number;
  playCount: number;
  creator: { nickname: string };
}

const SEARCH_TABS = [
  { key: SEARCH_TYPE_SONG, label: '单曲', icon: 'music-note' as const },
  { key: SEARCH_TYPE_ARTIST, label: '歌手', icon: 'account-music' as const },
  { key: SEARCH_TYPE_ALBUM, label: '专辑', icon: 'disc' as const },
  { key: SEARCH_TYPE_PLAYLIST, label: '歌单', icon: 'playlist-music' as const },
];

export default function SearchScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackScreenProps<'Search'>['navigation']>();
  const { search, getHotSearch, searchResults, hotSearch, loading: songLoading, searchValue } = useSearch();
  const { playSong } = usePlayer();
  const { playAll } = usePlaylist();
  const searchStore = useSearchStore();

  const [keyword, setKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState(SEARCH_TYPE_SONG);
  const [artists, setArtists] = useState<ArtistResult[]>([]);
  const [albums, setAlbums] = useState<AlbumResult[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistResult[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getHotSearch();
    loadSearchHistory();
  }, []);

  // Auto-search from deep link (e.g. 歌单广场 / 新碟上架)
  useEffect(() => {
    const stored = searchStore.searchValue;
    if (stored && stored.trim()) {
      setKeyword(stored);
      setIsSearching(true);
      if (inputRef.current) {
        inputRef.current.setNativeProps({ text: stored });
      }
      search(stored, SEARCH_TYPE_SONG);
      // Clear after consuming
      searchStore.setSearchValue('');
    }
  }, [searchStore.searchValue]);

  const loadSearchHistory = useCallback(async () => {
    try {
      const stored = searchStore.searchValue;
      if (stored) {
        setSearchHistory([stored]);
      }
    } catch {}
  }, [searchStore]);

  const addToHistory = useCallback((kw: string) => {
    if (!kw.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item !== kw);
      const updated = [kw, ...filtered].slice(0, MAX_HISTORY);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  const performSearch = useCallback(async (kw: string, type: number) => {
    if (!kw.trim()) return;
    setTabLoading(true);
    try {
      const res = await getSearch({ keywords: kw, type, limit: 30 });
      const result = res?.data?.result;

      if (type === SEARCH_TYPE_ARTIST) {
        const data = result?.artists;
        if (Array.isArray(data)) {
          setArtists(
            data.map((a: any) => ({
              id: a.id,
              name: a.name,
              picUrl: a.picUrl || a.img1v1Url || '',
              img1v1Url: a.img1v1Url || '',
              albumSize: a.albumSize || 0,
            }))
          );
        }
      } else if (type === SEARCH_TYPE_ALBUM) {
        const data = result?.albums;
        if (Array.isArray(data)) {
          setAlbums(
            data.map((a: any) => ({
              id: a.id,
              name: a.name,
              picUrl: a.picUrl || a.blurPicUrl || '',
              artist: { name: a.artist?.name || '', id: a.artist?.id || 0 },
            }))
          );
        }
      } else if (type === SEARCH_TYPE_PLAYLIST) {
        const data = result?.playLists || result?.playlists;
        if (Array.isArray(data)) {
          setPlaylists(
            data.map((p: any) => ({
              id: p.id,
              name: p.name,
              coverImgUrl: p.coverImgUrl || '',
              trackCount: p.trackCount || 0,
              playCount: p.playCount || 0,
              creator: { nickname: p.creator?.nickname || '' },
            }))
          );
        }
      }
    } catch {
    } finally {
      setTabLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((text: string) => {
    setKeyword(text);
    setIsSearching(text.trim().length > 0);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.trim()) {
      debounceRef.current = setTimeout(() => {
        search(text, SEARCH_TYPE_SONG);
        performSearch(text, SEARCH_TYPE_ARTIST);
        performSearch(text, SEARCH_TYPE_ALBUM);
        performSearch(text, SEARCH_TYPE_PLAYLIST);
        addToHistory(text.trim());
      }, DEBOUNCE_MS);
    }
  }, [search, performSearch, addToHistory]);

  const handleKeywordPress = useCallback((kw: string) => {
    setKeyword(kw);
    setIsSearching(true);
    if (Platform.OS !== 'web' && inputRef.current) {
      inputRef.current.setNativeProps({ text: kw });
    }
    search(kw, SEARCH_TYPE_SONG);
    performSearch(kw, SEARCH_TYPE_ARTIST);
    performSearch(kw, SEARCH_TYPE_ALBUM);
    performSearch(kw, SEARCH_TYPE_PLAYLIST);
    addToHistory(kw.trim());
  }, [search, performSearch, addToHistory]);

  const handleClearInput = useCallback(() => {
    setKeyword('');
    setIsSearching(false);
    inputRef.current?.focus();
  }, []);

  const handleSongPress = useCallback((song: SongResult, index: number) => {
    playAll(searchResults, index);
    playSong(song);
  }, [searchResults, playAll, playSong]);

  const handleTabPress = useCallback((type: number) => {
    setActiveTab(type);
    if (keyword.trim() && type !== SEARCH_TYPE_SONG) {
      performSearch(keyword, type);
    }
  }, [keyword, performSearch]);

  const renderSearchBar = () => (
    <View style={[styles.searchBar, { marginTop: insets.top }]}>
      <View style={[styles.searchInputContainer, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="搜索音乐、歌手、歌词"
          placeholderTextColor={colors.textSecondary}
          value={keyword}
          onChangeText={handleInputChange}
          autoFocus={false}
          returnKeyType="search"
        />
        {keyword.length > 0 && (
          <TouchableOpacity onPress={handleClearInput} style={styles.clearButton}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {isSearching && (
        <TouchableOpacity onPress={() => { setKeyword(''); setIsSearching(false); }} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: colors.primary }]}>取消</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHotSearch = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="fire" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>热搜</Text>
      </View>
      <View style={styles.tagContainer}>
        {hotSearch.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.tag, { backgroundColor: colors.surface }]}
            onPress={() => handleKeywordPress(item.searchWord)}
          >
            <Text style={[styles.tagIndex, { color: index < 3 ? colors.primary : colors.textTertiary }]}>{index + 1}</Text>
            <Text style={[styles.tagText, { color: colors.text }]}>{item.searchWord}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderHistory = () => {
    if (searchHistory.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <MaterialCommunityIcons name="history" size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>搜索历史</Text>
          </View>
          <TouchableOpacity onPress={clearHistory}>
            <MaterialCommunityIcons name="delete-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.tagContainer}>
          {searchHistory.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.historyTag, { backgroundColor: colors.surface }]}
              onPress={() => handleKeywordPress(item)}
            >
              <Text style={[styles.historyTagText, { color: colors.textSecondary }]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderTabBar = () => (
    <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
      {SEARCH_TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            activeTab === tab.key && { backgroundColor: colors.primary },
          ]}
          onPress={() => handleTabPress(tab.key)}
        >
          <MaterialCommunityIcons
            name={tab.icon}
            size={14}
            color={activeTab === tab.key ? '#ffffff' : colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderArtistCard = ({ item }: { item: ArtistResult }) => (
    <TouchableOpacity
      style={styles.artistCard}
      onPress={() => navigation.navigate('ArtistDetail', { id: item.id })}
    >
      <NetworkImage uri={item.picUrl || item.img1v1Url} style={styles.artistAvatar} />
      <Text style={[styles.artistName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[styles.artistAlbumCount, { color: colors.textTertiary }]}>{item.albumSize}张专辑</Text>
    </TouchableOpacity>
  );

  const renderAlbumCard = ({ item }: { item: AlbumResult }) => (
    <TouchableOpacity
      style={styles.albumCard}
      onPress={() => navigation.navigate('AlbumDetail', { id: item.id })}
    >
      <NetworkImage uri={item.picUrl} style={styles.albumCover} />
      <Text style={[styles.albumName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
      <Text style={[styles.albumArtist, { color: colors.textSecondary }]} numberOfLines={1}>{item.artist.name}</Text>
    </TouchableOpacity>
  );

  const renderPlaylistCard = ({ item }: { item: PlaylistResult }) => (
    <TouchableOpacity
      style={styles.playlistCard}
      onPress={() => navigation.navigate('PlaylistDetail', { id: item.id })}
    >
      <NetworkImage uri={item.coverImgUrl} style={styles.playlistCover} />
      <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
      <Text style={[styles.playlistMeta, { color: colors.textSecondary }]}>{item.trackCount}首 · by {item.creator.nickname}</Text>
    </TouchableOpacity>
  );

  const renderSearchResults = () => {
    const isLoading = activeTab === SEARCH_TYPE_SONG ? songLoading : tabLoading;

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    switch (activeTab) {
      case SEARCH_TYPE_SONG:
        return (
          <SongList
            songs={searchResults}
            onSongPress={handleSongPress}
            currentSongId={undefined}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="music-note-off" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无搜索结果</Text>
              </View>
            }
          />
        );
      case SEARCH_TYPE_ARTIST:
        return (
          <FlatList
            data={artists}
            renderItem={renderArtistCard}
            keyExtractor={(item) => String(item.id)}
            numColumns={3}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无搜索结果</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        );
      case SEARCH_TYPE_ALBUM:
        return (
          <FlatList
            data={albums}
            renderItem={renderAlbumCard}
            keyExtractor={(item) => String(item.id)}
            numColumns={3}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无搜索结果</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        );
      case SEARCH_TYPE_PLAYLIST:
        return (
          <FlatList
            data={playlists}
            renderItem={renderPlaylistCard}
            keyExtractor={(item) => String(item.id)}
            numColumns={3}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无搜索结果</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderSearchBar()}

      {isSearching ? (
        <View style={styles.resultsContainer}>
          {renderTabBar()}
          <View style={styles.resultsContent}>
            {renderSearchResults()}
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.defaultContent}
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {renderHotSearch()}
          {renderHistory()}
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: colors.background,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    ...Typography.body2,
    paddingVertical: 0,
    marginLeft: Spacing.sm,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  cancelButton: {
    marginLeft: Spacing.md,
  },
  cancelText: {
    ...Typography.body2,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '600',
    marginLeft: 6,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tagIndex: {
    ...Typography.caption,
    fontWeight: '700',
    marginRight: Spacing.xs,
    minWidth: 16,
  },
  tagText: {
    ...Typography.caption,
  },
  historyTag: {
    borderRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  historyTagText: {
    ...Typography.caption,
  },
  defaultContent: {
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.xxl,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xxl,
  },
  tabText: {
    ...Typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
  },
  resultsContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    ...Typography.body2,
    marginTop: Spacing.sm,
  },
  gridContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  row: {
    marginBottom: Spacing.md,
  },
  artistCard: {
    width: CARD_WIDTH,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  artistAvatar: {
    width: CARD_WIDTH - 8,
    height: CARD_WIDTH - 8,
    borderRadius: (CARD_WIDTH - 8) / 2,
    backgroundColor: colors.surfaceVariant,
  },
  artistName: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  artistAlbumCount: {
    ...Typography.overline,
    marginTop: 2,
  },
  albumCard: {
    width: CARD_WIDTH,
    marginHorizontal: Spacing.xs,
  },
  albumCover: {
    width: CARD_WIDTH - 8,
    height: CARD_WIDTH - 8,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surfaceVariant,
  },
  albumName: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  albumArtist: {
    ...Typography.overline,
    marginTop: 2,
  },
  playlistCard: {
    width: CARD_WIDTH,
    marginHorizontal: Spacing.xs,
  },
  playlistCover: {
    width: CARD_WIDTH - 8,
    height: CARD_WIDTH - 8,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surfaceVariant,
  },
  playlistName: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  playlistMeta: {
    ...Typography.overline,
    marginTop: 2,
  },
  });
}
