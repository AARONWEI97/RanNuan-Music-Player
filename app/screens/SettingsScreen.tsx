import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useSettingsStore } from '../store/settingsStore';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { APP_VERSION, DEFAULT_API_URL } from '../constants/config';
import { setApiBaseUrl } from '../api/request';
import { musicParser } from '../services/musicParserService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

// ==================== 配置常量 ====================

const THEME_OPTIONS = [
  { label: '浅色', labelEn: 'Light', value: 'light' as const, icon: 'white-balance-sunny' as const },
  { label: '深色', labelEn: 'Dark', value: 'dark' as const, icon: 'moon-waning-crescent' as const },
  { label: '跟随系统', labelEn: 'System', value: 'system' as const, icon: 'theme-light-dark' as const },
  { label: '🐶暖阳', labelEn: '🐶 Sunny', value: 'dog-light' as const, icon: 'dog' as const },
  { label: '🐶夜汪', labelEn: '🐶 Night', value: 'dog-dark' as const, icon: 'dog-side' as const },
];

const QUALITY_OPTIONS = [
  { label: '标准', labelEn: 'Standard', value: 'standard' },
  { label: '较高', labelEn: 'High', value: 'higher' },
  { label: '极高', labelEn: 'Very High', value: 'exhigh' },
  { label: '无损', labelEn: 'Lossless', value: 'lossless' },
];

type TabId = 'appearance' | 'playback' | 'source' | 'network' | 'about';

// ==================== 主组件 ====================

function useTabConfig(t: (key: string) => string) {
  return [
    { id: 'appearance' as TabId, label: t('settings.appearance'), icon: 'palette-outline' as const },
    { id: 'playback' as TabId, label: t('settings.playback'), icon: 'play-circle-outline' as const },
    { id: 'source' as TabId, label: t('settings.musicParsing'), icon: 'music-circle-outline' as const },
    { id: 'network' as TabId, label: t('settings.network'), icon: 'web' as const },
    { id: 'about' as TabId, label: t('settings.about'), icon: 'information-outline' as const },
  ];
}

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  // Store
  const theme = useSettingsStore((s) => s.theme);
  const apiBaseUrl = useSettingsStore((s) => s.apiBaseUrl);
  const musicQuality = useSettingsStore((s) => s.musicQuality);
  const showLyricTranslation = useSettingsStore((s) => s.showLyricTranslation);
  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const enableMusicParsing = useSettingsStore((s) => s.enableMusicParsing);
  const customApiUrl = useSettingsStore((s) => s.customApiUrl);
  const unblockServiceUrl = useSettingsStore((s) => s.unblockServiceUrl);
  const lxMusicApiUrl = useSettingsStore((s) => s.lxMusicApiUrl);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setApiBaseUrlStore = useSettingsStore((s) => s.setApiBaseUrl);
  const setMusicQuality = useSettingsStore((s) => s.setMusicQuality);
  const setShowLyricTranslation = useSettingsStore((s) => s.setShowLyricTranslation);
  const setAutoPlay = useSettingsStore((s) => s.setAutoPlay);
  const setEnableMusicParsing = useSettingsStore((s) => s.setEnableMusicParsing);
  const setCustomApiUrl = useSettingsStore((s) => s.setCustomApiUrl);
  const setUnblockServiceUrl = useSettingsStore((s) => s.setUnblockServiceUrl);
  const setLxMusicApiUrl = useSettingsStore((s) => s.setLxMusicApiUrl);

  // Tab state
  const tabConfig = useTabConfig(t);
  const [activeTab, setActiveTab] = useState<TabId>('appearance');
  const tabScrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Input states
  // 默认地址不暴露 IP，仅当用户自定义过才显示值
  const [apiUrlInput, setApiUrlInput] = useState(
    apiBaseUrl && apiBaseUrl !== DEFAULT_API_URL ? apiBaseUrl : ''
  );
  const [customApiUrlInput, setCustomApiUrlInput] = useState(customApiUrl);
  const [unblockUrlInput, setUnblockUrlInput] = useState(unblockServiceUrl);
  const [lxMusicUrlInput, setLxMusicUrlInput] = useState(lxMusicApiUrl);

  // ==================== Handlers ====================

  const switchTab = useCallback((tabId: TabId) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setActiveTab(tabId);
  }, [fadeAnim]);

  const handleApiUrlSubmit = useCallback(() => {
    if (apiUrlInput.trim()) {
      setApiBaseUrlStore(apiUrlInput.trim());
      setApiBaseUrl(apiUrlInput.trim());
    }
  }, [apiUrlInput, setApiBaseUrlStore]);

  const handleResetApiUrl = useCallback(() => {
    setApiUrlInput('');
    setApiBaseUrlStore(DEFAULT_API_URL);
    setApiBaseUrl(DEFAULT_API_URL);
  }, [setApiBaseUrlStore]);

  const handleCustomApiUrlSubmit = useCallback(() => {
    const url = customApiUrlInput.trim();
    setCustomApiUrl(url);
    AsyncStorage.setItem('custom_api_url', url);
  }, [customApiUrlInput, setCustomApiUrl]);

  const handleUnblockUrlSubmit = useCallback(() => {
    const url = unblockUrlInput.trim();
    setUnblockServiceUrl(url);
    AsyncStorage.setItem('unblock_service_url', url);
  }, [unblockUrlInput, setUnblockServiceUrl]);

  const handleLxMusicUrlSubmit = useCallback(() => {
    const url = lxMusicUrlInput.trim();
    setLxMusicApiUrl(url);
    AsyncStorage.setItem('lxmusic_api_url', url);
  }, [lxMusicUrlInput, setLxMusicApiUrl]);

  const handleClearCache = useCallback(() => {
    Alert.alert('清除缓存', '确定要清除所有音源解析缓存吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: () => {
          musicParser.clearCache();
          Alert.alert('提示', '缓存已清除');
        },
      },
    ]);
  }, []);

  const handleOpenGithub = useCallback(() => {
    Linking.openURL('https://github.com/AARONWEI97/RanNuan-Music-Player').catch(() => {});
  }, []);

  const handleOpenBatterySettings = useCallback(() => {
    // ★ 引导用户关闭电池优化，防止 Android 系统冻结后台 JS 线程
    // 导致锁屏时无法自动切歌
    if (Platform.OS === 'android') {
      // 打开应用设置页（电池优化）
      Linking.openSettings().catch(() => {
        // fallback: 尝试打开应用详情页
        Linking.openURL('android.settings.APPLICATION_DETAILS_SETTINGS').catch(() => {});
      });
    }
  }, []);

  // ==================== 渲染辅助 ====================

  const renderSectionTitle = (title: string, icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name']) => (
    <View style={styles.sectionTitleRow}>
      {icon && (
        <MaterialCommunityIcons name={icon} size={16} color={colors.primary} style={{ marginRight: 6 }} />
      )}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  const renderCard = (children: React.ReactNode) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>{children}</View>
  );

  const renderOptionRow = (label: string, right: React.ReactNode, subtitle?: string) => (
    <View style={styles.optionRow}>
      <View style={styles.optionLeft}>
        <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
        {subtitle && <Text style={[styles.optionHint, { color: colors.textTertiary }]}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );

  const renderToggle = (label: string, value: boolean, onToggle: (v: boolean) => void, subtitle?: string) => (
    <View style={styles.optionRow}>
      <View style={styles.optionLeft}>
        <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
        {subtitle && <Text style={[styles.optionHint, { color: colors.textTertiary }]}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#ffffff"
      />
    </View>
  );

  const renderSelector = <T extends string>(
    options: { label: string; value: T; icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[],
    currentValue: T,
    onSelect: (v: T) => void,
  ) => (
    <View style={[styles.selectorContainer, { backgroundColor: colors.surface }]}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.selectorOption, currentValue === opt.value && { backgroundColor: colors.primary }]}
          onPress={() => onSelect(opt.value)}
        >
          {opt.icon && (
            <MaterialCommunityIcons
              name={opt.icon}
              size={13}
              color={currentValue === opt.value ? '#ffffff' : colors.textSecondary}
              style={{ marginRight: 3 }}
            />
          )}
          <Text style={[styles.selectorText, currentValue === opt.value && styles.selectorTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderUrlInput = (
    value: string,
    onChangeText: (t: string) => void,
    onSubmit: () => void,
    placeholder: string,
  ) => (
    <View style={styles.inputRow}>
      <TextInput
        style={[styles.textInput, { color: colors.text, backgroundColor: colors.surface }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        onSubmitEditing={onSubmit}
        returnKeyType="done"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={onSubmit}>
        <Text style={styles.saveBtnText}>保存</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDivider = () => <View style={[styles.divider, { backgroundColor: colors.divider }]} />;

  // ==================== Tab 内容 ====================

  const renderAppearanceTab = () => (
    <>
      {renderCard(
        <>
          {renderOptionRow('主题模式', renderSelector(THEME_OPTIONS, theme, setTheme))}
        </>
      )}
    </>
  );

  const renderPlaybackTab = () => (
    <>
      {renderCard(
        <>
          {renderOptionRow('音质选择', renderSelector(QUALITY_OPTIONS, musicQuality, setMusicQuality))}
          {renderDivider()}
          {renderToggle('自动播放', autoPlay, setAutoPlay, '打开歌曲详情时自动播放')}
          {renderDivider()}
          {renderToggle('显示歌词翻译', showLyricTranslation, setShowLyricTranslation, '歌词界面显示原文与翻译')}
        </>
      )}
    </>
  );

  const renderSourceTab = () => (
    <>
      {renderCard(
        <>
          {renderToggle('启用音源解析', enableMusicParsing, setEnableMusicParsing, '使用第三方源解析无版权歌曲')}
          {enableMusicParsing && (
            <>
              {renderDivider()}
              <View style={styles.optionColumn}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>自定义音源 API</Text>
                <Text style={[styles.optionHint, { color: colors.textTertiary }]}>第三方音源解析接口地址</Text>
                {renderUrlInput(customApiUrlInput, setCustomApiUrlInput, handleCustomApiUrlSubmit, 'https://example.com/api')}
              </View>
              {renderDivider()}
              <View style={styles.optionColumn}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>落雪音乐 API</Text>
                <Text style={[styles.optionHint, { color: colors.textTertiary }]}>LxMusic 音源解析服务地址</Text>
                {renderUrlInput(lxMusicUrlInput, setLxMusicUrlInput, handleLxMusicUrlSubmit, 'https://lxmusicapi.pages.dev')}
              </View>
              {renderDivider()}
              <View style={styles.optionColumn}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>解锁服务地址</Text>
                <Text style={[styles.optionHint, { color: colors.textTertiary }]}>UnblockNeteaseMusic 服务端地址</Text>
                {renderUrlInput(unblockUrlInput, setUnblockUrlInput, handleUnblockUrlSubmit, 'https://unblock.example.com')}
              </View>
              {renderDivider()}
              <TouchableOpacity style={styles.optionRow} onPress={handleClearCache}>
                <View style={styles.optionLeft}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>清除解析缓存</Text>
                  <Text style={[styles.optionHint, { color: colors.textTertiary }]}>清除所有音源解析缓存数据</Text>
                </View>
                <Text style={[styles.dangerText, { color: colors.error }]}>清除</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </>
  );

  const renderNetworkTab = () => (
    <>
      {renderSectionTitle('API 服务地址', 'server')}
      {renderCard(
        <View style={styles.optionColumn}>
          <Text style={[styles.optionHint, { color: colors.textTertiary }]}>
            网易云音乐 API 后端服务地址，修改后需重启应用生效
          </Text>
          {renderUrlInput(apiUrlInput, setApiUrlInput, handleApiUrlSubmit, '当前使用默认服务器地址')}
          <TouchableOpacity onPress={handleResetApiUrl}>
            <Text style={[styles.resetText, { color: colors.primary }]}>重置为默认</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderAboutTab = () => (
    <>
      {renderCard(
        <>
          <View style={styles.appInfoRow}>
            <Image source={require('../../assets/top-logo.png')} style={styles.appLogoImage} />
            <View style={styles.appInfoText}>
              <Text style={[styles.appName, { color: colors.text }]}>冉暖音乐</Text>
              <Text style={[styles.appVersion, { color: colors.textSecondary }]}>版本 {APP_VERSION}</Text>
            </View>
          </View>
          {renderDivider()}
          <TouchableOpacity style={styles.optionRow} onPress={handleOpenGithub}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="github" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>GitHub</Text>
                <Text style={[styles.optionHint, { color: colors.textTertiary }]}>AARONWEI97/RanNuanMusic</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          {renderDivider()}
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>开源协议</Text>
              <Text style={[styles.optionHint, { color: colors.textTertiary }]}>本项目基于 MIT 协议开源</Text>
            </View>
            <Text style={[styles.optionValue, { color: colors.textSecondary }]}>MIT</Text>
          </View>
          {Platform.OS === 'android' && (
            <>
              {renderDivider()}
              <TouchableOpacity style={styles.optionRow} onPress={handleOpenBatterySettings}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="battery-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                  <View>
                    <Text style={[styles.optionLabel, { color: colors.text }]}>电池优化</Text>
                    <Text style={[styles.optionHint, { color: colors.textTertiary }]}>关闭电池优化以改善锁屏切歌</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </>
  );

  const tabContent: Record<TabId, () => React.ReactNode> = {
    appearance: renderAppearanceTab,
    playback: renderPlaybackTab,
    source: renderSourceTab,
    network: renderNetworkTab,
    about: renderAboutTab,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 顶部标题 + Tab 导航 */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('tab.settings')}</Text>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {tabConfig.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabPill,
                activeTab === tab.id
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surface },
              ]}
              onPress={() => switchTab(tab.id)}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={14}
                color={activeTab === tab.id ? '#ffffff' : colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.id ? styles.tabLabelActive : { color: colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab 内容 */}
      <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {tabContent[activeTab]()}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ==================== 样式 ====================

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },

    // Header
    header: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    headerTitle: {
      ...Typography.h4,
      fontWeight: '700',
      marginBottom: Spacing.md,
      marginLeft: 2,
    },
    tabBar: {
      paddingVertical: 2,
      gap: 8,
    },
    tabPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      marginRight: 4,
    },
    tabLabel: {
      ...Typography.caption,
      fontWeight: '500',
    },
    tabLabelActive: {
      color: '#ffffff',
      fontWeight: '600',
    },

    // Content
    contentWrapper: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
    },

    // Card
    card: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      marginTop: Spacing.md,
    },

    // Section title
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.lg,
      marginBottom: Spacing.xs,
      marginLeft: 4,
    },
    sectionTitle: {
      ...Typography.caption,
      fontWeight: '600',
    },

    // Option row
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    optionLeft: {
      flex: 1,
      marginRight: Spacing.md,
    },
    optionColumn: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    optionLabel: {
      ...Typography.body2,
    },
    optionHint: {
      ...Typography.caption,
      marginTop: 2,
    },
    optionValue: {
      ...Typography.body2,
    },

    // Divider
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: Spacing.lg,
    },

    // Selector
    selectorContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      borderRadius: BorderRadius.md,
      padding: 2,
    },
    selectorOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
    },
    selectorText: {
      ...Typography.caption,
      color: colors.textSecondary,
    },
    selectorTextActive: {
      color: '#ffffff',
      fontWeight: '600',
    },

    // Input
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.sm,
    },
    textInput: {
      flex: 1,
      ...Typography.caption,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      marginRight: Spacing.sm,
    },
    saveBtn: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
    },
    saveBtnText: {
      ...Typography.caption,
      color: '#ffffff',
      fontWeight: '600',
    },
    resetText: {
      ...Typography.overline,
      marginTop: Spacing.xs,
    },

    // Danger
    dangerText: {
      ...Typography.caption,
      fontWeight: '500',
    },

    // About
    appInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
    appLogoImage: {
      width: 52,
      height: 52,
      borderRadius: BorderRadius.lg,
      marginRight: Spacing.md,
    },
    appInfoText: {
      flex: 1,
    },
    appName: {
      ...Typography.h4,
      fontWeight: '600',
    },
    appVersion: {
      ...Typography.caption,
      marginTop: 2,
    },

    // GitHub link (kept for backward compat)
    githubLink: {
      ...Typography.caption,
    },
  });
}
