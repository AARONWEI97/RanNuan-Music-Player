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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
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
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>加载失败</Text>
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
      {/* Hero greeting area */}
      <View style={styles.heroSection}>
        <Text style={[styles.greeting, { color: colors.text }]}>{getGreeting()}</Text>
        <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>发现你喜欢的音乐</Text>
      </View>

      {/* Search bar */}
      <Pressable style={[styles.searchBar, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate('Search')}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
        <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>搜索音乐、歌手、歌词</Text>
      </Pressable>

      {/* Banners */}
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
                style={[
                  styles.dot,
                  { backgroundColor: activeBannerIndex === index ? colors.primary : colors.divider },
                  activeBannerIndex === index && styles.activeDot,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Recommended playlists */}
      {playlists.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>推荐歌单</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {playlists.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.playlistCard}
                onPress={() => navigation.navigate('PlaylistDetail', { id: item.id })}
              >
                <View style={styles.playlistCoverWrapper}>
                  <Image source={{ uri: item.picUrl }} style={styles.playlistCover} />
                  <View style={styles.playCountBadge}>
                    <MaterialCommunityIcons name="play" size={10} color="#ffffff" />
                    <Text style={styles.playCountText}>{formatPlayCount(item.playCount)}</Text>
                  </View>
                </View>
                <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recommended songs */}
      {recommendSongs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>推荐音乐</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </View>
          {recommendSongs.slice(0, 6).map((song, index) => (
            <TouchableOpacity
              key={String(song.id)}
              style={[styles.songItem, { borderBottomColor: colors.divider }]}
              onPress={() => handlePlaySong(song, index)}
            >
              <Image source={{ uri: song.picUrl || song.al?.picUrl }} style={styles.songCover} />
              <View style={styles.songInfo}>
                <Text style={[styles.songName, { color: colors.text }]} numberOfLines={1}>{song.name}</Text>
                <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                  {song.ar?.map((a) => a.name).join(' / ') || '未知歌手'}
                </Text>
              </View>
              <MaterialCommunityIcons name="play-circle-outline" size={28} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Hot singers */}
      {hotSingers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>热门歌手</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {hotSingers.map((artist) => (
              <TouchableOpacity
                key={artist.id}
                style={styles.artistCard}
                onPress={() => navigation.navigate('ArtistDetail', { id: artist.id })}
              >
                <Image source={{ uri: artist.picUrl }} style={styles.artistAvatar} />
                <Text style={[styles.artistName, { color: colors.text }]} numberOfLines={1}>{artist.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* New albums */}
      {newAlbums.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>新碟上架</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {newAlbums.map((album) => (
              <TouchableOpacity
                key={album.id}
                style={styles.albumCard}
                onPress={() => navigation.navigate('AlbumDetail', { id: album.id })}
              >
                <Image source={{ uri: album.picUrl }} style={styles.albumCover} />
                <Text style={[styles.albumName, { color: colors.text }]} numberOfLines={2}>{album.name}</Text>
                <Text style={[styles.albumArtist, { color: colors.textSecondary }]} numberOfLines={1}>{album.artist.name}</Text>
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
  heroSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  greeting: {
    ...Typography.h2,
    fontWeight: '700',
  },
  greetingSub: {
    ...Typography.body2,
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.xxl,
  },
  searchPlaceholder: {
    ...Typography.body2,
    marginLeft: Spacing.sm,
  },
  bannerSection: {
    marginBottom: Spacing.md,
  },
  bannerImage: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  activeDot: {
    width: 16,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
  },
  horizontalScroll: {
    paddingHorizontal: Spacing.md,
  },
  playlistCard: {
    width: CARD_WIDTH + 8,
    marginHorizontal: 4,
  },
  playlistCoverWrapper: {
    position: 'relative',
  },
  playlistCover: {
    width: CARD_WIDTH + 8,
    height: CARD_WIDTH + 8,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surfaceVariant,
  },
  playCountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.xxl,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  playCountText: {
    color: '#ffffff',
    fontSize: 10,
    marginLeft: 2,
  },
  playlistName: {
    fontSize: 12,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  songCover: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceVariant,
  },
  songInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  songName: {
    ...Typography.body2,
    fontWeight: '500',
  },
  songArtist: {
    ...Typography.caption,
    marginTop: 2,
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
    ...Typography.caption,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  albumCard: {
    width: CARD_WIDTH + 8,
    marginHorizontal: 4,
  },
  albumCover: {
    width: CARD_WIDTH + 8,
    height: CARD_WIDTH + 8,
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
  errorText: {
    ...Typography.body1,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.xxl,
  },
  retryText: {
    ...Typography.body2,
    color: '#ffffff',
    fontWeight: '600',
  },
  });
}
