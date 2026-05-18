import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Image, Animated, Easing, Platform, Dimensions, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigation, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

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
import PlaylistImportScreen from '../screens/PlaylistImportScreen';
import MiniPlayer from '../components/player/MiniPlayer';
import { usePlayerStore } from '../store/playerStore';
import { useAppTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Custom Tab Bar Constants ────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_BAR_CONTENT_HEIGHT = 58;
const PILL_WIDTH = 56;
const PILL_HEIGHT = 34;
const GLOW_WIDTH = 76;
const GLOW_HEIGHT = 48;

const DEFAULT_ICONS: Record<string, string> = {
  Home: 'home-variant',
  Search: 'magnify',
  User: 'account-circle-outline',
  Settings: 'cog-outline',
};

function useTabLabels() {
  const { t } = useTranslation();
  return {
    Home: t('tab.home'),
    Search: t('tab.search'),
    User: t('tab.user'),
    Settings: t('tab.settings'),
  };
}

// Dog theme tab icons
const DOG_TAB_ICONS: Record<string, any> = {
  Home: require('../../assets/dog-theme/tab_home.png'),
  Search: require('../../assets/dog-theme/tab_search.png'),
  User: require('../../assets/dog-theme/tab_user.png'),
  Settings: require('../../assets/dog-theme/tab_settings.png'),
};

// ─── Custom Tab Bar ──────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDog } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabLabels = useTabLabels();
  const tabCount = state.routes.length;
  const tabWidth = SCREEN_WIDTH / tabCount;
  const bottomPadding = Math.max(insets.bottom, 4);
  const barHeight = TAB_BAR_CONTENT_HEIGHT + bottomPadding;

  // ── Sliding pill indicator ──
  const pillTargetX = state.index * tabWidth + (tabWidth - PILL_WIDTH) / 2;
  const pillX = useRef(new Animated.Value(pillTargetX)).current;

  // ── Sliding ambient glow ──
  const glowTargetX = state.index * tabWidth + (tabWidth - GLOW_WIDTH) / 2;
  const glowX = useRef(new Animated.Value(glowTargetX)).current;

  // ── Per-tab animations ──
  const scaleAnims = useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 1.25 : 1))
  ).current;
  const dotAnims = useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))
  ).current;
  const labelColorAnims = useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))
  ).current;

  useEffect(() => {
    // Pill slide
    Animated.spring(pillX, {
      toValue: state.index * tabWidth + (tabWidth - PILL_WIDTH) / 2,
      useNativeDriver: true,
      friction: 7,
      tension: 45,
    }).start();

    // Glow slide
    Animated.spring(glowX, {
      toValue: state.index * tabWidth + (tabWidth - GLOW_WIDTH) / 2,
      useNativeDriver: true,
      friction: 7,
      tension: 40,
    }).start();

    // Per-icon scale (bounce)
    scaleAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === state.index ? 1.25 : 1,
        useNativeDriver: true,
        friction: 4,
        tension: 45,
      }).start();
    });

    // Dot fade
    dotAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === state.index ? 1 : 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    // Label color transition
    labelColorAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === state.index ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });
  }, [state.index, tabWidth]);

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.tabBarBg,
          height: barHeight,
          paddingBottom: bottomPadding,
          borderTopColor: colors.divider,
        },
      ]}
    >
      {/* Ambient glow behind active tab */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            transform: [{ translateX: glowX }],
            backgroundColor: colors.tabBarActive,
          },
        ]}
      />

      {/* Sliding pill indicator */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pill,
          {
            transform: [{ translateX: pillX }],
            backgroundColor: colors.tabBarActive,
          },
        ]}
      />

      {/* Tab buttons row */}
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            (typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : tabLabels[route.name as keyof typeof tabLabels]) || route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const iconColor = isFocused ? '#ffffff' : colors.tabBarInactive;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabButton}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.6}
            >
              <Animated.View
                style={[styles.iconContainer, { transform: [{ scale: scaleAnims[index] }] }]}
              >
                {isDog ? (
                  <Image
                    source={DOG_TAB_ICONS[route.name]}
                    style={[styles.dogIcon, { opacity: isFocused ? 1 : 0.45 }]}
                    resizeMode="contain"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name={DEFAULT_ICONS[route.name] as any}
                    size={26}
                    color={iconColor}
                  />
                )}
              </Animated.View>

              <Animated.Text
                style={[
                  styles.tabLabel,
                  {
                    color: labelColorAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [colors.tabBarInactive, '#ffffff'],
                    }),
                  },
                ]}
              >
                {label}
              </Animated.Text>

              {/* Active dot indicator */}
              <Animated.View
                style={[
                  styles.activeDot,
                  {
                    backgroundColor: colors.tabBarActive,
                    opacity: dotAnims[index],
                    transform: [
                      {
                        scale: dotAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
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

// ─── Main Tabs ───────────────────────────────────────────────────────
function MainTabs() {
  const { t } = useTranslation();
  return (
    <View style={styles.tabContainer}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tab.home') }} />
        <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: t('tab.search') }} />
        <Tab.Screen name="User" component={UserScreen} options={{ tabBarLabel: t('tab.user') }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t('tab.settings') }} />
      </Tab.Navigator>
    </View>
  );
}

// ─── Global Mini Player ──────────────────────────────────────────────
function GlobalMiniPlayer({ currentRouteName }: { currentRouteName: string }) {
  const playMusic = usePlayerStore((s) => s.playMusic);
  const insets = useSafeAreaInsets();

  if (!playMusic) return null;
  if (currentRouteName === 'Player') return null;

  const isTabRoute = ['Home', 'Search', 'User', 'Settings'].includes(currentRouteName);
  const bottomPadding = Math.max(insets.bottom, 4);
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + bottomPadding;
  const bottomOffset = isTabRoute ? tabBarHeight : bottomPadding;

  return (
    <View style={[styles.globalMiniPlayerContainer, { bottom: bottomOffset }]}>
      <MiniPlayerWithNavigation />
    </View>
  );
}

// ─── Stack Screen Options ─────────────────────────────────────────────
const stackScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
};

// ─── App Navigator ────────────────────────────────────────────────────
export default function AppNavigator() {
  const navRef = useRef<NavigationContainerRef<ReactNavigation.RootParamList>>(null);
  const [currentRouteName, setCurrentRouteName] = useState('');

  const handleStateChange = useCallback(() => {
    const state = navRef.current?.getRootState();
    if (state) {
      setCurrentRouteName(getDeepRouteName(state));
    }
  }, []);

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
          <Stack.Screen name="PlaylistImport" component={PlaylistImportScreen} />
        </Stack.Navigator>
        <GlobalMiniPlayer currentRouteName={currentRouteName} />
      </View>
    </NavigationContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
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

  // ── Custom Tab Bar ──
  tabBar: {
    position: 'relative',
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 34,
  },
  dogIcon: {
    width: 28,
    height: 28,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },

  // ── Sliding pill indicator ──
  pill: {
    position: 'absolute',
    top: 10,
    left: 0,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    zIndex: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  // ── Ambient glow ──
  glow: {
    position: 'absolute',
    top: 3,
    left: 0,
    width: GLOW_WIDTH,
    height: GLOW_HEIGHT,
    borderRadius: GLOW_HEIGHT / 2,
    opacity: 0.08,
    zIndex: 0,
  },
});
