import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '../store/settingsStore';
import { LightColors, DarkColors, DogLightColors, DogDarkColors } from './colors';
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

const dogLightTheme: AppTheme = {
  colors: DogLightColors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  iconSize: IconSize,
  dark: false,
};

const dogDarkTheme: AppTheme = {
  colors: DogDarkColors,
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
  isDog: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  colors: LightColors,
  isDark: false,
  isDog: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const settingsTheme = useSettingsStore((s) => s.theme);
  const systemColorScheme = useColorScheme();

  const isDog = settingsTheme === 'dog-light' || settingsTheme === 'dog-dark';

  const isDark = useMemo(() => {
    if (settingsTheme === 'system') {
      return systemColorScheme === 'dark';
    }
    return settingsTheme === 'dark' || settingsTheme === 'dog-dark';
  }, [settingsTheme, systemColorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => {
      let theme: AppTheme;
      if (isDog) {
        theme = isDark ? dogDarkTheme : dogLightTheme;
      } else {
        theme = isDark ? darkTheme : lightTheme;
      }
      return {
        theme,
        colors: theme.colors,
        isDark,
        isDog,
      };
    },
    [isDark, isDog]
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
