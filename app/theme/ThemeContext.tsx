import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '../store/settingsStore';
import { LightColors, DarkColors } from './colors';
import { Typography } from './typography';
import { Spacing, BorderRadius, IconSize } from './spacing';
import type { AppTheme } from './types';

// 直接创建 theme 对象，避免从 ./index 循环引用
const lightTheme: AppTheme = {
  colors: LightColors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  iconSize: IconSize,
  dark: false,
};

const darkTheme: AppTheme = {
  colors: DarkColors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  iconSize: IconSize,
  dark: true,
};

interface ThemeContextValue {
  theme: AppTheme;
  colors: typeof LightColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  colors: LightColors,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const settingsTheme = useSettingsStore((s) => s.theme);
  const systemColorScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (settingsTheme === 'system') {
      return systemColorScheme === 'dark';
    }
    return settingsTheme === 'dark';
  }, [settingsTheme, systemColorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: isDark ? darkTheme : lightTheme,
      colors: isDark ? DarkColors : LightColors,
      isDark,
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export { ThemeContext };
