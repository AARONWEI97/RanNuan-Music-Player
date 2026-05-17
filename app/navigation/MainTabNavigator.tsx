import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigation, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import UserScreen from '../screens/UserScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PlayerScreen from '../screens/PlayerScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';
import ArtistDetailScreen from '../screens/ArtistDetailScreen';
import AlbumDetailScreen from '../screens/AlbumDetailScreen';
import ToplistScreen from '../screens/ToplistScreen';
import MvScreen from '../screens/MvScreen';
import LoginScreen from '../screens/LoginScreen';
import DownloadScreen from '../screens/DownloadScreen';
import MiniPlayer from '../components/player/MiniPlayer';
import { usePlayerStore } from '../store/playerStore';
import { useAppTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 递归获取路由栈中最顶层的路由名
function getDeepRouteName(state: any): string {
  if (!state || !state.routes) return '';
  const current = state.routes[state.index];
  if (current?.state) {
    return getDeepRouteName(current.state);
  }
  return current?.name || '';
}

function MiniPlayerWithNavigation() {
  const navigation = useNavigation();

  return (
    <MiniPlayer
      onPress={() => {
        navigation.navigate('Player' as never);
      }}
    />
  );
}

// Dog theme tab icons
const DOG_TAB_ICONS: Record<string, any> = {
  Home: require('../../assets/dog-theme/tab_home.png'),
  Search: require('../../assets/dog-theme/tab_search.png'),
  User: require('../../assets/dog-theme/tab_user.png'),
  Settings: require('../../assets/dog-theme/tab_settings.png'),
};

function MainTabs() {
  const { colors, isDog } = useAppTheme();
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, 4);
  const tabBarHeight = 52 + bottomPadding;

  const renderTabIcon = (name: string, defaultIcon: string) => {
    return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => {
      if (isDog) {
        return (
          <Image
            source={DOG_TAB_ICONS[name]}
            style={{
              width: size + 2,
              height: size + 2,
              opacity: focused ? 1 : 0.5,
            }}
            resizeMode="contain"
          />
        );
      }
      return <MaterialCommunityIcons name={defaultIcon as any} size={size} color={color} />;
    };
  };

  return (
    <View style={styles.tabContainer}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.divider,
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingBottom: bottomPadding,
            height: tabBarHeight,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: '首页',
            tabBarIcon: renderTabIcon('Home', 'home-variant'),
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{
            tabBarLabel: '搜索',
            tabBarIcon: renderTabIcon('Search', 'magnify'),
          }}
        />
        <Tab.Screen
          name="User"
          component={UserScreen}
          options={{
            tabBarLabel: '我的',
            tabBarIcon: renderTabIcon('User', 'account-circle-outline'),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: '设置',
            tabBarIcon: renderTabIcon('Settings', 'cog-outline'),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

function GlobalMiniPlayer({ currentRouteName }: { currentRouteName: string }) {
  const playMusic = usePlayerStore((s) => s.playMusic);
  const insets = useSafeAreaInsets();

  if (!playMusic) {
    return null;
  }

  // 全屏播放器页面不显示 MiniPlayer
  if (currentRouteName === 'Player') {
    return null;
  }

  // 在 Tab 页面时，MiniPlayer 在 TabBar 上方；在其他子页面时，在底部安全区域上方
  const isTabRoute = ['Home', 'Search', 'User', 'Settings'].includes(currentRouteName);
  const bottomPadding = Math.max(insets.bottom, 4);
  const tabBarHeight = 52 + bottomPadding;
  const bottomOffset = isTabRoute ? tabBarHeight : bottomPadding;

  return (
    <View style={[styles.globalMiniPlayerContainer, { bottom: bottomOffset }]}>
      <MiniPlayerWithNavigation />
    </View>
  );
}

// Common stack screen options for smooth animations
const stackScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
};

export default function AppNavigator() {
  const navRef = useRef<NavigationContainerRef<ReactNavigation.RootParamList>>(null);
  const [currentRouteName, setCurrentRouteName] = useState('');

  const handleStateChange = useCallback(() => {
    const state = navRef.current?.getRootState();
    if (state) {
      setCurrentRouteName(getDeepRouteName(state));
    }
  }, []);

  // 初始化时获取一次路由名
  useEffect(() => {
    const state = navRef.current?.getRootState();
    if (state) {
      setCurrentRouteName(getDeepRouteName(state));
    }
  }, []);

  return (
    <NavigationContainer ref={navRef} onStateChange={handleStateChange}>
      <View style={styles.rootContainer}>
        <Stack.Navigator screenOptions={stackScreenOptions}>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'none' }} />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen as any} options={{ headerShown: false }} />
          <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen as any} options={{ headerShown: false }} />
          <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen as any} options={{ headerShown: false }} />
          <Stack.Screen name="Toplist" component={ToplistScreen} />
          <Stack.Screen name="MvList" component={MvScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Download" component={DownloadScreen} />
        </Stack.Navigator>
        <GlobalMiniPlayer currentRouteName={currentRouteName} />
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  tabContainer: {
    flex: 1,
  },
  globalMiniPlayerContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 10,
  },
});
