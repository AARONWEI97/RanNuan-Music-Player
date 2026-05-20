import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import SongList from '../components/music/SongList';
import NetworkImage from '../components/common/NetworkImage';
import SongActionSheet from '../components/music/SongActionSheet';
import CommentList from '../components/comment/CommentList';
import { useSongActionSheet } from '../hooks/useSongActionSheet';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAppTheme } from '../theme/ThemeContext';
import { getAlbumDetail } from '../api/music';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { formatPlayCount } from '../utils/format';
import type { SongResult, RootStackScreenProps } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = SCREEN_WIDTH * 0.6;

export default function AlbumDetailScreen({
  route,
  navigation,
}: RootStackScreenProps<'AlbumDetail'>) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
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

  const { actionSong, showSheet, actionItems, handlePress: handleSongMore, handleClose, commentSongId, showComments, setShowComments } = useSongActionSheet();

  const formatPublishTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
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

  const listHeader = (
    <>
      {/* ═══ Gradient Header ═══ */}
      <View style={styles.headerContainer}>
        <NetworkImage uri={album?.picUrl} style={styles.headerCover} />
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.8)']}
          style={styles.headerGradient}
        />
        {/* Back button */}
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        {/* Info overlay */}
        <View style={[styles.headerInfo, { paddingBottom: Spacing.lg }]}>
          <View style={styles.headerCoverRow}>
            <NetworkImage uri={album?.picUrl} style={styles.headerAlbumCover} />
            <View style={styles.headerTextInfo}>
              <Text style={styles.headerAlbumName} numberOfLines={2}>{album?.name}</Text>
              <TouchableOpacity
                style={styles.artistRow}
                onPress={() => album?.artist?.id && navigation.navigate('ArtistDetail', { id: album.artist.id })}
              >
                <MaterialCommunityIcons name="account-music" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.artistNameText} numberOfLines={1}>{album?.artist?.name}</Text>
              </TouchableOpacity>
              <View style={styles.metaRow}>
                {album?.publishTime ? (
                  <>
                    <MaterialCommunityIcons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.metaText}>{formatPublishTime(album.publishTime)}</Text>
                    <Text style={styles.metaDot}>·</Text>
                  </>
                ) : null}
                {album?.size ? (
                  <>
                    <MaterialCommunityIcons name="music-note" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.metaText}>{album.size}首</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ═══ Description ═══ */}
      {album?.description ? (
        <View style={styles.descSection}>
          <Text style={[styles.descLabel, { color: colors.text }]}>简介</Text>
          <Text style={[styles.descText, { color: colors.textSecondary }]} numberOfLines={3}>
            {album.description}
          </Text>
        </View>
      ) : null}

      {/* ═══ Play All ═══ */}
      <View style={styles.playAllRow}>
        <TouchableOpacity style={[styles.playAllButton, { backgroundColor: colors.primary }]} onPress={handlePlayAll} activeOpacity={0.7}>
          <MaterialCommunityIcons name="play" size={18} color="#ffffff" />
          <Text style={styles.playAllText}>播放全部</Text>
        </TouchableOpacity>
        <Text style={[styles.songCount, { color: colors.textSecondary }]}>{songs.length} 首</Text>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SongList
        songs={songs}
        onSongPress={handleSongPress}
        onSongMorePress={handleSongMore}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
      <SongActionSheet visible={showSheet} song={actionSong} actions={actionItems} onClose={handleClose} />
      <Modal visible={showComments} animationType="slide" onRequestClose={() => setShowComments(false)}>
        <View style={[styles.commentModal, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <View style={styles.commentHeader}>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.commentTitle, { color: colors.text }]}>歌曲评论</Text>
            <View style={{ width: 40 }} />
          </View>
          <CommentList songId={Number(commentSongId)} type="music" />
        </View>
      </Modal>
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

    // ═══ Gradient Header ═══
    headerContainer: {
      height: HEADER_HEIGHT,
      position: 'relative',
    },
    headerCover: {
      width: SCREEN_WIDTH,
      height: HEADER_HEIGHT,
    },
    headerGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: HEADER_HEIGHT * 0.75,
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
    headerInfo: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: Spacing.lg,
    },
    headerCoverRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    headerAlbumCover: {
      width: 90,
      height: 90,
      borderRadius: BorderRadius.lg,
      backgroundColor: 'rgba(0,0,0,0.2)',
    },
    headerTextInfo: {
      flex: 1,
      marginLeft: Spacing.md,
      marginBottom: 4,
    },
    headerAlbumName: {
      ...Typography.h4,
      color: '#ffffff',
      fontWeight: '700',
      marginBottom: Spacing.xs,
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    artistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    artistNameText: {
      ...Typography.caption,
      color: 'rgba(255,255,255,0.9)',
      marginLeft: 4,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaText: {
      ...Typography.caption,
      color: 'rgba(255,255,255,0.7)',
      marginLeft: 4,
      fontSize: 11,
    },
    metaDot: {
      ...Typography.caption,
      color: 'rgba(255,255,255,0.5)',
      marginHorizontal: Spacing.xs,
    },

    // ═══ Description ═══
    descSection: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.sm,
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

    // ═══ Play All ═══
    playAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
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
    listContent: {
      paddingBottom: 100,
    },
    commentModal: { flex: 1 },
    commentHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    commentTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  });
}
