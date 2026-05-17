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

import SongList from '../components/music/SongList';
import NetworkImage from '../components/common/NetworkImage';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { getArtistDetail, getArtistTopSongs } from '../api/artist';
import { LightColors } from '../theme/colors';
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

export default function ArtistDetailScreen({ route }: RootStackScreenProps<'ArtistDetail'>) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
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
        <View style={styles.coverGradient} />
        <View style={[styles.coverInfo, { paddingBottom: insets.top > 0 ? Spacing.lg : Spacing.xl }]}>
          <Text style={styles.artistName}>{artist?.name}</Text>
          {aliasText ? (
            <Text style={styles.artistAlias}>{aliasText}</Text>
          ) : null}
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>{artist?.musicSize || 0} 首歌曲</Text>
            <Text style={styles.statsDot}>·</Text>
            <Text style={styles.statsText}>{artist?.albumSize || 0} 张专辑</Text>
          </View>
        </View>
      </View>

      {artist?.briefDesc ? (
        <View style={styles.briefSection}>
          <Text style={styles.briefText} numberOfLines={3} ellipsizeMode="tail">
            {artist.briefDesc}
          </Text>
        </View>
      ) : null}

      {songs.length > 0 ? (
        <View style={styles.playAllRow}>
          <TouchableOpacity style={styles.playAllButton} onPress={handlePlayAll} activeOpacity={0.7}>
            <Text style={styles.playAllIcon}>▶</Text>
            <Text style={styles.playAllText}>播放全部</Text>
          </TouchableOpacity>
          <Text style={styles.songCount}>{songs.length} 首</Text>
        </View>
      ) : null}
    </>
  ), [artist, coverUrl, aliasText, songs, handlePlayAll, insets.top]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={LightColors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>加载失败</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
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
          <Text style={styles.emptyText}>暂无热门歌曲</Text>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[LightColors.primary]}
          tintColor={LightColors.primary}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LightColors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LightColors.background,
  },
  errorText: {
    ...Typography.body1,
    color: LightColors.textSecondary,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: LightColors.primary,
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    color: LightColors.textSecondary,
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
    backgroundColor: LightColors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xxl,
  },
  playAllIcon: {
    color: '#ffffff',
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  playAllText: {
    ...Typography.body2,
    color: '#ffffff',
    fontWeight: '600',
  },
  songCount: {
    ...Typography.caption,
    color: LightColors.textSecondary,
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
    color: LightColors.textSecondary,
  },
});
