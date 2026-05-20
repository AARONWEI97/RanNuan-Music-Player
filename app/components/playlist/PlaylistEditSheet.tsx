import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { updatePlaylist, updatePlaylistName, updatePlaylistDesc } from '../../api/playlist';
import { showToast } from '../ui/Toast';

interface PlaylistEditSheetProps {
  visible: boolean;
  playlistId: number;
  initialName: string;
  initialDesc: string;
  onClose: () => void;
  onSaved: (name: string, desc: string) => void;
}

export default function PlaylistEditSheet({ visible, playlistId, initialName, initialDesc, onClose, onSaved }: PlaylistEditSheetProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDesc);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { showToast({ title: '歌单名称不能为空', type: 'warning' }); return; }
    setSaving(true);
    try {
      await updatePlaylist({ id: playlistId, name: name.trim(), desc: desc.trim() });
      showToast({ title: '已保存', type: 'success' });
      onSaved(name.trim(), desc.trim());
      onClose();
    } catch { showToast({ title: '保存失败', type: 'error' }); }
    setSaving(false);
  }, [name, desc, playlistId, onSaved, onClose]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.sheet, { backgroundColor: colors.card || (isDark ? '#1a1a2e' : '#fff'), paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>编辑歌单信息</Text>
                <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
              </View>
              <ScrollView style={styles.body} bounces={false}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>歌单名称</Text>
                <TextInput style={[styles.input, { color: colors.text, borderColor: colors.divider || 'rgba(128,128,128,0.2)', backgroundColor: colors.surfaceVariant || 'rgba(128,128,128,0.05)' }]} value={name} onChangeText={setName} maxLength={40} placeholder="输入歌单名称" placeholderTextColor={colors.textSecondary} />
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.md }]}>歌单描述</Text>
                <TextInput style={[styles.input, styles.descInput, { color: colors.text, borderColor: colors.divider || 'rgba(128,128,128,0.2)', backgroundColor: colors.surfaceVariant || 'rgba(128,128,128,0.05)' }]} value={desc} onChangeText={setDesc} maxLength={200} placeholder="输入歌单描述" placeholderTextColor={colors.textSecondary} multiline />
              </ScrollView>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: saving ? colors.primary + '80' : colors.primary }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>保存</Text>}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 17, fontWeight: '700' },
  body: { maxHeight: 300 },
  label: { fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: 15 },
  descInput: { height: 80, textAlignVertical: 'top', paddingTop: 10 },
  saveBtn: { marginTop: Spacing.xl, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
