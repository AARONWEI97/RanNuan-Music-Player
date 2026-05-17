import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import SongList from '../components/music/SongList';
import NetworkImage from '../components/common/NetworkImage';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAppTheme } from '../theme/ThemeContext';
import { getAlbumDetail } from '../api/music';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { formatPlayCount } from '../utils/format';
import type { SongResult, RootStackScreenProps } from '../types';

export default function AlbumDetailScreen({
  route,
}: RootStackScreenProps<'AlbumDetail'>) {
  const { id } = route.params;
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [album, setAlbum] = useState<any>(null);
  const [songs, setSongs] = useState<SongResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { playSong } = usePlayer();
  const { playAll } = usePlaylist();

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const res = await getAlbumDetail(String(id));
      const albumData = res.data.album;
      const songsData = res.data.songs || [];

      const mappedSongs: SongResult[] = songsData.map((song: any) => ({
        id: song.id,
        name: song.name,
        ar: song.ar || [{ name: albumData.artist.name, id: albumData.artist.id }],
        al: {
          name: albumData.name,
          id: albumData.id,
          picUrl: albumData.picUrl,
        },
        dt: song.dt || song.duration,
        picUrl: albumData.picUrl,
        duration: song.dt || song.duration,
        count: 0,
      }));

      setAlbum(albumData);
      setSongs(mappedSongs);
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
      playSong(songs[0]);
    }
  }, [songs, playAll, playSong]);

  const handleSongPress = useCallback(
    (song: SongResult, index: number) => {
      playAll(songs, index);
      playSong(song);
    },
    [songs, playAll, playSong]
  );

  const formatPublishTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return (
      date.getFullYear() +
      '年' +
      (date.getMonth() + 1) +
      '月' +
      date.getDate() +
      '日'
    );
  };

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

  const ListHeader = (
    <View>
      <View style={styles.header}>
        <NetworkImage uri={album?.picUrl} style={styles.cover} />
        <View style={styles.headerInfo}>
          <Text style={[styles.albumName, { color: colors.text }]} numberOfLines={2}>
            {album?.name}
          </Text>
          <TouchableOpacity style={styles.artistRow}>
            <MaterialCommunityIcons name="account-music" size={14} color={colors.primary} />
            <Text style={[styles.artistName, { color: colors.primary }]} numberOfLines={1}>
              {album?.artist?.name}
            </Text>
          </TouchableOpacity>
          {album?.publishTime ? (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="calendar-outline" size={12} color={colors.textTertiary} />
              <Text style={[styles.publishTime, { color: colors.textTertiary }]}>
                {formatPublishTime(album.publishTime)}
              </Text>
            </View>
          ) : null}
          {album?.size ? (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="music-note" size={12} color={colors.textTertiary} />
              <Text style={[styles.songCount, { color: colors.textTertiary }]}>{album.size}首</Text>
            </View>
          ) : null}
        </View>
      </View>

      {album?.description ? (
        <View style={styles.descContainer}>
          <Text style={[styles.descLabel, { color: colors.text }]}>简介</Text>
          <Text style={[styles.descText, { color: colors.textSecondary }]} numberOfLines={3}>
            {album.description}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity style={[styles.playAllButton, { backgroundColor: colors.primary }]} onPress={handlePlayAll}>
        <MaterialCommunityIcons name="play" size={18} color="#ffffff" />
        <Text style={styles.playAllText}>播放全部</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SongList
        songs={songs}
        onSongPress={handleSongPress}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
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
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    ...Typography.body2,
    color: '#ffffff',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  cover: {
    width: 140,
    height: 140,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surfaceVariant,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  albumName: {
    ...Typography.h3,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  artistName: {
    ...Typography.body2,
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  publishTime: {
    ...Typography.caption,
    marginLeft: 4,
  },
  songCount: {
    ...Typography.caption,
    marginLeft: 4,
  },
  descContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  descLabel: {
    ...Typography.body2,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  descText: {
    ...Typography.caption,
    lineHeight: 18,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  playAllText: {
    ...Typography.body2,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  });
}
