import React, { useCallback, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { usePlaylistStore } from '../../store/playlistStore';
import { usePlayerStore } from '../../store/playerStore';
import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import { PLAY_MODE_SEQUENTIAL, PLAY_MODE_LOOP, PLAY_MODE_SHUFFLE } from '../../constants/config';
import { usePlayer } from '../../hooks/usePlayer';
import type { SongResult } from '../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.55;

const PLAY_MODE_ICONS: Record<number, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  [PLAY_MODE_SEQUENTIAL]: 'repeat',
  [PLAY_MODE_LOOP]: 'repeat-once',
  [PLAY_MODE_SHUFFLE]: 'shuffle',
};

const PLAY_MODE_LABELS: Record<number, string> = {
  [PLAY_MODE_SEQUENTIAL]: '顺序播放',
  [PLAY_MODE_LOOP]: '单曲循环',
  [PLAY_MODE_SHUFFLE]: '随机播放',
};

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
  const { playSong } = usePlayer();

  // 修复：歌曲点击时真正播放音频（之前只更新 store 不播放）
  const handleSongPress = useCallback(
    (song: SongResult, index: number) => {
      setPlayListIndex(index);
      playSong(song);
    },
    [setPlayListIndex, playSong]
  );

  const handleClose = useCallback(() => {
    setShowPlaylistDrawer(false);
  }, [setShowPlaylistDrawer]);

  // 修复：initialScrollIndex 越界导致闪退
  const safeInitialIndex = useMemo(() => {
    if (playList.length === 0) return 0;
    const clampedIndex = Math.min(playListIndex, playList.length - 1);
    return clampedIndex > 3 ? clampedIndex - 2 : 0;
  }, [playListIndex, playList.length]);

  const renderItem = useCallback(
    ({ item, index }: { item: SongResult; index: number }) => {
      const isActive = item.id === playMusic?.id;
      const artistNames = item.ar?.map((a: any) => a.name).join(' / ') || item.artists?.map((a: any) => a.name).join(' / ') || '未知歌手';

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
            <MaterialCommunityIcons name="close" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [playMusic, handleSongPress, removeFromPlayList, colors]
  );

  return (
    <Modal
      visible={showPlaylistDrawer}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
    <Pressable style={styles.overlay} onPress={handleClose}>
      <Pressable>
        <View style={[styles.drawer, { paddingBottom: insets.bottom + Spacing.md }]}>
          <TouchableOpacity style={styles.handleWrap} onPress={handleClose} activeOpacity={0.6}>
            <View style={styles.handle} />
          </TouchableOpacity>

              <View style={styles.header}>
                <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.6}>
                  <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={styles.headerLeft}>
                  <MaterialCommunityIcons name="playlist-music" size={20} color={colors.text} />
                  <Text style={styles.headerTitle}>播放列表</Text>
                  <Text style={styles.headerCount}>{playList.length}首</Text>
                </View>
                <View style={styles.headerRight}>
                  <TouchableOpacity style={styles.modeButton} onPress={togglePlayMode}>
                    <MaterialCommunityIcons
                      name={PLAY_MODE_ICONS[playMode] || 'repeat'}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.modeLabel}>{PLAY_MODE_LABELS[playMode]}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.clearButton} onPress={clearPlayAll}>
                    <MaterialCommunityIcons name="delete-outline" size={18} color={colors.textSecondary} />
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
                initialScrollIndex={safeInitialIndex}
                getItemLayout={(_, index) => ({
                  length: 56,
                  offset: 56 * index,
                  index,
                })}
              />
        </View>
      </Pressable>
    </Pressable>
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
    },
    handleWrap: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xxl,
      alignItems: 'center',
    },
    closeBtn: {
      padding: Spacing.xs,
      marginRight: Spacing.sm,
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
      alignItems: 'center',
    },
    headerTitle: {
      ...Typography.h4,
      color: colors.text,
      fontWeight: '600',
      marginLeft: Spacing.xs,
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
    modeLabel: {
      ...Typography.caption,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    clearLabel: {
      ...Typography.caption,
      color: colors.textSecondary,
      marginLeft: 4,
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
  });
}
