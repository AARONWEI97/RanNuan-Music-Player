import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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

const THEME_OPTIONS = [
  { label: '浅色', value: 'light' as const, icon: 'white-balance-sunny' as const },
  { label: '深色', value: 'dark' as const, icon: 'moon-waning-crescent' as const },
  { label: '跟随系统', value: 'system' as const, icon: 'theme-light-dark' as const },
  { label: '🐶暖阳', value: 'dog-light' as const, icon: 'dog' as const },
  { label: '🐶夜汪', value: 'dog-dark' as const, icon: 'dog-side' as const },
];

const LANGUAGE_OPTIONS = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
];

const QUALITY_OPTIONS = [
  { label: '标准', value: 'standard' },
  { label: '较高', value: 'higher' },
  { label: '极高', value: 'exhigh' },
  { label: '无损', value: 'lossless' },
];

const SECTION_ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  '外观': 'palette-outline',
  '语言': 'translate',
  '网络': 'web',
  '播放': 'play-circle-outline',
  '歌词': 'text-box-outline',
  '音源解析': 'music-circle-outline',
  '通用': 'cog-outline',
  '关于': 'information-outline',
};

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);
  const apiBaseUrl = useSettingsStore((s) => s.apiBaseUrl);
  const musicQuality = useSettingsStore((s) => s.musicQuality);
  const showLyricTranslation = useSettingsStore((s) => s.showLyricTranslation);
  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const enableMusicParsing = useSettingsStore((s) => s.enableMusicParsing);
  const customApiUrl = useSettingsStore((s) => s.customApiUrl);
  const unblockServiceUrl = useSettingsStore((s) => s.unblockServiceUrl);
  const lxMusicApiUrl = useSettingsStore((s) => s.lxMusicApiUrl);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setApiBaseUrlStore = useSettingsStore((s) => s.setApiBaseUrl);
  const setMusicQuality = useSettingsStore((s) => s.setMusicQuality);
  const setShowLyricTranslation = useSettingsStore((s) => s.setShowLyricTranslation);
  const setAutoPlay = useSettingsStore((s) => s.setAutoPlay);
  const setEnableMusicParsing = useSettingsStore((s) => s.setEnableMusicParsing);
  const setCustomApiUrl = useSettingsStore((s) => s.setCustomApiUrl);
  const setUnblockServiceUrl = useSettingsStore((s) => s.setUnblockServiceUrl);
  const setLxMusicApiUrl = useSettingsStore((s) => s.setLxMusicApiUrl);

  const [apiUrlInput, setApiUrlInput] = useState(apiBaseUrl || DEFAULT_API_URL);
  const [customApiUrlInput, setCustomApiUrlInput] = useState(customApiUrl);
  const [unblockUrlInput, setUnblockUrlInput] = useState(unblockServiceUrl);
  const [lxMusicUrlInput, setLxMusicUrlInput] = useState(lxMusicApiUrl);

  const handleApiUrlSubmit = useCallback(() => {
    if (apiUrlInput.trim()) {
      setApiBaseUrlStore(apiUrlInput.trim());
      setApiBaseUrl(apiUrlInput.trim());
    }
  }, [apiUrlInput, setApiBaseUrlStore]);

  const handleResetApiUrl = useCallback(() => {
    setApiUrlInput(DEFAULT_API_URL);
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
    Linking.openURL('https://github.com/algerkong/AlgerMusicPlayer').catch(() => {});
  }, []);

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <MaterialCommunityIcons
          name={SECTION_ICONS[title] || 'cog-outline'}
          size={18}
          color={colors.primary}
        />
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>{children}</View>
    </View>
  );

  const renderThemeSelector = () => (
    <View style={styles.optionRow}>
      <Text style={[styles.optionLabel, { color: colors.text }]}>主题模式</Text>
      <View style={[styles.selectorContainer, { backgroundColor: colors.surface }]}>
        {THEME_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.selectorOption, theme === opt.value && { backgroundColor: colors.primary }]}
            onPress={() => setTheme(opt.value)}
          >
            <MaterialCommunityIcons
              name={opt.icon}
              size={14}
              color={theme === opt.value ? '#ffffff' : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.selectorText, theme === opt.value && styles.selectorTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderLanguageSelector = () => (
    <View style={styles.optionRow}>
      <Text style={[styles.optionLabel, { color: colors.text }]}>语言</Text>
      <View style={[styles.selectorContainer, { backgroundColor: colors.surface }]}>
        {LANGUAGE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.selectorOption, language === opt.value && { backgroundColor: colors.primary }]}
            onPress={() => setLanguage(opt.value)}
          >
            <Text style={[styles.selectorText, language === opt.value && styles.selectorTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderQualitySelector = () => (
    <View style={styles.optionRow}>
      <Text style={[styles.optionLabel, { color: colors.text }]}>音质选择</Text>
      <View style={[styles.selectorContainer, { backgroundColor: colors.surface }]}>
        {QUALITY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.selectorOption, musicQuality === opt.value && { backgroundColor: colors.primary }]}
            onPress={() => setMusicQuality(opt.value)}
          >
            <Text style={[styles.selectorText, musicQuality === opt.value && styles.selectorTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderApiUrlInput = () => (
    <View style={styles.optionColumn}>
      <Text style={[styles.optionLabel, { color: colors.text }]}>API 地址</Text>
      <View style={styles.apiUrlRow}>
        <TextInput
          style={[styles.apiUrlInput, { color: colors.text, backgroundColor: colors.surface }]}
          value={apiUrlInput}
          onChangeText={setApiUrlInput}
          placeholder={DEFAULT_API_URL}
          placeholderTextColor={colors.textTertiary}
          onSubmitEditing={handleApiUrlSubmit}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={[styles.apiUrlSave, { backgroundColor: colors.primary }]} onPress={handleApiUrlSubmit}>
          <Text style={styles.apiUrlSaveText}>保存</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={handleResetApiUrl}>
        <Text style={[styles.resetText, { color: colors.primary }]}>重置为默认</Text>
      </TouchableOpacity>
    </View>
  );

  const renderToggle = (label: string, value: boolean, onToggle: (v: boolean) => void) => (
    <View style={styles.optionRow}>
      <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#ffffff"
      />
    </View>
  );

  const renderMusicParsingSection = () => (
    <>
      {renderToggle('启用音源解析', enableMusicParsing, setEnableMusicParsing)}
      {enableMusicParsing && (
        <>
          <View style={styles.optionColumn}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>自定义音源 API</Text>
            <Text style={[styles.optionHint, { color: colors.textTertiary }]}>第三方音源解析接口地址</Text>
            <View style={styles.apiUrlRow}>
              <TextInput
                style={[styles.apiUrlInput, { color: colors.text, backgroundColor: colors.surface }]}
                value={customApiUrlInput}
                onChangeText={setCustomApiUrlInput}
                placeholder="https://example.com/api"
                placeholderTextColor={colors.textTertiary}
                onSubmitEditing={handleCustomApiUrlSubmit}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity style={[styles.apiUrlSave, { backgroundColor: colors.primary }]} onPress={handleCustomApiUrlSubmit}>
                <Text style={styles.apiUrlSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.optionColumn}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>落雪音乐 API</Text>
            <Text style={[styles.optionHint, { color: colors.textTertiary }]}>LxMusic 音源解析服务地址</Text>
            <View style={styles.apiUrlRow}>
              <TextInput
                style={[styles.apiUrlInput, { color: colors.text, backgroundColor: colors.surface }]}
                value={lxMusicUrlInput}
                onChangeText={setLxMusicUrlInput}
                placeholder="https://lxmusicapi.pages.dev"
                placeholderTextColor={colors.textTertiary}
                onSubmitEditing={handleLxMusicUrlSubmit}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity style={[styles.apiUrlSave, { backgroundColor: colors.primary }]} onPress={handleLxMusicUrlSubmit}>
                <Text style={styles.apiUrlSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.optionColumn}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>解锁服务地址</Text>
            <Text style={[styles.optionHint, { color: colors.textTertiary }]}>UnblockNeteaseMusic 服务端地址</Text>
            <View style={styles.apiUrlRow}>
              <TextInput
                style={[styles.apiUrlInput, { color: colors.text, backgroundColor: colors.surface }]}
                value={unblockUrlInput}
                onChangeText={setUnblockUrlInput}
                placeholder="https://unblock.example.com"
                placeholderTextColor={colors.textTertiary}
                onSubmitEditing={handleUnblockUrlSubmit}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity style={[styles.apiUrlSave, { backgroundColor: colors.primary }]} onPress={handleUnblockUrlSubmit}>
                <Text style={styles.apiUrlSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.optionRow} onPress={handleClearCache}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>清除解析缓存</Text>
            <Text style={[styles.dangerText, { color: colors.error }]}>清除</Text>
          </TouchableOpacity>
        </>
      )}
    </>
  );

  const renderAbout = () => (
    <View style={styles.optionColumn}>
      <View style={styles.optionRow}>
        <Text style={[styles.optionLabel, { color: colors.text }]}>版本</Text>
        <Text style={[styles.optionValue, { color: colors.textSecondary }]}>{APP_VERSION}</Text>
      </View>
      <TouchableOpacity style={styles.optionRow} onPress={handleOpenGithub}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="github" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={[styles.optionLabel, { color: colors.text }]}>GitHub</Text>
        </View>
        <Text style={[styles.githubLink, { color: colors.primary }]}>algerkong/AlgerMusicPlayer</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {renderSection('外观', renderThemeSelector())}
      {renderSection('语言', renderLanguageSelector())}
      {renderSection('网络', renderApiUrlInput())}
      {renderSection('播放', renderQualitySelector())}
      {renderSection('歌词', renderToggle('显示歌词翻译', showLyricTranslation, setShowLyricTranslation))}
      {renderSection('音源解析', renderMusicParsingSection())}
      {renderSection('通用', renderToggle('自动播放', autoPlay, setAutoPlay))}
      {renderSection('关于', renderAbout())}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  sectionTitle: {
    ...Typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginLeft: 6,
  },
  sectionContent: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
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
  apiUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  apiUrlInput: {
    flex: 1,
    ...Typography.caption,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
  },
  apiUrlSave: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  apiUrlSaveText: {
    ...Typography.caption,
    color: '#ffffff',
    fontWeight: '600',
  },
  resetText: {
    ...Typography.overline,
    marginTop: Spacing.xs,
  },
  dangerText: {
    ...Typography.caption,
  },
  githubLink: {
    ...Typography.caption,
  },
  });
}
