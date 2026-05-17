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
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

function getStatusIcon(status: DownloadTask['status']): React.ComponentProps<typeof MaterialCommunityIcons>['name'] {
  const map: Record<DownloadTask['status'], React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
    pending: 'clock-outline',
    downloading: 'download',
    completed: 'check-circle',
    failed: 'alert-circle',
    paused: 'pause-circle',
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
          style={[styles.itemContainer, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}
          onPress={() => item.status === 'completed' ? handlePlay(item) : undefined}
          activeOpacity={item.status === 'completed' ? 0.7 : 1}
        >
          <NetworkImage uri={coverUrl} style={styles.cover} />
          <View style={styles.info}>
            <Text style={[styles.songName, { color: colors.text }]} numberOfLines={1}>{item.song.name}</Text>
            <Text style={[styles.artistName, { color: colors.textSecondary }]} numberOfLines={1}>{artistName}</Text>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name={getStatusIcon(item.status)} size={14} color={getStatusColor(item.status, colors)} />
              <Text style={[styles.statusText, { color: getStatusColor(item.status, colors) }]}>
                {getStatusText(item.status)}
              </Text>
              {item.status === 'downloading' && (
                <Text style={[styles.progressText, { color: colors.primary }]}>{Math.round(item.progress * 100)}%</Text>
              )}
              {item.fileSize ? (
                <Text style={[styles.sizeText, { color: colors.textTertiary }]}>{formatFileSize(item.fileSize)}</Text>
              ) : null}
            </View>
            {item.status === 'downloading' && (
              <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceVariant }]}>
                <View style={[styles.progressBarFill, { width: `${item.progress * 100}%`, backgroundColor: colors.primary }]} />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="delete-outline" size={22} color={colors.textTertiary} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [handlePlay, handleDelete, colors]
  );

  const keyExtractor = useCallback((item: DownloadTask) => String(item.song.id), []);

  const ListHeader = useMemo(() => {
    if (completedList.length === 0) return null;
    return (
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
          已完成 {completedList.length} 首
        </Text>
        <TouchableOpacity onPress={handleClearAll}>
          <Text style={[styles.clearAllText, { color: colors.error }]}>清除全部</Text>
        </TouchableOpacity>
      </View>
    );
  }, [completedList.length, handleClearAll, colors]);

  if (allItems.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.titleBar}>
          <Text style={[styles.title, { color: colors.text }]}>下载管理</Text>
        </View>
        <EmptyState title="暂无下载任务" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.titleBar}>
        <Text style={[styles.title, { color: colors.text }]}>下载管理</Text>
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
  },
  titleBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    ...Typography.h4,
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
  },
  clearAllText: {
    ...Typography.caption,
  },
  listContent: {
    paddingBottom: 100,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    fontWeight: '500',
    marginBottom: 2,
  },
  artistName: {
    ...Typography.caption,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusText: {
    ...Typography.overline,
    fontWeight: '600',
  },
  progressText: {
    ...Typography.overline,
  },
  sizeText: {
    ...Typography.overline,
  },
  progressBarBg: {
    height: 3,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  });
}
