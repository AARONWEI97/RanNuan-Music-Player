import React, { useMemo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';

interface LoadingProps {
  message?: string;
  overlay?: boolean;
  size?: 'small' | 'large';
}

export default function Loading({ message, overlay = false, size = 'small' }: LoadingProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (overlay) {
    return (
      <Modal transparent visible animationType="none">
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={[styles.container, styles.inline]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    paddingVertical: Spacing.lg,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayContent: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    minHeight: 100,
  },
  message: {
    ...Typography.body2,
    color: colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  });
}
