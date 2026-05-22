import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getUserFollows, getUserFollowers, followUser } from '../api/user';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { formatPlayCount } from '../utils/format';
import type { RootStackParamList, RootStackScreenProps } from '../types';
import NetworkImage from '../components/common/NetworkImage';

type FollowListRouteProp = RouteProp<RootStackParamList, 'FollowList'>;

const PAGE_SIZE = 30;

interface FollowUser {
  userId: number;
  nickname: string;
  avatarUrl: string;
  signature: string;
  gender: number;
  followed: boolean;
  followeds: number;
  follows: number;
  vipType: number;
}

export default function FollowListScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackScreenProps<'FollowList'>['navigation']>();
  const route = useRoute<FollowListRouteProp>();
  const { userId, type } = route.params;

  const [list, setList] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});

  const title = type === 'follows' ? '关注' : '粉丝';

  useEffect(() => {
    loadData(false);
  }, []);

  const loadData = useCallback(async (append: boolean) => {
    const currentOffset = append ? offset + PAGE_SIZE : 0;
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const fetcher = type === 'follows' ? getUserFollows : getUserFollowers;
      const res = await fetcher(userId, PAGE_SIZE, currentOffset);
      const data = res?.data?.follow || res?.data?.followeds || [];

      const mapped: FollowUser[] = (Array.isArray(data) ? data : []).map((u: any) => ({
        userId: u.userId,
        nickname: u.nickname,
        avatarUrl: u.avatarUrl,
        signature: u.signature || '',
        gender: u.gender,
        followed: u.followed ?? false,
        followeds: u.followeds ?? 0,
        follows: u.follows ?? 0,
        vipType: u.vipType ?? 0,
      }));

      // Initialize following map
      const map: Record<number, boolean> = {};
      mapped.forEach((u) => { map[u.userId] = u.followed; });

      if (append) {
        setList((prev) => [...prev, ...mapped]);
        setOffset((prev) => prev + PAGE_SIZE);
        setFollowingMap((prev) => ({ ...prev, ...map }));
      } else {
        setList(mapped);
        setOffset(0);
        setFollowingMap(map);
      }

      setHasMore(res?.data?.more ?? mapped.length >= PAGE_SIZE);
    } catch {
      if (!append) setList([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [type, userId, offset]);

  const handleToggleFollow = useCallback(async (targetUserId: number, currentlyFollowed: boolean) => {
    const t = currentlyFollowed ? 0 : 1;
    try {
      const res = await followUser(targetUserId, t);
      if (res?.data?.code === 200) {
        setFollowingMap((prev) => ({
          ...prev,
          [targetUserId]: !currentlyFollowed,
        }));
      }
    } catch {}
  }, []);

  const renderItem = useCallback(({ item }: { item: FollowUser }) => {
    const isFollowing = followingMap[item.userId] ?? item.followed;
    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: colors.divider }]}
        activeOpacity={0.6}
      >
        <NetworkImage uri={item.avatarUrl} style={styles.avatar} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.nickname, { color: colors.text }]} numberOfLines={1}>
              {item.nickname}
            </Text>
            {item.vipType === 11 && (
              <View style={styles.vipBadge}>
                <Text style={styles.vipBadgeText}>VIP</Text>
              </View>
            )}
            {item.gender === 1 && (
              <MaterialCommunityIcons name="gender-male" size={14} color="#3b82f6" style={{ marginLeft: 4 }} />
            )}
            {item.gender === 2 && (
              <MaterialCommunityIcons name="gender-female" size={14} color="#ec4899" style={{ marginLeft: 4 }} />
            )}
          </View>
          {item.signature ? (
            <Text style={[styles.signature, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.signature}
            </Text>
          ) : null}
          <Text style={[styles.subMeta, { color: colors.textTertiary }]}>
            {formatPlayCount(item.followeds)}粉丝 · {formatPlayCount(item.follows)}关注
          </Text>
        </View>
        {type === 'follows' ? (
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
            onPress={() => handleToggleFollow(item.userId, isFollowing)}
          >
            <Text style={[styles.followBtnText, isFollowing && { color: colors.textSecondary }]}>
              {isFollowing ? '已关注' : '+ 关注'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  }, [colors, type, followingMap, handleToggleFollow]);

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (!hasMore && list.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>— 已加载全部 —</Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={list}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.userId)}
        contentContainerStyle={{ paddingBottom: 106 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-off-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {type === 'follows' ? '还没有关注任何人' : '还没有粉丝'}
            </Text>
          </View>
        }
        ListFooterComponent={renderFooter}
        onEndReached={() => hasMore && !loadingMore && loadData(true)}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.sm,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    title: { ...Typography.h3, fontWeight: '700', flex: 1, textAlign: 'center' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
    emptyText: { ...Typography.body2, marginTop: Spacing.sm },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceVariant },
    info: { flex: 1, marginLeft: Spacing.md },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    nickname: { ...Typography.body2, fontWeight: '600' },
    vipBadge: {
      backgroundColor: '#fbbf24',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      marginLeft: 6,
    },
    vipBadgeText: { fontSize: 9, fontWeight: '700', color: '#92400e' },
    signature: { ...Typography.caption, marginTop: 2 },
    subMeta: { ...Typography.overline, marginTop: 2, fontSize: 10 },
    followBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: BorderRadius.xxl,
      backgroundColor: colors.primary,
    },
    followBtnActive: {
      backgroundColor: colors.surfaceVariant,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    followBtnText: { ...Typography.caption, color: '#ffffff', fontWeight: '600' },
    footer: { paddingVertical: Spacing.lg, alignItems: 'center' },
    footerText: { ...Typography.caption },
  });
}
