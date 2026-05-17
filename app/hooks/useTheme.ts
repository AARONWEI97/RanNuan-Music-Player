import { useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '../store/settingsStore';

export type AppTheme = 'light' | 'dark';

export function useTheme() {
  const settingsStore = useSettingsStore();
  const systemColorScheme = useColorScheme();

  const theme = useMemo<AppTheme>(() => {
    if (settingsStore.theme === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return settingsStore.theme as AppTheme;
  }, [settingsStore.theme, systemColorScheme]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    settingsStore.setTheme(nextTheme);
  }, [theme, settingsStore]);

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
  };
}
