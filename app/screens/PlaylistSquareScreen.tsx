import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import NetworkImage from '../components/common/NetworkImage';
import { useAppTheme } from '../theme/ThemeContext';
import { getPlaylistCategory } from '../api/home';
import { getHotPlaylistCategories } from '../api/playlist';
import { getListByCat } from '../api/list';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import type { RootStackScreenProps } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COL_COUNT = 3;
const CARD_GAP = Spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - CARD_GAP * (COL_COUNT - 1)) / COL_COUNT;

interface PlaylistItem {
  id: number;
  name: string;
  coverImgUrl: string;
  playCount: number;
  trackCount?: number;
  creator?: { nickname: string };
}

// ─── 默认分类（API 失败时降级使用）───
const FALLBACK_CATS = [
  { name: '华语', category: '华语' },
  { name: '流行', category: '流行' },
  { name: '摇滚', category: '摇滚' },
  { name: '民谣', category: '民谣' },
  { name: '电子', category: '电子' },
  { name: '说唱', category: '说唱' },
  { name: '轻音乐', category: '轻音乐' },
  { name: '爵士', category: '爵士' },
  { name: '古典', category: '古典' },
  { name: 'R&B', category: 'R&B' },
  { name: '影视原声', category: '影视原声' },
  { name: 'ACG', category: 'ACG' },
];

function formatCount(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return String(n);
}

export default function PlaylistSquareScreen({ navigation }: RootStackScreenProps<'PlaylistSquare'>) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [hotCats, setHotCats] = useState<string[]>([]);
  const [allCats, setAllCats] = useState<{ name: string; category: string }[]>(FALLBACK_CATS);
  const [selectedCat, setSelectedCat] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  // ─── Fetch categories ───
  useEffect(() => {
    Promise.all([
      getHotPlaylistCategories().catch(() => null),
      getPlaylistCategory().catch(() => null),
    ]).then(([hotRes, allRes]) => {
      const hots: any[] = hotRes?.data?.tags || [];
      if (hots.length > 0) setHotCats(hots.map((t: any) => t.name || t).slice(0, 10));

      const all = allRes?.data?.sub || allRes?.data?.categories;
      if (Array.isArray(all)) {
        setAllCats(all.map((c: any) => ({ name: c.name || c, category: c.category || c.name || c })));
      } else if (all && typeof all === 'object') {
        // Nested categories: { "0": "语种", "1": "风格", ... }
        const flat: { name: string; category: string }[] = [];
        Object.values(all).forEach((group: any) => {
          if (Array.isArray(group)) {
            group.forEach((c: any) => {
              flat.push({ name: c.name || c, category: c.category || c.name || c });
            });
          }
        });
        if (flat.length > 0) setAllCats(flat);
      }
    }).catch(() => {});
  }, []);

  // ─── Fetch playlists ───
  const fetchPlaylists = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    if (reset) {
      setLoading(true);
      setPlaylists([]);
      setOffset(0);
      setHasMore(true);
    } else {
      if (loadingMore) return;
      setLoadingMore(true);
    }
    try {
      const cat = selectedCat === '全部' ? undefined : selectedCat;
      const res = await getListByCat({
        cat: cat || undefined,
        order: 'hot',
        limit: 30,
        offset: currentOffset,
      });
      const data = res?.data?.playlists || [];
      if (Array.isArray(data)) {
        const mapped = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          coverImgUrl: item.coverImgUrl || item.picUrl || '',
          playCount: item.playCount || 0,
          trackCount: item.trackCount,
          creator: item.creator,
        }));
        setPlaylists(reset ? mapped : [...playlists, ...mapped]);
        setOffset(currentOffset + data.length);
        setHasMore(data.length >= 30);
      } else {
        setHasMore(false);
      }
      setError(false);
    } catch {
      if (reset) setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCat, offset, loadingMore, playlists]);

  useEffect(() => { fetchPlaylists(true); }, [selectedCat]);

  const handleEndReached = () => { if (hasMore && !loadingMore) fetchPlaylists(false); };

  // ─── Re-filter when tapping a category ───
  const handleCatPress = useCallback((cat: string) => {
    if (cat !== selectedCat) setSelectedCat(cat);
  }, [selectedCat]);

  const handlePlaylistPress = useCallback((id: number) => {
    navigation.navigate('PlaylistDetail', { id });
  }, [navigation]);

  // ─── Render card ───
  const renderCard = useCallback(({ item }: { item: PlaylistItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.6}
      onPress={() => handlePlaylistPress(item.id)}
    >
      <View style={styles.cardCoverWrap}>
        <NetworkImage uri={item.coverImgUrl} style={styles.cardCover} />
        <View style={styles.playCountBadge}>
          <MaterialCommunityIcons name="play" size={10} color="#fff" />
          <Text style={styles.playCountText}>{formatCount(item.playCount)}</Text>
        </View>
      </View>
      <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
    </TouchableOpacity>
  ), [colors, styles, handlePlaylistPress]);

  const catsToShow = hotCats.length > 0 ? hotCats : allCats.slice(0, 12).map(c => c.name);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>歌单广场</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingCenter}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.errorCenter}>
          <MaterialCommunityIcons name="alert-circle-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>加载失败</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => fetchPlaylists(true)}>
            <Text style={styles.retryText}>重试</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => String(item.id)}
          numColumns={COL_COUNT}
          renderItem={renderCard}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View style={[styles.catBar, { backgroundColor: colors.surfaceVariant }]}>
              <TouchableOpacity
                style={[styles.catChip, selectedCat === '全部' && { backgroundColor: colors.primary }]}
                onPress={() => handleCatPress('全部')}
              >
                <Text style={[styles.catChipText, { color: selectedCat === '全部' ? '#fff' : colors.textSecondary }]}>全部</Text>
              </TouchableOpacity>
              {catsToShow.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, cat === selectedCat && { backgroundColor: colors.primary }]}
                  onPress={() => handleCatPress(cat)}
                >
                  <Text style={[styles.catChipText, { color: cat === selectedCat ? '#fff' : colors.textSecondary }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ padding: 20 }} color={colors.primary} />
            : !hasMore && playlists.length > 0 ? <Text style={[styles.endText, { color: colors.textSecondary }]}>— 已加载全部 —</Text>
            : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="music-box-multiple-outline" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无歌单</Text>
            </View>
          }
          contentContainerStyle={{ padding: Spacing.lg, paddingTop: Spacing.sm }}
          columnWrapperStyle={COL_COUNT > 1 ? { gap: CARD_GAP, marginBottom: Spacing.md } : undefined}
        />
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md },
    backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', ...Typography.h3, color: '#ffffff', fontWeight: '600' },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
    errorText: { ...Typography.body1 },
    retryBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xxl },
    retryText: { color: '#fff', fontWeight: '600' },

    catBar: {
      flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
      paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg, marginBottom: Spacing.md,
    },
    catChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.xxl },
    catChipText: { ...Typography.caption, fontWeight: '500' },

    card: { width: CARD_WIDTH, marginBottom: Spacing.md },
    cardCoverWrap: { position: 'relative', marginBottom: Spacing.xs },
    cardCover: { width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: BorderRadius.lg },
    playCountBadge: {
      position: 'absolute', top: 4, right: 4, flexDirection: 'row', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: BorderRadius.sm, paddingHorizontal: 5, paddingVertical: 2, gap: 2,
    },
    playCountText: { fontSize: 9, color: '#fff', fontWeight: '600' },
    cardName: { ...Typography.caption, fontWeight: '500', lineHeight: 16 },

    emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyText: { ...Typography.body2, marginTop: Spacing.sm },
    endText: { textAlign: 'center', padding: Spacing.lg, ...Typography.caption },
  });
}
