import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LightColors } from '../../theme/colors';
import NetworkImage from '../common/NetworkImage';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

const sizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export default function Avatar({ uri, name, size = 'md', style }: AvatarProps) {
  const [error, setError] = useState(false);
  const dimension = sizeMap[size];
  const showFallback = !uri || error;
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const fontSize = dimension * 0.4;

  if (showFallback) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            backgroundColor: LightColors.primary,
          },
          style,
        ]}
      >
        <Text style={[styles.fallbackText, { fontSize }]}>{initial}</Text>
      </View>
    );
  }

  return (
    <NetworkImage
      uri={uri}
      style={{
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        }}
      onError={() => setError(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
