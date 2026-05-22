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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getQrKey, createQr, checkQr, loginByCellphone, loginByCaptcha, loginByEmail, loginByUid, registerAnonymous, sendCaptcha } from '../api/login';
import { getUserAccount } from '../api/user';
import { useUserStore } from '../store/userStore';
import { TOKEN_KEY } from '../api/request';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import type { RootStackScreenProps } from '../types';

type LoginMethod = 'qr' | 'phone' | 'email' | 'uid' | 'cookie';

const QR_POLL_INTERVAL = 3000;
const QR_EXPIRE_TIME = 300000;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackScreenProps<'Login'>['navigation']>();
  const { colors } = useAppTheme();
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
  const [loginMode, setLoginMode] = useState<'password' | 'captcha'>('password');
  const [captcha, setCaptcha] = useState('');
  const [captchaSending, setCaptchaSending] = useState(false);
  const [captchaCountdown, setCaptchaCountdown] = useState(0);

  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  const [uid, setUid] = useState('');

  const [cookie, setCookie] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    };
  }, []);

  // 验证码倒计时
  useEffect(() => {
    if (captchaCountdown <= 0) return;
    const timer = setInterval(() => {
      setCaptchaCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [captchaCountdown]);

  const handleSendCaptcha = useCallback(async () => {
    if (!phone.trim() || phone.trim().length < 11) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }
    setCaptchaSending(true);
    try {
      await sendCaptcha(phone.trim());
      setCaptchaCountdown(60);
    } catch {
      Alert.alert('提示', '发送验证码失败，请稍后重试');
    } finally {
      setCaptchaSending(false);
    }
  }, [phone]);

  const handleLoginSuccess = useCallback(async (cookieStr: string, type: 'qr' | 'phone' | 'uid' | 'cookie') => {
    try {
      if (cookieStr) {
        await AsyncStorage.setItem(TOKEN_KEY, cookieStr);
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
            const ck = checkRes?.data?.cookie || '';
            await handleLoginSuccess(ck, 'qr');
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
    if (loginMode === 'captcha' && !captcha.trim()) {
      Alert.alert('提示', '请输入验证码');
      return;
    }
    if (loginMode === 'password' && !password.trim()) {
      Alert.alert('提示', '请输入密码');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (loginMode === 'captcha') {
        res = await loginByCaptcha(phone.trim(), captcha.trim());
      } else {
        res = await loginByCellphone(phone.trim(), password.trim());
      }
      const code = res?.data?.code;

      if (code === 200) {
        const ck = res?.data?.cookie || res?.headers?.['set-cookie']?.[0] || '';
        await handleLoginSuccess(ck, 'phone');
      } else if (code === 502) {
        Alert.alert('登录失败', loginMode === 'captcha' ? '验证码错误' : '手机号或密码错误');
      } else {
        Alert.alert('登录失败', res?.data?.message || '未知错误');
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 502) {
        Alert.alert('登录失败', loginMode === 'captcha' ? '验证码错误' : '手机号或密码错误');
      } else {
        Alert.alert('登录失败', '网络错误，请重试');
      }
    } finally {
      setLoading(false);
    }
  }, [phone, password, captcha, loginMode, handleLoginSuccess]);

  // 邮箱登录
  const handleEmailLogin = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('提示', '请输入邮箱');
      return;
    }
    if (!emailPassword.trim()) {
      Alert.alert('提示', '请输入密码');
      return;
    }

    setLoading(true);
    try {
      const res = await loginByEmail(email.trim(), emailPassword.trim());
      const code = res?.data?.code;

      if (code === 200) {
        const ck = res?.data?.cookie || res?.headers?.['set-cookie']?.[0] || '';
        await handleLoginSuccess(ck, 'phone');
      } else {
        Alert.alert('登录失败', res?.data?.message || '邮箱或密码错误');
      }
    } catch {
      Alert.alert('登录失败', '网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [email, emailPassword, handleLoginSuccess]);

  // 游客登录
  const handleGuestLogin = useCallback(async () => {
    setGuestLoading(true);
    try {
      const res = await registerAnonymous();
      const cookie = res?.data?.cookie || res?.headers?.['set-cookie']?.[0] || '';

      if (cookie) {
        await AsyncStorage.setItem(TOKEN_KEY, cookie);

        const accountRes = await getUserAccount();
        const profile = accountRes?.data?.profile;
        const account = accountRes?.data?.account;

        if (profile) {
          setUser({
            userId: profile.userId || account?.id,
            nickname: profile.nickname || '游客',
            avatarUrl: profile.avatarUrl,
            backgroundUrl: profile.backgroundUrl,
            vipType: profile.vipType,
            profile,
            account,
          });
          setLoginType('guest');
          Alert.alert('提示', '游客登录成功，部分功能可能需要正式登录才能使用');
          navigation.goBack();
        } else {
          // 游客没有 profile，使用基础信息
          setUser({
            userId: account?.id || 0,
            nickname: account?.userName || '游客',
            avatarUrl: '',
            backgroundUrl: '',
            vipType: 0,
          });
          setLoginType('guest');
          Alert.alert('提示', '游客模式已开启，部分功能受限');
          navigation.goBack();
        }
      } else {
        Alert.alert('提示', '游客登录失败，请重试');
      }
    } catch {
      Alert.alert('提示', '游客登录失败，请检查网络');
    } finally {
      setGuestLoading(false);
    }
  }, [setUser, setLoginType, navigation]);

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
        await AsyncStorage.setItem(TOKEN_KEY, `uid:${uid.trim()}`);
        setUser({
          userId: profile.userId || uid,
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
          backgroundUrl: profile.backgroundUrl,
          vipType: profile.vipType,
          profile,
        });
        setLoginType('uid');
        Alert.alert(
          '提示',
          'UID 登录仅可查看公开信息，无法使用每日推荐、听歌排行等需要登录权限的功能。如需完整功能，请使用扫码或手机号登录。',
        );
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

  const handleCookieLogin = useCallback(async () => {
    if (!cookie.trim()) {
      Alert.alert('提示', '请输入 Cookie');
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem(TOKEN_KEY, cookie.trim());
      const accountRes = await getUserAccount();
      const profile = accountRes?.data?.profile;

      if (profile) {
        setUser({
          userId: profile.userId || accountRes?.data?.account?.id,
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
          backgroundUrl: profile.backgroundUrl,
          vipType: profile.vipType,
          profile,
          account: accountRes?.data?.account,
        });
        setLoginType('cookie');
        navigation.goBack();
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
        Alert.alert('登录失败', 'Cookie 无效或已过期');
      }
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY);
      Alert.alert('登录失败', 'Cookie 验证失败，请检查格式');
    } finally {
      setLoading(false);
    }
  }, [cookie, setUser, setLoginType, navigation]);

  // ─── Render Methods ───

  const renderQrLogin = () => (
    <View style={styles.methodContent}>
      <Text style={[styles.methodTitle, { color: '#ffffff' }]}>扫码登录</Text>
      <Text style={styles.methodSubtitle}>请使用网易云音乐 APP 扫描二维码</Text>

      <View style={styles.qrCodeWrapper}>
        {qrStatus === 'loading' && (
          <View style={styles.qrPlaceholder}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
        {qrStatus === 'waiting' && qrCodeUrl ? (
          <Image source={{ uri: qrCodeUrl }} style={styles.qrCodeImage} resizeMode="contain" />
        ) : null}
        {qrStatus === 'scanned' && (
          <View style={[styles.qrOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <MaterialCommunityIcons name="check-circle" size={48} color="#4ade80" />
            <Text style={styles.qrScannedText}>扫描成功</Text>
            <Text style={styles.qrScannedSubtext}>请在手机上确认登录</Text>
          </View>
        )}
        {qrStatus === 'expired' && (
          <View style={[styles.qrOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <MaterialCommunityIcons name="refresh" size={48} color="rgba(255,255,255,0.5)" />
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
    <View style={styles.methodContent}>
      <Text style={[styles.methodTitle, { color: '#ffffff' }]}>手机号登录</Text>
      <Text style={styles.methodSubtitle}>使用手机号和密码登录，或使用验证码快捷登录</Text>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconWrap}>
          <MaterialCommunityIcons name="cellphone" size={18} color="rgba(255,255,255,0.5)" />
        </View>
        <TextInput
          style={styles.loginInput}
          placeholder="请输入手机号"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={11}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* 密码/验证码 切换 */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeTab, loginMode === 'password' && styles.modeTabActive]}
          onPress={() => setLoginMode('password')}
        >
          <Text style={[styles.modeTabText, loginMode === 'password' && styles.modeTabTextActive]}>密码登录</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, loginMode === 'captcha' && styles.modeTabActive]}
          onPress={() => setLoginMode('captcha')}
        >
          <Text style={[styles.modeTabText, loginMode === 'captcha' && styles.modeTabTextActive]}>验证码登录</Text>
        </TouchableOpacity>
      </View>

      {loginMode === 'password' ? (
        <View style={styles.inputGroup}>
          <View style={styles.inputIconWrap}>
            <MaterialCommunityIcons name="lock-outline" size={18} color="rgba(255,255,255,0.5)" />
          </View>
          <TextInput
            style={styles.loginInput}
            placeholder="请输入密码"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ) : (
        <View style={styles.inputGroup}>
          <View style={styles.inputIconWrap}>
            <MaterialCommunityIcons name="shield-check-outline" size={18} color="rgba(255,255,255,0.5)" />
          </View>
          <TextInput
            style={[styles.loginInput, { flex: 1 }]}
            placeholder="请输入验证码"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={captcha}
            onChangeText={setCaptcha}
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.captchaBtn, captchaCountdown > 0 && styles.captchaBtnDisabled]}
            onPress={handleSendCaptcha}
            disabled={captchaCountdown > 0 || captchaSending}
          >
            {captchaSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.captchaBtnText}>
                {captchaCountdown > 0 ? `${captchaCountdown}s` : '获取验证码'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handlePhoneLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.submitButtonText}>登录</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderEmailLogin = () => (
    <View style={styles.methodContent}>
      <Text style={[styles.methodTitle, { color: '#ffffff' }]}>邮箱登录</Text>
      <Text style={styles.methodSubtitle}>使用 163 网易邮箱和密码登录</Text>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconWrap}>
          <MaterialCommunityIcons name="email-outline" size={18} color="rgba(255,255,255,0.5)" />
        </View>
        <TextInput
          style={styles.loginInput}
          placeholder="请输入邮箱"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconWrap}>
          <MaterialCommunityIcons name="lock-outline" size={18} color="rgba(255,255,255,0.5)" />
        </View>
        <TextInput
          style={styles.loginInput}
          placeholder="请输入密码"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={emailPassword}
          onChangeText={setEmailPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleEmailLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.submitButtonText}>登录</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderUidLogin = () => (
    <View style={styles.methodContent}>
      <Text style={[styles.methodTitle, { color: '#ffffff' }]}>UID 登录</Text>
      <Text style={styles.methodSubtitle}>输入网易云音乐用户 ID 快速登录</Text>

      <View style={styles.inputGroup}>
        <View style={styles.inputIconWrap}>
          <MaterialCommunityIcons name="identifier" size={18} color="rgba(255,255,255,0.5)" />
        </View>
        <TextInput
          style={styles.loginInput}
          placeholder="请输入 UID"
          placeholderTextColor="rgba(255,255,255,0.4)"
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
        {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.submitButtonText}>登录</Text>}
      </TouchableOpacity>

      <Text style={styles.uidTip}>UID 登录仅可查看公开信息，无法使用需要登录权限的功能</Text>
    </View>
  );

  const renderCookieLogin = () => (
    <View style={styles.methodContent}>
      <Text style={[styles.methodTitle, { color: '#ffffff' }]}>Cookie 登录</Text>
      <Text style={styles.methodSubtitle}>从浏览器中获取 Cookie 登录</Text>

      <View style={styles.inputGroup}>
        <View style={[styles.inputIconWrap, { alignItems: 'flex-start', marginTop: 14 }]}>
          <MaterialCommunityIcons name="cookie-outline" size={18} color="rgba(255,255,255,0.5)" />
        </View>
        <TextInput
          style={[styles.loginInput, styles.cookieInput]}
          placeholder="请粘贴网易云音乐 Cookie"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={cookie}
          onChangeText={setCookie}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleCookieLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.submitButtonText}>登录</Text>}
      </TouchableOpacity>

      <View style={styles.cookieSteps}>
        <Text style={styles.cookieStepTitle}>获取方式：</Text>
        <Text style={styles.cookieStep}>1. 在浏览器中登录 music.163.com</Text>
        <Text style={styles.cookieStep}>2. 按 F12 打开开发者工具</Text>
        <Text style={styles.cookieStep}>3. 切到 Application → Cookies</Text>
        <Text style={styles.cookieStep}>4. 复制 MUSIC_U 的值</Text>
      </View>
    </View>
  );

  const LOGIN_METHODS: { key: LoginMethod; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
    { key: 'qr', label: '扫码', icon: 'qrcode-scan' },
    { key: 'phone', label: '手机号', icon: 'cellphone' },
    { key: 'email', label: '邮箱', icon: 'email-outline' },
    { key: 'cookie', label: 'Cookie', icon: 'cookie-outline' },
    { key: 'uid', label: 'UID', icon: 'identifier' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f766e', '#0d5749', '#0a3d33', '#052e24']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="close" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Image source={require('../../assets/top-logo.png')} style={styles.logoImage} />
            <Text style={styles.appName}>RanNuan Music</Text>
            <Text style={styles.appSlogan}>登录网易云音乐账号</Text>
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            {/* Method Tabs */}
            <View style={styles.methodTabs}>
              {LOGIN_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.key}
                  style={[styles.methodTab, activeMethod === method.key && styles.methodTabActive]}
                  onPress={() => setActiveMethod(method.key)}
                >
                  <MaterialCommunityIcons
                    name={method.icon}
                    size={14}
                    color={activeMethod === method.key ? '#0f766e' : 'rgba(255,255,255,0.6)'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.methodTabText, activeMethod === method.key && styles.methodTabTextActive]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 460 风险提示 — 手机号/邮箱登录容易触发风控 */}
            {(activeMethod === 'phone' || activeMethod === 'email') && (
              <View style={styles.warningBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#fbbf24" />
                <Text style={styles.warningText}>
                  手机/邮箱登录易触发网易风控（460），建议优先使用扫码或 Cookie 登录
                </Text>
              </View>
            )}

            {/* Method Content */}
            {activeMethod === 'qr' && renderQrLogin()}
            {activeMethod === 'phone' && renderPhoneLogin()}
            {activeMethod === 'email' && renderEmailLogin()}
            {activeMethod === 'cookie' && renderCookieLogin()}
            {activeMethod === 'uid' && renderUidLogin()}

            {/* 游客模式入口 */}
            <View style={styles.guestSection}>
              <View style={styles.guestDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>或</Text>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity
                style={styles.guestButton}
                onPress={handleGuestLogin}
                disabled={guestLoading}
                activeOpacity={0.8}
              >
                {guestLoading ? (
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="incognito" size={18} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
                    <Text style={styles.guestButtonText}>游客模式浏览</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.guestTip}>无需登录，快速体验部分功能</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: Spacing.md,
  },
  appName: {
    ...Typography.h2,
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  appSlogan: {
    ...Typography.body2,
    color: 'rgba(255,255,255,0.7)',
  },

  // ─── Login Card ───
  loginCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  methodTabs: {
    flexDirection: 'row',
    padding: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    gap: 6,
  },
  warningText: {
    flex: 1,
    ...Typography.caption,
    color: '#fbbf24',
    lineHeight: 17,
  },
  methodTabActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  methodTabText: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  methodTabTextActive: {
    color: '#0f766e',
    fontWeight: '600',
  },

  // ─── Method Content ───
  methodContent: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  methodTitle: {
    ...Typography.h3,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  methodSubtitle: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: Spacing.xl,
  },

  // ─── QR Login ───
  qrCodeWrapper: {
    width: 180,
    height: 180,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeImage: {
    width: 180,
    height: 180,
  },
  qrOverlay: {
    width: 180,
    height: 180,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrScannedText: {
    ...Typography.body2,
    color: '#4ade80',
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  qrScannedSubtext: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.6)',
    marginTop: Spacing.xs,
  },
  qrExpiredText: {
    ...Typography.body2,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  refreshButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  refreshButtonText: {
    ...Typography.caption,
    color: '#ffffff',
    fontWeight: '600',
  },
  qrSteps: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  qrStep: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },

  // ─── Form Inputs ───
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIconWrap: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginInput: {
    flex: 1,
    ...Typography.body2,
    color: '#ffffff',
    paddingVertical: Spacing.md,
    paddingRight: Spacing.lg,
  },
  cookieInput: {
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    width: '100%',
    borderRadius: BorderRadius.xxl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...Typography.body2,
    color: '#ffffff',
    fontWeight: '600',
  },
  uidTip: {
    ...Typography.overline,
    color: 'rgba(255,255,255,0.35)',
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  // ─── Cookie Steps ───
  cookieSteps: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  cookieStepTitle: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  cookieStep: {
    ...Typography.overline,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: Spacing.xs,
    lineHeight: 16,
  },

  // ─── 手机号登录 密码/验证码切换 ───
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.lg,
    padding: 3,
    marginBottom: Spacing.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  modeTabActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  modeTabText: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  modeTabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  captchaBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginLeft: Spacing.sm,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captchaBtnDisabled: {
    opacity: 0.5,
  },
  captchaBtnText: {
    ...Typography.caption,
    color: '#ffffff',
    fontWeight: '600',
  },

  // ─── 游客模式 ───
  guestSection: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  guestDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.4)',
    marginHorizontal: Spacing.md,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xxl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  guestButtonText: {
    ...Typography.body2,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  guestTip: {
    ...Typography.overline,
    color: 'rgba(255,255,255,0.3)',
    marginTop: Spacing.sm,
  },
});
