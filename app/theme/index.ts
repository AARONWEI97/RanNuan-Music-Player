import { LightColors, DarkColors } from './colors';
import { Typography } from './typography';
import { Spacing, BorderRadius, IconSize } from './spacing';
import type { AppTheme } from './types';

export { type AppTheme } from './types';

export const lightTheme: AppTheme = {
  colors: LightColors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  iconSize: IconSize,
  dark: false,
};

export const darkTheme: AppTheme = {
  colors: DarkColors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  iconSize: IconSize,
  dark: true,
};

export { ThemeProvider, useAppTheme, ThemeContext } from './ThemeContext';
