import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LightColors } from '../../theme/colors';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import NetworkImage from '../common/NetworkImage';

interface ArtistCardProps {
  id: number | string;
  name: string;
  picUrl?: string;
  alias?: string[];
  onPress?: (id: number | string) => void;
}

export default function ArtistCard({ id, name, picUrl, alias, onPress }: ArtistCardProps) {
  const aliasText = alias && alias.length > 0 ? alias[0] : '';

  return (
    <TouchableOpacity
      onPress={() => onPress?.(id)}
      activeOpacity={0.7}
      style={styles.container}
    >
      <View style={styles.avatarContainer}>
        <NetworkImage
          uri={picUrl}
          style={styles.avatar}
        />
      </View>
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {name}
      </Text>
      {aliasText ? (
        <Text style={styles.alias} numberOfLines={1} ellipsizeMode="tail">
          {aliasText}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 90,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: LightColors.surfaceVariant,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  name: {
    ...Typography.caption,
    color: LightColors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  alias: {
    ...Typography.overline,
    color: LightColors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});
