import React from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';

import { usePlaylistStore } from '../../store/playlistStore';
import { LightColors } from '../../theme/colors';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';

const PLAY_MODE_ICONS = ['🔁', '🔂', '🔀', '💝'];
const PLAY_MODE_LABELS = ['顺序', '单曲', '随机', '心动'];

interface PlayModeToggleProps {
  size?: 'small' | 'normal';
  showLabel?: boolean;
}

export default function PlayModeToggle({ size = 'normal', showLabel = false }: PlayModeToggleProps) {
  const playMode = usePlaylistStore((s) => s.playMode);
  const togglePlayMode = usePlaylistStore((s) => s.togglePlayMode);

  const iconSize = size === 'small' ? 18 : 22;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={togglePlayMode}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.icon, { fontSize: iconSize }]}>{PLAY_MODE_ICONS[playMode]}</Text>
      {showLabel && (
        <Text style={styles.label}>{PLAY_MODE_LABELS[playMode]}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {},
  label: {
    ...Typography.overline,
    color: LightColors.textTertiary,
    marginTop: 2,
  },
});
