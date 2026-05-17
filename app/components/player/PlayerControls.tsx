import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LightColors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { usePlayerStore } from '../../store/playerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import * as trackPlayerService from '../../services/trackPlayerService';

const PLAY_MODE_ICONS = ['🔁', '🔂', '🔀', '🧠'];

export default function PlayerControls() {
  const isPlay = usePlayerStore((s) => s.isPlay);
  const setIsPlay = usePlayerStore((s) => s.setIsPlay);
  const playMode = usePlaylistStore((s) => s.playMode);
  const togglePlayMode = usePlaylistStore((s) => s.togglePlayMode);

  const handlePlayPause = async () => {
    try {
      await trackPlayerService.togglePlayback();
      setIsPlay(!isPlay);
    } catch {}
  };

  const handlePrevious = async () => {
    try {
      await trackPlayerService.skipToPrevious();
    } catch {}
  };

  const handleNext = async () => {
    try {
      await trackPlayerService.skipToNext();
    } catch {}
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={togglePlayMode} style={styles.sideButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.sideIcon}>{PLAY_MODE_ICONS[playMode]}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handlePrevious} style={styles.controlButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.secondaryIcon}>⏮</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handlePlayPause} style={styles.playButton} activeOpacity={0.8}>
        <Text style={styles.playIcon}>{isPlay ? '⏸' : '▶'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleNext} style={styles.controlButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.secondaryIcon}>⏭</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={togglePlayMode} style={styles.sideButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={[styles.sideIcon, playMode !== 0 && styles.activeModeIcon]}>{PLAY_MODE_ICONS[playMode]}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  sideButton: {
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideIcon: {
    fontSize: 20,
    color: LightColors.textSecondary,
  },
  activeModeIcon: {
    color: LightColors.primary,
  },
  controlButton: {
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryIcon: {
    fontSize: 28,
    color: LightColors.text,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: LightColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
  },
  playIcon: {
    fontSize: 28,
    color: '#ffffff',
  },
});
