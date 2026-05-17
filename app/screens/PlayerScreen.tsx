import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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

import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useFavorite } from '../hooks/useFavorite';
import { useLyric } from '../hooks/useLyric';
import { useDownload } from '../hooks/useDownload';
import { useAppTheme } from '../theme/ThemeContext';
import LyricView from '../components/lyric/LyricView';
import PlaylistDrawer from '../components/player/PlaylistDrawer';
import { PLAY_MODE_SEQUENTIAL, PLAY_MODE_LOOP, PLAY_MODE_SHUFFLE, PLAY_MODE_INTELLIGENCE } from '../constants/config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ALBUM_SIZE = SCREEN_WIDTH * 0.68;

const PLAY_MODE_ICONS: Record<number, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  [PLAY_MODE_SEQUENTIAL]: 'repeat',
  [PLAY_MODE_LOOP]: 'repeat-once',
  [PLAY_MODE_SHUFFLE]: 'shuffle',
  [PLAY_MODE_INTELLIGENCE]: 'head-heart',
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
  const { colors } = useAppTheme();
  const { togglePlayback, next, prev, seekTo, playSong, isPlay, playMusic, currentProgress, duration } = usePlayer();
  const { playMode, togglePlayMode, showPlaylistDrawer, setShowPlaylistDrawer } = usePlaylist();
  const { isFavorite, toggleFavorite } = useFavorite();
  const { lyric, currentLineIndex, isLoading, fontSize, showTranslation, loadLyric } = useLyric();
  const { download, checkDownloaded } = useDownload();

  const [showLyric, setShowLyric] = useState(false);

  // 下滑关闭动画：整个页面的 Y 轴偏移
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  // Album art rotation animation
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isPlay) {
      spinAnim.current = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: true,
        })
      );
      spinAnim.current.start();
    } else {
      spinAnim.current?.stop();
    }
    return () => {
      spinAnim.current?.stop();
    };
  }, [isPlay]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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

  // 关闭动画：先播放向下滑出动画，结束后再调用 goBack()
  const handleGoBack = useCallback(() => {
    if (isClosingRef.current) return; // 防止重复触发
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

  // 空状态页面也需要关闭动画
  const renderEmptyPlayer = () => (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient
        colors={[colors.playerBg, colors.playerSurface, colors.playerBg]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-down" size={28} color={colors.playerText} />
        </TouchableOpacity>
      </View>
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="music-note-off" size={64} color={colors.playerTextSecondary} />
        <Text style={[styles.emptyText, { color: colors.playerTextSecondary }]}>暂无播放</Text>
      </View>
    </Animated.View>
  );

  if (!playMusic) {
    return renderEmptyPlayer();
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={[colors.playerBg, colors.playerSurface, colors.playerBg]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-down" size={28} color={colors.playerText} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.playerText }]} numberOfLines={1}>
            {playMusic.name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.playerTextSecondary }]} numberOfLines={1}>
            {artistName}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Content Area - Album Art / Lyrics */}
      <TouchableOpacity
        style={styles.contentArea}
        activeOpacity={1}
        onPress={toggleShowLyric}
      >
        {showLyric ? (
          <View style={styles.lyricContainer}>
            <LyricView
              lyric={lyric}
              currentLineIndex={currentLineIndex}
              currentTimeMs={currentTimeMs}
              fontSize={fontSize}
              showTranslation={showTranslation}
              isLoading={isLoading}
              onSeekTo={handleSeekTo}
            />
          </View>
        ) : (
          <View style={styles.artworkContainer}>
            <Animated.View
              style={[
                styles.albumArtWrapper,
                { transform: [{ rotate: spin }] },
              ]}
            >
              <Image
                source={{ uri: albumArt }}
                style={styles.albumArt}
                resizeMode="cover"
              />
              {/* Vinyl center hole effect */}
              <View style={styles.albumCenter}>
                <View style={styles.albumCenterInner} />
              </View>
            </Animated.View>
            <Text style={[styles.tapHint, { color: colors.playerTextSecondary }]}>
              <MaterialCommunityIcons name="text-box-outline" size={14} color={colors.playerTextSecondary} />
              {' '}点击查看歌词
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Song Info */}
      <View style={styles.songInfoSection}>
        <Text style={[styles.songName, { color: colors.playerText }]} numberOfLines={1}>
          {playMusic.name}
        </Text>
        <Text style={[styles.artistNameText, { color: colors.playerTextSecondary }]} numberOfLines={1}>
          {artistName}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration > 0 ? duration : 1}
          value={currentProgress}
          onSlidingComplete={seekTo}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={`${colors.playerTextSecondary}33`}
          thumbTintColor={colors.primary}
        />
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: colors.playerTextSecondary }]}>
            {formatTime(currentProgress)}
          </Text>
          <Text style={[styles.timeText, { color: colors.playerTextSecondary }]}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>

      {/* Main Controls */}
      <View style={styles.controlsSection}>
        <TouchableOpacity style={styles.controlButton} onPress={togglePlayMode}>
          <MaterialCommunityIcons
            name={PLAY_MODE_ICONS[playMode] || 'repeat'}
            size={24}
            color={colors.playerTextSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={prev}>
          <MaterialCommunityIcons name="skip-previous" size={38} color={colors.playerText} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
          <MaterialCommunityIcons
            name={isPlay ? 'pause' : 'play'}
            size={36}
            color="#ffffff"
            style={{ marginLeft: isPlay ? 0 : 3 }}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={next}>
          <MaterialCommunityIcons name="skip-next" size={38} color={colors.playerText} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleToggleFavorite}>
          <MaterialCommunityIcons
            name={isFav ? 'heart' : 'heart-outline'}
            size={26}
            color={isFav ? colors.primary : colors.playerTextSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={handleDownload}
          disabled={isDownloaded}
        >
          <MaterialCommunityIcons
            name={isDownloaded ? 'check-circle' : 'download-outline'}
            size={24}
            color={isDownloaded ? colors.success : colors.playerTextSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomButton} onPress={toggleShowLyric}>
          <MaterialCommunityIcons
            name={showLyric ? 'image-outline' : 'text-box-outline'}
            size={24}
            color={colors.playerTextSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
        >
          <MaterialCommunityIcons
            name="playlist-music"
            size={24}
            color={colors.playerTextSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Playlist Drawer Modal */}
      <PlaylistDrawer />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    width: 44,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumArtWrapper: {
    width: ALBUM_SIZE,
    height: ALBUM_SIZE,
    borderRadius: ALBUM_SIZE / 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  albumArt: {
    width: ALBUM_SIZE,
    height: ALBUM_SIZE,
    borderRadius: ALBUM_SIZE / 2,
  },
  albumCenter: {
    position: 'absolute',
    width: ALBUM_SIZE * 0.22,
    height: ALBUM_SIZE * 0.22,
    borderRadius: (ALBUM_SIZE * 0.22) / 2,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  albumCenterInner: {
    width: ALBUM_SIZE * 0.08,
    height: ALBUM_SIZE * 0.08,
    borderRadius: (ALBUM_SIZE * 0.08) / 2,
    backgroundColor: '#2a2a4a',
  },
  tapHint: {
    fontSize: 12,
    marginTop: 16,
  },
  lyricContainer: {
    flex: 1,
  },
  songInfoSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  songName: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  artistNameText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  progressSection: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  timeText: {
    fontSize: 12,
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  controlButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ff3b3b',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    shadowColor: '#ff3b3b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    gap: 36,
  },
  bottomButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
  },
});
