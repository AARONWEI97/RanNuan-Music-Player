import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useFavorite } from '../hooks/useFavorite';
import { useLyric } from '../hooks/useLyric';
import { useDownload } from '../hooks/useDownload';
import LyricView from '../components/lyric/LyricView';
import { PLAY_MODE_SEQUENTIAL, PLAY_MODE_LOOP, PLAY_MODE_SHUFFLE, PLAY_MODE_INTELLIGENCE } from '../constants/config';
import type { RootStackScreenProps } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PLAY_MODE_ICONS = ['🔁', '🔂', '🔀', '🧠'];

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const navigation = useNavigation<RootStackScreenProps<'Player'>['navigation']>();
  const insets = useSafeAreaInsets();
  const { togglePlayback, next, prev, seekTo, playMusic, isPlay, currentProgress, duration } = usePlayer();
  const { playMode, togglePlayMode, showPlaylistDrawer, setShowPlaylistDrawer } = usePlaylist();
  const { isFavorite, toggleFavorite } = useFavorite();
  const { lyric, currentLineIndex, isLoading, fontSize, showTranslation, loadLyric } = useLyric();
  const { download, checkDownloaded } = useDownload();

  const [showLyric, setShowLyric] = useState(false);

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

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onEnd((e) => {
          if (e.translationY > 100) {
            navigation.goBack();
          }
        }),
    [navigation]
  );

  if (!playMusic) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>暂无播放</Text>
        </View>
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{playMusic.name}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{artistName}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

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
              <Image
                source={{ uri: albumArt }}
                style={styles.albumArt}
                resizeMode="cover"
              />
              <Text style={styles.tapHint}>点击查看歌词</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.songInfoSection}>
          <Text style={styles.songName} numberOfLines={1}>{playMusic.name}</Text>
          <Text style={styles.artistName} numberOfLines={1}>{artistName}</Text>
        </View>

        <View style={styles.progressSection}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration > 0 ? duration : 1}
            value={currentProgress}
            onSlidingComplete={seekTo}
            minimumTrackTintColor="#ff3b3b"
            maximumTrackTintColor="#444444"
            thumbTintColor="#ff3b3b"
          />
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentProgress)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        <View style={styles.controlsSection}>
          <TouchableOpacity style={styles.controlButton} onPress={togglePlayMode}>
            <Text style={styles.controlIcon}>{PLAY_MODE_ICONS[playMode] || '🔁'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={prev}>
            <Text style={styles.controlIconLarge}>⏮</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            <Text style={styles.playIcon}>{isPlay ? '⏸' : '▶️'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={next}>
            <Text style={styles.controlIconLarge}>⏭</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handleToggleFavorite}>
            <Text style={styles.controlIcon}>{isFav ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleDownload}
            disabled={isDownloaded}
          >
            <Text style={styles.bottomIcon}>{isDownloaded ? '✅' : '📥'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={toggleShowLyric}
          >
            <Text style={styles.bottomIcon}>{showLyric ? '🖼️' : '🎤'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
          >
            <Text style={styles.bottomIcon}>📋</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#aaaaaa',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumArt: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: 16,
    backgroundColor: '#333355',
  },
  tapHint: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    marginTop: 12,
  },
  lyricContainer: {
    flex: 1,
  },
  songInfoSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  songName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  artistName: {
    fontSize: 14,
    color: '#aaaaaa',
    marginTop: 4,
    textAlign: 'center',
  },
  progressSection: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: '#888888',
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    fontSize: 22,
  },
  controlIconLarge: {
    fontSize: 28,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ff3b3b',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  playIcon: {
    fontSize: 32,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    gap: 36,
    paddingBottom: 8,
  },
  bottomButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomIcon: {
    fontSize: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#888888',
  },
});
