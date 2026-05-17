import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing } from '../../theme/spacing';
import { usePlayerStore } from '../../store/playerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { usePlayer } from '../../hooks/usePlayer';
import { PLAY_MODE_SEQUENTIAL, PLAY_MODE_LOOP, PLAY_MODE_SHUFFLE, PLAY_MODE_INTELLIGENCE } from '../../constants/config';

const PLAY_MODE_ICONS: Record<number, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  [PLAY_MODE_SEQUENTIAL]: 'repeat',
  [PLAY_MODE_LOOP]: 'repeat-once',
  [PLAY_MODE_SHUFFLE]: 'shuffle',
  [PLAY_MODE_INTELLIGENCE]: 'head-heart',
};

export default function PlayerControls() {
  const { colors } = useAppTheme();
  const isPlay = usePlayerStore((s) => s.isPlay);
  const playMode = usePlaylistStore((s) => s.playMode);
  const togglePlayMode = usePlaylistStore((s) => s.togglePlayMode);
  const { togglePlayback, next, prev } = usePlayer();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={togglePlayMode} style={styles.sideButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MaterialCommunityIcons
          name={PLAY_MODE_ICONS[playMode] || 'repeat'}
          size={22}
          color={playMode !== PLAY_MODE_SEQUENTIAL ? colors.primary : colors.textSecondary}
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={prev} style={styles.controlButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MaterialCommunityIcons name="skip-previous" size={32} color={colors.text} />
      </TouchableOpacity>

      <TouchableOpacity onPress={togglePlayback} style={[styles.playButton, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
        <MaterialCommunityIcons name={isPlay ? 'pause' : 'play'} size={30} color="#ffffff" style={{ marginLeft: isPlay ? 0 : 2 }} />
      </TouchableOpacity>

      <TouchableOpacity onPress={next} style={styles.controlButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MaterialCommunityIcons name="skip-next" size={32} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.sideButton}>
        {/* 右侧占位，保持对称 */}
      </View>
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
    width: 44,
  },
  controlButton: {
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
  },
});
