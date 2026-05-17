import { LightColors } from './colors';
import { Typography } from './typography';
import { Spacing, BorderRadius, IconSize } from './spacing';

export interface AppTheme {
  colors: typeof LightColors;
  typography: typeof Typography;
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
  iconSize: typeof IconSize;
  dark: boolean;
}
