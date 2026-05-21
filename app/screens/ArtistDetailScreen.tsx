import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import SongItem from '../components/music/SongItem';
import NetworkImage from '../components/common/NetworkImage';
import SongActionSheet from '../components/music/SongActionSheet';
import CommentList from '../components/comment/CommentList';
import { useSongActionSheet } from '../hooks/useSongActionSheet';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAppTheme } from '../theme/ThemeContext';
import {
  getArtistDetail,
  getArtistDesc,
  getArtistTopSongs,
  getArtistSongs,
  getArtistAlbums,
  getArtistMv,
  getArtistVideo,
  subscribeArtist,
  getArtistFollowCount,
  getSimiArtist,
} from '../api/artist';
import { useUserStore } from '../store/userStore';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import type { SongResult, RootStackScreenProps } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = SCREEN_WIDTH * 0.7;
const MV_CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;
const ALBUM_CARD_SIZE = (SCREEN_WIDTH - Spacing.md * 2 - Spacing.md * 2) / 3;

type ArtistTab = 'hot' | 'all' | 'album' | 'mv' | 'video';

interface ArtistInfo {
  cover: string;
  avatar: string;
  name: string;
  briefDesc: string;
  albumSize: number;
  musicSize: number;
  alias: string[];
  mvSize?: number;
}

export default function ArtistDetailScreen({ route, navigation }: RootStackScreenProps<'ArtistDetail'>) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { playSong } = usePlayer();
  const { playAll } = usePlaylist();
  const user = useUserStore((s) => s.user);
  const loginType = useUserStore((s) => s.loginType);
  const isLoggedIn = !!user && loginType !== 'uid';

  // Artist info
  const [artist, setArtist] = useState<ArtistInfo | null>(null);
  const [desc, setDesc] = useState<string>('');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Follow
  const [followed, setFollowed] = useState(false);
  const [followCount, setFollowCount] = useState<number>(0);
  const [followLoading, setFollowLoading] = useState(false);
  const descRef = useRef<{ loaded: boolean }>({ loaded: false });

  // Tab
  const [activeTab, setActiveTab] = useState<ArtistTab>('hot');

  // Hot songs
  const [hotSongs, setHotSongs] = useState<SongResult[]>([]);

  // All songs (paginated)
  const [allSongs, setAllSongs] = useState<SongResult[]>([]);
  const [allSongsOffset, setAllSongsOffset] = useState(0);
  const [allSongsHasMore, setAllSongsHasMore] = useState(true);
  const [allSongsLoading, setAllSongsLoading] = useState(false);
  const [allSongsOrder, setAllSongsOrder] = useState<'hot' | 'time'>('time');

  // Albums
  const [albums, setAlbums] = useState<any[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);

  // MV
  const [mvList, setMvList] = useState<any[]>([]);
  const [mvLoading, setMvLoading] = useState(false);

  // Video
  const [videoList, setVideoList] = useState<any[]>([]);
  const [videoCursor, setVideoCursor] = useState<number>(0);
  const [videoHasMore, setVideoHasMore] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Similar artists
  const [similarArtists, setSimilarArtists] = useState<any[]>([]);

  // ─── Fetch ───
  const fetchData = useCallback(async () => {
    try {
      const [detailRes, songsRes] = await Promise.all([
        getArtistDetail(id),
        getArtistTopSongs({ id, limit: 50 }),
      ]);

      const artistData = detailRes?.data?.data?.artist;
      if (artistData) {
        setArtist({
          cover: artistData.cover || artistData.picUrl || artistData.avatar || '',
          avatar: artistData.avatar || artistData.cover || '',
          name: artistData.name || '',
          briefDesc: artistData.briefDesc || '',
          albumSize: artistData.albumSize || 0,
          musicSize: artistData.musicSize || 0,
          alias: (artistData.alias || []).map((a: any) => (typeof a === 'string' ? a : a?.txt || a?.ti || '')),
          mvSize: artistData.mvSize || 0,
        });
        setFollowed(!!artistData.followed);
      }

      const songsData = songsRes?.data?.songs;
      if (Array.isArray(songsData)) {
        setHotSongs(songsData.map(mapSong));
      }

      // Fetch follow count, desc & similar artists in background
      getArtistFollowCount(id).then((res) => {
        const data = res?.data?.data;
        if (data?.followCount !== undefined) setFollowCount(data.followCount);
      }).catch(() => {});

      if (!descRef.current.loaded) {
        getArtistDesc(id).then((res) => {
          const d = res?.data;
          const intro = d?.introduction;
          let txt = '';
          if (Array.isArray(intro)) {
            txt = intro.map((s: any) => (typeof s === 'string' ? s : s?.txt || '')).filter(Boolean).join('\n\n');
          } else if (typeof intro === 'string') {
            txt = intro;
          }
          if (!txt) txt = (typeof d?.briefDesc === 'string' ? d.briefDesc : '') || d?.introduction?.toString?.() || '';
          if (txt) { setDesc(txt.trim()); descRef.current.loaded = true; }
        }).catch(() => {});
      }

      getSimiArtist(id).then((res) => {
        const data = res?.data?.artists;
        if (Array.isArray(data)) setSimilarArtists(data.slice(0, 8));
      }).catch(() => {});

      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Tab data loaders ───
  const loadAllSongs = useCallback(async (reset = false) => {
    const offset = reset ? 0 : allSongsOffset;
    if (!reset && allSongsLoading) return;
    setAllSongsLoading(true);
    try {
      const res = await getArtistSongs({ id, limit: 50, offset, order: allSongsOrder });
      const data = res?.data?.songs;
      if (Array.isArray(data)) {
        const mapped = data.map(mapSong);
        setAllSongs(reset ? mapped : [...allSongs, ...mapped]);
        setAllSongsOffset(offset + data.length);
        setAllSongsHasMore(data.length >= 50);
      } else {
        setAllSongsHasMore(false);
      }
    } catch {} finally {
      setAllSongsLoading(false);
    }
  }, [id, allSongsOffset, allSongsOrder, allSongs, allSongsLoading]);

  const loadAlbums = useCallback(async () => {
    if (albums.length > 0 || albumsLoading) return;
    setAlbumsLoading(true);
    try {
      const res = await getArtistAlbums({ id, limit: 30 });
      const data = res?.data?.hotAlbums || res?.data?.albums;
      if (Array.isArray(data)) setAlbums(data);
    } catch {} finally {
      setAlbumsLoading(false);
    }
  }, [id, albums.length, albumsLoading]);

  const loadMv = useCallback(async () => {
    if (mvList.length > 0 || mvLoading) return;
    setMvLoading(true);
    try {
      const res = await getArtistMv({ id, limit: 30 });
      const data = res?.data?.mvs;
      if (Array.isArray(data)) setMvList(data);
    } catch {} finally {
      setMvLoading(false);
    }
  }, [id, mvList.length, mvLoading]);

  const loadVideo = useCallback(async (reset = false) => {
    const cursor = reset ? 0 : videoCursor;
    if (!reset && videoLoading) return;
    setVideoLoading(true);
    try {
      const res = await getArtistVideo({ id, size: 10, cursor, order: 1 });
      const data = res?.data?.data;
      if (Array.isArray(data)) {
        setVideoList(reset ? data : [...videoList, ...data]);
        setVideoCursor(cursor + data.length);
        setVideoHasMore(data.length >= 10);
      } else {
        setVideoHasMore(false);
      }
    } catch {} finally {
      setVideoLoading(false);
    }
  }, [id, videoCursor, videoList, videoLoading]);

  // Scroll to top when collapsing description or switching tab
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [showFullDesc, activeTab]);

  // Load tab data when tab changes
  useEffect(() => {
    if (activeTab === 'all' && allSongs.length === 0) loadAllSongs(true);
    else if (activeTab === 'album') loadAlbums();
    else if (activeTab === 'mv') loadMv();
    else if (activeTab === 'video' && videoList.length === 0) loadVideo(true);
  }, [activeTab]);

  // ─── Follow ───
  const handleFollow = useCallback(async () => {
    if (!isLoggedIn) {
      navigation.navigate('Login');
      return;
    }
    setFollowLoading(true);
    try {
      const t = followed ? 2 : 1;
      await subscribeArtist(id, t);
      setFollowed(!followed);
      setFollowCount((c) => followed ? Math.max(0, c - 1) : c + 1);
    } catch {} finally {
      setFollowLoading(false);
    }
  }, [id, followed, isLoggedIn, navigation]);

  // ─── Song helpers ───
  const handlePlayAll = useCallback((songList: SongResult[]) => {
    if (songList.length > 0) playAll(songList, 0);
  }, [playAll]);

  const handleSongPress = useCallback((song: SongResult, index: number) => {
    const currentList = activeTab === 'hot' ? hotSongs : allSongs;
    playAll(currentList, index);
    playSong(song);
  }, [activeTab, hotSongs, allSongs, playAll, playSong]);

  const { actionSong, showSheet, actionItems, handlePress: handleSongMore, handleClose, commentSongId, showComments, setShowComments } = useSongActionSheet();

  const coverUrl = artist?.cover || artist?.avatar;

  // ─── Tab bar ───
  const TABS: { key: ArtistTab; label: string }[] = [
    { key: 'hot', label: '热门' },
    { key: 'all', label: '全部' },
    { key: 'album', label: '专辑' },
    { key: 'mv', label: 'MV' },
    { key: 'video', label: '视频' },
  ];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>加载失败</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={fetchData}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        contentContainerStyle={{ paddingBottom: 104 }}
      >
        {/* ─── Content area (keeps min height to fill screen for small tabs) ─── */}
        <View style={{ minHeight: Dimensions.get('window').height * 0.95 }}>
        {/* ─── Cover ─── */}
        <View style={styles.coverContainer}>
          <NetworkImage uri={coverUrl} style={styles.coverImage} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.coverGradient} />
          <TouchableOpacity style={[styles.backButton, { top: insets.top + 8 }]} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={[styles.coverInfo, { paddingBottom: Spacing.lg }]}>
            <Text style={styles.artistName}>{artist?.name}</Text>
            {artist?.alias?.length ? <Text style={styles.artistAlias}>{artist.alias.join(' / ')}</Text> : null}
            <View style={styles.statsRow}>
              <MaterialCommunityIcons name="music-note" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statsText}>{artist?.musicSize || 0} 首</Text>
              <Text style={styles.statsDot}>·</Text>
              <MaterialCommunityIcons name="disc" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statsText}>{artist?.albumSize || 0} 专辑</Text>
              <Text style={styles.statsDot}>·</Text>
              <MaterialCommunityIcons name="account-group-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statsText}>{followCount > 0 ? followCount : ''}</Text>
              <TouchableOpacity
                style={[styles.followBtn, followed && styles.followBtnActive]}
                onPress={handleFollow}
                disabled={followLoading}
                activeOpacity={0.7}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={followed ? '#ffffff' : colors.primary} />
                ) : (
                  <Text style={[styles.followBtnText, { color: followed ? '#ffffff' : colors.primary }]}>
                    {followed ? '已关注' : '+ 关注'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── Description ─── */}
        {(desc || artist?.briefDesc) ? (
          <View style={styles.descSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>简介</Text>
            <TouchableOpacity onPress={() => setShowFullDesc(!showFullDesc)} activeOpacity={0.7}>
              <Text style={[styles.descText, { color: colors.textSecondary }]} numberOfLines={showFullDesc ? undefined : 3}>
                {desc || artist?.briefDesc}
              </Text>
              {(desc || (artist?.briefDesc || '').length > 120) ? (
                <Text style={styles.descToggle}>{showFullDesc ? '收起' : '展开'}</Text>
              ) : null}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ─── Similar Artists ─── */}
        {similarArtists.length > 0 ? (
          <View style={styles.simiSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>相似歌手</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.simiScroll}>
              {similarArtists.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.simiCard}
                  onPress={() => navigation.push('ArtistDetail', { id: item.id })}
                  activeOpacity={0.6}
                >
                  <NetworkImage uri={item.picUrl || item.img1v1Url} style={styles.simiAvatar} />
                  <Text style={[styles.simiName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* ─── Tab Bar ─── */}
        <View style={[styles.tabBar, { backgroundColor: colors.surfaceVariant }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabItem, isActive && { backgroundColor: colors.primary }]}
                  activeOpacity={0.7}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[styles.tabText, { color: isActive ? '#ffffff' : colors.textSecondary }]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── Tab Content (同一个 ScrollView 内，向上滑动收起头部) ─── */}
        {activeTab === 'hot' && (
          <View>
            <View style={styles.playAllRow}>
              <TouchableOpacity style={[styles.playAllButton, { backgroundColor: colors.primary }]} onPress={() => handlePlayAll(hotSongs)} activeOpacity={0.7}>
                <MaterialCommunityIcons name="play" size={18} color="#ffffff" />
                <Text style={styles.playAllText}>播放全部</Text>
              </TouchableOpacity>
              <Text style={[styles.songCount, { color: colors.textSecondary }]}>{hotSongs.length} 首</Text>
            </View>
            {hotSongs.length === 0 ? (
              <EmptyView icon="music-note-off" text="暂无热门歌曲" colors={colors} />
            ) : (
              hotSongs.map((song, index) => (
                <SongItem
                  key={String(song.id)}
                  song={song}
                  index={index}
                  onPress={() => handleSongPress(song, index)}
                  onMorePress={() => handleSongMore(song, index)}
                />
              ))
            )}
          </View>
        )}

        {activeTab === 'all' && (
          <View>
            <View style={styles.allSongsHeader}>
              <View style={[styles.orderToggle, { backgroundColor: colors.surfaceVariant }]}>
                <TouchableOpacity
                  style={[styles.orderTab, allSongsOrder === 'hot' && { backgroundColor: colors.primary }]}
                  onPress={() => { setAllSongsOrder('hot'); setAllSongs([]); setAllSongsOffset(0); setAllSongsHasMore(true); loadAllSongs(true); }}
                >
                  <Text style={[styles.orderText, { color: allSongsOrder === 'hot' ? '#ffffff' : colors.textSecondary }]}>最热</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.orderTab, allSongsOrder === 'time' && { backgroundColor: colors.primary }]}
                  onPress={() => { setAllSongsOrder('time'); setAllSongs([]); setAllSongsOffset(0); setAllSongsHasMore(true); loadAllSongs(true); }}
                >
                  <Text style={[styles.orderText, { color: allSongsOrder === 'time' ? '#ffffff' : colors.textSecondary }]}>最新</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={[styles.playAllButtonSmall, { backgroundColor: colors.primary }]} onPress={() => handlePlayAll(allSongs)} activeOpacity={0.7}>
              <MaterialCommunityIcons name="play" size={16} color="#ffffff" />
              <Text style={styles.playAllTextSmall}>播放全部</Text>
            </TouchableOpacity>
            {allSongs.map((item, index) => (
              <TouchableOpacity key={String(item.id)} style={styles.songRowItem} onPress={() => handleSongPress(item, index)} activeOpacity={0.6}>
                {item.picUrl ? <NetworkImage uri={item.picUrl} style={styles.songThumb} /> : null}
                <View style={styles.songInfo}>
                  <Text style={[styles.songName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.ar?.map((a: any) => a.name).join(' / ') || '未知歌手'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {allSongsLoading ? <ActivityIndicator style={{ padding: 20 }} color={colors.primary} /> : null}
            {!allSongsHasMore && allSongs.length > 0 ? <Text style={[styles.endText, { color: colors.textSecondary }]}>— 已加载全部 —</Text> : null}
            {allSongsHasMore && !allSongsLoading ? (
              <TouchableOpacity style={{ padding: 16, alignItems: 'center' }} onPress={() => loadAllSongs(false)}>
                <Text style={{ color: colors.primary }}>加载更多</Text>
              </TouchableOpacity>
            ) : null}
            {allSongs.length === 0 && !allSongsLoading ? <EmptyView icon="music-note-off" text="暂无歌曲" colors={colors} /> : null}
          </View>
        )}

        {activeTab === 'album' && (
          <View style={styles.albumGrid}>
            {albumsLoading && albums.length === 0 ? (
              <ActivityIndicator style={{ padding: 20 }} color={colors.primary} />
            ) : albums.length === 0 ? (
              <EmptyView icon="disc" text="暂无专辑" colors={colors} />
            ) : (
              <View style={styles.albumRow}>
                {albums.map((item) => (
                  <TouchableOpacity key={String(item.id)} style={styles.albumCard} onPress={() => navigation.navigate('AlbumDetail', { id: item.id })} activeOpacity={0.6}>
                    <NetworkImage uri={item.picUrl || item.coverImgUrl} style={styles.albumCover} />
                    <Text style={[styles.albumName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.albumTime, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.publishTime ? new Date(item.publishTime).getFullYear() : ''}{item.size ? ` · ${item.size}首` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'mv' && (
          <View style={styles.mvGrid}>
            {mvLoading && mvList.length === 0 ? (
              <ActivityIndicator style={{ padding: 20 }} color={colors.primary} />
            ) : mvList.length === 0 ? (
              <EmptyView icon="filmstrip" text="暂无 MV" colors={colors} />
            ) : (
              <View style={styles.mvRow}>
                {mvList.map((item) => (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={[styles.mvCard, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => navigation.navigate('MvPlayer', { id: item.id })}
                    activeOpacity={0.6}
                  >
                    <NetworkImage uri={item.imgurl || item.cover || item.picUrl} style={styles.mvCover} />
                    <View style={styles.mvPlayIcon}>
                      <MaterialCommunityIcons name="play-circle-outline" size={28} color="#ffffff" />
                    </View>
                    <Text style={[styles.mvName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    {item.artistName ? <Text style={[styles.mvArtist, { color: colors.textSecondary }]} numberOfLines={1}>{item.artistName}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'video' && (
          <View style={styles.videoGrid}>
            {videoLoading && videoList.length === 0 ? (
              <ActivityIndicator style={{ padding: 20 }} color={colors.primary} />
            ) : videoList.length === 0 ? (
              <EmptyView icon="video-outline" text="暂无视频" colors={colors} />
            ) : (
              <View style={styles.mvRow}>
                {videoList.map((item, idx) => (
                  <TouchableOpacity key={String(item.vid || idx)} style={[styles.mvCard, { backgroundColor: colors.surfaceVariant }]} activeOpacity={0.6}>
                    <NetworkImage uri={item.coverUrl || item.imgurl} style={styles.mvCover} />
                    <View style={styles.mvPlayIcon}>
                      <MaterialCommunityIcons name="play-circle-outline" size={28} color="#ffffff" />
                    </View>
                    <Text style={[styles.mvName, { color: colors.text }]} numberOfLines={1}>{item.title || item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {videoHasMore && !videoLoading ? (
              <TouchableOpacity style={{ padding: 16, alignItems: 'center' }} onPress={() => loadVideo(false)}>
                <Text style={{ color: colors.primary }}>加载更多</Text>
              </TouchableOpacity>
            ) : null}
            {!videoHasMore && videoList.length > 0 ? <Text style={[styles.endText, { color: colors.textSecondary }]}>— 已加载全部 —</Text> : null}
          </View>
        )}
      </View>
      </ScrollView>

      <SongActionSheet visible={showSheet} song={actionSong} actions={actionItems} onClose={handleClose} />
      <Modal visible={showComments} animationType="slide" onRequestClose={() => setShowComments(false)}>
        <View style={[styles.commentModal, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <View style={styles.commentHeader}>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.commentTitle, { color: colors.text }]}>歌曲评论</Text>
            <View style={{ width: 40 }} />
          </View>
          <CommentList songId={Number(commentSongId)} type="music" />
        </View>
      </Modal>
    </View>
  );
}

// ─── Empty view ───
function EmptyView({ icon, text, colors }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; text: string; colors: any }) {
  return (
    <View style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
      <MaterialCommunityIcons name={icon} size={40} color={colors.textTertiary} />
      <Text style={{ marginTop: Spacing.sm, ...Typography.body2, color: colors.textSecondary }}>{text}</Text>
    </View>
  );
}

// ─── Song mapper ───
function mapSong(song: any): SongResult {
  return {
    id: song.id,
    name: song.name,
    ar: song.ar || [],
    al: song.al || { name: '', id: 0, picUrl: '' },
    dt: song.dt || 0,
    picUrl: song.al?.picUrl || '',
    duration: song.dt || 0,
    count: 0,
  };
}

// ─── Styles ───
function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { ...Typography.body1, marginTop: Spacing.md, marginBottom: Spacing.lg },
    retryButton: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.xxl },
    retryText: { ...Typography.body2, color: '#ffffff', fontWeight: '600' },

    // Cover
    coverContainer: { height: COVER_HEIGHT, position: 'relative' },
    coverImage: { width: SCREEN_WIDTH, height: COVER_HEIGHT },
    coverGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: COVER_HEIGHT * 0.6 },
    backButton: { position: 'absolute', left: Spacing.md, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    coverInfo: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.lg },
    artistName: { ...Typography.h1, color: '#ffffff', marginBottom: Spacing.xs },
    artistAlias: { ...Typography.body2, color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.xs },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, flexWrap: 'wrap' },
    statsText: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', marginLeft: 4 },
    statsDot: { ...Typography.caption, color: 'rgba(255,255,255,0.5)', marginHorizontal: Spacing.sm },

    // Follow
    followBtn: {
      marginLeft: 'auto',
      paddingHorizontal: Spacing.md,
      paddingVertical: 5,
      borderRadius: BorderRadius.xxl,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: 'transparent',
    },
    followBtnActive: { backgroundColor: colors.primary },
    followBtnText: { ...Typography.caption, fontWeight: '600' },

    // Description
    descSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    sectionTitle: { ...Typography.body2, fontWeight: '600', marginBottom: Spacing.sm },
    descText: { ...Typography.body2, lineHeight: 20 },
    descToggle: { ...Typography.caption, color: colors.primary, marginTop: Spacing.xs },

    // Similar artists
    simiSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    simiScroll: { gap: Spacing.md, paddingRight: Spacing.lg },
    simiCard: { alignItems: 'center', width: 72 },
    simiAvatar: { width: 60, height: 60, borderRadius: 30, marginBottom: Spacing.xs },
    simiName: { ...Typography.caption, textAlign: 'center', width: 72 },

    // Tab Bar
    tabBar: { paddingVertical: Spacing.sm, marginTop: Spacing.sm },
    tabScroll: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm },
    tabItem: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.xxl },
    tabText: { ...Typography.body2, fontWeight: '500' },

    // Play All
    playAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    playAllButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.xxl },
    playAllText: { ...Typography.body2, color: '#ffffff', fontWeight: '600', marginLeft: Spacing.xs },
    playAllButtonSmall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, marginHorizontal: Spacing.lg, borderRadius: BorderRadius.xxl, marginBottom: Spacing.sm },
    playAllTextSmall: { ...Typography.body2, color: '#ffffff', fontWeight: '600', marginLeft: Spacing.xs },
    songCount: { ...Typography.caption },

    // All songs header
    allSongsHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
    orderToggle: { flexDirection: 'row', borderRadius: BorderRadius.lg, padding: 3, alignSelf: 'flex-start' },
    orderTab: { paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: BorderRadius.md },
    orderText: { ...Typography.caption, fontWeight: '500' },
    endText: { textAlign: 'center', padding: Spacing.lg, ...Typography.caption },

    // All songs item
    songRowItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    songThumb: { width: 44, height: 44, borderRadius: BorderRadius.md, marginRight: Spacing.md },
    songInfo: { flex: 1 },
    songName: { ...Typography.body2, fontWeight: '500' },
    songArtist: { ...Typography.caption, marginTop: 2 },

    // Album
    albumGrid: { padding: Spacing.md },
    albumRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    albumCard: { width: ALBUM_CARD_SIZE, marginBottom: Spacing.md },
    albumCover: { width: ALBUM_CARD_SIZE, height: ALBUM_CARD_SIZE, borderRadius: BorderRadius.lg },
    albumName: { ...Typography.caption, fontWeight: '500', marginTop: Spacing.xs },
    albumTime: { ...Typography.overline, marginTop: 2 },

    // MV / Video
    mvGrid: { padding: Spacing.md },
    videoGrid: { padding: Spacing.md },
    mvRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    mvCard: { width: MV_CARD_WIDTH, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md },
    mvCover: { width: MV_CARD_WIDTH, height: MV_CARD_WIDTH * 0.56, borderRadius: BorderRadius.lg },
    mvPlayIcon: { position: 'absolute', top: '50%', left: '50%', marginTop: -14, marginLeft: -14 },
    mvName: { ...Typography.caption, fontWeight: '500', paddingHorizontal: Spacing.sm, paddingTop: Spacing.xs, paddingBottom: 2 },
    mvArtist: { ...Typography.overline, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm },

    // Comment modal
    commentModal: { flex: 1 },
    commentHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    commentTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  });
}
