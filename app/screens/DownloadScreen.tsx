import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDownload } from '../hooks/useDownload';
import { usePlayer } from '../hooks/usePlayer';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import NetworkImage from '../components/common/NetworkImage';
import EmptyState from '../components/ui/EmptyState';
import type { DownloadTask } from '../store/downloadStore';

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function getStatusText(status: DownloadTask['status']): string {
  const map: Record<DownloadTask['status'], string> = {
    pending: '等待中',
    downloading: '下载中',
    completed: '已完成',
    failed: '失败',
    paused: '已暂停',
  };
  return map[status];
}

function getStatusColor(status: DownloadTask['status'], colors: ReturnType<typeof useAppTheme>['colors']): string {
  const map: Record<DownloadTask['status'], string> = {
    pending: colors.textTertiary,
    downloading: colors.primary,
    completed: colors.success,
    failed: colors.error,
    paused: colors.warning,
  };
  return map[status];
}

export default function DownloadScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { completedList, tasks, remove, clearAll } = useDownload();
  const { playSong } = usePlayer();

  const allItems = useMemo(() => {
    const completedIds = new Set(completedList.map((c) => String(c.song.id)));
    const activeTasks = tasks.filter((t) => !completedIds.has(String(t.song.id)));
    return [...activeTasks, ...completedList];
  }, [tasks, completedList]);

  const handlePlay = useCallback(
    (task: DownloadTask) => {
      if (task.status === 'completed' && task.localUri) {
        playSong({
          ...task.song,
          playMusicUrl: task.localUri,
        });
      }
    },
    [playSong]
  );

  const handleDelete = useCallback(
    (task: DownloadTask) => {
      Alert.alert('删除下载', `确定要删除"${task.song.name}"吗？`, [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => remove(task.song.id),
        },
      ]);
    },
    [remove]
  );

  const handleClearAll = useCallback(() => {
    if (completedList.length === 0) return;
    Alert.alert('清除全部', '确定要清除所有已下载的歌曲吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: () => clearAll(),
      },
    ]);
  }, [completedList.length, clearAll]);

  const renderItem = useCallback(
    ({ item }: { item: DownloadTask }) => {
      const artistName = item.song.ar?.map((a) => a.name).join(' / ') || '未知歌手';
      const coverUrl = item.song.picUrl || item.song.al?.picUrl;

      return (
        <TouchableOpacity
          style={styles.itemContainer}
          onPress={() => item.status === 'completed' ? handlePlay(item) : undefined}
          activeOpacity={item.status === 'completed' ? 0.7 : 1}
        >
          <NetworkImage uri={coverUrl} style={styles.cover} />
          <View style={styles.info}>
            <Text style={styles.songName} numberOfLines={1}>{item.song.name}</Text>
            <Text style={styles.artistName} numberOfLines={1}>{artistName}</Text>
            <View style={styles.statusRow}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status, colors) }]}>
                {getStatusText(item.status)}
              </Text>
              {item.status === 'downloading' && (
                <Text style={styles.progressText}>{Math.round(item.progress * 100)}%</Text>
              )}
              {item.fileSize ? (
                <Text style={styles.sizeText}>{formatFileSize(item.fileSize)}</Text>
              ) : null}
            </View>
            {item.status === 'downloading' && (
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${item.progress * 100}%` }]} />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [handlePlay, handleDelete]
  );

  const keyExtractor = useCallback((item: DownloadTask) => String(item.song.id), []);

  const ListHeader = useMemo(() => {
    if (completedList.length === 0) return null;
    return (
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>
          已完成 {completedList.length} 首
        </Text>
        <TouchableOpacity onPress={handleClearAll}>
          <Text style={styles.clearAllText}>清除全部</Text>
        </TouchableOpacity>
      </View>
    );
  }, [completedList.length, handleClearAll]);

  if (allItems.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.titleBar}>
          <Text style={styles.title}>下载管理</Text>
        </View>
        <EmptyState title="暂无下载任务" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>下载管理</Text>
      </View>
      {ListHeader}
      <FlatList
        data={allItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titleBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    ...Typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.body2,
    color: colors.textSecondary,
  },
  clearAllText: {
    ...Typography.caption,
    color: colors.error,
  },
  listContent: {
    paddingBottom: 100,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceVariant,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  songName: {
    ...Typography.body2,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  artistName: {
    ...Typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusText: {
    ...Typography.overline,
    fontWeight: '600',
  },
  progressText: {
    ...Typography.overline,
    color: colors.primary,
  },
  sizeText: {
    ...Typography.overline,
    color: colors.textTertiary,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  deleteIcon: {
    fontSize: 18,
  },
  });
}
