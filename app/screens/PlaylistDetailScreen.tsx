import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RootStackScreenProps, SongResult } from '../types';
import { getPlaylistDetail } from '../api/music';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAppTheme } from '../theme/ThemeContext';
import SongList from '../components/music/SongList';
import NetworkImage from '../components/common/NetworkImage';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { formatPlayCount } from '../utils/format';

export default function PlaylistDetailScreen({
  route,
}: RootStackScreenProps<'PlaylistDetail'>) {
  const { id } = route.params;
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
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
      <View style={styles.coverSection}>
        <NetworkImage uri={playlist?.coverImgUrl} style={styles.cover} />
        <View style={styles.infoSection}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {playlist?.name}
          </Text>
          <View style={styles.creatorRow}>
            <NetworkImage uri={playlist?.creator?.avatarUrl} style={styles.avatar} />
            <Text style={[styles.creatorName, { color: colors.textSecondary }]} numberOfLines={1}>
              {playlist?.creator?.nickname}
            </Text>
          </View>
          {playlist?.playCount > 0 && (
            <View style={styles.playCountRow}>
              <MaterialCommunityIcons name="play-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.playCount, { color: colors.textTertiary }]}>
                {formatPlayCount(playlist.playCount)}次播放
              </Text>
            </View>
          )}
        </View>
      </View>

      {playlist?.tags && playlist.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {playlist.tags.map((tag: string) => (
            <View key={tag} style={[styles.tag, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {playlist?.description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
          {playlist.description}
        </Text>
      ) : null}

      <TouchableOpacity style={[styles.playAllButton, { backgroundColor: colors.primary }]} onPress={handlePlayAll}>
        <MaterialCommunityIcons name="play" size={18} color="#ffffff" />
        <Text style={styles.playAllText}>播放全部</Text>
        <Text style={styles.songCount}>({songs.length}首)</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SongList
        songs={songs}
        onSongPress={handleSongPress}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
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
  centerContainer: {
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
    backgroundColor: colors.surfaceVariant,
  },
  infoSection: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  name: {
    ...Typography.h3,
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
    backgroundColor: colors.surfaceVariant,
  },
  creatorName: {
    ...Typography.caption,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  playCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playCount: {
    ...Typography.caption,
    marginLeft: 4,
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
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  tagText: {
    ...Typography.overline,
    fontSize: 11,
  },
  description: {
    ...Typography.caption,
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
    borderRadius: BorderRadius.xl,
  },
  playAllText: {
    ...Typography.body2,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: Spacing.xs,
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
}
