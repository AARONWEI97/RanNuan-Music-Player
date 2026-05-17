import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getQrKey, createQr, checkQr, loginByCellphone, loginByUid } from '../api/login';
import { getUserAccount } from '../api/user';
import { useUserStore } from '../store/userStore';
import { TOKEN_KEY } from '../api/request';
import { LightColors } from '../theme/colors';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import type { RootStackScreenProps } from '../types';

type LoginMethod = 'qr' | 'phone' | 'uid';

const QR_POLL_INTERVAL = 3000;
const QR_EXPIRE_TIME = 300000;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackScreenProps<'Login'>['navigation']>();
  const setUser = useUserStore((s) => s.setUser);
  const setLoginType = useUserStore((s) => s.setLoginType);

  const [activeMethod, setActiveMethod] = useState<LoginMethod>('qr');
  const [loading, setLoading] = useState(false);

  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrKey, setQrKey] = useState('');
  const [qrStatus, setQrStatus] = useState<'loading' | 'waiting' | 'scanned' | 'expired'>('loading');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [uid, setUid] = useState('');

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    };
  }, []);

  const handleLoginSuccess = useCallback(async (cookie: string, type: 'qr' | 'phone' | 'uid') => {
    try {
      if (cookie) {
        await AsyncStorage.setItem(TOKEN_KEY, cookie);
      }

      const accountRes = await getUserAccount();
      const account = accountRes?.data?.account;
      const profile = accountRes?.data?.profile;

      if (profile) {
        setUser({
          userId: profile.userId || account?.id,
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
          backgroundUrl: profile.backgroundUrl,
          vipType: profile.vipType,
          profile,
          account,
        });
        setLoginType(type);
        navigation.goBack();
      } else {
        Alert.alert('登录失败', '获取用户信息失败，请重试');
      }
    } catch (e) {
      Alert.alert('登录失败', '获取用户信息失败，请重试');
    }
  }, [setUser, setLoginType, navigation]);

  const generateQrCode = useCallback(async () => {
    try {
      setQrStatus('loading');
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);

      const keyRes = await getQrKey();
      const unikey = keyRes?.data?.data?.unikey;
      if (!unikey) {
        setQrStatus('expired');
        return;
      }

      setQrKey(unikey);

      const qrRes = await createQr(unikey);
      const qrImg = qrRes?.data?.data?.qrimg;
      if (qrImg) {
        setQrCodeUrl(qrImg);
      }

      setQrStatus('waiting');

      expireTimerRef.current = setTimeout(() => {
        setQrStatus('expired');
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      }, QR_EXPIRE_TIME);

      pollTimerRef.current = setInterval(async () => {
        try {
          const checkRes = await checkQr(unikey);
          const code = checkRes?.data?.code;

          if (code === 803) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
            const cookie = checkRes?.data?.cookie || '';
            await handleLoginSuccess(cookie, 'qr');
          } else if (code === 802) {
            setQrStatus('scanned');
          } else if (code === 800) {
            setQrStatus('expired');
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          }
        } catch {}
      }, QR_POLL_INTERVAL);
    } catch {
      setQrStatus('expired');
    }
  }, [handleLoginSuccess]);

  useEffect(() => {
    if (activeMethod === 'qr') {
      generateQrCode();
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    }
  }, [activeMethod, generateQrCode]);

  const handlePhoneLogin = useCallback(async () => {
    if (!phone.trim()) {
      Alert.alert('提示', '请输入手机号');
      return;
    }
    if (!password.trim()) {
      Alert.alert('提示', '请输入密码');
      return;
    }

    setLoading(true);
    try {
      const res = await loginByCellphone(phone.trim(), password.trim());
      const code = res?.data?.code;

      if (code === 200) {
        const cookie = res?.data?.cookie || res?.headers?.['set-cookie']?.[0] || '';
        await handleLoginSuccess(cookie, 'phone');
      } else if (code === 502) {
        Alert.alert('登录失败', '手机号或密码错误');
      } else {
        Alert.alert('登录失败', res?.data?.message || '未知错误');
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 502) {
        Alert.alert('登录失败', '手机号或密码错误');
      } else {
        Alert.alert('登录失败', '网络错误，请重试');
      }
    } finally {
      setLoading(false);
    }
  }, [phone, password, handleLoginSuccess]);

  const handleUidLogin = useCallback(async () => {
    if (!uid.trim()) {
      Alert.alert('提示', '请输入 UID');
      return;
    }

    setLoading(true);
    try {
      const res = await loginByUid(uid.trim());
      const profile = res?.data?.profile;

      if (profile) {
        setUser({
          userId: profile.userId || uid,
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
          backgroundUrl: profile.backgroundUrl,
          vipType: profile.vipType,
          profile,
        });
        setLoginType('uid');
        navigation.goBack();
      } else {
        Alert.alert('登录失败', '未找到该用户');
      }
    } catch {
      Alert.alert('登录失败', 'UID 无效或网络错误');
    } finally {
      setLoading(false);
    }
  }, [uid, setUser, setLoginType, navigation]);

  const renderQrLogin = () => (
    <View style={styles.qrContainer}>
      <Text style={styles.qrTitle}>扫码登录</Text>
      <Text style={styles.qrSubtitle}>请使用网易云音乐 APP 扫描二维码登录</Text>

      <View style={styles.qrCodeWrapper}>
        {qrStatus === 'loading' && (
          <View style={styles.qrPlaceholder}>
            <ActivityIndicator size="large" color={LightColors.primary} />
          </View>
        )}
        {qrStatus === 'waiting' && qrCodeUrl ? (
          <Image source={{ uri: qrCodeUrl }} style={styles.qrCodeImage} resizeMode="contain" />
        ) : null}
        {qrStatus === 'scanned' && (
          <View style={styles.qrOverlay}>
            <Text style={styles.qrScannedIcon}>✓</Text>
            <Text style={styles.qrScannedText}>扫描成功</Text>
            <Text style={styles.qrScannedSubtext}>请在手机上确认登录</Text>
          </View>
        )}
        {qrStatus === 'expired' && (
          <View style={styles.qrOverlay}>
            <Text style={styles.qrExpiredIcon}>⟳</Text>
            <Text style={styles.qrExpiredText}>二维码已过期</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={generateQrCode}>
              <Text style={styles.refreshButtonText}>点击刷新</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.qrSteps}>
        <Text style={styles.qrStep}>1. 打开网易云音乐 APP</Text>
        <Text style={styles.qrStep}>2. 点击左上角「☰」菜单</Text>
        <Text style={styles.qrStep}>3. 点击「扫一扫」扫描二维码</Text>
      </View>
    </View>
  );

  const renderPhoneLogin = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>手机号登录</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>手机号</Text>
        <TextInput
          style={styles.input}
          placeholder="请输入手机号"
          placeholderTextColor={LightColors.textTertiary}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={11}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>密码</Text>
        <TextInput
          style={styles.input}
          placeholder="请输入密码"
          placeholderTextColor={LightColors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handlePhoneLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.submitButtonText}>登录</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderUidLogin = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>UID 登录</Text>
      <Text style={styles.formSubtitle}>输入网易云音乐用户 ID 快速登录</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>用户 UID</Text>
        <TextInput
          style={styles.input}
          placeholder="请输入 UID"
          placeholderTextColor={LightColors.textTertiary}
          value={uid}
          onChangeText={setUid}
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleUidLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.submitButtonText}>登录</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const LOGIN_METHODS: { key: LoginMethod; label: string }[] = [
    { key: 'qr', label: '扫码登录' },
    { key: 'phone', label: '手机号' },
    { key: 'uid', label: 'UID' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.appName}>Alger Music</Text>
          <Text style={styles.appSlogan}>登录网易云音乐账号</Text>
        </View>

        <View style={styles.methodTabs}>
          {LOGIN_METHODS.map((method) => (
            <TouchableOpacity
              key={method.key}
              style={[styles.methodTab, activeMethod === method.key && styles.methodTabActive]}
              onPress={() => setActiveMethod(method.key)}
            >
              <Text style={[styles.methodTabText, activeMethod === method.key && styles.methodTabTextActive]}>
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeMethod === 'qr' && renderQrLogin()}
        {activeMethod === 'phone' && renderPhoneLogin()}
        {activeMethod === 'uid' && renderUidLogin()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightColors.background,
  },
  scrollView: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: Spacing.lg,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LightColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: LightColors.textSecondary,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  appName: {
    ...Typography.h2,
    color: LightColors.primary,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  appSlogan: {
    ...Typography.body2,
    color: LightColors.textSecondary,
  },
  methodTabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    backgroundColor: LightColors.surface,
    borderRadius: BorderRadius.xxl,
    padding: 3,
  },
  methodTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.xxl,
  },
  methodTabActive: {
    backgroundColor: LightColors.primary,
  },
  methodTabText: {
    ...Typography.caption,
    color: LightColors.textSecondary,
    fontWeight: '500',
  },
  methodTabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  qrTitle: {
    ...Typography.h3,
    color: LightColors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  qrSubtitle: {
    ...Typography.body2,
    color: LightColors.textSecondary,
    marginBottom: Spacing.xl,
  },
  qrCodeWrapper: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.lg,
    backgroundColor: LightColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: LightColors.border,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeImage: {
    width: 200,
    height: 200,
  },
  qrOverlay: {
    width: 200,
    height: 200,
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrScannedIcon: {
    fontSize: 40,
    color: LightColors.success,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  qrScannedText: {
    ...Typography.body2,
    color: LightColors.success,
    fontWeight: '600',
  },
  qrScannedSubtext: {
    ...Typography.caption,
    color: LightColors.textSecondary,
    marginTop: Spacing.xs,
  },
  qrExpiredIcon: {
    fontSize: 40,
    color: LightColors.textTertiary,
    marginBottom: Spacing.sm,
  },
  qrExpiredText: {
    ...Typography.body2,
    color: LightColors.textTertiary,
    marginBottom: Spacing.md,
  },
  refreshButton: {
    backgroundColor: LightColors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xxl,
  },
  refreshButtonText: {
    ...Typography.caption,
    color: '#ffffff',
    fontWeight: '600',
  },
  qrSteps: {
    width: '100%',
    backgroundColor: LightColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  qrStep: {
    ...Typography.body2,
    color: LightColors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  formContainer: {
    paddingHorizontal: Spacing.lg,
  },
  formTitle: {
    ...Typography.h3,
    color: LightColors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  formSubtitle: {
    ...Typography.body2,
    color: LightColors.textSecondary,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.caption,
    color: LightColors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  input: {
    backgroundColor: LightColors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.body2,
    color: LightColors.text,
  },
  submitButton: {
    backgroundColor: LightColors.primary,
    borderRadius: BorderRadius.xxl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    height: 48,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...Typography.body2,
    color: '#ffffff',
    fontWeight: '600',
  },
});
