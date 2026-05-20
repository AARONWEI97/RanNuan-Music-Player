import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useFavorite } from '../hooks/useFavorite';
import { useLyric } from '../hooks/useLyric';
import { useDownload } from '../hooks/useDownload';
import { useAppTheme } from '../theme/ThemeContext';
import { useAlbumColors } from '../hooks/useAlbumColors';
import LyricView from '../components/lyric/LyricView';
import PlaylistDrawer from '../components/player/PlaylistDrawer';
import CommentList from '../components/comment/CommentList';
import { PLAY_MODE_SEQUENTIAL, PLAY_MODE_LOOP, PLAY_MODE_SHUFFLE } from '../constants/config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISC_SIZE = SCREEN_WIDTH * 0.78;
const CENTER_HUB = 28;

const PLAY_MODE_ICONS: Record<number, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  [PLAY_MODE_SEQUENTIAL]: 'repeat',
  [PLAY_MODE_LOOP]: 'repeat-once',
  [PLAY_MODE_SHUFFLE]: 'shuffle',
};

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ═══════════════════ Custom Progress Bar ═══════════════════
function ProgressBar({
  value,
  max,
  accentColor,
  onSeek,
}: {
  value: number;
  max: number;
  accentColor: string;
  onSeek: (v: number) => void;
}) {
  const [localWidth, setLocalWidth] = useState(SCREEN_WIDTH - 64);
  const pan = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);

  const percentage = max > 0 ? Math.min(value / max, 1) : 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = true;
      },
      onPanResponderMove: (_, gs) => {
        const pct = Math.max(0, Math.min(gs.moveX / localWidth, 1));
        pan.setValue(pct);
      },
      onPanResponderRelease: (_, gs) => {
        const pct = Math.max(0, Math.min(gs.moveX / localWidth, 1));
        onSeek(pct * max);
        isDragging.current = false;
        pan.setValue(0);
      },
    })
  ).current;

  const fillWidth = isDragging.current
    ? (pan as any).__getValue
      ? Math.max(0, Math.min((pan as any).__getValue(), 1)) * 100
      : percentage * 100
    : percentage * 100;

  return (
    <View
      style={styles.progressContainer}
      onLayout={(e) => setLocalWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      {/* Track */}
      <View style={styles.progressTrack}>
        {/* Fill */}
        <View style={[styles.progressFill, { width: `${fillWidth}%`, backgroundColor: accentColor }]} />
        {/* Thumb */}
        <View
          style={[
            styles.progressThumb,
            {
              left: `${fillWidth}%`,
              backgroundColor: accentColor,
              shadowColor: accentColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

// ═══════════════════ Main Component ═══════════════════
export default function PlayerScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDog: _isDog } = useAppTheme();
  const { togglePlayback, next, prev, seekTo, playSong: _playSong, isPlay, playMusic, currentProgress, duration } = usePlayer();
  const { playMode, togglePlayMode, showPlaylistDrawer, setShowPlaylistDrawer } = usePlaylist();
  const { isFavorite, toggleFavorite } = useFavorite();
  const { lyric, currentLineIndex, isLoading, fontSize, showTranslation } = useLyric();
  const { download, checkDownloaded } = useDownload();

  const [showLyric, setShowLyric] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [prevSongId, setPrevSongId] = useState<string | number | null>(null);

  // ── Dynamic album colors ──
  const albumArtUrl = playMusic?.picUrl || playMusic?.al?.picUrl || '';
  const albumColors = useAlbumColors(albumArtUrl);

  // ── Lyric overscroll ──
  const handleLyricOverscrollTop = useCallback(() => setShowLyric(false), []);

  // ── Slide-down dismiss ──
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  // ═══ Album Art Rotation ═══
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);

  const startSpinAnimation = useCallback(() => {
    spinAnim.current?.stop();
    spinAnim.current = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 25000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinAnim.current.start();
  }, [spinValue]);

  useEffect(() => {
    if (isPlay && !showLyric) {
      startSpinAnimation();
    } else {
      spinAnim.current?.stop();
    }
    return () => { spinAnim.current?.stop(); };
  }, [isPlay, showLyric, startSpinAnimation]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ═══ Cover Transition Animation ═══
  const coverScale = useRef(new Animated.Value(1)).current;
  const coverOpacity = useRef(new Animated.Value(1)).current;
  const transitionRef = useRef(false);

  useEffect(() => {
    const currentId = playMusic?.id;
    if (currentId && prevSongId !== null && prevSongId !== currentId && !transitionRef.current) {
      transitionRef.current = true;
      coverOpacity.setValue(1);
      coverScale.setValue(1);

      Animated.parallel([
        Animated.timing(coverScale, { toValue: 0.85, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(coverOpacity, { toValue: 0.3, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start(() => {
        setPrevSongId(currentId);
        Animated.parallel([
          Animated.spring(coverScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
          Animated.timing(coverOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]).start(() => {
          transitionRef.current = false;
        });
      });
      return;
    }
    if (currentId && prevSongId === null) {
      setPrevSongId(currentId);
    }
  }, [playMusic?.id]);

  // ═══ Play Button Breath Glow ═══
  const glowAnim = useRef(new Animated.Value(0.35)).current;
  const glowAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlay) {
      const loop1 = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.35, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      const loop2 = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim2, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowAnim2, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loop1.start();
      loop2.start();
      return () => { loop1.stop(); loop2.stop(); };
    } else {
      glowAnim.setValue(0.35);
      glowAnim2.setValue(0);
    }
  }, [isPlay]);

  // ═══ Rainbow shimmer (subtle, rotates opposite direction) ═══
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const shimmerRotate = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // ── Lyric page fade ──
  const lyricFadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(lyricFadeAnim, {
      toValue: showLyric ? 1 : 0, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
    }).start();
  }, [showLyric]);

  const isFav = playMusic ? isFavorite(Number(playMusic.id)) : false;
  const isDownloaded = playMusic ? checkDownloaded(playMusic.id) : false;

  const artistName = useMemo(() => {
    if (!playMusic?.ar) return '未知歌手';
    return playMusic.ar.map((a) => a.name).join(' / ');
  }, [playMusic]);

  const accentColor = albumColors.accent;
  const currentTimeMs = currentProgress * 1000;

  const handleToggleFavorite = useCallback(() => {
    if (playMusic) toggleFavorite(Number(playMusic.id));
  }, [playMusic, toggleFavorite]);

  const handleSeekTo = useCallback((timeSec: number) => seekTo(timeSec), [seekTo]);

  const toggleShowLyric = useCallback(() => setShowLyric((p) => !p), []);

  const handleDownload = useCallback(() => {
    if (playMusic && !isDownloaded) download(playMusic);
  }, [playMusic, isDownloaded, download]);

  const handleGoBack = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && navigation.canGoBack()) navigation.goBack();
    });
  }, [navigation, slideAnim]);

  // ── Empty player ──
  if (!playMusic) {
    return (
      <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
        <View style={StyleSheet.absoluteFill}>
          <Image source={require('../../assets/dog-theme/A_dreamy__warm_abstract_backgr_2026-05-18T07-11-30.png')} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFill} />
        </View>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
            <MaterialCommunityIcons name="chevron-down" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="paw" size={64} color="rgba(255,255,255,0.25)" />
          <Text style={styles.emptyText}>暂无播放</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      {/* ═══ Dynamic Color Background ═══ */}
      <View style={StyleSheet.absoluteFill}>
        {albumArtUrl ? (
          <Image source={{ uri: albumArtUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={80} />
        ) : (
          <Image source={require('../../assets/dog-theme/A_dreamy__warm_abstract_backgr_2026-05-18T07-11-30.png')} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        {/* Dynamic gradient overlay using extracted colors */}
        <LinearGradient
          colors={[
            albumColors.dark + 'CC',
            albumColors.dark + '99',
            albumColors.muted + '88',
            'rgba(0,0,0,0.85)',
          ]}
          locations={[0, 0.35, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Vignette for depth */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.5)']}
          locations={[0, 0.25, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* ═══ Header ═══ */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
          <MaterialCommunityIcons name="chevron-down" size={24} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{playMusic.name}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{artistName}</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowPlaylistDrawer(!showPlaylistDrawer)}>
          <MaterialCommunityIcons name="playlist-music" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </View>

      {/* ═══ Content Area ═══ */}
      {showLyric ? (
        <Animated.View style={[styles.lyricPageWrap, { opacity: lyricFadeAnim }]}>
          <View style={styles.lyricBackArea} pointerEvents="box-none">
            <TouchableOpacity style={styles.lyricBackBtn} onPress={() => setShowLyric(false)} activeOpacity={0.7}>
              <MaterialCommunityIcons name="chevron-down" size={18} color="rgba(255,255,255,0.45)" />
              <Text style={styles.lyricBackHint}>下滑返回封面</Text>
            </TouchableOpacity>
          </View>
          <LyricView
            lyric={lyric} currentLineIndex={currentLineIndex} currentTimeMs={currentTimeMs}
            fontSize={fontSize} showTranslation={showTranslation} isLoading={isLoading}
            onSeekTo={handleSeekTo} onOverscrollTop={handleLyricOverscrollTop} bottomOffset={180}
          />
        </Animated.View>
      ) : (
        <Animated.View style={[styles.contentArea, { opacity: lyricFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
          <TouchableOpacity style={styles.discContainer} activeOpacity={1} onPress={toggleShowLyric}>
            {/* ═══ Picture Disc Vinyl — full-cover album art ═══ */}
            <View style={styles.discOuter}>
              {/* Outer glow ring — pulsing with accent color */}
              <Animated.View style={[styles.discGlow, { opacity: isPlay ? glowAnim : 0.08, shadowColor: accentColor }]} />

              {/* Rotating disc */}
              <Animated.View style={[styles.discBody, { transform: [{ rotate: spin }] }]}>
                {/* Album art fills the ENTIRE disc */}
                <Image source={{ uri: albumArtUrl }} style={styles.discCover} resizeMode="cover" />

                {/* Subtle vinyl groove rings overlay */}
                <View style={styles.grooveOuter} />
                <View style={styles.grooveMid1} />
                <View style={styles.grooveMid2} />
                <View style={styles.grooveInner} />

                {/* Rainbow shimmer arc — subtle iridescent effect */}
                <Animated.View style={[styles.shimmerArc, { transform: [{ rotate: shimmerRotate }] }]}>
                  <LinearGradient
                    colors={['transparent', 'rgba(255,150,200,0.06)', 'rgba(100,180,255,0.07)', 'rgba(150,255,150,0.04)', 'transparent']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>

                {/* Center hub / spindle */}
                <View style={styles.centerHub}>
                  <View style={styles.centerHubRing} />
                  <View style={styles.centerHubDot} />
                </View>
              </Animated.View>
            </View>

            <View style={styles.tapHintRow}>
              <MaterialCommunityIcons name="text-box-outline" size={13} color="rgba(255,255,255,0.35)" />
              <Text style={styles.tapHintText}>轻触查看歌词</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ═══ Song Info ═══ */}
      {!showLyric && (
        <View style={styles.songInfoSection}>
          <Text style={styles.songName} numberOfLines={1}>{playMusic.name}</Text>
          <Text style={styles.artistNameText} numberOfLines={1}>{artistName}</Text>
        </View>
      )}

      {/* ═══ Bottom Control Panel — Frosted Glass ═══ */}
      <View style={[styles.controlPanel, { paddingBottom: insets.bottom + 8, backgroundColor: albumColors.muted + 'CC' }]}>
        <View style={[styles.panelTopLine, { backgroundColor: accentColor + '30' }]} />

        {/* ── Custom Progress Bar ── */}
        <View style={styles.progressSection}>
          <ProgressBar value={currentProgress} max={duration > 0 ? duration : 1} accentColor={accentColor} onSeek={handleSeekTo} />
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentProgress)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* ── Main Controls ── */}
        <View style={styles.controlsRow}>
          {/* Play Mode */}
          <TouchableOpacity style={styles.sideBtn} onPress={togglePlayMode} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name={PLAY_MODE_ICONS[playMode] || 'repeat'} size={20} color="rgba(255,255,255,0.55)" />
          </TouchableOpacity>

          {/* Previous */}
          <TouchableOpacity style={styles.skipBtn} onPress={prev} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="skip-previous" size={30} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          {/* Play / Pause — Double-layer glow */}
          <TouchableOpacity style={styles.playBtnContainer} onPress={togglePlayback} activeOpacity={0.85}>
            {/* Outer diffuse glow */}
            <Animated.View style={[styles.playBtnGlowOuter, { opacity: glowAnim2, backgroundColor: accentColor }]} />
            {/* Inner pulse glow */}
            <Animated.View style={[styles.playBtnGlowInner, { opacity: isPlay ? glowAnim : 0.1, backgroundColor: accentColor }]} />
            {/* Button body */}
            <View style={[styles.playBtnInner, { backgroundColor: accentColor }]}>
              <MaterialCommunityIcons name={isPlay ? 'pause' : 'play'} size={36} color="#fff" style={{ marginLeft: isPlay ? 0 : 3 }} />
            </View>
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity style={styles.skipBtn} onPress={next} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="skip-next" size={30} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          {/* Favorite */}
          <TouchableOpacity style={styles.sideBtn} onPress={handleToggleFavorite} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name={isFav ? 'heart' : 'heart-outline'} size={21} color={isFav ? accentColor : 'rgba(255,255,255,0.55)'} />
          </TouchableOpacity>
        </View>

        {/* ── Bottom Actions ── */}
        <View style={[styles.actionBar, { borderTopColor: accentColor + '20' }]}>
          <TouchableOpacity style={styles.actionItem} onPress={handleDownload} disabled={isDownloaded}>
            <MaterialCommunityIcons name={isDownloaded ? 'check-circle' : 'download-outline'} size={18} color={isDownloaded ? colors.success : 'rgba(255,255,255,0.45)'} />
            <Text style={[styles.actionLabel, isDownloaded && { color: colors.success }]}>{isDownloaded ? '已下载' : '下载'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={toggleShowLyric}>
            <MaterialCommunityIcons name={showLyric ? 'image-outline' : 'text-box-outline'} size={18} color={showLyric ? accentColor : 'rgba(255,255,255,0.45)'} />
            <Text style={[styles.actionLabel, showLyric && { color: accentColor }]}>{showLyric ? '封面' : '歌词'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => setShowPlaylistDrawer(!showPlaylistDrawer)}>
            <MaterialCommunityIcons name="playlist-music" size={18} color="rgba(255,255,255,0.45)" />
            <Text style={styles.actionLabel}>列表</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => setShowComments(true)}>
            <MaterialCommunityIcons name="comment-text-outline" size={18} color="rgba(255,255,255,0.45)" />
            <Text style={styles.actionLabel}>评论</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Playlist Drawer */}
      <PlaylistDrawer />

      {/* ── 歌曲评论弹窗 ── */}
      <Modal visible={showComments} animationType="slide" onRequestClose={() => setShowComments(false)}>
        <View style={[styles.commentModal, { backgroundColor: colors.background }]}>
          <View style={[styles.commentHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.commentTitle, { color: colors.text }]}>歌曲评论</Text>
            <View style={{ width: 40 }} />
          </View>
          <CommentList songId={Number(playMusic?.id ?? 0)} type="music" />
        </View>
      </Modal>
    </Animated.View>
  );
}

// ═══════════════════ Styles ═══════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // ── Header ──
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6, zIndex: 10 },
  headerBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.95)', letterSpacing: 0.4 },
  headerSubtitle: { fontSize: 11, marginTop: 1, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.3 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },

  // ── Picture Disc Vinyl ──
  contentArea: { flex: 1, justifyContent: 'center', zIndex: 5 },
  discContainer: { alignItems: 'center', justifyContent: 'center' },
  discOuter: { width: DISC_SIZE + 44, height: DISC_SIZE + 44, alignItems: 'center', justifyContent: 'center' },
  discGlow: {
    position: 'absolute', width: DISC_SIZE + 60, height: DISC_SIZE + 60, borderRadius: (DISC_SIZE + 60) / 2,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 40, elevation: 20,
  },
  discBody: {
    width: DISC_SIZE, height: DISC_SIZE, borderRadius: DISC_SIZE / 2, backgroundColor: '#0d0d0d',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.8, shadowRadius: 30, elevation: 18,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  discCover: { width: DISC_SIZE, height: DISC_SIZE, borderRadius: DISC_SIZE / 2 },
  // Groove rings — subtle overlays
  grooveOuter: {
    position: 'absolute', width: DISC_SIZE * 0.92, height: DISC_SIZE * 0.92, borderRadius: (DISC_SIZE * 0.92) / 2,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.04)',
  },
  grooveMid1: {
    position: 'absolute', width: DISC_SIZE * 0.78, height: DISC_SIZE * 0.78, borderRadius: (DISC_SIZE * 0.78) / 2,
    borderWidth: 0.4, borderColor: 'rgba(255,255,255,0.03)',
  },
  grooveMid2: {
    position: 'absolute', width: DISC_SIZE * 0.64, height: DISC_SIZE * 0.64, borderRadius: (DISC_SIZE * 0.64) / 2,
    borderWidth: 0.3, borderColor: 'rgba(255,255,255,0.025)',
  },
  grooveInner: {
    position: 'absolute', width: DISC_SIZE * 0.50, height: DISC_SIZE * 0.50, borderRadius: (DISC_SIZE * 0.50) / 2,
    borderWidth: 0.3, borderColor: 'rgba(255,255,255,0.02)',
  },
  shimmerArc: {
    position: 'absolute', width: DISC_SIZE, height: DISC_SIZE, borderRadius: DISC_SIZE / 2, overflow: 'hidden',
  },
  centerHub: {
    position: 'absolute', width: CENTER_HUB, height: CENTER_HUB, borderRadius: CENTER_HUB / 2,
    backgroundColor: '#111', justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  centerHubRing: {
    width: CENTER_HUB - 8, height: CENTER_HUB - 8, borderRadius: (CENTER_HUB - 8) / 2,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  centerHubDot: {
    position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tapHintRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 4 },
  tapHintText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5 },

  // ── Song Info ──
  songInfoSection: { alignItems: 'center', paddingHorizontal: 32, zIndex: 5 },
  songName: { fontSize: 20, fontWeight: '800', color: 'rgba(255,255,255,0.95)', textAlign: 'center', letterSpacing: 0.5, marginBottom: 4 },
  artistNameText: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', letterSpacing: 0.3 },

  // ── Lyric Page ──
  lyricPageWrap: { flex: 1, zIndex: 5 },
  lyricBackArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, alignItems: 'center', paddingTop: 8 },
  lyricBackBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.3)', gap: 4 },
  lyricBackHint: { fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5 },

  // ── Control Panel ──
  controlPanel: { zIndex: 5, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  panelTopLine: { height: StyleSheet.hairlineWidth, marginBottom: 4 },

  // ── Custom Progress Bar ──
  progressSection: { paddingHorizontal: 32, marginTop: 8 },
  progressContainer: { height: 32, justifyContent: 'center' },
  progressTrack: { height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center' },
  progressFill: { position: 'absolute', height: 3, borderRadius: 1.5 },
  progressThumb: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7, marginLeft: -7,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 6,
    borderWidth: 2, borderColor: '#fff',
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timeText: { fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 },

  // ── Controls Row ──
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, marginTop: 14 },
  sideBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  skipBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  // Play button — double glow
  playBtnContainer: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  playBtnGlowOuter: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 12,
  },
  playBtnGlowInner: {
    position: 'absolute', width: 68, height: 68, borderRadius: 34,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  playBtnInner: {
    width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },

  // ── Action Bar ──
  actionBar: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 24, marginTop: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  actionItem: { alignItems: 'center', gap: 4, paddingHorizontal: 16 },
  actionLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.3 },

  // ── Comment Modal ──
  commentModal: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  commentTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
