import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Platform, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';

import { usePlayer } from '../hooks/usePlayer';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import type { SongResult } from '../types';

interface LocalAudio {
  id: string;
  name: string;
  artist: string;
  uri: string;
  duration: number;
}

export default function LocalMusicScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { playSong } = usePlayer();
  const { playAll } = usePlaylist();

  const [loading, setLoading] = useState(true);
  const [audios, setAudios] = useState<LocalAudio[]>([]);

  const scanLocal = useCallback(async () => {
    setLoading(true);
    try {
      // 1. 请求权限
      let permResult: MediaLibrary.PermissionResponse;
      try {
        permResult = await MediaLibrary.requestPermissionsAsync();
      } catch {
        // "不再询问" 模式下可能直接抛异常
        permResult = { status: 'denied', granted: false, canAskAgain: false, expires: 'never' };
      }

      if (!permResult.granted) {
        Alert.alert(
          '需要媒体访问权限',
          '请在系统设置中允许媒体访问权限\n\n如果看不到相关选项，请先运行 npx expo run:android 重建 APK',
          [
            { text: '取消', style: 'cancel' },
            { text: '去设置', onPress: () => Linking.openSettings() },
          ],
        );
        setLoading(false);
        return;
      }

      // 2. 扫描系统媒体库
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: 'audio', first: 500,
      });

      if (assets.length > 0) {
        setAudios(assets.map((a) => ({
          id: a.id,
          name: a.filename.replace(/\.[^.]+$/, '') || '未知',
          artist: '本地音乐',
          uri: a.uri,
          duration: a.duration,
        })));
      } else {
        setAudios([]);
      }
    } catch {
      Alert.alert(
        '扫描失败',
        '请点击右上角刷新按钮重试，或将音乐文件放入 Music 文件夹',
        [
          { text: '确定' },
          { text: '去设置', onPress: () => Linking.openSettings() },
        ],
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { scanLocal(); }, [scanLocal]);

  const handlePlay = (audio: LocalAudio, idx: number) => {
    const songs: SongResult[] = audios.map((a) => ({
      id: a.id, name: a.name, ar: [{ name: a.artist, id: 0 }],
      al: { name: '本地音乐', id: 0, picUrl: '' }, dt: (a.duration || 0) * 1000,
      picUrl: '', duration: (a.duration || 0) * 1000, count: 0,
    }));
    playAll(songs, idx);
    playSong(songs[0]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.scanText, { color: colors.textSecondary }]}>正在扫描本地音乐...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>本地音乐</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={scanLocal}>
          <MaterialCommunityIcons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {audios.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="music-note-off" size={56} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>未找到本地音乐</Text>
          <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
            请点击刷新按钮重新扫描{'\n'}或手动将音乐文件放入 Music 文件夹
          </Text>
        </View>
      ) : (
        <FlatList
          data={audios}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={styles.item} onPress={() => handlePlay(item, index)} activeOpacity={0.7}>
              <View style={[styles.itemIcon, { backgroundColor: colors.primary + '20' }]}>
                <MaterialCommunityIcons name="music" size={22} color={colors.primary} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.itemArtist, { color: colors.textSecondary }]} numberOfLines={1}>{item.artist}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  scanText: { fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  refreshBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyText: { fontSize: 15 },
  emptyHint: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  itemIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { marginLeft: Spacing.md, flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemArtist: { fontSize: 12, marginTop: 2 },
});
