import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  InteractionManager,
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
import { getBanners, getPersonalizedPlaylist, getRecommendMusic, getHotSinger, getPersonalizedMV, getDayRecommend, getPersonalFM, getNewAlbum } from '../api/home';
import { getToplist } from '../api/list';
import { useUserStore } from '../store/userStore';
import { useSearchStore } from '../store/searchStore';
import NetworkImage from '../components/common/NetworkImage';
import type { SongResult, RootStackScreenProps } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_COLUMNS = 2;
const CARD_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - CARD_GAP) / CARD_COLUMNS;

// Quick nav card grid: 2 rows x 3 columns
const NAV_CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - 10 * 2) / 3;

interface BannerItem {
  imageUrl: string;
  targetId: number;
  targetType: number;
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
}

interface AlbumItem {
  id: number;
  name: string;
  picUrl: string;
  artistName: string;
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
  const user = useUserStore((s) => s.user);
  const setSearchValue = useSearchStore((s) => s.setSearchValue);

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [recommendSongs, setRecommendSongs] = useState<SongResult[]>([]);
  const [hotSingers, setHotSingers] = useState<ArtistItem[]>([]);
  const [newAlbums, setNewAlbums] = useState<AlbumItem[]>([]);
  const [dailyRecommendSongs, setDailyRecommendSongs] = useState<SongResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  // Cover images for quick nav cards — from dedicated APIs
  const [toplistCover, setToplistCover] = useState('');
  const [mvCover, setMvCover] = useState('');
  const [dailyRecommendCover, setDailyRecommendCover] = useState('');
  const [personalFMCover, setPersonalFMCover] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const [bannersRes, playlistsRes, songsRes, singersRes, toplistRes, mvRes, dayRecommendRes, fmRes, albumRes] = await Promise.allSettled([
        getBanners(2),
        getPersonalizedPlaylist(6),
        getRecommendMusic({ limit: 20 }),
        getHotSinger({ offset: 0, limit: 10 }),
        getToplist(),
        getPersonalizedMV(),
        getDayRecommend(),
        getPersonalFM(),
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
            }))
          );
        }
      }

      // New Albums
      if (albumRes.status === 'fulfilled') {
        anySuccess = true;
        const data = albumRes.value?.data?.albums;
        if (Array.isArray(data)) {
          setNewAlbums(
            data.slice(0, 10).map((a: any) => ({
              id: a.id,
              name: a.name,
              picUrl: a.picUrl || a.blurPicUrl,
              artistName: a.artist?.name || '未知歌手',
            }))
          );
        }
      }

      // Toplist cover for 排行榜 nav card
      if (toplistRes.status === 'fulfilled') {
        const list = toplistRes.value?.data?.list;
        if (Array.isArray(list) && list.length > 0) {
          setToplistCover(list[0].coverImgUrl || '');
        }
      }

      // Personalized MV cover for MV nav card
      if (mvRes.status === 'fulfilled') {
        const result = mvRes.value?.data?.result;
        if (Array.isArray(result) && result.length > 0) {
          setMvCover(result[0].picUrl || '');
        }
      }

      // Daily recommend cover for 每日推荐 nav card
      if (dayRecommendRes.status === 'fulfilled') {
        const dailySongs = dayRecommendRes.value?.data?.data?.dailySongs;
        if (Array.isArray(dailySongs) && dailySongs.length > 0) {
          setDailyRecommendCover(dailySongs[0].al?.picUrl || dailySongs[0].picUrl || '');
          setDailyRecommendSongs(dailySongs);
        }
      }

      // Personal FM cover for nav card
      if (fmRes.status === 'fulfilled') {
        const data = fmRes.value?.data?.data;
        if (Array.isArray(data) && data.length > 0) {
          setPersonalFMCover(data[0].album?.picUrl || data[0].picUrl || '');
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
    // ★ 延迟到交互空闲时加载数据，避免阻塞 UI 渲染
    const handle = InteractionManager.runAfterInteractions(() => {
      fetchData();
    });
    return () => handle.cancel();
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

  // Banner click handler - navigate based on targetType
  const handleBannerPress = useCallback(
    (banner: BannerItem) => {
      if (!banner.targetId) return;
      switch (banner.targetType) {
        case 1000: // 歌单
          navigation.navigate('PlaylistDetail', { id: banner.targetId });
          break;
        case 1002: // 歌手
          navigation.navigate('ArtistDetail', { id: banner.targetId });
          break;
        case 1003: // 专辑
          navigation.navigate('AlbumDetail', { id: banner.targetId });
          break;
        case 1004: // MV
          navigation.navigate('MvPlayer', { id: banner.targetId });
          break;
      }
    },
    [navigation]
  );

  // Helper: navigate to Search tab with a pre-filled keyword
  const navigateToSearch = useCallback(
    (keyword: string) => {
      setSearchValue(keyword);
      navigation.navigate('Search');
    },
    [setSearchValue, navigation]
  );

  // Quick nav items — each card uses a dedicated, non-duplicating cover source
  // Row 1: 心动模式, 每日推荐, 私人FM
  // Row 2: 排行榜, MV, 歌单广场
  const quickNavItems = useMemo(
    () => [
      {
        icon: 'music-note-plus' as const,
        label: '推荐新歌',
        coverUrl: recommendSongs[0]?.picUrl || recommendSongs[0]?.al?.picUrl || '',
        onPress: () => {
          if (recommendSongs.length > 0) {
            playAll(recommendSongs, 0);
            playSong(recommendSongs[0]);
          }
        },
      },
      {
        icon: 'calendar-clock' as const,
        label: '每日推荐',
        coverUrl: dailyRecommendCover,
        onPress: () => {
          if (!user) {
            navigation.navigate('Login');
            return;
          }
          navigation.navigate('DailyRecommend');
        },
      },
      {
        icon: 'radio' as const,
        label: '私人FM',
        coverUrl: personalFMCover,
        onPress: async () => {
          try {
            // Call /personal_fm multiple times to gather enough songs (each call returns ~3)
            const results = await Promise.all([
              getPersonalFM(),
              getPersonalFM(),
              getPersonalFM(),
              getPersonalFM(),
            ]);
            const fmSongs: SongResult[] = [];
            for (const res of results) {
              const data = res?.data?.data;
              if (Array.isArray(data)) {
                for (const s of data) {
                  fmSongs.push({
                    id: s.id,
                    name: s.name,
                    picUrl: s.album?.picUrl || s.picUrl || '',
                    ar: s.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
                    al: s.album || { id: 0, name: '', picUrl: '' },
                    count: 0,
                  });
                }
              }
            }
            if (fmSongs.length > 0) {
              playAll(fmSongs, 0);
              playSong(fmSongs[0]);
            }
          } catch {
            // silently fail
          }
        },
      },
      {
        icon: 'trophy' as const,
        label: '排行榜',
        coverUrl: toplistCover,
        onPress: () => navigation.navigate('Toplist'),
      },
      {
        icon: 'television-classic' as const,
        label: 'MV',
        coverUrl: mvCover,
        onPress: () => navigation.navigate('MvList'),
      },
      {
        icon: 'playlist-music' as const,
        label: '歌单广场',
        coverUrl: hotSingers[0]?.picUrl || '',
        onPress: () => navigation.navigate('PlaylistSquare'),
      },
    ],
    [recommendSongs, navigation, dailyRecommendCover, dailyRecommendSongs, personalFMCover, toplistCover, mvCover, hotSingers, user, playAll, playSong, navigateToSearch]
  );

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
    <View style={styles.container}>
      {/* ═══ Fixed Header ═══ */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../top-logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerGreeting}>{getGreeting()}</Text>
              <Text style={styles.headerName} numberOfLines={1}>
                {user?.nickname || '发现好音乐'}
              </Text>
            </View>
          </View>
          <Pressable style={styles.headerSearchBtn} onPress={() => navigation.navigate('Search')}>
            <MaterialCommunityIcons name="magnify" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* ═══ Scrollable Content ═══ */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Quick Nav — Cover Image Cards (3x2) ═══ */}
        <View style={styles.navGrid}>
          {quickNavItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.navCard}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={styles.navCardInner}>
                {/* Cover image background */}
                {item.coverUrl ? (
                  <NetworkImage uri={item.coverUrl} style={StyleSheet.absoluteFillObject} />
                ) : (
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.surfaceVariant }]} />
                )}
                {/* Dark gradient overlay for readability */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)']}
                  style={StyleSheet.absoluteFillObject}
                />
                {/* Icon + Label */}
                <View style={styles.navIconBg}>
                  <MaterialCommunityIcons name={item.icon} size={24} color="#fff" />
                </View>
                <Text style={styles.navLabel}>{item.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══ Banner Carousel ═══ */}
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
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.9}
                  onPress={() => handleBannerPress(banner)}
                >
                  <NetworkImage uri={banner.imageUrl} style={styles.bannerImage} />
                </TouchableOpacity>
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

        {/* ═══ Recommended Playlists (2-column grid) ═══ */}
        {playlists.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>推荐歌单</Text>
              </View>
              <TouchableOpacity style={styles.moreBtn} onPress={() => navigation.navigate('PlaylistSquare')}>
                <Text style={[styles.moreText, { color: colors.textSecondary }]}>更多</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.playlistGrid}>
              {playlists.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.playlistCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('PlaylistDetail', { id: item.id })}
                >
                  <View style={styles.playlistCoverWrapper}>
                    <NetworkImage uri={item.picUrl} style={styles.playlistCover} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.5)']}
                      style={styles.playlistCoverGradient}
                    />
                    <View style={styles.playCountBadge}>
                      <MaterialCommunityIcons name="play" size={10} color="#ffffff" />
                      <Text style={styles.playCountText}>{formatPlayCount(item.playCount)}</Text>
                    </View>
                    <View style={styles.playCircleOverlay}>
                      <MaterialCommunityIcons name="play" size={20} color="#fff" />
                    </View>
                  </View>
                  <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ═══ Hot Artists (horizontal scroll) ═══ */}
        {hotSingers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: '#22c55e' }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>热门歌手</Text>
              </View>
              <TouchableOpacity style={styles.moreBtn} onPress={() => navigation.navigate('ArtistList')}>
                <Text style={[styles.moreText, { color: colors.textSecondary }]}>更多</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistScroll}>
              {hotSingers.map((artist) => (
                <TouchableOpacity
                  key={artist.id}
                  style={styles.artistCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('ArtistDetail', { id: artist.id })}
                >
                  <View style={styles.artistAvatarWrap}>
                    <NetworkImage uri={artist.picUrl} style={styles.artistAvatar} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.15)']}
                      style={styles.artistAvatarGradient}
                    />
                  </View>
                  <Text style={[styles.artistName, { color: colors.text }]} numberOfLines={1}>{artist.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ═══ New Albums (horizontal scroll) ═══ */}
        {newAlbums.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: '#06b6d4' }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>新碟上架</Text>
              </View>
              <TouchableOpacity style={styles.moreBtn} onPress={() => navigation.navigate('Search')}>
                <Text style={[styles.moreText, { color: colors.textSecondary }]}>更多</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.albumScroll}>
              {newAlbums.map((album) => (
                <TouchableOpacity
                  key={album.id}
                  style={styles.albumCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('AlbumDetail', { id: album.id })}
                >
                  <View style={styles.albumCoverWrapper}>
                    <NetworkImage uri={album.picUrl} style={styles.albumCover} />
                    <View style={[styles.albumCoverDisc, { backgroundColor: colors.surfaceVariant }]}>
                      <View style={[styles.albumDiscHole, { backgroundColor: colors.background }]} />
                    </View>
                  </View>
                  <Text style={[styles.albumName, { color: colors.text }]} numberOfLines={1}>{album.name}</Text>
                  <Text style={[styles.albumArtist, { color: colors.textSecondary }]} numberOfLines={1}>{album.artistName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ═══ Recommended New Songs (compact list) ═══ */}
        {recommendSongs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>推荐新歌</Text>
              </View>
              <TouchableOpacity
                style={styles.playAllBtn}
                onPress={() => {
                  if (recommendSongs.length > 0) {
                    playAll(recommendSongs, 0);
                    playSong(recommendSongs[0]);
                  }
                }}
              >
                <MaterialCommunityIcons name="play-circle" size={18} color={colors.primary} />
                <Text style={[styles.playAllText, { color: colors.primary }]}>播放全部</Text>
              </TouchableOpacity>
            </View>
            {recommendSongs.slice(0, 20).map((song, index) => (
              <TouchableOpacity
                key={String(song.id)}
                style={[styles.songItem, { borderBottomColor: colors.divider }]}
                activeOpacity={0.6}
                onPress={() => handlePlaySong(song, index)}
              >
                <Text style={[styles.songIndex, { color: index < 3 ? colors.primary : colors.textTertiary }]}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <NetworkImage uri={song.picUrl || song.al?.picUrl} style={styles.songCover} />
                <View style={styles.songInfo}>
                  <Text style={[styles.songName, { color: colors.text }]} numberOfLines={1}>{song.name}</Text>
                  <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                    {song.ar?.map((a: any) => a.name).join(' / ') || song.song?.artists?.map((a: any) => a.name).join(' / ') || song.artists?.map((a: any) => a.name).join(' / ') || '未知歌手'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="play-circle-outline" size={26} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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

    // ═══ Fixed Header ═══
    fixedHeader: {
      backgroundColor: colors.background,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.sm,
      // Subtle bottom separator
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerLogo: {
      width: 72,
      height: 72,
      borderRadius: 18,
      marginRight: -Spacing.xs,
      marginLeft: -Spacing.sm,
      transform: [{ rotate: '45deg' }],
    },
    headerTextWrap: {
      flex: 1,
    },
    headerGreeting: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    headerName: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    headerSearchBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
      backgroundColor: colors.surfaceVariant,
    },

    // ═══ Quick Nav — Cover Image Cards (3x2) ═══
    navGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xs,
      gap: 10,
    },
    navCard: {
      width: NAV_CARD_WIDTH,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      // Shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    navCardInner: {
      width: '100%',
      aspectRatio: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: Spacing.md,
      paddingTop: Spacing.lg,
    },
    navIconBg: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    navLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#ffffff',
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },

    // ═══ Banner ═══
    bannerSection: {
      marginTop: Spacing.md,
      marginBottom: Spacing.md,
    },
    bannerImage: {
      width: SCREEN_WIDTH,
      height: 150,
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
      borderRadius: 4,
    },

    // ═══ Section Common ═══
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
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    sectionTitle: {
      ...Typography.h4,
      fontWeight: '700',
      fontSize: 17,
    },
    moreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    moreText: {
      fontSize: 13,
      fontWeight: '500',
    },

    // ═══ Playlists (2-column grid) ═══
    playlistGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: Spacing.lg,
      gap: CARD_GAP,
    },
    playlistCard: {
      width: CARD_SIZE,
      marginBottom: Spacing.md,
    },
    playlistCoverWrapper: {
      position: 'relative',
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    playlistCover: {
      width: CARD_SIZE,
      height: CARD_SIZE,
      backgroundColor: colors.surfaceVariant,
    },
    playlistCoverGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '40%',
    },
    playCountBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: BorderRadius.xxl,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    playCountText: {
      color: '#ffffff',
      fontSize: 10,
      marginLeft: 2,
    },
    playCircleOverlay: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    playlistName: {
      fontSize: 12,
      marginTop: 8,
      lineHeight: 17,
      fontWeight: '500',
    },

    // ═══ Artists ═══
    artistScroll: {
      paddingHorizontal: Spacing.lg,
    },
    artistCard: {
      width: 88,
      marginRight: 12,
      alignItems: 'center',
    },
    artistAvatarWrap: {
      position: 'relative',
      borderRadius: 44,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    artistAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surfaceVariant,
    },
    artistAvatarGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      borderRadius: 40,
    },
    artistName: {
      ...Typography.caption,
      marginTop: Spacing.sm,
      textAlign: 'center',
      fontWeight: '500',
    },

    // ═══ Albums ═══
    albumScroll: {
      paddingHorizontal: Spacing.lg,
    },
    albumCard: {
      width: 130,
      marginRight: 12,
    },
    albumCoverWrapper: {
      position: 'relative',
      flexDirection: 'row',
    },
    albumCover: {
      width: 130,
      height: 130,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.surfaceVariant,
    },
    albumCoverDisc: {
      position: 'absolute',
      right: -12,
      top: '15%',
      width: 28,
      height: 130 * 0.7,
      borderRadius: 14,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    albumDiscHole: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.background,
    },
    albumName: {
      fontSize: 12,
      marginTop: Spacing.sm,
      lineHeight: 17,
      fontWeight: '500',
    },
    albumArtist: {
      fontSize: 11,
      marginTop: 2,
    },

    // ═══ New Songs ═══
    playAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    playAllText: {
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 3,
    },
    songItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    songIndex: {
      width: 28,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    songCover: {
      width: 44,
      height: 44,
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
      fontSize: 11,
    },

    // ═══ Error ═══
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
