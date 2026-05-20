import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import type { SongResult } from '../../types';

export interface SongActionItem {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  destructive?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

interface SongActionSheetProps {
  visible: boolean;
  song: SongResult | null;
  actions: SongActionItem[];
  onClose: () => void;
}

export default function SongActionSheet({ visible, song, actions, onClose }: SongActionSheetProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useRef(createStyles(colors, isDark)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShow(false));
    }
  }, [visible]);

  const artistName = song?.ar?.map((a: any) => a.name).join(' / ') || '未知歌手';
  const coverUrl = song?.picUrl || song?.al?.picUrl || '';

  if (!show) return null;

  // ★ Bottom inset: for devices with gesture navigation bar (non-fullscreen),
  // add extra padding so the cancel button isn't hidden behind the nav bar
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 16);

  return (
    <Modal transparent visible={show} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheet,
                {
                  paddingBottom: bottomPadding,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [400, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* ── Drag Handle ── */}
              <View style={styles.dragHandle}>
                <View style={styles.dragHandleBar} />
              </View>

              {/* ── Song Header with Cover ── */}
              {song && (
                <View style={styles.songHeader}>
                  <Image
                    source={{ uri: coverUrl }}
                    style={styles.songCover}
                    resizeMode="cover"
                  />
                  <View style={styles.songInfo}>
                    <Text style={styles.songName} numberOfLines={1}>
                      {song.name}
                    </Text>
                    <Text style={styles.songArtist} numberOfLines={1}>
                      {artistName}
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Actions ── */}
              <ScrollView style={styles.actionsScroll} bounces={false} showsVerticalScrollIndicator={false}>
                {actions.map((action, idx) => (
                  <TouchableOpacity
                    key={action.key}
                    style={[styles.actionItem, idx === actions.length - 1 && styles.actionItemLast]}
                    onPress={action.onPress}
                    activeOpacity={0.6}
                    disabled={action.loading || action.disabled}
                  >
                    {action.loading ? (
                      <ActivityIndicator
                        size="small"
                        color={action.destructive ? colors.error : colors.primary}
                        style={styles.actionIcon}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name={action.icon}
                        size={22}
                        color={action.destructive ? colors.error : colors.text}
                        style={styles.actionIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.actionLabel,
                        action.destructive && { color: colors.error },
                        (action.disabled || action.loading) && { opacity: 0.4 },
                      ]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* ── Separator ── */}
              <View style={styles.separator} />

              {/* ── Cancel ── */}
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.6}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card || (isDark ? '#1a1a2e' : '#ffffff'),
      borderTopLeftRadius: BorderRadius.xxl,
      borderTopRightRadius: BorderRadius.xxl,
      maxHeight: '72%',
    },
    dragHandle: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 4,
    },
    dragHandleBar: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.divider || 'rgba(128,128,128,0.25)',
    },
    songHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider || 'rgba(128,128,128,0.15)',
    },
    songCover: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.surfaceVariant || 'rgba(128,128,128,0.15)',
    },
    songInfo: {
      marginLeft: Spacing.md,
      flex: 1,
    },
    songName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    songArtist: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actionsScroll: {
      maxHeight: 280,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: Spacing.xl,
    },
    actionItemLast: {
      paddingBottom: 0,
    },
    actionIcon: {
      width: 28,
      textAlign: 'center',
      marginRight: Spacing.md,
    },
    actionLabel: {
      fontSize: 15,
      color: colors.text,
    },
    separator: {
      height: 6,
      backgroundColor: colors.divider || 'rgba(128,128,128,0.08)',
      marginVertical: Spacing.sm,
    },
    cancelBtn: {
      marginHorizontal: Spacing.lg,
      paddingVertical: 14,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.surfaceVariant || 'rgba(128,128,128,0.08)',
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
