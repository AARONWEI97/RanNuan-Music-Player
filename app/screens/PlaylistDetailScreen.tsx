import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { RootStackScreenProps, SongResult } from '../types';
import { getPlaylistDetail, likeSong, updatePlaylistTracks } from '../api/music';
import { deletePlaylist } from '../api/playlist';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useDownload } from '../hooks/useDownload';
import { useUserStore } from '../store/userStore';
import { usePlaylistStore } from '../store/playlistStore';
import { showToast } from '../components/ui/Toast';

import { useAppTheme } from '../theme/ThemeContext';
import SongList from '../components/music/SongList';
import NetworkImage from '../components/common/NetworkImage';
import SongActionSheet, { type SongActionItem } from '../components/music/SongActionSheet';
import CommentList from '../components/comment/CommentList';
import PlaylistEditSheet from '../components/playlist/PlaylistEditSheet';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { formatPlayCount } from '../utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = SCREEN_WIDTH * 0.65;

export default function PlaylistDetailScreen({
  route,
  navigation,
}: RootStackScreenProps<'PlaylistDetail'>) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { playSong } = usePlayer();
  const { playAll, addToNext } = usePlaylist();
  const { download } = useDownload();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [playlist, setPlaylist] = useState<any>(null);
  const [songs, setSongs] = useState<SongResult[]>([]);
  const [actionSong, setActionSong] = useState<SongResult | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentSongId, setCommentSongId] = useState<string>('');
  const [showEditSheet, setShowEditSheet] = useState(false);

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

  const handleSongMorePress = useCallback((song: SongResult, _index: number) => {
    setActionSong(song);
    setShowActionSheet(true);
  }, []);

  const handleCloseActionSheet = useCallback(() => {
    setShowActionSheet(false);
    setSubmitting(null);
  }, []);

  // ★ 是否为自己创建的歌单
  const userId = useUserStore((s) => s.user?.userId);
  const isOwnPlaylist = !!(playlist?.creator?.userId && userId && playlist.creator.userId === userId);

  // ★ 构建操作菜单项
  const actionItems: SongActionItem[] = useMemo(() => {
    if (!actionSong) return [];
    const s = actionSong;
    const items: SongActionItem[] = [
      {
        key: 'play-next',
        label: '下一首播放',
        icon: 'skip-next',
        onPress: () => {
          addToNext(s);
          showToast({ title: '已添加到下一首', message: `「${s.name}」将在当前歌曲播放完后播放`, type: 'success' });
          handleCloseActionSheet();
        },
      },
      {
        key: 'like',
        label: '收藏',
        icon: 'heart-outline',
        loading: submitting === 'like',
        onPress: async () => {
          setSubmitting('like');
          try {
            await likeSong(Number(s.id), true);
            showToast({ title: '已收藏', message: `「${s.name}」已添加到「我喜欢的音乐」`, type: 'success' });
            handleCloseActionSheet();
          } catch { showToast({ title: '收藏失败', message: '请检查网络后重试', type: 'error' }); }
          setSubmitting(null);
        },
      },
      {
        key: 'download',
        label: '下载',
        icon: 'download-outline',
        onPress: () => {
          download(s);
          showToast({ title: '开始下载', message: `「${s.name}」已加入下载队列`, type: 'success' });
          handleCloseActionSheet();
        },
      },
    ];

    // ★ 自己的歌单 → 显示删除按钮
    if (isOwnPlaylist && playlist?.id) {
      items.push({
        key: 'remove',
        label: '从歌单中删除',
        icon: 'trash-can-outline',
        destructive: true,
        loading: submitting === 'remove',
        onPress: async () => {
          setSubmitting('remove');
          try {
            await updatePlaylistTracks({ op: 'del', pid: Number(id), tracks: String(s.id) });
            // 本地立即移除
            setSongs((prev) => prev.filter((song) => song.id !== s.id));
            usePlaylistStore.getState().removeFromPlayList(s.id);
            showToast({ title: '已删除', message: `「${s.name}」已从歌单中移除`, type: 'success' });
            handleCloseActionSheet();
          } catch { showToast({ title: '删除失败', message: '请检查网络后重试', type: 'error' }); }
          setSubmitting(null);
        },
      });
    }

    items.push({
      key: 'comment',
      label: '查看歌曲评论',
      icon: 'comment-text-outline',
      onPress: () => {
        handleCloseActionSheet();
        setCommentSongId(String(s.id));
        setShowComments(true);
      },
    });

    items.push({
      key: 'artist',
      label: `歌手: ${s.ar?.map((a: any) => a.name).join('/') || '未知'}`,
      icon: 'account-music-outline',
      onPress: () => {
        const artistId = s.ar?.[0]?.id;
        if (artistId) {
          handleCloseActionSheet();
          navigation.navigate('ArtistDetail', { id: Number(artistId) });
        } else {
          showToast({ title: '暂无歌手信息', type: 'info' });
        }
      },
    });

    return items;
  }, [actionSong, submitting, addToNext, download, handleCloseActionSheet, navigation, isOwnPlaylist, id, playlist?.id]);

  const handleDeletePlaylist = useCallback(() => {
    Alert.alert(
      '删除歌单',
      `确定要删除「${playlist?.name || '此歌单'}」吗？此操作不可撤销。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deletePlaylist(id);
              if (res?.data?.code === 200) {
                Alert.alert('提示', '歌单已删除', [
                  { text: '知道了', onPress: () => navigation.goBack() },
                ]);
              } else {
                Alert.alert('错误', res?.data?.message || res?.data?.msg || '删除失败');
              }
            } catch {
              Alert.alert('错误', '删除歌单失败，请重试');
            }
          },
        },
      ]
    );
  }, [id, playlist, navigation]);

  // ★ useMemo 必须在早返回之前，否则 hook 数量不一致导致崩溃
  const listHeader = useMemo(() => (
    <>
      {/* ═══ Gradient Header ═══ */}
      <View style={styles.headerContainer}>
        <NetworkImage uri={playlist?.coverImgUrl} style={styles.headerCover} />
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.75)']}
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
        {/* Edit button — only for own playlists */}
        {isOwnPlaylist && (
          <TouchableOpacity
            style={[styles.editButton, { top: insets.top + 8 }]}
            onPress={() => setShowEditSheet(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="pencil-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
        {/* Delete button */}
        <TouchableOpacity
          style={[styles.deleteButton, { top: insets.top + 8 }]}
          onPress={handleDeletePlaylist}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="delete-outline" size={22} color="#ffffff" />
        </TouchableOpacity>
        {/* Info overlay */}
        <View style={[styles.headerInfo, { paddingBottom: Spacing.lg }]}>
          <View style={styles.headerCoverRow}>
            <NetworkImage uri={playlist?.coverImgUrl} style={styles.headerSmallCover} />
            <View style={styles.headerTextInfo}>
              <Text style={styles.headerName} numberOfLines={2}>{playlist?.name}</Text>
              <View style={styles.creatorRow}>
                <NetworkImage uri={playlist?.creator?.avatarUrl} style={styles.creatorAvatar} />
                <Text style={styles.creatorName} numberOfLines={1}>{playlist?.creator?.nickname}</Text>
              </View>
            </View>
          </View>
          {playlist?.playCount > 0 && (
            <View style={styles.playCountRow}>
              <MaterialCommunityIcons name="play-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.playCount}>{formatPlayCount(playlist.playCount)}次播放</Text>
            </View>
          )}
        </View>
      </View>

      {/* ═══ Tags + Description ═══ */}
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

      {/* ═══ Play All ═══ */}
      <View style={styles.playAllRow}>
        <TouchableOpacity style={[styles.playAllButton, { backgroundColor: colors.primary }]} onPress={handlePlayAll} activeOpacity={0.7}>
          <MaterialCommunityIcons name="play" size={18} color="#ffffff" />
          <Text style={styles.playAllText}>播放全部</Text>
        </TouchableOpacity>
        <Text style={[styles.songCount, { color: colors.textSecondary }]}>{songs.length} 首</Text>
      </View>
    </>
  ), [playlist, songs.length, colors.primary, colors.textSecondary, insets.top, navigation, handleDeletePlaylist, handlePlayAll]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SongList
        songs={songs}
        onSongPress={handleSongPress}
        onSongMorePress={handleSongMorePress}
        ListHeaderComponent={listHeader}
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

      <SongActionSheet
        visible={showActionSheet}
        song={actionSong}
        actions={actionItems}
        onClose={handleCloseActionSheet}
      />

      {/* ── 歌曲评论弹窗 ── */}
      <Modal visible={showComments} animationType="slide" onRequestClose={() => setShowComments(false)}>
        <View style={[{ flex: 1, backgroundColor: colors.background }, { paddingTop: insets.top }]}>
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

      {/* ── 歌单编辑 ── */}
      <PlaylistEditSheet
        visible={showEditSheet}
        playlistId={Number(id)}
        initialName={playlist?.name || ''}
        initialDesc={playlist?.description || ''}
        onClose={() => setShowEditSheet(false)}
        onSaved={(name, desc) => {
          setPlaylist((prev: any) => ({ ...prev, name, description: desc }));
        }}
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
    deleteButton: {
      position: 'absolute',
      right: Spacing.md,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    editButton: {
      position: 'absolute',
      right: Spacing.md + 44,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    commentHeader: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, marginTop: 0,
    },
    commentTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
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
    headerSmallCover: {
      width: 80,
      height: 80,
      borderRadius: BorderRadius.lg,
      backgroundColor: 'rgba(0,0,0,0.2)',
    },
    headerTextInfo: {
      flex: 1,
      marginLeft: Spacing.md,
      marginBottom: 4,
    },
    headerName: {
      ...Typography.h4,
      color: '#ffffff',
      fontWeight: '700',
      marginBottom: Spacing.xs,
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    creatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    creatorAvatar: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    creatorName: {
      ...Typography.caption,
      color: 'rgba(255,255,255,0.9)',
      marginLeft: Spacing.xs,
      flex: 1,
    },
    playCountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.sm,
    },
    playCount: {
      ...Typography.caption,
      color: 'rgba(255,255,255,0.8)',
      marginLeft: 4,
    },

    // ═══ Tags ═══
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      marginBottom: Spacing.xs,
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
      marginBottom: Spacing.sm,
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
      paddingBottom: Spacing.xxxl,
    },
  });
}
