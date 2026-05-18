import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PanResponder } from 'react-native';

import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useFavorite } from '../hooks/useFavorite';
import { useLyric } from '../hooks/useLyric';
import { useDownload } from '../hooks/useDownload';
import { useAppTheme } from '../theme/ThemeContext';
import LyricView from '../components/lyric/LyricView';
import PlaylistDrawer from '../components/player/PlaylistDrawer';
import { PLAY_MODE_SEQUENTIAL, PLAY_MODE_LOOP, PLAY_MODE_SHUFFLE } from '../constants/config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ALBUM_SIZE = SCREEN_WIDTH * 0.66;
const VINYL_SIZE = ALBUM_SIZE * 1.18;
const CENTER_DOT = ALBUM_SIZE * 0.18;

const PLAY_MODE_ICONS: Record<number, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  [PLAY_MODE_SEQUENTIAL]: 'repeat',
  [PLAY_MODE_LOOP]: 'repeat-once',
  [PLAY_MODE_SHUFFLE]: 'shuffle',
};

const PLAY_MODE_LABELS: Record<number, string> = {
  [PLAY_MODE_SEQUENTIAL]: '列表循环',
  [PLAY_MODE_LOOP]: '单曲循环',
  [PLAY_MODE_SHUFFLE]: '随机播放',
};

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDog } = useAppTheme();
  const { togglePlayback, next, prev, seekTo, playSong, isPlay, playMusic, currentProgress, duration } = usePlayer();
  const { playMode, togglePlayMode, showPlaylistDrawer, setShowPlaylistDrawer } = usePlaylist();
  const { isFavorite, toggleFavorite } = useFavorite();
  const { lyric, currentLineIndex, isLoading, fontSize, showTranslation, loadLyric } = useLyric();
  const { download, checkDownloaded } = useDownload();

  const [showLyric, setShowLyric] = useState(false);

  // Lyric page: go back to cover when overscroll top
  const handleLyricOverscrollTop = useCallback(() => setShowLyric(false), []);

  // 下滑关闭动画
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  // Album art rotation animation
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);
  const rotationCount = useRef(0);

  const startSpinAnimation = useCallback(() => {
    spinAnim.current?.stop();
    rotationCount.current += 1;
    spinAnim.current = Animated.loop(
      Animated.timing(spinValue, {
        toValue: rotationCount.current,
        duration: 20000,
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
    return () => {
      spinAnim.current?.stop();
    };
  }, [isPlay, showLyric, startSpinAnimation]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Play button breathing glow
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (isPlay) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0.4);
    }
  }, [isPlay]);

  // Vinyl groove shimmer effect
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const shimmerRotate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Lyric page fade transition
  const lyricFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(lyricFadeAnim, {
      toValue: showLyric ? 1 : 0,
      duration: 350,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [showLyric]);

  const isFav = playMusic ? isFavorite(Number(playMusic.id)) : false;
  const isDownloaded = playMusic ? checkDownloaded(playMusic.id) : false;

  const artistName = useMemo(() => {
    if (!playMusic?.ar) return '未知歌手';
    return playMusic.ar.map((a) => a.name).join(' / ');
  }, [playMusic]);

  const albumArt = useMemo(() => {
    return playMusic?.picUrl || playMusic?.al?.picUrl || '';
  }, [playMusic]);

  const currentTimeMs = currentProgress * 1000;

  // Accent color
  const accentColor = colors.primary;

  const handleToggleFavorite = useCallback(() => {
    if (playMusic) {
      toggleFavorite(Number(playMusic.id));
    }
  }, [playMusic, toggleFavorite]);

  const handleSeekTo = useCallback(
    (timeSec: number) => {
      seekTo(timeSec);
    },
    [seekTo]
  );

  const toggleShowLyric = useCallback(() => {
    setShowLyric((prev) => !prev);
  }, []);

  const handleDownload = useCallback(() => {
    if (playMusic && !isDownloaded) {
      download(playMusic);
    }
  }, [playMusic, isDownloaded, download]);

  const handleGoBack = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && navigation.canGoBack()) {
        navigation.goBack();
      }
    });
  }, [navigation, slideAnim]);

  // Empty player
  const renderEmptyPlayer = () => (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={require('../../assets/dog-theme/A_dreamy__warm_abstract_backgr_2026-05-18T07-11-30.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.9)']}
          style={StyleSheet.absoluteFill}
        />
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

  if (!playMusic) {
    return renderEmptyPlayer();
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      {/* ═══ Full-screen immersive background ═══
       *  - Blurred album art covers ENTIRE screen (not just a square)
       *  - Gradient overlay is semi-transparent so album color bleeds through everywhere
       *  - No hard cut between "blur area" and "black area"
       */}
      <View style={StyleSheet.absoluteFill}>
        {albumArt ? (
          <Image
            source={{ uri: albumArt }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            blurRadius={70}
          />
        ) : (
          <Image
            source={require('../../assets/dog-theme/A_dreamy__warm_abstract_backgr_2026-05-18T07-11-30.png')}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
        {/* Layered gradients for depth without killing the album color */}
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.25)',
            'rgba(0,0,0,0.35)',
            'rgba(0,0,0,0.55)',
            'rgba(0,0,0,0.75)',
          ]}
          locations={[0, 0.3, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Extra vignette at very top & bottom for text readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.5)']}
          locations={[0, 0.25, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Header — refined glass style */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
          <MaterialCommunityIcons name="chevron-down" size={24} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {playMusic.name}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {artistName}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowPlaylistDrawer(!showPlaylistDrawer)}>
          <MaterialCommunityIcons name="playlist-music" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </View>

      {/* Content Area - Album Art / Lyrics */}
      {showLyric ? (
        /* ── Lyric Mode (NetEase pure lyric style) ──
         *  - No song info in lyric area — header already shows it
         *  - Pure full-screen lyric experience
         *  - bottomOffset keeps current line above controls
         */
        <Animated.View style={[styles.lyricPageWrap, { opacity: lyricFadeAnim }]}>
            {/* Back-to-cover overlay */}
            <View style={styles.lyricBackArea} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.lyricBackBtn}
                onPress={() => setShowLyric(false)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="chevron-down" size={18} color="rgba(255,255,255,0.45)" />
                <Text style={styles.lyricBackHint}>下滑返回封面</Text>
              </TouchableOpacity>
            </View>
            <LyricView
              lyric={lyric}
              currentLineIndex={currentLineIndex}
              currentTimeMs={currentTimeMs}
              fontSize={fontSize}
              showTranslation={showTranslation}
              isLoading={isLoading}
              onSeekTo={handleSeekTo}
              onOverscrollTop={handleLyricOverscrollTop}
              bottomOffset={160}
            />
          </Animated.View>
      ) : (
        /* ── Vinyl Mode ── */
        <Animated.View style={[styles.contentArea, { opacity: lyricFadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0],
        }) }]}>
          <TouchableOpacity
            style={styles.artworkContainer}
            activeOpacity={1}
            onPress={toggleShowLyric}
          >
            {/* Vinyl record — gradient light + iridescent shimmer */}
            <View style={styles.vinylOuter}>
              {/* Glow ring */}
              <Animated.View
                style={[
                  styles.vinylGlow,
                  {
                    opacity: isPlay ? glowAnim : 0.12,
                    shadowColor: accentColor,
                  },
                ]}
              />

              {/* Vinyl disc */}
              <Animated.View
                style={[styles.vinylDisc, { transform: [{ rotate: spin }] }]}
              >
                {/* Concentric groove rings */}
                <View style={styles.grooveOuter} />
                <View style={styles.grooveMiddle} />
                <View style={styles.grooveInner} />
                <View style={styles.grooveCore} />

                {/* Iridescent rainbow arc — rotates independently */}
                <Animated.View
                  style={[styles.rainbowArc, { transform: [{ rotate: shimmerRotate }] }]}
                >
                  <LinearGradient
                    colors={[
                      'transparent',
                      'rgba(255,100,200,0.08)',
                      'rgba(100,200,255,0.10)',
                      'rgba(150,255,150,0.07)',
                      'rgba(255,220,100,0.08)',
                      'rgba(200,150,255,0.09)',
                      'transparent',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>

                {/* Second rainbow arc — counter-rotating for depth */}
                <Animated.View
                  style={[styles.rainbowArc2, { transform: [{ rotate: shimmerRotate }] }]}
                >
                  <LinearGradient
                    colors={[
                      'transparent',
                      'rgba(100,150,255,0.06)',
                      'rgba(255,180,100,0.07)',
                      'rgba(100,255,200,0.05)',
                      'transparent',
                    ]}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>

                {/* Album art — large center circle */}
                <View style={styles.albumArtClip}>
                  <Image
                    source={{ uri: albumArt }}
                    style={styles.albumArt}
                    resizeMode="cover"
                  />
                </View>

                {/* Center spindle — gradient ring + dot */}
                <LinearGradient
                  colors={['#444', '#222', '#111']}
                  style={styles.vinylCenter}
                >
                  <View style={styles.centerDot} />
                </LinearGradient>
              </Animated.View>
            </View>

            <View style={styles.tapHintRow}>
              <MaterialCommunityIcons name="text-box-outline" size={13} color="rgba(255,255,255,0.4)" />
              <Text style={styles.tapHintText}>轻触查看歌词</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Song Info — only visible in vinyl mode */}
      {!showLyric && (
        <View style={styles.songInfoSection}>
          <Text style={styles.songName} numberOfLines={1}>
            {playMusic.name}
          </Text>
          <Text style={styles.artistNameText} numberOfLines={1}>
            {artistName}
          </Text>
        </View>
      )}

      {/* ═══ Bottom Control Panel — frosted glass ═══
       *  Semi-transparent backdrop so controls are readable
       *  while the album color atmosphere still flows through
       */}
      <View style={styles.controlPanel}>
        <View style={styles.panelEdgeLine} />

        {/* Progress */}
        <View style={styles.progressSection}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration > 0 ? duration : 1}
            value={currentProgress}
            onSlidingComplete={seekTo}
            minimumTrackTintColor={accentColor}
            maximumTrackTintColor="rgba(255,255,255,0.12)"
            thumbTintColor={accentColor}
          />
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentProgress)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Main Controls */}
        <View style={styles.controlsRow}>
          {/* Play Mode */}
          <TouchableOpacity style={styles.sideCtrlBtn} onPress={togglePlayMode}>
            <MaterialCommunityIcons
              name={PLAY_MODE_ICONS[playMode] || 'repeat'}
              size={21}
              color="rgba(255,255,255,0.6)"
            />
          </TouchableOpacity>

          {/* Previous */}
          <TouchableOpacity style={styles.skipBtn} onPress={prev}>
            <MaterialCommunityIcons name="skip-previous" size={30} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          {/* Play / Pause */}
          <TouchableOpacity style={styles.playBtnOuter} onPress={togglePlayback} activeOpacity={0.8}>
            <Animated.View
              style={[
                styles.playBtnGlow,
                { opacity: isPlay ? glowAnim : 0, backgroundColor: accentColor },
              ]}
            />
            <View style={[styles.playBtnInner, { backgroundColor: accentColor }]}>
              <MaterialCommunityIcons
                name={isPlay ? 'pause' : 'play'}
                size={34}
                color="#ffffff"
                style={{ marginLeft: isPlay ? 0 : 3 }}
              />
            </View>
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity style={styles.skipBtn} onPress={next}>
            <MaterialCommunityIcons name="skip-next" size={30} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          {/* Favorite */}
          <TouchableOpacity style={styles.sideCtrlBtn} onPress={handleToggleFavorite}>
            <Animated.View
              style={[
                styles.favGlow,
                { opacity: isFav ? 0.5 : 0, shadowColor: accentColor },
              ]}
            />
            <MaterialCommunityIcons
              name={isFav ? 'heart' : 'heart-outline'}
              size={22}
              color={isFav ? accentColor : 'rgba(255,255,255,0.6)'}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Actions */}
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={styles.actionItem} onPress={handleDownload} disabled={isDownloaded}>
            <View style={styles.actionIconWrap}>
              <MaterialCommunityIcons
                name={isDownloaded ? 'check-circle' : 'download-outline'}
                size={19}
                color={isDownloaded ? colors.success : 'rgba(255,255,255,0.55)'}
              />
            </View>
            <Text style={[styles.actionLabel, { color: isDownloaded ? colors.success : 'rgba(255,255,255,0.40)' }]}>
              {isDownloaded ? '已下载' : '下载'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={toggleShowLyric}>
            <View style={[styles.actionIconWrap, showLyric && styles.actionIconActive]}>
              <MaterialCommunityIcons
                name={showLyric ? 'image-outline' : 'text-box-outline'}
                size={19}
                color={showLyric ? accentColor : 'rgba(255,255,255,0.55)'}
              />
            </View>
            <Text style={[styles.actionLabel, showLyric && { color: accentColor }]}>
              {showLyric ? '封面' : '歌词'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => setShowPlaylistDrawer(!showPlaylistDrawer)}>
            <View style={styles.actionIconWrap}>
              <MaterialCommunityIcons name="playlist-music" size={19} color="rgba(255,255,255,0.55)" />
            </View>
            <Text style={styles.actionLabel}>列表</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Playlist Drawer */}
      <PlaylistDrawer />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ═══ Background ═══ (image uses absoluteFill + resizeMode cover — no custom style needed)

  // ═══ Control Panel ═══
  controlPanel: {
    zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  panelEdgeLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  // ═══ Header ═══
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.3,
  },

  // ═══ Vinyl / Album Art — Gradient Iridescent ═══
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 5,
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylOuter: {
    width: VINYL_SIZE,
    height: VINYL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylGlow: {
    position: 'absolute',
    width: VINYL_SIZE + 40,
    height: VINYL_SIZE + 40,
    borderRadius: (VINYL_SIZE + 40) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 35,
    elevation: 16,
  },
  vinylDisc: {
    width: VINYL_SIZE,
    height: VINYL_SIZE,
    borderRadius: VINYL_SIZE / 2,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  grooveOuter: {
    position: 'absolute',
    width: VINYL_SIZE * 0.94,
    height: VINYL_SIZE * 0.94,
    borderRadius: (VINYL_SIZE * 0.94) / 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  grooveMiddle: {
    position: 'absolute',
    width: VINYL_SIZE * 0.84,
    height: VINYL_SIZE * 0.84,
    borderRadius: (VINYL_SIZE * 0.84) / 2,
    borderWidth: 0.3,
    borderColor: 'rgba(255,255,255,0.035)',
  },
  grooveInner: {
    position: 'absolute',
    width: VINYL_SIZE * 0.74,
    height: VINYL_SIZE * 0.74,
    borderRadius: (VINYL_SIZE * 0.74) / 2,
    borderWidth: 0.3,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  grooveCore: {
    position: 'absolute',
    width: VINYL_SIZE * 0.64,
    height: VINYL_SIZE * 0.64,
    borderRadius: (VINYL_SIZE * 0.64) / 2,
    borderWidth: 0.3,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  rainbowArc: {
    position: 'absolute',
    width: VINYL_SIZE,
    height: VINYL_SIZE,
    borderRadius: VINYL_SIZE / 2,
    overflow: 'hidden',
  },
  rainbowArc2: {
    position: 'absolute',
    width: VINYL_SIZE * 0.8,
    height: VINYL_SIZE * 0.8,
    top: VINYL_SIZE * 0.1,
    left: VINYL_SIZE * 0.1,
    borderRadius: (VINYL_SIZE * 0.8) / 2,
    overflow: 'hidden',
  },
  albumArtClip: {
    width: ALBUM_SIZE * 0.58,
    height: ALBUM_SIZE * 0.58,
    borderRadius: (ALBUM_SIZE * 0.58) / 2,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  albumArt: {
    width: ALBUM_SIZE * 0.58,
    height: ALBUM_SIZE * 0.58,
    borderRadius: (ALBUM_SIZE * 0.58) / 2,
  },
  vinylCenter: {
    position: 'absolute',
    width: CENTER_DOT,
    height: CENTER_DOT,
    borderRadius: CENTER_DOT / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 4,
  },
  tapHintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
  },

  // ═══ Lyric Page ═══
  lyricPageWrap: {
    flex: 1,
    zIndex: 5,
  },
  lyricBackArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingTop: 8,
  },
  lyricBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    gap: 4,
  },
  lyricBackHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
  },

  // ═══ Song Info (vinyl mode only) ═══
  songInfoSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 8,
    zIndex: 5,
  },
  songName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  artistNameText: {
    fontSize: 13,
    marginTop: 3,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // ═══ Progress ═══
  progressSection: {
    paddingHorizontal: 28,
    paddingTop: 4,
    zIndex: 5,
  },
  slider: {
    width: '100%',
    height: 28,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
    paddingHorizontal: 2,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },

  // ═══ Main Controls ═══
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    zIndex: 5,
  },
  sideCtrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 8,
  },
  playBtnOuter: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  playBtnGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 12,
  },
  playBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  favGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },

  // ═══ Bottom Actions ═══
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    zIndex: 5,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 3,
  },
  actionIconActive: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  actionLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
  },

  // ═══ Empty State ═══
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
});
