import React, { useCallback, useRef } from 'react';
import { FlatList, StyleSheet, ViewStyle, RefreshControlProps } from 'react-native';
import { SongResult } from '../../types';
import SongItem from './SongItem';

interface SongListProps {
  songs: SongResult[];
  onSongPress?: (song: SongResult, index: number) => void;
  onSongMorePress?: (song: SongResult, index: number) => void;
  currentSongId?: string | number;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  contentContainerStyle?: ViewStyle;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

const ITEM_HEIGHT = 64;

export default function SongList({
  songs,
  onSongPress,
  onSongMorePress,
  currentSongId,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
  refreshControl,
}: SongListProps) {
  // ★ 用 ref 持有回调引用，避免 renderItem 依赖回调变化导致全量重渲染
  const onSongPressRef = useRef(onSongPress);
  const onSongMorePressRef = useRef(onSongMorePress);
  onSongPressRef.current = onSongPress;
  onSongMorePressRef.current = onSongMorePress;

  const renderItem = useCallback(
    ({ item, index }: { item: SongResult; index: number }) => (
      <SongItem
        song={item}
        index={index}
        isActive={currentSongId !== undefined && item.id === currentSongId}
        onPress={() => onSongPressRef.current?.(item, index)}
        onMorePress={() => onSongMorePressRef.current?.(item, index)}
      />
    ),
    [currentSongId] // ★ 只依赖 currentSongId，不依赖回调函数
  );

  const keyExtractor = useCallback((item: SongResult) => String(item.id), []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <FlatList
      data={songs}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={contentContainerStyle}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      initialNumToRender={12}
      windowSize={5}
      updateCellsBatchingPeriod={100}
      keyboardShouldPersistTaps="handled"
    />
  );
}
