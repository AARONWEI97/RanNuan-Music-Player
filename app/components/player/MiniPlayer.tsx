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
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.container}>
      {/* Progress bar — ultra-thin, spans full width */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(progressPercent * 100, 100)}%` }]} />
      </View>

      <View style={styles.content}>
        {/* Cover art */}
        <NetworkImage uri={coverUrl} style={styles.cover} />

        {/* Song info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {playMusic.name}
          </Text>
          <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
            {artistName}
          </Text>
        </View>

        {/* Play / Pause */}
        <TouchableOpacity onPress={togglePlayback} style={styles.controlBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <View style={[styles.playBtnCircle, isPlay && styles.playBtnActive]}>
            {isLoading ? (
              <ActivityIndicator size="small" color={isPlay ? '#fff' : colors.primary} />
            ) : (
              <MaterialCommunityIcons
                name={isPlay ? 'pause' : 'play'}
                size={20}
                color={isPlay ? '#fff' : colors.primary}
                style={!isPlay ? { marginLeft: 2 } : undefined}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity onPress={next} style={styles.controlBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons name="skip-next" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Playlist */}
        <TouchableOpacity onPress={() => setShowPlaylistDrawer(true)} style={styles.controlBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons name="playlist-music" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.miniPlayerBg,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      // Shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    progressTrack: {
      height: 2,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    progressFill: {
      height: 2,
      backgroundColor: colors.primary,
      borderRadius: 1,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: Spacing.md,
      paddingRight: Spacing.sm,
      paddingVertical: Spacing.sm,
    },
    cover: {
      width: 46,
      height: 46,
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
      marginBottom: 1,
    },
    artist: {
      ...Typography.caption,
      color: colors.textSecondary,
      fontSize: 11,
    },
    playBtnCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    playBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    controlBtn: {
      padding: Spacing.xs,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
