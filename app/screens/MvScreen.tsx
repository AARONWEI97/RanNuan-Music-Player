import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getTopMv } from '../api/mv';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import type { RootStackScreenProps } from '../types';

interface MvItem {
  id: number;
  name: string;
  cover: string;
  artistName: string;
  playCount: number;
  duration: number;
}

function formatPlayCount(count: number): string {
  if (count >= 100000000) return `${(count / 100000000).toFixed(1)}亿`;
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  return String(count);
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${String(s).padStart(2, '0')}`;
}

export default function MvScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<RootStackScreenProps<'MvList'>['navigation']>();
  const insets = useSafeAreaInsets();

  const [mvList, setMvList] = useState<MvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchMvList = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      }
      const res = await getTopMv({ limit: 20, offset: isLoadMore ? offset : 0 });
      const data = res?.data?.data;
      if (Array.isArray(data)) {
        const items = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          cover: item.cover || item.picUrl,
          artistName: item.artistName || item.artists?.map((a: any) => a.name).join(' / ') || '',
          playCount: item.playCount || 0,
          duration: item.duration || 0,
        }));
        if (isLoadMore) {
          setMvList((prev) => [...prev, ...items]);
          setOffset((prev) => prev + data.length);
        } else {
          setMvList(items);
          setOffset(data.length);
        }
        if (data.length < 20) setHasMore(false);
      }
    } catch (e) {
      console.error('Failed to fetch MV list', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [offset]);

  useEffect(() => {
    fetchMvList();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setOffset(0);
    setHasMore(true);
    fetchMvList();
  }, [fetchMvList]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      fetchMvList(true);
    }
  }, [hasMore, loadingMore, fetchMvList]);

  const renderItem = useCallback(
    ({ item }: { item: MvItem }) => (
      <TouchableOpacity
        style={styles.mvCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('MvPlayer', { id: item.id })}
      >
        <View style={styles.mvCoverWrap}>
          <Image source={{ uri: item.cover }} style={styles.mvCover} />
          <View style={styles.mvPlayOverlay}>
            <MaterialCommunityIcons name="play" size={28} color="#fff" />
          </View>
          <View style={styles.mvPlayCount}>
            <MaterialCommunityIcons name="play" size={10} color="#fff" />
            <Text style={styles.mvPlayCountText}>{formatPlayCount(item.playCount)}</Text>
          </View>
          {item.duration > 0 && (
            <View style={styles.mvDuration}>
              <Text style={styles.mvDurationText}>{formatDuration(item.duration)}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.mvName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
        <Text style={[styles.mvArtist, { color: colors.textSecondary }]} numberOfLines={1}>{item.artistName}</Text>
      </TouchableOpacity>
    ),
    [styles, colors, navigation]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>MV</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={mvList}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={styles.loadMore} /> : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const CARD_GAP = 10;
const CARD_WIDTH = (Dimensions.get('window').width - Spacing.lg * 2 - CARD_GAP) / 2;

import { Dimensions } from 'react-native';

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centerContent: { justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      backgroundColor: colors.background,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
    headerRight: { width: 40 },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
    row: { marginBottom: Spacing.md, gap: CARD_GAP },
    mvCard: { width: CARD_WIDTH },
    mvCoverWrap: {
      position: 'relative',
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    mvCover: { width: CARD_WIDTH, height: CARD_WIDTH * 0.56, backgroundColor: colors.surfaceVariant },
    mvPlayOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.15)',
    },
    mvPlayCount: {
      position: 'absolute',
      top: 6,
      right: 6,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 10,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    mvPlayCountText: { color: '#fff', fontSize: 9, marginLeft: 2 },
    mvDuration: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    mvDurationText: { color: '#fff', fontSize: 10 },
    mvName: { fontSize: 13, fontWeight: '500', marginTop: Spacing.sm, lineHeight: 18 },
    mvArtist: { fontSize: 11, marginTop: 2 },
    loadMore: { paddingVertical: Spacing.lg },
  });
}
