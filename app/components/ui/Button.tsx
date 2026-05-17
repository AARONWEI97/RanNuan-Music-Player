import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LightColors } from '../../theme/colors';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const sizeConfig: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number; borderRadius: number }> = {
  sm: { height: 32, paddingHorizontal: Spacing.md, fontSize: 12, borderRadius: BorderRadius.sm },
  md: { height: 40, paddingHorizontal: Spacing.lg, fontSize: 14, borderRadius: BorderRadius.md },
  lg: { height: 48, paddingHorizontal: Spacing.xl, fontSize: 16, borderRadius: BorderRadius.lg },
};

const getVariantStyle = (variant: ButtonVariant): { container: ViewStyle; text: TextStyle } => {
  switch (variant) {
    case 'primary':
      return {
        container: { backgroundColor: LightColors.primary },
        text: { color: '#ffffff' },
      };
    case 'secondary':
      return {
        container: { backgroundColor: LightColors.surfaceVariant, borderWidth: 1, borderColor: LightColors.border },
        text: { color: LightColors.text },
      };
    case 'ghost':
      return {
        container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: LightColors.primary },
        text: { color: LightColors.primary },
      };
    case 'text':
      return {
        container: { backgroundColor: 'transparent' },
        text: { color: LightColors.primary },
      };
  }
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const config = sizeConfig[size];
  const variantStyles = getVariantStyle(variant);
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          height: config.height,
          paddingHorizontal: config.paddingHorizontal,
          borderRadius: config.borderRadius,
        },
        variantStyles.container,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#ffffff' : LightColors.primary}
        />
      ) : (
        <Text
          style={[
            styles.text,
            { fontSize: config.fontSize },
            variantStyles.text,
            isDisabled && styles.disabledText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '500',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
});
