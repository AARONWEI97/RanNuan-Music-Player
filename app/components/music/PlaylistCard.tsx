import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import { formatPlayCount } from '../../utils/format';
import NetworkImage from '../common/NetworkImage';

interface PlaylistCardProps {
  id: number | string;
  name: string;
  picUrl: string;
  playCount?: number;
  onPress?: (id: number | string) => void;
}

export default function PlaylistCard({ id, name, picUrl, playCount, onPress }: PlaylistCardProps) {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={() => onPress?.(id)}
      activeOpacity={0.7}
      style={styles.container}
    >
      <View style={styles.coverContainer}>
        <NetworkImage uri={picUrl} style={styles.cover} />
        {playCount !== undefined && playCount > 0 && (
          <View style={styles.playCountBadge}>
            <MaterialCommunityIcons name="play" size={8} color="#ffffff" />
            <Text style={styles.playCountText}>{formatPlayCount(playCount)}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    marginRight: Spacing.md,
  },
  coverContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  cover: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.md,
  },
  playCountBadge: {
    position: 'absolute',
    top: 4,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  playCountText: {
    ...Typography.overline,
    color: '#ffffff',
    fontSize: 9,
    marginLeft: 2,
  },
  name: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
});
