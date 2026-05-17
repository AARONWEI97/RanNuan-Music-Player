import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAppTheme } from '../theme/ThemeContext';
import { getBanners, getPersonalizedPlaylist, getRecommendMusic, getHotSinger, getNewAlbum } from '../api/home';
import type { SongResult, RootStackScreenProps } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 160;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3;

interface BannerItem {
  imageUrl: string;
  targetId: number;
  targetType: number;
  titleColor: string;
  typeTitle: string;
}

interface PlaylistItem {
  id: number;
  name: string;
  picUrl: string;
  playCount: number;
}

interface ArtistItem {
  id: number;
  name: string;
  picUrl: string;
  img1v1Url: string;
}

interface AlbumItem {
  id: number;
  name: string;
  picUrl: string;
  artist: { name: string; id: number };
  publishTime: number;
}

function formatPlayCount(count: number): string {
  if (count >= 100000000) return `${(count / 100000000).toFixed(1)}亿`;
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  return String(count);
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<RootStackScreenProps<'Home'>['navigation']>();
  const insets = useSafeAreaInsets();
  const { playSong } = usePlayer();
  const { playAll } = usePlaylist();

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [recommendSongs, setRecommendSongs] = useState<SongResult[]>([]);
  const [hotSingers, setHotSingers] = useState<ArtistItem[]>([]);
  const [newAlbums, setNewAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const [bannersRes, playlistsRes, songsRes, singersRes, albumsRes] = await Promise.allSettled([
        getBanners(2),
        getPersonalizedPlaylist(6),
        getRecommendMusic({ limit: 12 }),
        getHotSinger({ offset: 0, limit: 6 }),
        getNewAlbum(),
      ]);

      let anySuccess = false;

      if (bannersRes.status === 'fulfilled') {
        anySuccess = true;
        const data = bannersRes.value?.data?.banners;
        if (Array.isArray(data)) {
          setBanners(
            data.map((b: any) => ({
              imageUrl: b.imageUrl || b.pic,
              targetId: b.targetId,
              targetType: b.targetType,
              typeTitle: b.typeTitle,
              titleColor: b.titleColor,
            }))
          );
        }
      }

      if (playlistsRes.status === 'fulfilled') {
        anySuccess = true;
        const data = playlistsRes.value?.data?.result;
        if (Array.isArray(data)) {
          setPlaylists(
            data.map((p: any) => ({
              id: p.id,
              name: p.name,
              picUrl: p.picUrl,
              playCount: p.playCount || 0,
            }))
          );
        }
      }

      if (songsRes.status === 'fulfilled') {
        anySuccess = true;
        const data = songsRes.value?.data?.result;
        if (Array.isArray(data)) {
          setRecommendSongs(data);
        }
      }

      if (singersRes.status === 'fulfilled') {
        anySuccess = true;
        const data = singersRes.value?.data?.artists;
        if (Array.isArray(data)) {
          setHotSingers(
            data.map((a: any) => ({
              id: a.id,
              name: a.name,
              picUrl: a.picUrl || a.img1v1Url,
              img1v1Url: a.img1v1Url,
            }))
          );
        }
      }

      if (albumsRes.status === 'fulfilled') {
        anySuccess = true;
        const data = albumsRes.value?.data?.albums;
        if (Array.isArray(data)) {
          setNewAlbums(
            data.slice(0, 6).map((a: any) => ({
              id: a.id,
              name: a.name,
              picUrl: a.picUrl || a.blurPicUrl,
              artist: { name: a.artist?.name || '', id: a.artist?.id || 0 },
              publishTime: a.publishTime,
            }))
          );
        }
      }

      // 全部 API 请求都失败时显示错误状态
      if (!anySuccess) {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handlePlaySong = useCallback(
    (song: SongResult, index: number) => {
      playAll(recommendSongs, index);
      playSong(song);
    },
    [recommendSongs, playAll, playSong]
  );

  const handleBannerScroll = useCallback((e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setActiveBannerIndex(index);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>加载失败</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      <Pressable style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>搜索音乐、歌手、歌词</Text>
      </Pressable>

      {banners.length > 0 && (
        <View style={styles.bannerSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleBannerScroll}
            scrollEventThrottle={16}
          >
            {banners.map((banner, index) => (
              <Image
                key={index}
                source={{ uri: banner.imageUrl }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          <View style={styles.paginationDots}>
            {banners.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, activeBannerIndex === index && styles.activeDot]}
              />
            ))}
          </View>
        </View>
      )}

      {playlists.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>推荐歌单</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {playlists.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.playlistCard}
                onPress={() => navigation.navigate('PlaylistDetail', { id: item.id })}
              >
                <Image source={{ uri: item.picUrl }} style={styles.playlistCover} />
                <Text style={styles.playlistName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.playCount}>{formatPlayCount(item.playCount)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {recommendSongs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>推荐音乐</Text>
          </View>
          {recommendSongs.slice(0, 6).map((song, index) => (
            <TouchableOpacity
              key={String(song.id)}
              style={styles.songItem}
              onPress={() => handlePlaySong(song, index)}
            >
              <Image source={{ uri: song.picUrl || song.al?.picUrl }} style={styles.songCover} />
              <View style={styles.songInfo}>
                <Text style={styles.songName} numberOfLines={1}>{song.name}</Text>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {song.ar?.map((a) => a.name).join(' / ') || '未知歌手'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {hotSingers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>热门歌手</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {hotSingers.map((artist) => (
              <TouchableOpacity
                key={artist.id}
                style={styles.artistCard}
                onPress={() => navigation.navigate('ArtistDetail', { id: artist.id })}
              >
                <Image source={{ uri: artist.picUrl }} style={styles.artistAvatar} />
                <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {newAlbums.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>新碟上架</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {newAlbums.map((album) => (
              <TouchableOpacity
                key={album.id}
                style={styles.albumCard}
                onPress={() => navigation.navigate('AlbumDetail', { id: album.id })}
              >
                <Image source={{ uri: album.picUrl }} style={styles.albumCover} />
                <Text style={styles.albumName} numberOfLines={2}>{album.name}</Text>
                <Text style={styles.albumArtist} numberOfLines={1}>{album.artist.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: 20,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  bannerSection: {
    marginBottom: 16,
  },
  bannerImage: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.divider,
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: colors.primary,
    width: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  horizontalScroll: {
    paddingHorizontal: 12,
  },
  playlistCard: {
    width: CARD_WIDTH + 8,
    marginHorizontal: 4,
  },
  playlistCover: {
    width: CARD_WIDTH + 8,
    height: CARD_WIDTH + 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
  },
  playlistName: {
    fontSize: 12,
    color: colors.text,
    marginTop: 6,
    lineHeight: 16,
  },
  playCount: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  songCover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: colors.surfaceVariant,
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  songName: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  songArtist: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  artistCard: {
    width: 80,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  artistAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceVariant,
  },
  artistName: {
    fontSize: 12,
    color: colors.text,
    marginTop: 6,
    textAlign: 'center',
  },
  albumCard: {
    width: CARD_WIDTH + 8,
    marginHorizontal: 4,
  },
  albumCover: {
    width: CARD_WIDTH + 8,
    height: CARD_WIDTH + 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
  },
  albumName: {
    fontSize: 12,
    color: colors.text,
    marginTop: 6,
    lineHeight: 16,
  },
  albumArtist: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  });
}
