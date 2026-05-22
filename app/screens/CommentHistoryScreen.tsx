import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useUserStore } from '../store/userStore';
import { getUserCommentHistory } from '../api/comment';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import type { RootStackScreenProps } from '../types';

const PAGE_SIZE = 20;

interface CommentItem {
  commentId: number;
  content: string;
  time: number;
  likedCount: number;
  beReplied: any[];
  songName?: string;
  songId?: number;
  type?: string;
}

export default function CommentHistoryScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackScreenProps<'CommentHistory'>['navigation']>();
  const user = useUserStore((s) => s.user);

  const [list, setList] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastTime, setLastTime] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async (append = false) => {
    if (!user?.userId) return;
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await getUserCommentHistory({
        uid: user.userId,
        limit: PAGE_SIZE,
        time: append ? lastTime : 0,
      });
      const data = res?.data?.comments || res?.data?.data?.comments || [];

      if (Array.isArray(data)) {
        const mapped: CommentItem[] = data.map((c: any) => ({
          commentId: c.commentId,
          content: c.content,
          time: c.time,
          likedCount: c.likedCount || 0,
          beReplied: c.beReplied || [],
          songName: c.songName || c.beReplied?.[0]?.content?.match(/歌曲：(.+)/)?.[1] || '',
          songId: c.songId || c.threadId?.split('_')?.pop(),
          type: c.type || '评论',
        }));
        if (append) {
          setList((prev) => [...prev, ...mapped]);
        } else {
          setList(mapped);
        }
        if (mapped.length > 0) {
          setLastTime(mapped[mapped.length - 1].time);
        }
        setHasMore(data.length >= PAGE_SIZE && res?.data?.more !== false);
      } else if (!append) {
        setList([]);
      }
    } catch {
      if (!append) setList([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.userId, lastTime]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const renderItem = useCallback(({ item }: { item: CommentItem }) => (
    <View style={[styles.item, { borderBottomColor: colors.divider }]}>
      <View style={styles.itemHeader}>
        <Text style={[styles.timeText, { color: colors.textTertiary }]}>
          {formatTime(item.time)}
        </Text>
        <View style={styles.likesRow}>
          <MaterialCommunityIcons name="thumb-up-outline" size={13} color={colors.textTertiary} />
          <Text style={[styles.likesCount, { color: colors.textTertiary }]}>
            {item.likedCount > 0 ? item.likedCount : ''}
          </Text>
        </View>
      </View>
      <Text style={[styles.content, { color: colors.text }]} numberOfLines={4}>
        {item.content}
      </Text>
      {item.beReplied?.length > 0 && (
        <View style={[styles.replyBox, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.replyLabel, { color: colors.primary }]}>回复</Text>
          <Text style={[styles.replyContent, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.beReplied[0]?.content || ''}
          </Text>
        </View>
      )}
    </View>
  ), [colors]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>历史评论</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={list}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.commentId)}
          contentContainerStyle={{ paddingBottom: 106 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="comment-text-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                还没有发表过评论
              </Text>
            </View>
          }
          ListFooterComponent={renderFooter}
          onEndReached={() => hasMore && !loadingMore && loadData(true)}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
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
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
    timeText: { ...Typography.caption },
    likesRow: { flexDirection: 'row', alignItems: 'center' },
    likesCount: { ...Typography.caption, marginLeft: 3 },
    content: { ...Typography.body2, lineHeight: 22, marginBottom: Spacing.sm },
    replyBox: {
      borderRadius: BorderRadius.md,
      padding: Spacing.sm,
    },
    replyLabel: { ...Typography.overline, fontWeight: '600', marginBottom: 2 },
    replyContent: { ...Typography.caption },
    footer: { paddingVertical: Spacing.lg, alignItems: 'center' },
    footerText: { ...Typography.caption },
  });
}
