import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { LightColors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import { usePlayerStore } from '../../store/playerStore';
import { formatTime } from '../../utils/format';
import * as trackPlayerService from '../../services/trackPlayerService';

export default function ProgressBar() {
  const currentProgress = usePlayerStore((s) => s.currentProgress);
  const duration = usePlayerStore((s) => s.duration);
  const setCurrentProgress = usePlayerStore((s) => s.setCurrentProgress);
  const [slidingValue, setSlidingValue] = useState<number | null>(null);

  const displayProgress = slidingValue !== null ? slidingValue : currentProgress;
  const progressPercent = duration > 0 ? displayProgress / duration : 0;

  const handleSlidingStart = () => {
    setSlidingValue(currentProgress);
  };

  const handleValueChange = (value: number) => {
    setSlidingValue(value);
  };

  const handleSlidingComplete = async (value: number) => {
    setSlidingValue(null);
    setCurrentProgress(value);
    try {
      await trackPlayerService.seekTo(value);
    } catch {}
  };

  return (
    <View style={styles.container}>
      <Text style={styles.timeText}>{formatTime(displayProgress)}</Text>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={Math.max(duration, 1)}
        value={displayProgress}
        onSlidingStart={handleSlidingStart}
        onValueChange={handleValueChange}
        onSlidingComplete={handleSlidingComplete}
        minimumTrackTintColor={LightColors.primary}
        maximumTrackTintColor={LightColors.surfaceVariant}
        thumbTintColor={LightColors.primary}
        tapToSeek={true}
      />

      <Text style={styles.timeText}>{formatTime(duration)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: Spacing.xs,
  },
  timeText: {
    ...Typography.caption,
    color: LightColors.textSecondary,
    width: 42,
    textAlign: 'center',
  },
});
