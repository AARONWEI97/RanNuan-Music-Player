import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useUserStore } from '../store/userStore';
import { usePlayHistoryStore } from '../store/playHistoryStore';
import { useDownloadStore } from '../store/downloadStore';
import { useAppTheme } from '../theme/ThemeContext';
import { usePlayer } from '../hooks/usePlayer';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { formatPlayCount } from '../utils/format';
import { getUserDetail, getUserRecord, getUserAlbumSublist } from '../api/user';
import { deletePlaylist } from '../api/playlist';
import type { RootStackScreenProps } from '../types';
import type { SongResult } from '../types';
import NetworkImage from '../components/common/NetworkImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 300;
const ALBUM_CARD_SIZE = (SCREEN_WIDTH - 64) / 3;

type PlaylistTab = 'created' | 'collected' | 'album';

export default function UserScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackScreenProps<'User'>['navigation']>();
  const user = useUserStore((s) => s.user);
  const handleLogoutStore = useUserStore((s) => s.handleLogout);
  const playlists = useUserStore((s) => s.playlists);
  const playlistsLoading = useUserStore((s) => s.playlistsLoading);
  const fetchUserPlaylists = useUserStore((s) => s.fetchUserPlaylists);
  const fetchSubcount = useUserStore((s) => s.fetchSubcount);
  const fetchLevel = useUserStore((s) => s.fetchLevel);
  const fetchAccountInfo = useUserStore((s) => s.fetchAccountInfo);
  const fetchSocialStatus = useUserStore((s) => s.fetchSocialStatus);
  const subcount = useUserStore((s) => s.subcount);
  const levelData = useUserStore((s) => s.levelData);
  const accountInfo = useUserStore((s) => s.accountInfo);
  const socialStatus = useUserStore((s) => s.socialStatus);
  const checkLoginStatus = useUserStore((s) => s.checkLoginStatus);
  const musicHistory = usePlayHistoryStore((s) => s.musicHistory);
  const downloadTasks = useDownloadStore((s) => s.tasks);
  const activeDownloadCount = downloadTasks.filter((t) => t.status === 'downloading' || t.status === 'pending').length;
  const { playSong } = usePlayer();

  const scrollViewRef = React.useRef<ScrollView>(null);
  const [recordSectionY, setRecordSectionY] = useState(0);

  const [playlistTab, setPlaylistTab] = useState<PlaylistTab>('created');
  const [userLevel, setUserLevel] = useState<number>(0);
  const [followedCount, setFollowedCount] = useState<number>(0);
  const [followCount, setFollowCount] = useState<number>(0);
  const [recordSongs, setRecordSongs] = useState<any[]>([]);
  const [recordLoading, setRecordLoading] = useState(false);

  // Album list
  const [albumList, setAlbumList] = useState<any[]>([]);
  const [albumLoading, setAlbumLoading] = useState(false);

  const profile = user as any;
  const nickname = profile?.nickname || profile?.profile?.nickname || '用户';
  const avatarUrl = profile?.avatarUrl || profile?.profile?.avatarUrl;
  const backgroundUrl = profile?.backgroundUrl || profile?.profile?.backgroundUrl;
  const signature = profile?.profile?.signature || profile?.signature || '';
  const followeds = followedCount || profile?.profile?.followeds || profile?.followeds || 0;
  const follows = followCount || profile?.profile?.follows || profile?.follows || 0;

  const loginType = useUserStore((s) => s.loginType);
  const isUidLogin = loginType === 'uid';
  const canFetchExtendedData = loginType !== 'uid' && loginType !== 'guest';

  // 客户端分离歌单：创建 vs 收藏（依赖 getUserPlaylist 统一接口 + subscribed 字段过滤）
  const createdPlaylists = useMemo(() => {
    return playlists.filter((p) => !p.subscribed);
  }, [playlists]);

  const collectedPlaylists = useMemo(() => {
    return playlists.filter((p) => p.subscribed);
  }, [playlists]);

  const displayPlaylists = playlistTab === 'created' ? createdPlaylists : playlistTab === 'collected' ? collectedPlaylists : [];

  // Exit with confirmation
  const handleLogout = useCallback(() => {
    Alert.alert('退出登录', '确定要退出当前账号吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: handleLogoutStore },
    ]);
  }, [handleLogoutStore]);

  // Navigate to follow list
  const handleFollowPress = useCallback((type: 'follows' | 'followeds') => {
    if (!user?.userId) return;
    navigation.navigate('FollowList' as any, { userId: user.userId, type } as any);
  }, [navigation, user?.userId]);

  // Initial login check
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Refresh playlists whenever the screen gains focus — ★ 延迟到交互空闲
  useFocusEffect(
    useCallback(() => {
      if (user?.userId) {
        const             handle = InteractionManager.runAfterInteractions(() => {
          fetchUserPlaylists();
          if (canFetchExtendedData) {
            getUserDetail(user.userId).then((res) => {
              const level = res?.data?.level;
              if (level) setUserLevel(level);
              const profile = res?.data?.profile;
              if (profile) {
                if (profile.followeds !== undefined) setFollowedCount(profile.followeds);
                if (profile.follows !== undefined) setFollowCount(profile.follows);
              }
            }).catch(() => {});
            // 拉取统计数量和等级详情
            fetchSubcount();
            fetchLevel();
            fetchAccountInfo();
            fetchSocialStatus();
          }
        });
        return () => handle.cancel();
      }
    }, [user?.userId, canFetchExtendedData, fetchUserPlaylists, fetchSubcount, fetchLevel, fetchAccountInfo, fetchSocialStatus])
  );

  // Fetch listening records — ★ 延迟到交互空闲时加载，避免阻塞 UI
  useEffect(() => {
    if (user?.userId && !isUidLogin) {
      const handle = InteractionManager.runAfterInteractions(() => {
        setRecordLoading(true);
        getUserRecord(user.userId, 0).then((res) => {
          const data = res?.data?.allData || res?.data?.weekData;
          if (Array.isArray(data)) {
            setRecordSongs(data.slice(0, 10));
          }
        }).catch(() => {}).finally(() => setRecordLoading(false));
      });
      return () => handle.cancel();
    }
  }, [user?.userId, isUidLogin]);

  // Fetch album list when tab switches to album — ★ 延迟加载
  useEffect(() => {
    if (playlistTab === 'album' && albumList.length === 0 && user && canFetchExtendedData) {
      const handle = InteractionManager.runAfterInteractions(() => {
        setAlbumLoading(true);
        getUserAlbumSublist({ limit: 30, offset: 0 }).then((res) => {
          const data = res?.data?.data;
          if (Array.isArray(data)) {
            setAlbumList(data);
          } else if (Array.isArray(res?.data)) {
            setAlbumList(res.data);
          }
        }).catch(() => {}).finally(() => setAlbumLoading(false));
      });
      return () => handle.cancel();
    }
  }, [playlistTab, user, canFetchExtendedData]);

  const handleLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const handlePlayHistorySong = useCallback((song: SongResult) => {
    playSong(song);
  }, [playSong]);

  const handleDeletePlaylist = useCallback((playlistId: number, playlistName: string) => {
    Alert.alert(
      '删除歌单',
      `确定要删除「${playlistName}」吗？此操作不可撤销。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deletePlaylist(playlistId);
              if (res?.data?.code === 200) {
                Alert.alert('提示', '歌单已删除');
                fetchUserPlaylists();
              } else {
                Alert.alert('错误', res?.data?.message || res?.data?.msg || '删除失败');
              }
            } catch {
              Alert.alert('错误', '删除歌单失败，请重试');
            }
          },
        },
      ]
    );
  }, [fetchUserPlaylists]);

  const handlePlayRecordSong = useCallback((recordItem: any) => {
    const song = recordItem.song;
    if (!song) return;
    const songResult: SongResult = {
      id: song.id,
      name: song.name,
      picUrl: song.al?.picUrl || song.album?.picUrl || '',
      ar: song.ar || song.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
      al: song.al || song.album || { id: 0, name: '', picUrl: '' },
      count: 0,
    };
    playSong(songResult);
  }, [playSong]);

  // ─── Not Logged In ───
  const renderNotLoggedIn = () => (
    <View style={styles.heroSection}>
      <LinearGradient
        colors={[colors.primary, colors.primary + 'CC', colors.primary + '88']}
        style={StyleSheet.absoluteFill}
      />
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
      {backgroundUrl ? (
        <View style={StyleSheet.absoluteFill}>
          <NetworkImage uri={backgroundUrl} style={styles.heroBackgroundImg} />
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.75)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : (
        <LinearGradient
          colors={[colors.primary, colors.primary + 'CC', colors.primary + '88']}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={[styles.heroContent, { paddingTop: insets.top + Spacing.lg }]}>
        {/* Avatar + Nickname Row */}
        <View style={styles.heroUserRow}>
          <NetworkImage uri={avatarUrl} style={styles.heroAvatar} />
          <View style={styles.heroUserText}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.heroNickname}>{nickname}</Text>
              {loginType && (
                <View style={styles.loginTypeTag}>
                  <Text style={styles.loginTypeTagText}>
                    {loginType === 'qr' ? '扫码' : loginType === 'phone' ? '手机' : loginType === 'cookie' ? 'Cookie' : loginType === 'guest' ? '游客' : 'UID'}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              {signature ? (
                <Text style={styles.heroSignature} numberOfLines={1}>{signature}</Text>
              ) : null}
              {!isUidLogin && (
                <TouchableOpacity
                  style={styles.editProfileBtn}
                  onPress={() => navigation.navigate('EditProfile' as any)}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.editProfileText}>编辑</Text>
                </TouchableOpacity>
              )}
            </View>
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
          <TouchableOpacity style={styles.statItem} onPress={() => handleFollowPress('followeds')}>
            <Text style={styles.statValue}>{followeds > 0 ? formatPlayCount(followeds) : '0'}</Text>
            <Text style={styles.statLabel}>粉丝</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={() => handleFollowPress('follows')}>
            <Text style={styles.statValue}>{follows > 0 ? formatPlayCount(follows) : '0'}</Text>
            <Text style={styles.statLabel}>关注</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              Lv.{levelData?.level || userLevel || (profile?.level ?? 0)}
            </Text>
            {levelData && (
              <View style={styles.levelProgressBar}>
                <View style={[styles.levelProgressFill, { width: `${Math.min(levelData.progress, 100)}%` }]} />
              </View>
            )}
            <Text style={styles.statLabel}>等级</Text>
          </View>
          {accountInfo?.profile?.vipType !== undefined && canFetchExtendedData && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons
                  name="crown"
                  size={14}
                  color={accountInfo.profile.vipType === 11 ? '#fbbf24' : '#94a3b8'}
                />
                <Text style={[styles.statValue, {
                  color: accountInfo.profile.vipType === 11 ? '#fbbf24' : '#ffffff',
                  fontSize: 11,
                }]}>
                  {accountInfo.profile.vipType === 11 ? '黑胶VIP' : accountInfo.profile.vipType > 0 ? 'VIP' : '普通'}
                </Text>
                <Text style={styles.statLabel}>会员</Text>
              </View>
            </>
          )}
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.logoutText}>退出</Text>
          </TouchableOpacity>
        </View>

        {/* Subcount Row — 仅在非UID登录且有数据时显示 */}
        {subcount && loginType !== 'uid' && (
          <View style={styles.subcountRow}>
            <View style={styles.subcountItem}>
              <Text style={styles.subcountValue}>{subcount.createdPlaylistCount || 0}</Text>
              <Text style={styles.subcountLabel}>歌单</Text>
            </View>
            <View style={styles.subcountItem}>
              <Text style={styles.subcountValue}>{subcount.artistCount || 0}</Text>
              <Text style={styles.subcountLabel}>歌手</Text>
            </View>
            <View style={styles.subcountItem}>
              <Text style={styles.subcountValue}>{subcount.mvCount || 0}</Text>
              <Text style={styles.subcountLabel}>MV</Text>
            </View>
            <View style={styles.subcountItem}>
              <Text style={styles.subcountValue}>{subcount.djRadioCount || 0}</Text>
              <Text style={styles.subcountLabel}>电台</Text>
            </View>
            <View style={styles.subcountItem}>
              <Text style={styles.subcountValue}>{subcount.programCount || 0}</Text>
              <Text style={styles.subcountLabel}>节目</Text>
            </View>
          </View>
        )}

        {/* Social Status — single row below subcount */}
        {socialStatus?.data?.content && canFetchExtendedData && (
          <View style={styles.subcountRow}>
            <View style={styles.subcountItem}>
              <MaterialCommunityIcons name="emoticon-outline" size={14} color="#ffffff" />
              <Text style={styles.subcountValue} numberOfLines={1}>
                {(socialStatus.data.content || '').slice(0, 8)}
              </Text>
              <Text style={styles.subcountLabel}>状态</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  // ─── Quick Menu (我的音乐) ───
  const renderQuickMenu = () => {
    const menuItems = [
      { key: 'favorite', icon: 'heart-outline' as const, label: '我喜欢的音乐', color: '#ef4444' },
      { key: 'recent', icon: 'history' as const, label: '播放历史', color: '#06b6d4' },
      { key: 'comment', icon: 'comment-text-outline' as const, label: '评论历史', color: '#a855f7' },
      { key: 'local', icon: 'folder-music-outline' as const, label: '本地音乐', color: '#f59e0b' },
      { key: 'heatmap', icon: 'chart-timeline-variant' as const, label: '听歌热力图', color: '#8b5cf6' },
      { key: 'download', icon: 'download-outline' as const, label: '下载管理', color: '#22c55e' },
      { key: 'import', icon: 'playlist-plus' as const, label: '歌单导入', color: '#ec4899' },
    ];
    return (
      <View style={styles.section}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickMenuScroll} contentContainerStyle={styles.quickMenuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.quickMenuCard, { backgroundColor: colors.surfaceVariant }]}
              activeOpacity={0.6}
              onPress={() => {
                if (item.key === 'favorite') {
                  if (!user) { navigation.navigate('Login'); return; }
                  navigation.navigate('LikedSongs');
                } else if (item.key === 'recent') {
                  navigation.navigate('History');
                } else if (item.key === 'local') {
                  navigation.navigate('LocalMusic');
                } else if (item.key === 'heatmap') {
                  navigation.navigate('Heatmap');
                } else if (item.key === 'download') {
                  navigation.navigate('Download' as any);
                } else if (item.key === 'comment') {
                  if (!user) { navigation.navigate('Login'); return; }
                  navigation.navigate('CommentHistory' as any);
                } else if (item.key === 'import') {
                  if (!user) { navigation.navigate('Login'); return; }
                  navigation.navigate('PlaylistImport');
                }
              }}
            >
              <View style={[styles.quickMenuIcon, { backgroundColor: `${item.color}18` }]}>
                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                {item.key === 'download' && activeDownloadCount > 0 && (
                  <View style={styles.downloadBadge}>
                    <Text style={styles.downloadBadgeText}>{activeDownloadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.quickMenuLabel, { color: colors.text }]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.swipeHint}>
          <MaterialCommunityIcons name="gesture-swipe-left" size={13} color={colors.textTertiary} />
          <Text style={[styles.swipeHintText, { color: colors.textTertiary }]}>左滑查看更多</Text>
        </View>
      </View>
    );
  };

  // ─── Playlists & Albums with Tabs ───
  const renderPlaylistsAndAlbums = () => {
    if (!user) return null;

    const tabs: { key: PlaylistTab; label: string; count: number }[] = [
      { key: 'created', label: '创建', count: createdPlaylists.length },
      { key: 'collected', label: '收藏', count: collectedPlaylists.length },
      { key: 'album', label: '专辑', count: albumList.length },
    ];

    return (
      <View style={styles.section}>
        {/* Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.surfaceVariant }]}>
          {tabs.map((tab) => {
            const isActive = playlistTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, isActive && { backgroundColor: colors.background }]}
                activeOpacity={0.7}
                onPress={() => setPlaylistTab(tab.key)}
              >
                <Text style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.textSecondary },
                ]}>
                  {tab.label} ({tab.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        {playlistTab === 'album' ? renderAlbumGrid() : renderPlaylistList()}
        {playlistTab === 'created' && displayPlaylists.length > 0 && (
          <Text style={[styles.playlistTip, { color: colors.textTertiary }]}>
            长按歌单可删除
          </Text>
        )}
      </View>
    );
  };

  // ─── Album Grid ───
  const renderAlbumGrid = () => {
    if (albumLoading) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (albumList.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="disc" size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>还没有收藏专辑</Text>
        </View>
      );
    }
    return (
      <FlatList
        key="album-grid"
        data={albumList}
        keyExtractor={(item, index) => String(item.id || index)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.albumCard}
            onPress={() => navigation.navigate('AlbumDetail', { id: item.id })}
          >
            <NetworkImage uri={item.picUrl || item.coverImgUrl} style={styles.albumCover} />
            <Text style={[styles.albumName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
            <Text style={[styles.albumArtist, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.artists?.[0]?.name || item.artist?.name || item.ar?.name || '未知歌手'}
            </Text>
          </TouchableOpacity>
        )}
        numColumns={3}
        columnWrapperStyle={styles.albumRow}
        scrollEnabled={false}
        initialNumToRender={9}
        maxToRenderPerBatch={6}
        windowSize={3}
        removeClippedSubviews={true}
      />
    );
  };

  // ─── Playlist List ───
  const renderPlaylistList = () => {
    if (playlistsLoading) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (displayPlaylists.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="music-note-off" size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {playlistTab === 'created' ? '还没有创建歌单' : '还没有收藏歌单'}
          </Text>
        </View>
      );
    }
    return (
      <FlatList
        data={displayPlaylists}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.playlistCard, { borderBottomColor: colors.divider }]}
            onPress={() => navigation.navigate('PlaylistDetail', { id: item.id })}
            onLongPress={() => handleDeletePlaylist(item.id, item.name)}
            activeOpacity={0.6}
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
        )}
        scrollEnabled={false}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={true}
      />
    );
  };

  // ─── Listening Record ───
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>听歌排行</Text>
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
      {renderPlaylistsAndAlbums()}
      {renderRecord()}
      {renderRecentHistory()}
    </ScrollView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },

    // ─── Hero Section ───
    heroSection: {
      height: HERO_HEIGHT,
      position: 'relative',
      overflow: 'hidden',
    },
    heroBackgroundImg: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
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
    loginTypeTag: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 8,
      marginLeft: 8,
    },
    loginTypeTagText: {
      ...Typography.overline,
      color: 'rgba(255,255,255,0.8)',
      fontSize: 9,
    },
    editProfileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    editProfileText: {
      ...Typography.overline,
      color: 'rgba(255,255,255,0.7)',
      marginLeft: 3,
      fontSize: 10,
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
    // ─── Level Progress ───
    levelProgressBar: {
      width: 40,
      height: 3,
      backgroundColor: 'rgba(255,255,255,0.6)',
      borderRadius: 2,
      marginTop: 3,
      overflow: 'hidden',
    },
    levelProgressFill: {
      height: '100%',
      backgroundColor: '#fbbf24',
      borderRadius: 2,
    },
    // ─── Subcount Row ───
    subcountRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(255,255,255,0.1)',
      marginTop: Spacing.sm,
    },
    subcountItem: {
      alignItems: 'center',
      minWidth: 40,
    },
    subcountValue: {
      ...Typography.caption,
      color: '#ffffff',
      fontWeight: '600',
    },
    subcountLabel: {
      ...Typography.overline,
      color: 'rgba(255,255,255,0.5)',
      marginTop: 1,
      fontSize: 10,
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
    quickMenuScroll: {
      marginBottom: Spacing.sm,
    },
    quickMenuGrid: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: Spacing.xs,
    },
    quickMenuCard: {
      width: 80,
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
    swipeHint: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: Spacing.xs,
      paddingRight: Spacing.xs,
      gap: 3,
    },
    swipeHintText: {
      ...Typography.overline,
      fontSize: 10,
    },
    downloadBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#ef4444',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
      borderWidth: 1.5,
      borderColor: '#ffffff',
    },
    downloadBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#ffffff',
      lineHeight: 13,
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
    playlistTip: {
      ...Typography.overline,
      textAlign: 'center',
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
    },

    // ─── Album Grid ───
    albumRow: {
      marginBottom: Spacing.md,
    },
    albumCard: {
      width: ALBUM_CARD_SIZE,
      marginHorizontal: Spacing.xs,
    },
    albumCover: {
      width: ALBUM_CARD_SIZE - 8,
      height: ALBUM_CARD_SIZE - 8,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.surfaceVariant,
    },
    albumName: {
      ...Typography.caption,
      marginTop: Spacing.xs,
      lineHeight: 16,
    },
    albumArtist: {
      ...Typography.overline,
      marginTop: 2,
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
