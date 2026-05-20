import React, { useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import { SongResult } from '../../types';
import { formatDuration } from '../../utils/format';
import NetworkImage from '../common/NetworkImage';

interface SongItemProps {
  song: SongResult;
  isActive?: boolean;
  onPress?: () => void;
  onMorePress?: () => void;
  index?: number;
}

const SongItem = memo(function SongItem({ song, isActive = false, onPress, onMorePress, index }: SongItemProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const artistName = song.ar?.map((a) => a.name).join(' / ') || '未知歌手';
  const duration = song.duration || song.dt || 0;
  const coverUrl = song.picUrl || song.al?.picUrl;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, isActive && styles.activeContainer]}
    >
      {index !== undefined && (
        <View style={styles.indexContainer}>
          <Text style={[styles.indexText, isActive && styles.activeText]}>
            {index + 1}
          </Text>
        </View>
      )}

      <NetworkImage
        uri={coverUrl}
        style={styles.cover}
      />

      <View style={styles.info}>
        <Text
          style={[styles.name, isActive && styles.activeText]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {song.name}
        </Text>
        <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
          {artistName}
        </Text>
      </View>

      {duration > 0 && (
        <Text style={styles.duration}>{formatDuration(duration)}</Text>
      )}

      {onMorePress && (
        <TouchableOpacity onPress={onMorePress} style={styles.moreButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.moreIcon}>⋮</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}, (prev, next) => {
  // 只在关键 props 变化时重渲染，忽略 onPress/onMorePress 引用变化
  return prev.song.id === next.song.id
    && prev.isActive === next.isActive
    && prev.index === next.index;
});

export default SongItem;

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.background,
  },
  activeContainer: {
    backgroundColor: `${colors.primary}10`,
  },
  indexContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  indexText: {
    ...Typography.caption,
    color: colors.textSecondary,
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
    justifyContent: 'center',
  },
  name: {
    ...Typography.body2,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  artist: {
    ...Typography.caption,
    color: colors.textSecondary,
  },
  activeText: {
    color: colors.primary,
  },
  duration: {
    ...Typography.caption,
    color: colors.textTertiary,
    marginRight: Spacing.xs,
  },
  moreButton: {
    padding: Spacing.xs,
  },
  moreIcon: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  });
}
