import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LightColors } from '../../theme/colors';
import { Spacing } from '../../theme/spacing';
import { Typography } from '../../theme/typography';

interface SectionHeaderProps {
  title: string;
  onMorePress?: () => void;
  moreText?: string;
}

export default function SectionHeader({ title, onMorePress, moreText = '更多' }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {onMorePress ? (
        <TouchableOpacity onPress={onMorePress} activeOpacity={0.7} style={styles.moreButton}>
          <Text style={styles.moreText}>{moreText}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    ...Typography.h4,
    color: LightColors.text,
    flex: 1,
  },
  moreButton: {
    paddingLeft: Spacing.sm,
  },
  moreText: {
    ...Typography.caption,
    color: LightColors.textSecondary,
  },
});
