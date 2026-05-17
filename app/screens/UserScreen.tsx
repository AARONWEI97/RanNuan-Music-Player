import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useUserStore } from '../store/userStore';
import { usePlayHistoryStore } from '../store/playHistoryStore';
import { usePlayerStore } from '../store/playerStore';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { formatPlayCount } from '../utils/format';
import { getUserDetail, getUserRecord } from '../api/user';
import type { RootStackScreenProps } from '../types';
import type { SongResult } from '../types';
import NetworkImage from '../components/common/NetworkImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 220;

type PlaylistTab = 'created' | 'collected';

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

  const scrollViewRef = React.useRef<ScrollView>(null);
  const [recordSectionY, setRecordSectionY] = useState(0);

  const [playlistTab, setPlaylistTab] = useState<PlaylistTab>('created');
  const [userLevel, setUserLevel] = useState<number>(0);
  const [recordSongs, setRecordSongs] = useState<any[]>([]);
  const [recordLoading, setRecordLoading] = useState(false);

  const profile = user as any;
  const nickname = profile?.nickname || profile?.profile?.nickname || '用户';
  const avatarUrl = profile?.avatarUrl || profile?.profile?.avatarUrl;
  const backgroundUrl = profile?.backgroundUrl || profile?.profile?.backgroundUrl;
  const signature = profile?.profile?.signature || profile?.signature || '';
  const followeds = profile?.profile?.followeds ?? profile?.followeds ?? 0;
  const follows = profile?.profile?.follows ?? profile?.follows ?? 0;

  const loginType = useUserStore((s) => s.loginType);
  const isUidLogin = loginType === 'uid';

  // Separate playlists into created and collected
  const createdPlaylists = useMemo(() => {
    if (!user?.userId) return playlists;
    return playlists.filter((p) => {
      const isCreator = p.creator?.nickname === nickname || !p.subscribed;
      return isCreator;
    });
  }, [playlists, user?.userId, nickname]);

  const collectedPlaylists = useMemo(() => {
    return playlists.filter((p) => p.subscribed);
  }, [playlists]);

  const displayPlaylists = playlistTab === 'created' ? createdPlaylists : collectedPlaylists;

  useEffect(() => {
    if (user && !isUidLogin) {
      fetchUserPlaylists();
      // Fetch user detail for level
      getUserDetail(user.userId).then((res) => {
        const level = res?.data?.level;
        if (level) setUserLevel(level);
      }).catch(() => {});
    } else if (user && isUidLogin) {
      // UID login: only fetch public playlists
      fetchUserPlaylists();
    }
  }, [user?.userId, isUidLogin]);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Fetch listening records when logged in (requires cookie auth)
  useEffect(() => {
    if (user?.userId && !isUidLogin) {
      setRecordLoading(true);
      getUserRecord(user.userId, 0).then((res) => {
        const data = res?.data?.allData || res?.data?.weekData;
        if (Array.isArray(data)) {
          setRecordSongs(data.slice(0, 10));
        }
      }).catch(() => {}).finally(() => setRecordLoading(false));
    }
  }, [user?.userId, isUidLogin]);

  const handleLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const handlePlayHistorySong = useCallback((song: SongResult) => {
    playMusic(song);
  }, [playMusic]);

  const handlePlayRecordSong = useCallback((recordItem: any) => {
    const song = recordItem.song;
    if (!song) return;
    const songResult: SongResult = {
      id: song.id,
      name: song.name,
      picUrl: song.al?.picUrl || song.album?.picUrl || '',
      ar: song.ar || song.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
    };
    playMusic(songResult);
  }, [playMusic]);

  // ─── Not Logged In ───
  const renderNotLoggedIn = () => (
    <View style={styles.heroSection}>
      <View style={[styles.heroGradientBg, { backgroundColor: colors.primary }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)']}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={[styles.heroContent, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <MaterialCommunityIcons name="account-circle" size={56} color="rgba(255,255,255,0.8)" />
        </View>
        <Text style={styles.heroNickname}>未登录</Text>
        <Text style={styles.heroSignature}>登录后享受更多功能</Text>
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>立即登录</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Logged In Hero ───
  const renderLoggedInHero = () => (
    <View style={styles.heroSection}>
      {/* Background */}
      {backgroundUrl ? (
        <View style={StyleSheet.absoluteFill}>
          <NetworkImage uri={backgroundUrl} style={styles.heroBackgroundImg} />
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : (
        <View style={[styles.heroGradientBg, { backgroundColor: colors.primary }]}>
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      <View style={[styles.heroContent, { paddingTop: insets.top + Spacing.lg }]}>
        {/* Avatar + Nickname Row */}
        <View style={styles.heroUserRow}>
          <NetworkImage uri={avatarUrl} style={styles.heroAvatar} />
          <View style={styles.heroUserText}>
            <Text style={styles.heroNickname}>{nickname}</Text>
            {signature ? (
              <Text style={styles.heroSignature} numberOfLines={1}>{signature}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <MaterialCommunityIcons name="cog-outline" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statValue}>{followeds > 0 ? formatPlayCount(followeds) : '0'}</Text>
            <Text style={styles.statLabel}>粉丝</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statValue}>{follows > 0 ? formatPlayCount(follows) : '0'}</Text>
            <Text style={styles.statLabel}>关注</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Lv.{userLevel || (profile?.vipType ?? 0)}</Text>
            <Text style={styles.statLabel}>等级</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.logoutText}>退出</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ─── Quick Menu (我的音乐) ───
  const renderQuickMenu = () => {
    const menuItems = [
      { key: 'favorite', icon: 'heart-outline' as const, label: '我喜欢的音乐', color: '#ef4444' },
      { key: 'recent', icon: 'history' as const, label: '最近播放', color: '#06b6d4' },
      { key: 'download', icon: 'download-outline' as const, label: '本地/下载', color: '#22c55e' },
      { key: 'radio', icon: 'radio' as const, label: '我的电台', color: '#8b5cf6' },
    ];
    return (
      <View style={styles.section}>
        <View style={styles.quickMenuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.quickMenuCard, { backgroundColor: colors.surfaceVariant }]}
              activeOpacity={0.6}
              onPress={() => {
                if (item.key === 'favorite') {
                  if (!user) {
                    navigation.navigate('Login');
                    return;
                  }
                  // 用户第一个歌单就是"我喜欢的音乐"
                  const likePlaylist = playlists.find((p) => !p.subscribed);
                  if (likePlaylist) {
                    navigation.navigate('PlaylistDetail', { id: likePlaylist.id });
                  } else {
                    Alert.alert('提示', '未找到我喜欢的音乐歌单');
                  }
                } else if (item.key === 'recent') {
                  // 滚动到听歌排行区域
                  if (recordSectionY > 0) {
                    scrollViewRef.current?.scrollTo({ y: recordSectionY - 60, animated: true });
                  }
                } else if (item.key === 'download') {
                  navigation.navigate('Download' as any);
                } else if (item.key === 'radio') {
                  Alert.alert('提示', '我的电台功能开发中，敬请期待');
                }
              }}
            >
              <View style={[styles.quickMenuIcon, { backgroundColor: `${item.color}18` }]}>
                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={[styles.quickMenuLabel, { color: colors.text }]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // ─── Playlists with Tabs ───
  const renderPlaylists = () => {
    if (!user) return null;

    return (
      <View style={styles.section}>
        {/* Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.surfaceVariant }]}>
          {(['created', 'collected'] as PlaylistTab[]).map((tab) => {
            const isActive = playlistTab === tab;
            const label = tab === 'created' ? '创建' : '收藏';
            const count = tab === 'created' ? createdPlaylists.length : collectedPlaylists.length;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabItem, isActive && { backgroundColor: colors.background }]}
                activeOpacity={0.7}
                onPress={() => setPlaylistTab(tab)}
              >
                <Text style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.textSecondary },
                ]}>
                  {label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {playlistsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : displayPlaylists.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="music-note-off" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {playlistTab === 'created' ? '还没有创建歌单' : '还没有收藏歌单'}
            </Text>
          </View>
        ) : (
          displayPlaylists.map((item) => (
            <TouchableOpacity
              key={String(item.id)}
              style={[styles.playlistCard, { borderBottomColor: colors.divider }]}
              onPress={() => navigation.navigate('PlaylistDetail', { id: item.id })}
            >
              <NetworkImage uri={item.coverImgUrl} style={styles.playlistCover} />
              <View style={styles.playlistInfo}>
                <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.playlistMeta, { color: colors.textSecondary }]}>
                  {item.trackCount}首{item.playCount > 0 ? ` · ${formatPlayCount(item.playCount)}次播放` : ''}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  // ─── Listening Record (听歌排行) ───
  const renderRecord = () => {
    if (!user) return null;
    if (recordLoading) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>听歌排行</Text>
            </View>
          </View>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        </View>
      );
    }
    if (recordSongs.length === 0) return null;

    return (
      <View style={styles.section} onLayout={(e) => setRecordSectionY(e.nativeEvent.layout.y)}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>听歌排行</Text>
          </View>
        </View>
        {recordSongs.map((record, index) => {
          const song = record.song;
          if (!song) return null;
          const playCount = record.playCount || record.score || 0;
          return (
            <TouchableOpacity
              key={String(song.id || index)}
              style={[styles.recordItem, { borderBottomColor: colors.divider }]}
              activeOpacity={0.6}
              onPress={() => handlePlayRecordSong(record)}
            >
              <Text style={[
                styles.recordIndex,
                { color: index < 3 ? colors.primary : colors.textTertiary },
              ]}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <NetworkImage
                uri={song.al?.picUrl || song.album?.picUrl || ''}
                style={styles.recordCover}
              />
              <View style={styles.recordInfo}>
                <Text style={[styles.recordName, { color: colors.text }]} numberOfLines={1}>
                  {song.name}
                </Text>
                <Text style={[styles.recordArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                  {song.ar?.map((a: any) => a.name).join(' / ') ||
                   song.artists?.map((a: any) => a.name).join(' / ') ||
                   '未知歌手'}
                </Text>
              </View>
              {playCount > 0 && (
                <Text style={[styles.recordPlayCount, { color: colors.textTertiary }]}>
                  {formatPlayCount(playCount)}次
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ─── Recent History ───
  const renderRecentHistory = () => {
    if (musicHistory.length === 0) return null;
    const recentItems = musicHistory.slice(0, 10);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionDot, { backgroundColor: '#06b6d4' }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>最近播放</Text>
          </View>
        </View>
        {recentItems.map((song, index) => (
          <TouchableOpacity
            key={String(song.id)}
            style={[styles.historyItem, { borderBottomColor: colors.divider }]}
            activeOpacity={0.6}
            onPress={() => handlePlayHistorySong(song)}
          >
            <Text style={[
              styles.recordIndex,
              { color: index < 3 ? colors.primary : colors.textTertiary },
            ]}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <NetworkImage
              uri={song.picUrl || song.al?.picUrl}
              style={styles.historyCover}
            />
            <View style={styles.historyInfo}>
              <Text style={[styles.historyName, { color: colors.text }]} numberOfLines={1}>{song.name}</Text>
              <Text style={[styles.historyArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                {song.ar?.map((a) => a.name).join(' / ') || '未知歌手'}
              </Text>
            </View>
            <MaterialCommunityIcons name="play-circle-outline" size={26} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {user ? renderLoggedInHero() : renderNotLoggedIn()}
      {renderQuickMenu()}
      {renderPlaylists()}
      {renderRecord()}
      {renderRecentHistory()}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },

    // ─── Hero Section ───
    heroSection: {
      height: HERO_HEIGHT,
      position: 'relative',
      overflow: 'hidden',
    },
    heroBackgroundImg: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    heroGradientBg: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    heroContent: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
    },
    heroUserRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    heroAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    heroUserText: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    heroNickname: {
      ...Typography.h3,
      color: '#ffffff',
      fontWeight: '700',
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    heroSignature: {
      ...Typography.caption,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 2,
    },
    settingsButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
    },
    statValue: {
      ...Typography.body2,
      color: '#ffffff',
      fontWeight: '600',
    },
    statLabel: {
      ...Typography.overline,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 1,
    },
    statDivider: {
      width: 1,
      height: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 'auto',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.xxl,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    logoutText: {
      ...Typography.overline,
      color: 'rgba(255,255,255,0.7)',
      marginLeft: 3,
    },

    // ─── Not Logged In ───
    avatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },
    loginButton: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: Spacing.xxl,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.xxl,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      marginTop: Spacing.sm,
    },
    loginButtonText: {
      ...Typography.body2,
      color: '#ffffff',
      fontWeight: '600',
    },

    // ─── Section ───
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
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionDot: {
      width: 4,
      height: 16,
      borderRadius: 2,
      marginRight: Spacing.sm,
    },
    sectionTitle: {
      ...Typography.h4,
      fontWeight: '600',
    },
    loadingBox: {
      paddingVertical: Spacing.xl,
      alignItems: 'center',
    },
    emptyBox: {
      alignItems: 'center',
      paddingVertical: Spacing.xxxl,
    },
    emptyText: {
      ...Typography.body2,
      marginTop: Spacing.sm,
    },

    // ─── Quick Menu ───
    quickMenuGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    quickMenuCard: {
      width: '23%',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
    },
    quickMenuIcon: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    quickMenuLabel: {
      ...Typography.caption,
      textAlign: 'center',
    },

    // ─── Tab Bar ───
    tabBar: {
      flexDirection: 'row',
      borderRadius: BorderRadius.xxl,
      padding: 3,
      marginBottom: Spacing.md,
    },
    tabItem: {
      flex: 1,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      borderRadius: BorderRadius.xxl,
    },
    tabLabel: {
      ...Typography.body2,
      fontWeight: '600',
    },

    // ─── Playlist ───
    playlistCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
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
      fontWeight: '500',
      marginBottom: 2,
    },
    playlistMeta: {
      ...Typography.caption,
    },

    // ─── Record ───
    recordItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    recordIndex: {
      ...Typography.caption,
      width: 24,
      textAlign: 'center',
      fontWeight: '600',
    },
    recordCover: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.surfaceVariant,
      marginLeft: Spacing.xs,
    },
    recordInfo: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    recordName: {
      ...Typography.body2,
      fontWeight: '500',
      marginBottom: 2,
    },
    recordArtist: {
      ...Typography.caption,
    },
    recordPlayCount: {
      ...Typography.overline,
      marginLeft: Spacing.sm,
    },

    // ─── History ───
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    historyCover: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.surfaceVariant,
      marginLeft: Spacing.xs,
    },
    historyInfo: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    historyName: {
      ...Typography.body2,
      fontWeight: '500',
      marginBottom: 2,
    },
    historyArtist: {
      ...Typography.caption,
    },
  });
}
