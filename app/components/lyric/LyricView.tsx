import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

import LyricLine from './LyricLine';
import type { MusicILyric } from '../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = 56;
const SCROLL_THRESHOLD = 5000;

interface LyricViewProps {
  lyric: MusicILyric | null;
  currentLineIndex: number;
  currentTimeMs: number;
  fontSize: number;
  showTranslation: boolean;
  isLoading: boolean;
  onSeekTo: (timeMs: number) => void;
  onOverscrollTop?: () => void;
  bottomOffset?: number;
  topOffset?: number;
}

export default function LyricView({
  lyric,
  currentLineIndex,
  currentTimeMs,
  fontSize,
  showTranslation,
  isLoading,
  onSeekTo,
  onOverscrollTop,
  bottomOffset = 0,
  topOffset = 0,
}: LyricViewProps) {
  const flatListRef = useRef<FlatList>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lines = useMemo(() => lyric?.lrcArray || [], [lyric]);

  useEffect(() => {
    if (isUserScrollingRef.current) return;
    if (currentLineIndex < 0 || !flatListRef.current) return;

    flatListRef.current.scrollToIndex({
      index: currentLineIndex,
      animated: true,
      viewPosition: 0.5,
    });
  }, [currentLineIndex]);

  const handleScrollBeginDrag = useCallback(() => {
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  }, []);

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, velocity } = e.nativeEvent;
      // Detect overscroll at top: user is at/past the top and swiping down
      if (
        onOverscrollTop &&
        contentOffset.y <= 0 &&
        velocity &&
        velocity.y > 0.6
      ) {
        onOverscrollTop();
        return;
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, SCROLL_THRESHOLD);
    },
    [onOverscrollTop]
  );

  const handleLinePress = useCallback(
    (startTimeMs: number) => {
      const timeSec = startTimeMs / 1000;
      onSeekTo(timeSec);
    },
    [onSeekTo]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof lines)[0]; index: number }) => (
      <View style={styles.itemContainer}>
        <LyricLine
          data={item}
          isActive={index === currentLineIndex}
          currentTimeMs={currentTimeMs}
          fontSize={fontSize}
          showTranslation={showTranslation}
          onPress={handleLinePress}
        />
      </View>
    ),
    [currentLineIndex, currentTimeMs, fontSize, showTranslation, handleLinePress]
  );

  const keyExtractor = useCallback((_: any, index: number) => String(index), []);

  const scrollContentStyle = useMemo(
    () => [
      styles.scrollContent,
      {
        paddingTop: SCREEN_HEIGHT * 0.18 + topOffset,
        paddingBottom: SCREEN_HEIGHT * 0.3 + bottomOffset,
      },
    ],
    [bottomOffset, topOffset]
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>歌词加载中...</Text>
      </View>
    );
  }

  if (!lyric || lines.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>暂无歌词</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={lines}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      onMomentumScrollEnd={handleScrollEndDrag}
      contentContainerStyle={scrollContentStyle}
      initialScrollIndex={currentLineIndex > 0 ? currentLineIndex : 0}
      onScrollToIndexFailed={(info) => {
        const wait = new Promise((resolve) => setTimeout(resolve, 100));
        wait.then(() => {
          flatListRef.current?.scrollToIndex({
            index: info.index,
            animated: true,
          });
        });
      }}
    />
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: SCREEN_HEIGHT * 0.3,
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 16,
  },
});
