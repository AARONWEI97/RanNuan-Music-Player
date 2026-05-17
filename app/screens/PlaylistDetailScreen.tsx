import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import type { RootStackScreenProps, SongResult } from '../types';
import { getPlaylistDetail } from '../api/music';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import SongList from '../components/music/SongList';
import NetworkImage from '../components/common/NetworkImage';
import { LightColors } from '../theme/colors';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { formatPlayCount } from '../utils/format';

export default function PlaylistDetailScreen({
  route,
}: RootStackScreenProps<'PlaylistDetail'>) {
  const { id } = route.params;
  const { playSong } = usePlayer();
  const { playAll } = usePlaylist();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [playlist, setPlaylist] = useState<any>(null);
  const [songs, setSongs] = useState<SongResult[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const res = await getPlaylistDetail(String(id));
      const data = res?.data?.playlist;
      if (data) {
        setPlaylist(data);
        const mapped: SongResult[] = (data.tracks || []).map((track: any) => ({
          id: track.id,
          name: track.name,
          ar: (track.ar || []).map((a: any) => ({ name: a.name, id: a.id })),
          al: {
            name: track.al?.name || '',
            id: track.al?.id || 0,
            picUrl: track.al?.picUrl || '',
          },
          dt: track.dt || 0,
          picUrl: track.al?.picUrl || '',
          duration: track.dt || 0,
          count: 0,
        }));
        setSongs(mapped);
      }
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

  const onRefresh = useCallback(() => {
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={LightColors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>加载失败</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ListHeader = (
    <View>
      <View style={styles.coverSection}>
        <NetworkImage uri={playlist?.coverImgUrl} style={styles.cover} />
        <View style={styles.infoSection}>
          <Text style={styles.name} numberOfLines={2}>
            {playlist?.name}
          </Text>
          <View style={styles.creatorRow}>
            <NetworkImage uri={playlist?.creator?.avatarUrl} style={styles.avatar} />
            <Text style={styles.creatorName} numberOfLines={1}>
              {playlist?.creator?.nickname}
            </Text>
          </View>
          {playlist?.playCount > 0 && (
            <Text style={styles.playCount}>
              {formatPlayCount(playlist.playCount)}次播放
            </Text>
          )}
        </View>
      </View>

      {playlist?.tags && playlist.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {playlist.tags.map((tag: string) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {playlist?.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {playlist.description}
        </Text>
      ) : null}

      <TouchableOpacity style={styles.playAllButton} onPress={handlePlayAll}>
        <Text style={styles.playAllIcon}>▶</Text>
        <Text style={styles.playAllText}>播放全部</Text>
        <Text style={styles.songCount}>({songs.length}首)</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SongList
        songs={songs}
        onSongPress={handleSongPress}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
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
  centerContainer: {
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: LightColors.primary,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    ...Typography.body2,
    color: '#ffffff',
    fontWeight: '500',
  },
  coverSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  cover: {
    width: 140,
    height: 140,
    borderRadius: BorderRadius.lg,
    backgroundColor: LightColors.surfaceVariant,
  },
  infoSection: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  name: {
    ...Typography.h3,
    color: LightColors.text,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: LightColors.surfaceVariant,
  },
  creatorName: {
    ...Typography.caption,
    color: LightColors.textSecondary,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  playCount: {
    ...Typography.caption,
    color: LightColors.textTertiary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: `${LightColors.primary}15`,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  tagText: {
    ...Typography.overline,
    color: LightColors.primary,
    fontSize: 11,
  },
  description: {
    ...Typography.caption,
    color: LightColors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: LightColors.primary,
    borderRadius: BorderRadius.xl,
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
  songCount: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: Spacing.xs,
  },
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
});
