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

import { getToplist } from '../api/list';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import type { RootStackScreenProps } from '../types';

interface ToplistItem {
  id: number;
  name: string;
  coverImgUrl: string;
  updateFrequency: string;
  trackCount: number;
  tracks?: { first: string; second: string }[];
}

export default function ToplistScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<RootStackScreenProps<'Toplist'>['navigation']>();
  const insets = useSafeAreaInsets();

  const [lists, setLists] = useState<ToplistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getToplist();
      const data = res?.data?.list;
      if (Array.isArray(data)) {
        setLists(
          data.map((item: any) => ({
            id: item.id,
            name: item.name,
            coverImgUrl: item.coverImgUrl,
            updateFrequency: item.updateFrequency || '',
            trackCount: item.trackCount || 0,
            tracks: item.tracks?.slice(0, 3).map((t: any) => ({
              first: t.first || '',
              second: t.second || '',
            })),
          }))
        );
      }
    } catch (e) {
      console.error('Failed to fetch toplist', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const renderItem = useCallback(
    ({ item }: { item: ToplistItem }) => (
      <TouchableOpacity
        style={styles.listCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PlaylistDetail', { id: item.id })}
      >
        <View style={styles.listCoverWrap}>
          <Image source={{ uri: item.coverImgUrl }} style={styles.listCover} />
          <View style={styles.listBadge}>
            <MaterialCommunityIcons name="update" size={9} color="#fff" />
            <Text style={styles.listBadgeText} numberOfLines={1}>{item.updateFrequency}</Text>
          </View>
        </View>
        <View style={styles.listInfo}>
          <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          {item.tracks && item.tracks.length > 0 ? (
            item.tracks.map((track, idx) => (
              <Text key={idx} style={[styles.trackText, { color: colors.textSecondary }]} numberOfLines={1}>
                {idx + 1}. {track.first} - {track.second}
              </Text>
            ))
          ) : (
            <Text style={[styles.trackText, { color: colors.textTertiary }]}>{item.trackCount} 首</Text>
          )}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textTertiary} />
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>排行榜</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={lists}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

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
    listCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    listCoverWrap: { position: 'relative', borderRadius: BorderRadius.md, overflow: 'hidden' },
    listCover: { width: 72, height: 72, borderRadius: BorderRadius.md, backgroundColor: colors.surfaceVariant },
    listBadge: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    listBadgeText: { color: '#fff', fontSize: 8, marginLeft: 2 },
    listInfo: { flex: 1, marginLeft: Spacing.md, justifyContent: 'center' },
    listName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
    trackText: { fontSize: 11, lineHeight: 16 },
  });
}
