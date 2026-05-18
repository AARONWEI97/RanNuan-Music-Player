import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import { usePlayerStore } from '../../store/playerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { usePlayer } from '../../hooks/usePlayer';
import NetworkImage from '../common/NetworkImage';

interface MiniPlayerProps {
  onPress?: () => void;
}

export default function MiniPlayer({ onPress }: MiniPlayerProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const playMusic = usePlayerStore((s) => s.playMusic);
  const isPlay = usePlayerStore((s) => s.isPlay);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const currentProgress = usePlayerStore((s) => s.currentProgress);
  const duration = usePlayerStore((s) => s.duration);
  const setShowPlaylistDrawer = usePlaylistStore((s) => s.setShowPlaylistDrawer);
  const { togglePlayback, next } = usePlayer();

  if (!playMusic) return null;

  const artistName = playMusic.ar?.map((a) => a.name).join(' / ') || '未知歌手';
  const coverUrl = playMusic.picUrl || playMusic.al?.picUrl;
  const progressPercent = duration > 0 ? currentProgress / duration : 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.container}>
      {/* 底层进度条背景 */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(progressPercent * 100, 100)}%` }]} />
      </View>

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

        <TouchableOpacity onPress={togglePlayback} style={styles.controlBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={styles.playBtnCircle}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons
                name={isPlay ? 'pause' : 'play'}
                size={22}
                color="#fff"
                style={!isPlay ? { marginLeft: 2 } : undefined}
              />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={next} style={styles.controlBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="skip-next" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowPlaylistDrawer(true)} style={styles.controlBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="playlist-music" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  container: {
    backgroundColor: colors.miniPlayerBg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    // 阴影（iOS）
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    // 阴影（Android）
    elevation: 4,
  },
  progressTrack: {
    height: 2,
    backgroundColor: colors.divider,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    paddingVertical: 8,
  },
  cover: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
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
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    ...Typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  playBtnCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtn: {
    padding: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  });
}
