import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useUserStore } from '../store/userStore';
import { updateUserInfo, uploadAvatar } from '../api/user';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import type { RootStackScreenProps } from '../types';

const GENDER_OPTIONS = [
  { label: '保密', value: 0, icon: 'help-circle-outline' as const },
  { label: '男', value: 1, icon: 'gender-male' as const },
  { label: '女', value: 2, icon: 'gender-female' as const },
];

export default function EditProfileScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackScreenProps<'EditProfile'>['navigation']>();
  const user = useUserStore((s) => s.user);
  const profile = (user as any)?.profile || user;

  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [signature, setSignature] = useState(profile?.signature || '');
  const [gender, setGender] = useState(profile?.gender ?? 0);
  const [birthdayStr, setBirthdayStr] = useState(
    profile?.birthday ? new Date(profile.birthday).toISOString().slice(0, 10) : ''
  );
  const [provinceId, setProvinceId] = useState(String(profile?.province || ''));
  const [cityId, setCityId] = useState(String(profile?.city || ''));
  const [saving, setSaving] = useState(false);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const avatarUrl = avatarUri || profile?.avatarUrl || user?.avatarUrl;

  const hasChanges = useMemo(() => {
    return nickname !== (profile?.nickname || '')
      || signature !== (profile?.signature || '')
      || gender !== (profile?.gender ?? 0)
      || birthdayStr !== (profile?.birthday ? new Date(profile.birthday).toISOString().slice(0, 10) : '')
      || provinceId !== String(profile?.province || '')
      || cityId !== String(profile?.city || '');
  }, [nickname, signature, gender, birthdayStr, provinceId, cityId, profile]);

  const handleSave = useCallback(async () => {
    Keyboard.dismiss();
    if (!nickname.trim()) {
      Alert.alert('提示', '昵称不能为空');
      return;
    }
    setSaving(true);
    try {
      const params: any = {};
      if (nickname !== (profile?.nickname || '')) params.nickname = nickname.trim();
      if (signature !== (profile?.signature || '')) params.signature = signature.trim();
      if (gender !== (profile?.gender ?? 0)) params.gender = gender;
      if (birthdayStr) {
        const ts = new Date(birthdayStr).getTime();
        if (!isNaN(ts)) params.birthday = ts;
      }
      const prov = parseInt(provinceId, 10);
      const city = parseInt(cityId, 10);
      if (!isNaN(prov)) params.province = prov;
      if (!isNaN(city)) params.city = city;

      const res = await updateUserInfo(params);
      if (res?.data?.code === 200) {
        Alert.alert('提示', '资料已更新', [
          { text: '确定', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('错误', res?.data?.message || '更新失败');
      }
    } catch {
      Alert.alert('错误', '网络请求失败，请重试');
    } finally {
      setSaving(false);
    }
  }, [nickname, signature, gender, birthdayStr, provinceId, cityId, profile, navigation]);

  const handleAvatarPress = useCallback(async () => {
    if (uploading) return;

    // Dynamic import — native module only available after rebuild
    let ImagePicker: any;
    try {
      ImagePicker = require('expo-image-picker');
    } catch {
      Alert.alert(
        '需要重新构建',
        '头像上传功能需要重新构建 APK。\n请运行 npx expo run:android',
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('提示', '需要相册权限才能更换头像');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);

      // Auto-upload
      setUploading(true);
      try {
        const res = await uploadAvatar(uri, 300);
        if (res?.data?.code === 200) {
          Alert.alert('提示', '头像更新成功');
        } else {
          Alert.alert('提示', '头像已选择，保存资料时会同步更新');
        }
      } catch {
        Alert.alert('提示', '头像已选择，但因网络问题未能上传，保存资料时重试');
      } finally {
        setUploading(false);
      }
    }
  }, [uploading]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>编辑资料</Text>
        <TouchableOpacity
          style={[styles.saveBtn, hasChanges && { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={[styles.saveText, hasChanges && { color: '#ffffff' }]}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 106 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarSection} onPress={handleAvatarPress} disabled={uploading}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <MaterialCommunityIcons name="account" size={44} color={colors.textTertiary} />
            </View>
          )}
          <View style={[styles.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
            {uploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <MaterialCommunityIcons name="camera-plus-outline" size={22} color="#ffffff" />
            )}
            <Text style={styles.avatarOverlayText}>
              {uploading ? '上传中...' : '更换头像'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Nickname */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>昵称</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.text }]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="请输入昵称"
            placeholderTextColor={colors.textTertiary}
            maxLength={30}
          />
        </View>

        {/* Signature */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>签名</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.text }]}
            value={signature}
            onChangeText={setSignature}
            placeholder="请输入个性签名"
            placeholderTextColor={colors.textTertiary}
            maxLength={140}
          />
        </View>

        {/* Gender */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>性别</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.genderOption,
                  gender === opt.value && { backgroundColor: colors.primary + '22', borderColor: colors.primary },
                  { borderColor: colors.divider },
                ]}
                onPress={() => setGender(opt.value)}
              >
                <MaterialCommunityIcons
                  name={opt.icon}
                  size={18}
                  color={gender === opt.value ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.genderLabel,
                    { color: gender === opt.value ? colors.primary : colors.text },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Birthday */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>生日</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.text }]}
            value={birthdayStr}
            onChangeText={setBirthdayStr}
            placeholder="1990-01-01"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </View>

        {/* Province */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>省份 ID</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.text }]}
            value={provinceId}
            onChangeText={setProvinceId}
            placeholder="省份代码（如 440000=广东）"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />
        </View>

        {/* City */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>城市 ID</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.text }]}
            value={cityId}
            onChangeText={setCityId}
            placeholder="城市代码（如 440300=深圳）"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.sm,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    title: { ...Typography.h3, fontWeight: '700', flex: 1, textAlign: 'center' },
    saveBtn: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.xxl,
      backgroundColor: colors.surfaceVariant,
    },
    saveText: { ...Typography.body2, color: colors.textTertiary, fontWeight: '600' },
    body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
    avatarSection: {
      alignSelf: 'center',
      marginBottom: Spacing.xxl,
    },
    avatar: { width: 88, height: 88, borderRadius: 44 },
    avatarPlaceholder: {
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarOverlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      borderRadius: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarOverlayText: {
      ...Typography.overline,
      color: '#ffffff',
      marginTop: 2,
      fontSize: 10,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    fieldLabel: { ...Typography.body2, width: 60 },
    fieldInput: {
      flex: 1,
      ...Typography.body2,
      paddingVertical: 0,
      textAlign: 'right',
    },
    genderRow: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    genderOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.xxl,
      borderWidth: 1,
    },
    genderLabel: {
      ...Typography.caption,
      marginLeft: 4,
      fontWeight: '500',
    },
  });
}
