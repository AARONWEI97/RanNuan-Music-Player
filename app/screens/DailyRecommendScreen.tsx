import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import NetworkImage from '../components/common/NetworkImage';
import SongItem from '../components/music/SongItem';
import { useSongActionSheet } from '../hooks/useSongActionSheet';
import { useReparse } from '../hooks/useReparse';
import SourcePickerModal from '../components/player/SourcePickerModal';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAppTheme } from '../theme/ThemeContext';
import { getDayRecommend } from '../api/home';
import { dislikeRecommendedSong, getHistoryRecommendDates, getHistoryRecommendSongs } from '../api/music';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import SongActionSheet from '../components/music/SongActionSheet';
import type { SongResult, RootStackScreenProps } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_SIZE = SCREEN_WIDTH * 0.38;

function mapSong(song: any): SongResult {
  return {
    id: song.id,
    name: song.name,
    ar: song.ar || [],
    al: song.al || { name: '', id: 0, picUrl: '' },
    dt: song.dt || 0,
    picUrl: song.al?.picUrl || '',
    duration: song.dt || 0,
    count: 0,
  };
}

export default function DailyRecommendScreen({ navigation }: RootStackScreenProps<'DailyRecommend'>) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { playSong } = usePlayer();
  const { playAll } = usePlaylist();

  const [songs, setSongs] = useState<SongResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const actionSongRef = useRef<SongResult | null>(null);

  const { reparseSong, reparseVisible, handleOpenReparse, handleCloseReparse, handleSelectSource } = useReparse();

  const { actionSong, showSheet, actionItems, handlePress: handleSongMore, handleClose: handleSheetClose } = useSongActionSheet({
    onReparse: handleOpenReparse,
    extra: [{
      key: 'dislike',
      label: '不感兴趣',
      icon: 'thumb-down-outline' as const,
      onPress: async () => {
        const s = actionSongRef.current;
        if (!s) return;
        try {
          await dislikeRecommendedSong(s.id);
          setSongs((prev) => prev.filter((item) => item.id !== s.id));
          Alert.alert('提示', '已标记，将减少此类推荐');
        } catch {
          Alert.alert('提示', '操作失败');
        }
        handleSheetClose();
      },
    }],
  });

  // 同步 actionSong 到 ref
  useEffect(() => { actionSongRef.current = actionSong; }, [actionSong]);

  const fetchSongs = useCallback(async (date?: string) => {
    setLoading(true);
    setError(false);
    try {
      let res;
      if (date) {
        res = await getHistoryRecommendSongs(date);
      } else {
        res = await getDayRecommend();
      }
      // 历史日推和今日日推的响应路径不同
      const inner = res?.data?.data || res?.data;
      const data = inner?.dailySongs || inner?.songs || inner?.data?.dailySongs || [];
      if (!Array.isArray(data) || data.length === 0) {
        setError(true); setLoading(false); return;
      }
      setSongs(data.map(mapSong));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs();
    getHistoryRecommendDates()
      .then((res) => {
        const dates: string[] = res?.data?.data?.dates || [];
        if (Array.isArray(dates)) setHistoryDates(dates);
      })
      .catch(() => {});
  }, [fetchSongs]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }, []);

  const handlePlayAll = useCallback(() => {
    if (songs.length > 0) { playAll(songs, 0); playSong(songs[0]); }
  }, [songs, playAll, playSong]);

  const handleSongPress = useCallback((song: SongResult) => {
    playAll(songs, songs.findIndex((s) => s.id === song.id));
    playSong(song);
  }, [songs, playAll, playSong]);

  const coverUrl = songs[0]?.picUrl || songs[0]?.al?.picUrl;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>加载失败</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => { setError(false); setLoading(true); fetchSongs(selectedDate || undefined); }}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color="#ffffff" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 106 }}>
        <LinearGradient
          colors={[colors.primary + 'DD', colors.primary + 'AA', colors.background]}
          locations={[0, 0.6, 1]}
          style={styles.heroSection}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroCoverWrap}>
              {coverUrl ? (
                <NetworkImage uri={coverUrl} style={styles.heroCover} />
              ) : (
                <View style={[styles.heroCover, styles.heroCoverPlaceholder]}>
                  <MaterialCommunityIcons name="calendar-clock" size={36} color="rgba(255,255,255,0.3)" />
                </View>
              )}
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>{selectedDate || today}</Text>
              </View>
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>{selectedDate ? '历史日推' : '每日推荐'}</Text>
              <Text style={styles.heroSubtitle}>根据你的音乐口味，为你推荐 {songs.length} 首歌曲</Text>
              <View style={styles.heroMeta}>
                <MaterialCommunityIcons name="music-note" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.heroMetaText}>{songs.length} 首歌曲</Text>
              </View>
              {selectedDate && (
                <TouchableOpacity
                  style={styles.backTodayBtn}
                  onPress={() => { setSelectedDate(null); fetchSongs(); }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="calendar-today" size={14} color="#ffffff" />
                  <Text style={styles.backTodayText}>回到今日推荐</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity style={[styles.playAllBtn, { backgroundColor: colors.primary }]} onPress={handlePlayAll} activeOpacity={0.7}>
            <MaterialCommunityIcons name="play" size={20} color="#ffffff" />
            <Text style={styles.playAllText}>播放全部</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── History Date Selector ── */}
        {historyDates.length > 0 && (
          <View style={styles.historySection}>
            <TouchableOpacity
              style={styles.historyToggle}
              onPress={() => setShowHistory(!showHistory)}
            >
              <MaterialCommunityIcons name="history" size={16} color={colors.primary} />
              <Text style={[styles.historyToggleText, { color: colors.primary }]}>
                历史日推 ({historyDates.length} 天可用)
              </Text>
              <MaterialCommunityIcons name={showHistory ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {showHistory && (
              <View style={styles.historyDateGrid}>
                {historyDates.slice(0, 20).map((date) => (
                  <TouchableOpacity
                    key={date}
                    style={[
                      styles.historyDateChip,
                      { borderColor: colors.divider },
                      selectedDate === date && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                    ]}
                    onPress={() => { setSelectedDate(date); setShowHistory(false); fetchSongs(date); }}
                  >
                    <Text style={[styles.historyDateText, { color: selectedDate === date ? colors.primary : colors.text }]}>
                      {date}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ═══ Song List ═══ */}
        {songs.map((song, index) => (
          <SongItem
            key={String(song.id)}
            song={song}
            index={index}
            onPress={() => handleSongPress(song)}
            onMorePress={() => handleSongMore(song, index)}
          />
        ))}
      </ScrollView>

      <SongActionSheet visible={showSheet} song={actionSong} actions={actionItems} onClose={handleSheetClose} />
      <SourcePickerModal song={reparseSong} visible={reparseVisible} onClose={handleCloseReparse} onSelectSource={handleSelectSource} />
    </View>
  );
}

function createStyles(_colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
    errorText: { ...Typography.body1 },
    retryBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xxl },
    retryText: { color: '#fff', fontWeight: '600' },

    backBtn: {
      position: 'absolute', left: Spacing.md, zIndex: 10,
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center',
    },

    heroSection: { paddingTop: 56, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
    heroCoverWrap: { position: 'relative' },
    heroCover: { width: COVER_SIZE, height: COVER_SIZE, borderRadius: BorderRadius.lg },
    heroCoverPlaceholder: { backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
    dateBadge: {
      position: 'absolute', bottom: -6, left: Spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: BorderRadius.sm,
      paddingHorizontal: Spacing.sm, paddingVertical: 2,
    },
    dateBadgeText: { fontSize: 10, color: '#fff', fontWeight: '600' },

    heroInfo: { flex: 1, gap: Spacing.xs },
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
    heroSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
    heroMeta: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: 4 },
    heroMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
    heroDot: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginHorizontal: 2 },

    playAllBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      marginTop: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xxl,
    },
    playAllText: { fontSize: 15, color: '#fff', fontWeight: '700', marginLeft: Spacing.xs },

    backTodayBtn: {
      flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
      marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
      backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: BorderRadius.xxl,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
      gap: 5,
    },
    backTodayText: { fontSize: 12, color: '#ffffff', fontWeight: '600' },

    // History
    historySection: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    historyToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    historyToggleText: { ...Typography.body2, fontWeight: '600', flex: 1 },
    historyDateGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm, gap: 8 },
    historyDateChip: {
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.xxl, borderWidth: 1,
    },
    historyDateText: { ...Typography.caption },
  });
}
