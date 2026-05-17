import React from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { usePlaylistStore } from '../../store/playlistStore';
import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import { PLAY_MODE_SEQUENTIAL, PLAY_MODE_LOOP, PLAY_MODE_SHUFFLE } from '../../constants/config';

const PLAY_MODE_ICONS: Record<number, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  [PLAY_MODE_SEQUENTIAL]: 'repeat',
  [PLAY_MODE_LOOP]: 'repeat-once',
  [PLAY_MODE_SHUFFLE]: 'shuffle',
};

const PLAY_MODE_LABELS: Record<number, string> = {
  [PLAY_MODE_SEQUENTIAL]: '顺序',
  [PLAY_MODE_LOOP]: '单曲',
  [PLAY_MODE_SHUFFLE]: '随机',
};

interface PlayModeToggleProps {
  size?: 'small' | 'normal';
  showLabel?: boolean;
}

export default function PlayModeToggle({ size = 'normal', showLabel = false }: PlayModeToggleProps) {
  const { colors } = useAppTheme();
  const playMode = usePlaylistStore((s) => s.playMode);
  const togglePlayMode = usePlaylistStore((s) => s.togglePlayMode);

  const iconSize = size === 'small' ? 18 : 24;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={togglePlayMode}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <MaterialCommunityIcons
        name={PLAY_MODE_ICONS[playMode] || 'repeat'}
        size={iconSize}
        color={colors.textSecondary}
      />
      {showLabel && (
        <Text style={[styles.label, { color: colors.textTertiary }]}>
          {PLAY_MODE_LABELS[playMode]}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.overline,
    marginTop: 2,
  },
});
