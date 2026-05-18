import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import SongList from '../components/music/SongList';
import NetworkImage from '../components/common/NetworkImage';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAppTheme } from '../theme/ThemeContext';
import { getArtistDetail, getArtistTopSongs } from '../api/artist';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import type { SongResult, RootStackScreenProps } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = SCREEN_WIDTH * 0.7;

interface ArtistInfo {
  cover: string;
  avatar: string;
  name: string;
  briefDesc: string;
  albumSize: number;
  musicSize: number;
  alias: string[];
}

export default function ArtistDetailScreen({ route, navigation }: RootStackScreenProps<'ArtistDetail'>) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { playSong } = usePlayer();
  const { playAll } = usePlaylist();

  const [artist, setArtist] = useState<ArtistInfo | null>(null);
  const [songs, setSongs] = useState<SongResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [detailRes, songsRes] = await Promise.all([
        getArtistDetail(id),
        getArtistTopSongs({ id, limit: 50 }),
      ]);

      const artistData = detailRes?.data?.data?.artist;
      if (artistData) {
        setArtist({
          cover: artistData.cover || artistData.avatar || '',
          avatar: artistData.avatar || artistData.cover || '',
          name: artistData.name || '',
          briefDesc: artistData.briefDesc || '',
          albumSize: artistData.albumSize || 0,
          musicSize: artistData.musicSize || 0,
          alias: artistData.alias || [],
        });
      }

      const songsData = songsRes?.data?.songs;
      if (Array.isArray(songsData)) {
        setSongs(
          songsData.map((song: any) => ({
            id: song.id,
            name: song.name,
            ar: song.ar || [],
            al: song.al || { name: '', id: 0, picUrl: '' },
            dt: song.dt || 0,
            picUrl: song.al?.picUrl || '',
            duration: song.dt || 0,
            count: 0,
          }))
        );
      }

      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handlePlayAll = useCallback(() => {
    if (songs.length > 0) {
      playAll(songs, 0);
    }
  }, [songs, playAll]);

  const handleSongPress = useCallback(
    (song: SongResult, index: number) => {
      playAll(songs, index);
      playSong(song);
    },
    [songs, playAll, playSong]
  );

  const coverUrl = artist?.cover || artist?.avatar;
  const aliasText = artist?.alias?.length ? artist.alias.join(' / ') : '';

  const listHeader = useMemo(() => (
    <>
      <View style={styles.coverContainer}>
        <NetworkImage uri={coverUrl} style={styles.coverImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.coverGradient}
        />
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={[styles.coverInfo, { paddingBottom: insets.top > 0 ? Spacing.lg : Spacing.xl }]}>
          <Text style={styles.artistName}>{artist?.name}</Text>
          {aliasText ? (
            <Text style={styles.artistAlias}>{aliasText}</Text>
          ) : null}
          <View style={styles.statsRow}>
            <MaterialCommunityIcons name="music-note" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statsText}>{artist?.musicSize || 0} 首歌曲</Text>
            <Text style={styles.statsDot}>·</Text>
            <MaterialCommunityIcons name="disc" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statsText}>{artist?.albumSize || 0} 张专辑</Text>
          </View>
        </View>
      </View>

      {artist?.briefDesc ? (
        <View style={styles.briefSection}>
          <Text style={[styles.briefText, { color: colors.textSecondary }]} numberOfLines={3} ellipsizeMode="tail">
            {artist.briefDesc}
          </Text>
        </View>
      ) : null}

      {songs.length > 0 ? (
        <View style={styles.playAllRow}>
          <TouchableOpacity style={[styles.playAllButton, { backgroundColor: colors.primary }]} onPress={handlePlayAll} activeOpacity={0.7}>
            <MaterialCommunityIcons name="play" size={18} color="#ffffff" />
            <Text style={styles.playAllText}>播放全部</Text>
          </TouchableOpacity>
          <Text style={[styles.songCount, { color: colors.textSecondary }]}>{songs.length} 首</Text>
        </View>
      ) : null}
    </>
  ), [artist, coverUrl, aliasText, songs, handlePlayAll, insets.top, colors]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>加载失败</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={fetchData}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SongList
      songs={songs}
      onSongPress={handleSongPress}
      ListHeaderComponent={listHeader}
      contentContainerStyle={styles.songListContent}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="music-note-off" size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无热门歌曲</Text>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    />
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...Typography.body1,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xxl,
  },
  retryText: {
    ...Typography.body2,
    color: '#ffffff',
    fontWeight: '600',
  },
  coverContainer: {
    height: COVER_HEIGHT,
    position: 'relative',
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
  },
  coverGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: COVER_HEIGHT * 0.6,
  },
  backButton: {
    position: 'absolute',
    left: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  coverInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
  },
  artistName: {
    ...Typography.h1,
    color: '#ffffff',
    marginBottom: Spacing.xs,
  },
  artistAlias: {
    ...Typography.body2,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  statsText: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  statsDot: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: Spacing.sm,
  },
  briefSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  briefText: {
    ...Typography.body2,
    lineHeight: 20,
  },
  playAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xxl,
  },
  playAllText: {
    ...Typography.body2,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  songCount: {
    ...Typography.caption,
  },
  songListContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    ...Typography.body2,
    marginTop: Spacing.sm,
  },
  });
}
