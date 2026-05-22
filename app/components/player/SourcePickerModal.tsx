import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import { AVAILABLE_SOURCES, SourceConfigManager } from '../../services/SongSourceConfigManager';
import type { SongResult } from '../../types';

interface Props {
  visible: boolean;
  song: SongResult | null;
  onClose: () => void;
  onSelectSource: (source: string) => void;
}

export default function SourcePickerModal({ visible, song, onClose, onSelectSource }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [currentSource, setCurrentSource] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState<string | null>(null);

  useEffect(() => {
    if (visible && song) {
      SourceConfigManager.getConfig(song.id).then((config) => {
        setCurrentSource(config?.sources?.[0] || null);
      });
      setLoadingSource(null);
    }
  }, [visible, song?.id]);

  const handleSelect = async (sourceKey: string) => {
    if (!song) return;
    setLoadingSource(sourceKey);

    // 清除之前的手动配置和缓存
    await SourceConfigManager.clearConfig(song.id);
    // 设置新的音源配置
    await SourceConfigManager.setConfig(song.id, [sourceKey], 'manual');

    setCurrentSource(sourceKey);
    onSelectSource(sourceKey);
    setLoadingSource(null);
  };

  const handleClear = async () => {
    if (!song) return;
    await SourceConfigManager.clearConfig(song.id);
    setCurrentSource(null);
    Alert.alert('已清除', '将恢复使用全局默认音源');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>选择解析音源</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            当前歌曲：{song?.name || '未知'}
          </Text>

          {/* Source List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {AVAILABLE_SOURCES.map((src) => {
              const isActive = currentSource === src.key;
              const isLoading = loadingSource === src.key;
              return (
                <TouchableOpacity
                  key={src.key}
                  style={[
                    styles.sourceItem,
                    { borderBottomColor: colors.divider },
                    isActive && { backgroundColor: colors.primary + '14' },
                  ]}
                  onPress={() => handleSelect(src.key)}
                  activeOpacity={0.6}
                  disabled={!!loadingSource}
                >
                  <View style={[styles.sourceIcon, { backgroundColor: src.color + '20' }]}>
                    <MaterialCommunityIcons name={src.icon as any} size={20} color={src.color} />
                  </View>
                  <Text style={[styles.sourceLabel, { color: colors.text }]}>{src.label}</Text>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : isActive ? (
                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}

            {/* Clear */}
            {currentSource && (
              <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                <MaterialCommunityIcons name="backup-restore" size={16} color={colors.error || '#ef4444'} />
                <Text style={[styles.clearText, { color: colors.error || '#ef4444' }]}>
                  恢复全局默认音源
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      maxHeight: '70%',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
    },
    handle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: colors.textTertiary,
      alignSelf: 'center', marginBottom: Spacing.md,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    title: { ...Typography.h3, fontWeight: '700' },
    subtitle: { ...Typography.caption, marginBottom: Spacing.md },
    list: { maxHeight: 340 },
    sourceItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth,
      borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, marginBottom: 2,
    },
    sourceIcon: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
    },
    sourceLabel: { ...Typography.body2, fontWeight: '500', flex: 1 },
    clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, gap: 6 },
    clearText: { ...Typography.body2 },
  });
}
