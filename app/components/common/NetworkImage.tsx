import React, { memo } from 'react';
import { View, Text, StyleSheet, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { LightColors } from '../../theme/colors';

interface NetworkImageProps {
  uri?: string | null;
  style?: ImageStyle;
  placeholder?: React.ReactNode;
  onError?: () => void;
}

const NetworkImage = memo(function NetworkImage({ uri, style, placeholder, onError }: NetworkImageProps) {
  if (!uri) {
    return placeholder ? <>{placeholder}</> : <DefaultPlaceholder style={style} />;
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, style]}
      contentFit="cover"
      transition={200}
      onError={onError}
      recyclingKey={uri}
    />
  );
});

export default NetworkImage;

function DefaultPlaceholder({ style }: { style?: ImageStyle }) {
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.placeholderIcon}>♪</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: LightColors.surfaceVariant,
  },
  placeholder: {
    backgroundColor: LightColors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 20,
    color: LightColors.textTertiary,
  },
});
