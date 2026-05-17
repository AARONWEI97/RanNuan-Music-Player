import React, { useCallback } from 'react';
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
  const renderItem = useCallback(
    ({ item, index }: { item: SongResult; index: number }) => (
      <SongItem
        song={item}
        index={index}
        isActive={currentSongId !== undefined && item.id === currentSongId}
        onPress={() => onSongPress?.(item, index)}
        onMorePress={() => onSongMorePress?.(item, index)}
      />
    ),
    [currentSongId, onSongPress, onSongMorePress]
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
      maxToRenderPerBatch={20}
      initialNumToRender={15}
      windowSize={10}
    />
  );
}
