import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
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
import LoginScreen from '../screens/LoginScreen';
import DownloadScreen from '../screens/DownloadScreen';
import MiniPlayer from '../components/player/MiniPlayer';
import { usePlayerStore } from '../store/playerStore';
import { useAppTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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

function MainTabs() {
  const { colors } = useAppTheme();
  const playMusic = usePlayerStore((s) => s.playMusic);
  const insets = useSafeAreaInsets();

  // 底部安全区域：全面屏手势手机有 home indicator 区域，
  // 虚拟按键手机无需额外 padding（系统导航栏已占空间）。
  // 确保至少保留 4px 的基础内边距。
  const bottomPadding = Math.max(insets.bottom, 4);
  const tabBarHeight = 52 + bottomPadding;

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
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home-variant" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{
            tabBarLabel: '搜索',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="magnify" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="User"
          component={UserScreen}
          options={{
            tabBarLabel: '我的',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: '设置',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
      {playMusic && (
        <View style={[styles.miniPlayerContainer, { bottom: tabBarHeight }]}>
          <MiniPlayerWithNavigation />
        </View>
      )}
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Player" component={PlayerScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen as any} />
        <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen as any} />
        <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen as any} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Download" component={DownloadScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
  },
  miniPlayerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
