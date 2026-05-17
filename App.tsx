import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setupPlayer } from './app/services/trackPlayerService';
import { useSettingsStore } from './app/store/settingsStore';
import { useFavoriteStore } from './app/store/favoriteStore';
import { useUserStore } from './app/store/userStore';
import { setApiBaseUrl } from './app/api/request';
import { DEFAULT_API_URL } from './app/constants/config';
import { ThemeProvider, useAppTheme } from './app/theme/ThemeContext';
import './app/i18n';
import ErrorBoundary from './app/components/common/ErrorBoundary';
import AppNavigator from './app/navigation/MainTabNavigator';
import PlaylistDrawer from './app/components/player/PlaylistDrawer';

function AppContent() {
  const { isDark, colors } = useAppTheme();
  const apiBaseUrl = useSettingsStore((s) => s.apiBaseUrl);
  const initializeFavoriteList = useFavoriteStore((s) => s.initializeFavoriteList);
  const checkLoginStatus = useUserStore((s) => s.checkLoginStatus);

  useEffect(() => {
    setupPlayer().catch(console.warn);
  }, []);

  useEffect(() => {
    const url = apiBaseUrl || DEFAULT_API_URL;
    setApiBaseUrl(url);
  }, [apiBaseUrl]);

  useEffect(() => {
    initializeFavoriteList([]);
  }, [initializeFavoriteList]);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
      <PlaylistDrawer />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
