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
import { getArtistList } from '../api/artist';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import type { RootStackScreenProps } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2) / 3;

const TYPE_OPTIONS = [
  { value: -1, label: '全部' },
  { value: 1, label: '男歌手' },
  { value: 2, label: '女歌手' },
  { value: 3, label: '乐队' },
];

const AREA_OPTIONS = [
  { value: -1, label: '全部' },
  { value: 7, label: '华语' },
  { value: 96, label: '欧美' },
  { value: 8, label: '日本' },
  { value: 16, label: '韩国' },
  { value: 0, label: '其他' },
];

const INITIAL_OPTIONS: { value: number | string; label: string }[] = [
  { value: -1, label: '热门' },
  { value: 0, label: '#' },
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' },
  { value: 'd', label: 'D' },
  { value: 'e', label: 'E' },
  { value: 'f', label: 'F' },
  { value: 'g', label: 'G' },
  { value: 'h', label: 'H' },
  { value: 'i', label: 'I' },
  { value: 'j', label: 'J' },
  { value: 'k', label: 'K' },
  { value: 'l', label: 'L' },
  { value: 'm', label: 'M' },
  { value: 'n', label: 'N' },
  { value: 'o', label: 'O' },
  { value: 'p', label: 'P' },
  { value: 'q', label: 'Q' },
  { value: 'r', label: 'R' },
  { value: 's', label: 'S' },
  { value: 't', label: 'T' },
  { value: 'u', label: 'U' },
  { value: 'v', label: 'V' },
  { value: 'w', label: 'W' },
  { value: 'x', label: 'X' },
  { value: 'y', label: 'Y' },
  { value: 'z', label: 'Z' },
];

export default function ArtistListScreen({ navigation }: RootStackScreenProps<'ArtistList'>) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [type, setType] = useState(-1);
  const [area, setArea] = useState(-1);
  const [initial, setInitial] = useState<number | string>(-1);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchArtists = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    if (reset) {
      setLoading(true);
      setArtists([]);
      setOffset(0);
      setHasMore(true);
    } else {
      if (loadingMore) return;
      setLoadingMore(true);
    }
    try {
      const res = await getArtistList({ type, area, initial: initial === -1 ? undefined : initial, limit: 30, offset: currentOffset });
      const data = res?.data?.artists;
      if (Array.isArray(data)) {
        setArtists(reset ? data : [...artists, ...data]);
        setOffset(currentOffset + data.length);
        setHasMore(data.length >= 30);
      } else {
        setHasMore(false);
      }
    } catch {} finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [type, area, initial, offset, loadingMore, artists]);

  useEffect(() => { fetchArtists(true); }, [type, area, initial]);

  const handleEndReached = () => { if (hasMore && !loadingMore) fetchArtists(false); };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>歌手分类</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Filters */}
      <View style={[styles.filterArea, { backgroundColor: colors.surfaceVariant }]}>
        {/* Type */}
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>类型</Text>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, type === opt.value && { backgroundColor: colors.primary }]}
                onPress={() => setType(opt.value)}
              >
                <Text style={[styles.chipText, { color: type === opt.value ? '#ffffff' : colors.textSecondary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* Area */}
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>地区</Text>
          <View style={styles.chipRow}>
            {AREA_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, area === opt.value && { backgroundColor: colors.primary }]}
                onPress={() => setArea(opt.value)}
              >
                <Text style={[styles.chipText, { color: area === opt.value ? '#ffffff' : colors.textSecondary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Initial bar */}
      <View style={[styles.initialBar, { backgroundColor: colors.surfaceVariant }]}>
        <ScrollableChipRow
          options={INITIAL_OPTIONS}
          selected={initial}
          onSelect={setInitial}
          colors={colors}
        />
      </View>

      {/* Artist Grid */}
      {loading ? (
        <View style={styles.loadingCenter}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={artists}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.artistCard}
              onPress={() => navigation.navigate('ArtistDetail', { id: item.id })}
              activeOpacity={0.6}
            >
              <NetworkImage uri={item.picUrl || item.img1v1Url} style={styles.artistAvatar} />
              <Text style={[styles.artistName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              {item.musicSize ? (
                <Text style={[styles.artistSongs, { color: colors.textSecondary }]}>{item.musicSize}首</Text>
              ) : null}
            </TouchableOpacity>
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 20 }} color={colors.primary} /> : hasMore ? null : <Text style={[styles.endText, { color: colors.textSecondary }]}>— 已加载全部 —</Text>}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-off" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无歌手</Text>
            </View>
          }
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          columnWrapperStyle={{ justifyContent: 'flex-start' }}
        />
      )}
    </View>
  );
}

// ─── Scrollable Chip Row ───
function ScrollableChipRow({ options, selected, onSelect, colors }: {
  options: { value: number | string; label: string }[];
  selected: number | string;
  onSelect: (v: number | string) => void;
  colors: any;
}) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={options}
      keyExtractor={(item) => String(item.value)}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 4 },
            selected === item.value && { backgroundColor: colors.primary },
          ]}
          onPress={() => onSelect(item.value)}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', color: selected === item.value ? '#ffffff' : colors.textSecondary }}>{item.label}</Text>
        </TouchableOpacity>
      )}
      contentContainerStyle={{ paddingHorizontal: Spacing.sm }}
    />
  );
}

// ─── Styles ───
function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md },
    backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', ...Typography.h3, color: '#ffffff', fontWeight: '600' },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Filters
    filterArea: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
    filterLabel: { ...Typography.caption, width: 36, fontWeight: '600' },
    chipRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    chipText: { ...Typography.caption, fontWeight: '500' },

    // Initial bar
    initialBar: { paddingVertical: Spacing.sm },

    // Grid
    artistCard: { width: CARD_SIZE, marginRight: Spacing.md, marginBottom: Spacing.md, alignItems: 'center' },
    artistAvatar: { width: CARD_SIZE - 16, height: CARD_SIZE - 16, borderRadius: (CARD_SIZE - 16) / 2, marginBottom: Spacing.xs },
    artistName: { ...Typography.caption, fontWeight: '500', textAlign: 'center' },
    artistSongs: { ...Typography.overline, textAlign: 'center', marginTop: 1 },

    // Empty
    emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyText: { ...Typography.body2, marginTop: Spacing.sm },
    endText: { textAlign: 'center', padding: Spacing.lg, ...Typography.caption },
  });
}
