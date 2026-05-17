import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useUserStore } from '../store/userStore';
import { usePlayHistoryStore } from '../store/playHistoryStore';
import { usePlayerStore } from '../store/playerStore';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { formatPlayCount } from '../utils/format';
import type { RootStackScreenProps } from '../types';
import NetworkImage from '../components/common/NetworkImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3;

export default function UserScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackScreenProps<'User'>['navigation']>();
  const user = useUserStore((s) => s.user);
  const handleLogout = useUserStore((s) => s.handleLogout);
  const playlists = useUserStore((s) => s.playlists);
  const playlistsLoading = useUserStore((s) => s.playlistsLoading);
  const fetchUserPlaylists = useUserStore((s) => s.fetchUserPlaylists);
  const checkLoginStatus = useUserStore((s) => s.checkLoginStatus);
  const musicHistory = usePlayHistoryStore((s) => s.musicHistory);
  const playMusic = usePlayerStore((s) => s.playMusic);

  useEffect(() => {
    if (user) {
      fetchUserPlaylists();
    }
  }, [user?.userId]);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const handleLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const renderNotLoggedIn = () => (
    <View style={styles.loginPrompt}>
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarPlaceholderIcon}>👤</Text>
      </View>
      <Text style={styles.loginTitle}>登录网易云音乐</Text>
      <Text style={styles.loginSubtitle}>登录后即可享受更多功能</Text>
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>立即登录</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoggedIn = () => {
    const profile = user as any;
    const nickname = profile?.nickname || profile?.profile?.nickname || '用户';
    const avatarUrl = profile?.avatarUrl || profile?.profile?.avatarUrl;
    const vipType = profile?.vipType ?? profile?.profile?.vipType ?? 0;

    return (
      <View style={styles.profileSection}>
        <View style={styles.profileHeader}>
          <NetworkImage uri={avatarUrl} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.nickname}>{nickname}</Text>
            {vipType > 0 && (
              <View style={styles.vipBadge}>
                <Text style={styles.vipText}>VIP</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>退出登录</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUserPlaylists = () => {
    if (!user) return null;
    if (playlistsLoading) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>我的歌单</Text>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        </View>
      );
    }

    if (playlists.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>我的歌单</Text>
          <Text style={styles.playlistCount}>{playlists.length}个歌单</Text>
        </View>
        {playlists.map((item) => (
          <TouchableOpacity
            key={String(item.id)}
            style={styles.playlistCard}
            onPress={() => navigation.navigate('PlaylistDetail', { id: item.id })}
          >
            <NetworkImage uri={item.coverImgUrl} style={styles.playlistCover} />
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.playlistMeta}>
                {item.trackCount}首 · {formatPlayCount(item.playCount)}次播放
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRecentHistory = () => {
    if (musicHistory.length === 0) return null;
    const recentItems = musicHistory.slice(0, 10);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>最近播放</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.seeAllText}>查看全部</Text>
          </TouchableOpacity>
        </View>
        {recentItems.map((song, index) => (
          <TouchableOpacity
            key={String(song.id)}
            style={styles.historyItem}
            onPress={() => {}}
          >
            <NetworkImage
              uri={song.picUrl || song.al?.picUrl}
              style={styles.historyCover}
            />
            <View style={styles.historyInfo}>
              <Text style={styles.historyName} numberOfLines={1}>{song.name}</Text>
              <Text style={styles.historyArtist} numberOfLines={1}>
                {song.ar?.map((a) => a.name).join(' / ') || '未知歌手'}
              </Text>
            </View>
            <Text style={styles.historyCount}>{song.count || 0}次</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMenuItems = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>我的音乐</Text>
      <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
        <Text style={styles.menuIcon}>❤️</Text>
        <Text style={styles.menuLabel}>我喜欢的音乐</Text>
        <Text style={styles.menuArrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Download' as any)}>
        <Text style={styles.menuIcon}>📥</Text>
        <Text style={styles.menuLabel}>本地/下载</Text>
        <Text style={styles.menuArrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
        <Text style={styles.menuIcon}>🕐</Text>
        <Text style={styles.menuLabel}>最近播放</Text>
        <Text style={styles.menuArrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
        <Text style={styles.menuIcon}>📻</Text>
        <Text style={styles.menuLabel}>我的电台</Text>
        <Text style={styles.menuArrow}>›</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {user ? renderLoggedIn() : renderNotLoggedIn()}
      {renderUserPlaylists()}
      {renderMenuItems()}
      {renderRecentHistory()}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loginPrompt: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl * 2,
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  avatarPlaceholderIcon: {
    fontSize: 36,
  },
  loginTitle: {
    ...Typography.h3,
    color: colors.text,
    marginBottom: Spacing.xs,
  },
  loginSubtitle: {
    ...Typography.body2,
    color: colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xxl,
  },
  loginButtonText: {
    ...Typography.body2,
    color: '#ffffff',
    fontWeight: '600',
  },
  profileSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceVariant,
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  nickname: {
    ...Typography.h4,
    color: colors.text,
    fontWeight: '600',
  },
  vipBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  vipText: {
    ...Typography.overline,
    color: '#333333',
    fontWeight: '700',
  },
  logoutButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    ...Typography.caption,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    color: colors.text,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  playlistCount: {
    ...Typography.caption,
    color: colors.textSecondary,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    ...Typography.caption,
    color: colors.primary,
  },
  loadingBox: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  playlistCover: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surfaceVariant,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  playlistName: {
    ...Typography.body2,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  playlistMeta: {
    ...Typography.caption,
    color: colors.textSecondary,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  historyCover: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceVariant,
  },
  historyInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  historyName: {
    ...Typography.body2,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  historyArtist: {
    ...Typography.caption,
    color: colors.textSecondary,
  },
  historyCount: {
    ...Typography.caption,
    color: colors.textTertiary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  menuLabel: {
    flex: 1,
    ...Typography.body2,
    color: colors.text,
  },
  menuArrow: {
    fontSize: 20,
    color: colors.textTertiary,
  },
  });
}
