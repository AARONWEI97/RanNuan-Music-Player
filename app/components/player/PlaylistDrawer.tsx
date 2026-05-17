import React, { useCallback, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlaylistStore } from '../../store/playlistStore';
import { usePlayerStore } from '../../store/playerStore';
import NetworkImage from '../common/NetworkImage';
import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import type { SongResult } from '../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.55;

const PLAY_MODE_ICONS = ['🔁', '🔂', '🔀', '💝'];
const PLAY_MODE_LABELS = ['顺序播放', '单曲循环', '随机播放', '心动模式'];

export default function PlaylistDrawer() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const showPlaylistDrawer = usePlaylistStore((s) => s.showPlaylistDrawer);
  const setShowPlaylistDrawer = usePlaylistStore((s) => s.setShowPlaylistDrawer);
  const playList = usePlaylistStore((s) => s.playList);
  const playListIndex = usePlaylistStore((s) => s.playListIndex);
  const playMode = usePlaylistStore((s) => s.playMode);
  const togglePlayMode = usePlaylistStore((s) => s.togglePlayMode);
  const removeFromPlayList = usePlaylistStore((s) => s.removeFromPlayList);
  const clearPlayAll = usePlaylistStore((s) => s.clearPlayAll);
  const setPlayListIndex = usePlaylistStore((s) => s.setPlayListIndex);
  const playMusic = usePlayerStore((s) => s.playMusic);
  const setIsPlay = usePlayerStore((s) => s.setIsPlay);
  const setPlayMusic = usePlayerStore((s) => s.setPlayMusic);

  const handleSongPress = useCallback(
    (song: SongResult, index: number) => {
      setPlayListIndex(index);
      setPlayMusic(song);
      setIsPlay(true);
    },
    [setPlayListIndex, setPlayMusic, setIsPlay]
  );

  const handleClose = useCallback(() => {
    setShowPlaylistDrawer(false);
  }, [setShowPlaylistDrawer]);

  const renderItem = useCallback(
    ({ item, index }: { item: SongResult; index: number }) => {
      const isActive = item.id === playMusic?.id;
      const artistNames = item.ar?.map((a) => a.name).join(' / ') || '未知歌手';

      return (
        <TouchableOpacity
          style={[styles.songItem, isActive && styles.songItemActive]}
          onPress={() => handleSongPress(item, index)}
          activeOpacity={0.7}
        >
          <View style={styles.songInfo}>
            <Text style={[styles.songName, isActive && styles.songNameActive]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {artistNames}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromPlayList(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.removeIcon}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [playMusic, handleSongPress, removeFromPlayList]
  );

  return (
    <Modal
      visible={showPlaylistDrawer}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.drawer, { paddingBottom: insets.bottom + Spacing.md }]}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerTitle}>播放列表</Text>
                  <Text style={styles.headerCount}>{playList.length}首</Text>
                </View>
                <View style={styles.headerRight}>
                  <TouchableOpacity style={styles.modeButton} onPress={togglePlayMode}>
                    <Text style={styles.modeIcon}>{PLAY_MODE_ICONS[playMode]}</Text>
                    <Text style={styles.modeLabel}>{PLAY_MODE_LABELS[playMode]}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.clearButton} onPress={clearPlayAll}>
                    <Text style={styles.clearIcon}>🗑</Text>
                    <Text style={styles.clearLabel}>清空</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <FlatList
                data={playList}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                initialScrollIndex={playListIndex > 3 ? playListIndex - 2 : 0}
                getItemLayout={(_, index) => ({
                  length: 56,
                  offset: 56 * index,
                  index,
                })}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: DRAWER_HEIGHT,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  headerTitle: {
    ...Typography.h4,
    color: colors.text,
    fontWeight: '600',
  },
  headerCount: {
    ...Typography.caption,
    color: colors.textTertiary,
    marginLeft: Spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  modeIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  modeLabel: {
    ...Typography.caption,
    color: colors.textSecondary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  clearLabel: {
    ...Typography.caption,
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: Spacing.lg,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    height: 56,
  },
  songItemActive: {
    backgroundColor: `${colors.primary}10`,
  },
  songInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  songName: {
    ...Typography.body2,
    color: colors.text,
    fontWeight: '400',
    marginBottom: 2,
  },
  songNameActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  songArtist: {
    ...Typography.overline,
    color: colors.textTertiary,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  removeIcon: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  });
}
