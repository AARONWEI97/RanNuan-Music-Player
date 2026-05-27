import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
import DonationModal from './app/components/common/DonationModal';
import { APP_VERSION } from './app/constants/config';

const DONATION_SHOWN_KEY = 'donation_shown_version';

function AppContent() {
  const { isDark, colors } = useAppTheme();
  const apiBaseUrl = useSettingsStore((s) => s.apiBaseUrl);
  const initializeFavoriteList = useFavoriteStore((s) => s.initializeFavoriteList);
  const checkLoginStatus = useUserStore((s) => s.checkLoginStatus);

  // ★ 打赏弹窗状态由 settingsStore 全局管理，HomeScreen 点击 logo 也能触发
  const showDonation = useSettingsStore((s) => s.showDonation);
  const setShowDonation = useSettingsStore((s) => s.setShowDonation);

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

  // ★ 首次启动时检查是否需要展示打赏弹窗
  useEffect(() => {
    AsyncStorage.getItem(DONATION_SHOWN_KEY).then((shownVersion) => {
      if (shownVersion !== APP_VERSION) {
        // 延迟 1.5s 显示，等首页加载完
        setTimeout(() => setShowDonation(true), 1500);
      }
    });
  }, []);

  const handleCloseDonation = useCallback(() => {
    setShowDonation(false);
    AsyncStorage.setItem(DONATION_SHOWN_KEY, APP_VERSION);
  }, [setShowDonation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
      <PlaylistDrawer />
      <DonationModal visible={showDonation} onClose={handleCloseDonation} />
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
