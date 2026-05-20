import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, type AVPlaybackStatus } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { getMvUrl, getMvDetail } from '../api/mv';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing } from '../theme/spacing';
import type { RootStackScreenProps } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function formatCount(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return String(n);
}

export default function MvPlayerScreen() {
  const route = useRoute<RootStackScreenProps<'MvPlayer'>['route']>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { id } = route.params;

  const videoRef = useRef<Video>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mvDetail, setMvDetail] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const toggleControls = useCallback(() => {
    if (showControls) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
    setShowControls(!showControls);
  }, [showControls, fadeAnim]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [urlRes, detailRes] = await Promise.all([
          getMvUrl(id), getMvDetail(String(id)),
        ]);
        if (cancelled) return;
        const u = urlRes?.data?.data?.url;
        if (u) setUrl(u);
        setMvDetail(detailRes?.data?.data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (error || !url) {
    return (
      <View style={[styles.center, { backgroundColor: '#000' }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.5)" />
        <Text style={styles.errorText}>加载失败</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Video */}
      <TouchableOpacity activeOpacity={1} onPress={toggleControls} style={styles.videoWrap}>
        <Video
          ref={videoRef}
          source={{ uri: url }}
          style={styles.video}
          resizeMode="contain"
          shouldPlay
          isLooping
          onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
            if (status.isLoaded) setIsPlaying(status.isPlaying);
          }}
        />
      </TouchableOpacity>

      {/* Controls overlay */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents={showControls ? 'auto' : 'none'}>
        <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.topGradient}>
          <TouchableOpacity style={[styles.backBtn, { marginTop: insets.top }]} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="chevron-down" size={26} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.bottomGradient}>
          <View style={[styles.infoRow, { paddingBottom: insets.bottom + 12 }]}>
            {mvDetail && (
              <>
                <Text style={styles.mvName} numberOfLines={1}>{mvDetail.name}</Text>
                <Text style={styles.mvArtist} numberOfLines={1}>
                  {mvDetail.artistName} · {formatCount(mvDetail.playCount || 0)} 播放
                </Text>
              </>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  errorText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, marginTop: 8 },
  retryBtn: { marginTop: 16, paddingHorizontal: 32, paddingVertical: 10, borderRadius: 22 },
  retryText: { color: '#fff', fontWeight: '600' },
  videoWrap: { flex: 1 },
  video: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topGradient: { paddingHorizontal: 16, paddingBottom: 40 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  bottomGradient: { paddingHorizontal: 20, paddingTop: 60 },
  infoRow: {},
  mvName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  mvArtist: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
});
