import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Modal, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getPlaylistTrackAll } from '../api/music';
import { getUserPlaylist } from '../api/user';
import { useUserStore } from '../store/userStore';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAppTheme } from '../theme/ThemeContext';
import SongList from '../components/music/SongList';
import SongActionSheet from '../components/music/SongActionSheet';
import CommentList from '../components/comment/CommentList';
import { useSongActionSheet } from '../hooks/useSongActionSheet';
import { useReparse } from '../hooks/useReparse';
import SourcePickerModal from '../components/player/SourcePickerModal';
import { Spacing } from '../theme/spacing';
import type { SongResult } from '../types';

export default function LikedSongsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { playSong } = usePlayer();
  const { playAll } = usePlaylist();
  const userId = useUserStore((s) => s.user?.userId);

  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<SongResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPlaylistName, setLikedPlaylistName] = useState('我喜欢的音乐');

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      // Step 1: find the "我喜欢的音乐" playlist
      const playlistRes = await getUserPlaylist(userId);
      const playlists: any[] = playlistRes?.data?.playlist || [];
      const liked = playlists.find(
        (p: any) => p.specialType === 5 || (p.userId === userId && p.name === '我喜欢的音乐'),
      );
      if (!liked) {
        // fallback: use first created playlist
        const firstCreated = playlists.find((p: any) => !p.subscribed);
        if (!firstCreated) { setSongs([]); setLoading(false); return; }
        setLikedPlaylistName(firstCreated.name);
        // Step 2: load all tracks
        const trackRes = await getPlaylistTrackAll({ id: firstCreated.id, limit: 9999, offset: 0 });
        const tracks = trackRes?.data?.songs || [];
        setSongs(mapTracks(tracks));
        setLoading(false);
        return;
      }

      setLikedPlaylistName(liked.name || '我喜欢的音乐');

      // Step 2: load ALL tracks via playlist API (single call, full song details)
      const trackRes = await getPlaylistTrackAll({ id: liked.id, limit: 9999, offset: 0 });
      const tracks = trackRes?.data?.songs || [];
      setSongs(mapTracks(tracks));
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSongPress = useCallback((song: SongResult, idx: number) => {
    playAll(songs, idx); playSong(song);
  }, [songs, playAll, playSong]);

  const { reparseSong, reparseVisible, handleOpenReparse, handleCloseReparse, handleSelectSource } = useReparse();
  const { actionSong, showSheet, actionItems, handlePress: handleSongMore, handleClose, commentSongId, showComments, setShowComments } = useSongActionSheet({ onReparse: handleOpenReparse });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{likedPlaylistName}</Text>
        <View style={{ width: 40 }} />
      </View>
      {songs.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="heart-outline" size={56} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无收藏歌曲</Text>
        </View>
      ) : (
        <SongList
          songs={songs}
          onSongPress={handleSongPress}
          onSongMorePress={handleSongMore}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[colors.primary]} />}
        />
      )}
      <SongActionSheet visible={showSheet} song={actionSong} actions={actionItems} onClose={handleClose} />
      <SourcePickerModal song={reparseSong} visible={reparseVisible} onClose={handleCloseReparse} onSelectSource={handleSelectSource} />
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

function mapTracks(tracks: any[]): SongResult[] {
  return tracks.map((s: any) => ({
    id: s.id,
    name: s.name || '未知歌曲',
    ar: (s.ar || []).map((a: any) => ({ id: a.id, name: a.name })),
    al: s.al || { id: 0, name: '', picUrl: '' },
    dt: s.dt || 0,
    picUrl: s.al?.picUrl || '',
    duration: s.dt || 0,
    count: 0,
  }));
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15 },
  commentModal: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  commentTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
