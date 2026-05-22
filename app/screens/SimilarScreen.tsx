import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getSimiSong, getSimiPlaylist, getSimiMv, getSimiArtist, getSimiUser } from '../api/simi';
import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { formatPlayCount } from '../utils/format';
import type { RootStackParamList, RootStackScreenProps, SongResult } from '../types';
import NetworkImage from '../components/common/NetworkImage';

type SimilarRouteProp = RouteProp<RootStackParamList, 'Similar'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - 56) / 3;

const TYPE_META: Record<string, { title: string; icon: string }> = {
  song:    { title: '相似歌曲',    icon: 'music-note' },
  playlist:{ title: '相似歌单',    icon: 'playlist-music' },
  mv:      { title: '相似 MV',     icon: 'filmstrip' },
  artist:  { title: '相似歌手',    icon: 'account-music' },
  user:    { title: '听过的人',    icon: 'account-group' },
};

export default function SimilarScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackScreenProps<'Similar'>['navigation']>();
  const route = useRoute<SimilarRouteProp>();
  const { id, type } = route.params;
  const { playSong } = usePlayer();
  const { playAll } = usePlaylist();

  const meta = TYPE_META[type] || { title: '相似推荐', icon: 'shape' };

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let res: any;
        switch (type) {
          case 'song':    res = await getSimiSong(id); break;
          case 'playlist':res = await getSimiPlaylist(id); break;
          case 'mv':      res = await getSimiMv(id); break;
          case 'artist':  res = await getSimiArtist(id); break;
          case 'user':    res = await getSimiUser(id); break;
          default:        res = null;
        }
        const list = res?.data?.songs
          || res?.data?.playlists
          || res?.data?.mvs
          || res?.data?.artists
          || res?.data?.userprofiles
          || res?.data
          || [];
        setData(Array.isArray(list) ? list : []);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, type]);

  const handleSongPress = useCallback((song: SongResult, idx: number) => {
    const songs = data.map(mapToSongResult);
    playAll(songs, idx);
    playSong(songs[0]);
  }, [data, playAll, playSong]);

  const renderSongItem = ({ item, index }: { item: any; index: number }) => {
    const song = mapToSongResult(item);
    return (
      <TouchableOpacity style={[styles.rowItem, { borderBottomColor: colors.divider }]} onPress={() => handleSongPress(song, index)}>
        <NetworkImage uri={item.album?.picUrl || item.al?.picUrl || ''} style={styles.rowCover} />
        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.artists?.[0]?.name || item.ar?.[0]?.name || '未知歌手'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  const renderPlaylistCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PlaylistDetail', { id: item.id })}>
      <NetworkImage uri={item.coverImgUrl} style={styles.cardCover} />
      <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
      <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
        {item.playCount > 0 ? formatPlayCount(item.playCount) : ''}
      </Text>
    </TouchableOpacity>
  );

  const renderMvCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('MvPlayer', { id: item.id })}>
      <NetworkImage uri={item.cover || item.coverUrl || ''} style={styles.cardCover} />
      <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
      <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
        {item.artistName || item.artist?.name || ''}
      </Text>
    </TouchableOpacity>
  );

  const renderArtistCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ArtistDetail', { id: item.id })}>
      <NetworkImage uri={item.picUrl || item.img1v1Url || ''} style={styles.artistAvatar} />
      <Text style={[styles.cardName, { color: colors.text, textAlign: 'center' }]} numberOfLines={2}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderUserCard = ({ item }: { item: any }) => (
    <View style={[styles.rowItem, { borderBottomColor: colors.divider }]}>
      <NetworkImage uri={item.avatarUrl} style={styles.userAvatar} />
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{item.nickname}</Text>
        <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
          {item.signature || ''}
        </Text>
      </View>
    </View>
  );

  const isGrid = type === 'playlist' || type === 'mv' || type === 'artist';

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <MaterialCommunityIcons name={meta.icon as any} size={18} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.title, { color: colors.text }]}>{meta.title}</Text>
        <View style={{ width: 40 }} />
      </View>
      {data.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="shape-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无相似推荐</Text>
        </View>
      ) : isGrid ? (
        <FlatList
          data={data}
          keyExtractor={(item, i) => String(item.id || i)}
          renderItem={type === 'mv' ? renderMvCard : type === 'artist' ? renderArtistCard : renderPlaylistCard}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 106 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, i) => String(item.id || i)}
          renderItem={type === 'user' ? renderUserCard : renderSongItem}
          contentContainerStyle={{ paddingBottom: 106 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function mapToSongResult(item: any): SongResult {
  return {
    id: item.id,
    name: item.name || '未知',
    ar: (item.artists || item.ar || []).map((a: any) => ({ id: a.id, name: a.name })),
    al: item.album || item.al || { id: 0, name: '', picUrl: '' },
    dt: item.duration || item.dt || 0,
    picUrl: item.album?.picUrl || item.al?.picUrl || '',
    duration: item.duration || item.dt || 0,
    count: 0,
  };
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    title: { ...Typography.h3, fontWeight: '700' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyText: { ...Typography.body2 },

    // Row items (songs / users)
    rowItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
    rowCover: { width: 48, height: 48, borderRadius: BorderRadius.sm, backgroundColor: colors.surfaceVariant },
    rowInfo: { flex: 1, marginLeft: Spacing.md },
    rowName: { ...Typography.body2, fontWeight: '500' },
    rowSub: { ...Typography.caption, marginTop: 2 },

    // Grid cards (playlists / MVs / artists)
    gridRow: { marginBottom: Spacing.md },
    card: { width: CARD_SIZE, marginHorizontal: Spacing.xs },
    cardCover: { width: CARD_SIZE - 8, height: CARD_SIZE - 8, borderRadius: BorderRadius.md, backgroundColor: colors.surfaceVariant },
    cardName: { ...Typography.caption, marginTop: Spacing.xs, lineHeight: 16 },
    cardSub: { ...Typography.overline, marginTop: 2 },
    artistAvatar: { width: CARD_SIZE - 8, height: CARD_SIZE - 8, borderRadius: (CARD_SIZE - 8) / 2, backgroundColor: colors.surfaceVariant, alignSelf: 'center' },

    // User
    userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceVariant },
  });
}
