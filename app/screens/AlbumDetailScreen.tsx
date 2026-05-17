import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import SongList from '../components/music/SongList';
import NetworkImage from '../components/common/NetworkImage';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { getAlbumDetail } from '../api/music';
import { LightColors } from '../theme/colors';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { formatPlayCount } from '../utils/format';
import type { SongResult, RootStackScreenProps } from '../types';

export default function AlbumDetailScreen({
  route,
}: RootStackScreenProps<'AlbumDetail'>) {
  const { id } = route.params;
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

  const ListHeader = (
    <View>
      <View style={styles.header}>
        <NetworkImage uri={album?.picUrl} style={styles.cover} />
        <View style={styles.headerInfo}>
          <Text style={styles.albumName} numberOfLines={2}>
            {album?.name}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {album?.artist?.name}
          </Text>
          {album?.publishTime ? (
            <Text style={styles.publishTime}>
              {formatPublishTime(album.publishTime)}
            </Text>
          ) : null}
          {album?.size ? (
            <Text style={styles.songCount}>{album.size}首</Text>
          ) : null}
        </View>
      </View>

      {album?.description ? (
        <View style={styles.descContainer}>
          <Text style={styles.descLabel}>简介</Text>
          <Text style={styles.descText} numberOfLines={3}>
            {album.description}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.playAllButton} onPress={handlePlayAll}>
        <Text style={styles.playAllIcon}>▶</Text>
        <Text style={styles.playAllText}>播放全部</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SongList
        songs={songs}
        onSongPress={handleSongPress}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[LightColors.primary]}
            tintColor={LightColors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightColors.background,
  },
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
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: LightColors.primary,
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
    backgroundColor: LightColors.surfaceVariant,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  albumName: {
    ...Typography.h3,
    color: LightColors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  artistName: {
    ...Typography.body2,
    color: LightColors.primary,
    marginBottom: Spacing.xs,
  },
  publishTime: {
    ...Typography.caption,
    color: LightColors.textSecondary,
    marginBottom: Spacing.xs,
  },
  songCount: {
    ...Typography.caption,
    color: LightColors.textSecondary,
  },
  descContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  descLabel: {
    ...Typography.body2,
    color: LightColors.text,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  descText: {
    ...Typography.caption,
    color: LightColors.textSecondary,
    lineHeight: 18,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: LightColors.primary,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
  },
  playAllIcon: {
    fontSize: 14,
    color: '#ffffff',
    marginRight: Spacing.xs,
  },
  playAllText: {
    ...Typography.body2,
    color: '#ffffff',
    fontWeight: '600',
  },
});
