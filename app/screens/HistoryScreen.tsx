import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, Modal, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getRecentSongs, getUserRecord } from '../api/user';
import { useUserStore } from '../store/userStore';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAppTheme } from '../theme/ThemeContext';
import SongList from '../components/music/SongList';
import SongActionSheet from '../components/music/SongActionSheet';
import CommentList from '../components/comment/CommentList';
import { useSongActionSheet } from '../hooks/useSongActionSheet';
import { Spacing } from '../theme/spacing';
import type { SongResult } from '../types';

export default function HistoryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { playSong } = usePlayer();
  const { playAll } = usePlaylist();
  const userId = useUserStore((s) => s.user?.userId || 0);

  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<SongResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'week' | 'all'>('week');

  const fetchData = useCallback(async () => {
    try {
      let res;
      if (activeTab === 'week') {
        res = await getUserRecord(userId, 1);
      } else {
        res = await getUserRecord(userId, 0);
      }
      const data: any[] = res?.data?.weekData || res?.data?.allData || [];
      const mapped = data.map((d: any) => ({
        id: d.song?.id || 0,
        name: d.song?.name || '未知',
        ar: (d.song?.ar || []).map((a: any) => ({ name: a.name, id: a.id })),
        al: { name: d.song?.al?.name || '', id: d.song?.al?.id || 0, picUrl: d.song?.al?.picUrl || '' } as any,
        dt: d.song?.dt || 0, picUrl: d.song?.al?.picUrl || '', duration: d.song?.dt || 0, count: d.playCount || 0,
      })) as SongResult[];
      setSongs(mapped);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [activeTab, userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSongPress = useCallback((song: SongResult, idx: number) => {
    playAll(songs, idx); playSong(song);
  }, [songs, playAll, playSong]);

  const { actionSong, showSheet, actionItems, handlePress: handleSongMore, handleClose, commentSongId, showComments, setShowComments } = useSongActionSheet();

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
        <Text style={[styles.title, { color: colors.text }]}>播放历史</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.tabRow}>
        {(['week', 'all'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} onPress={() => { setActiveTab(tab); setLoading(true); }}>
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>{tab === 'week' ? '本周' : '所有'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {songs.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="history" size={56} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无播放记录</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  tabRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing.sm },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15 },
  commentModal: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  commentTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
