import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import { usePlayerStore } from '../../store/playerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import * as trackPlayerService from '../../services/trackPlayerService';
import NetworkImage from '../common/NetworkImage';
import PlayModeToggle from './PlayModeToggle';

interface MiniPlayerProps {
  onPress?: () => void;
}

export default function MiniPlayer({ onPress }: MiniPlayerProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const playMusic = usePlayerStore((s) => s.playMusic);
  const isPlay = usePlayerStore((s) => s.isPlay);
  const currentProgress = usePlayerStore((s) => s.currentProgress);
  const duration = usePlayerStore((s) => s.duration);
  const setIsPlay = usePlayerStore((s) => s.setIsPlay);
  const setShowPlaylistDrawer = usePlaylistStore((s) => s.setShowPlaylistDrawer);

  if (!playMusic) return null;

  const artistName = playMusic.ar?.map((a) => a.name).join(' / ') || '未知歌手';
  const coverUrl = playMusic.picUrl || playMusic.al?.picUrl;
  const progressPercent = duration > 0 ? currentProgress / duration : 0;

  const handlePlayPause = async () => {
    try {
      await trackPlayerService.togglePlayback();
      setIsPlay(!isPlay);
    } catch {}
  };

  const handleNext = async () => {
    try {
      await trackPlayerService.skipToNext();
    } catch {}
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.container}>
      <View style={[styles.progressBar, { width: `${Math.min(progressPercent * 100, 100)}%` }]} />

      <View style={styles.content}>
        <NetworkImage uri={coverUrl} style={styles.cover} />

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {playMusic.name}
          </Text>
          <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
            {artistName}
          </Text>
        </View>

        <PlayModeToggle size="small" />

        <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.controlIcon}>{isPlay ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNext} style={styles.controlButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.controlIcon}>⏭</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowPlaylistDrawer(true)} style={styles.controlButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.controlIcon}>☰</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  container: {
    backgroundColor: colors.miniPlayerBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cover: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceVariant,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  name: {
    ...Typography.body2,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 1,
  },
  artist: {
    ...Typography.caption,
    color: colors.textSecondary,
  },
  controlButton: {
    padding: Spacing.xs,
  },
  controlIcon: {
    fontSize: 20,
    color: colors.text,
  },
  });
}
