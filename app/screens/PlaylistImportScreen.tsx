import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { importPlaylist, getImportTaskStatus } from '../api/playlist';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { useUserStore } from '../store/userStore';
import type { RootStackScreenProps } from '../types';

type ImportMethod = 'text' | 'link';

type TaskStatus = 'idle' | 'pending' | 'processing' | 'success' | 'failed';

const STATUS_MAP: Record<string, TaskStatus> = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETE: 'success',
  FAILED: 'failed',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  idle: '',
  pending: '等待处理...',
  processing: '正在导入...',
  success: '导入成功',
  failed: '导入失败',
};

const STATUS_ICON: Record<TaskStatus, string> = {
  idle: '',
  pending: 'clock-outline',
  processing: 'progress-clock',
  success: 'check-circle',
  failed: 'alert-circle',
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  idle: '',
  pending: '#f59e0b',
  processing: '#3b82f6',
  success: '#22c55e',
  failed: '#ef4444',
};

export default function PlaylistImportScreen() {
  const { colors } = useAppTheme();
  const styles = useStyleCreator(colors);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackScreenProps<'PlaylistImport'>['navigation']>();
  const user = useUserStore((s) => s.user);

  const [activeMethod, setActiveMethod] = useState<ImportMethod>('text');

  // Text import
  const [textInput, setTextInput] = useState('');

  // Link import
  const [linkInput, setLinkInput] = useState('');

  // Options
  const [importToStar, setImportToStar] = useState(false);
  const [playlistName, setPlaylistName] = useState('');

  // Task
  const [importing, setImporting] = useState(false);
  const [taskId, setTaskId] = useState<string | number | null>(null);

  const safeTaskId = typeof taskId === 'object' ? JSON.stringify(taskId) : taskId;
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('idle');
  const [taskMessage, setTaskMessage] = useState('');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Cleanup polling
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Spinning animation for progress
  useEffect(() => {
    if (taskStatus === 'pending' || taskStatus === 'processing') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [taskStatus, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const checkTaskStatus = useCallback(async (taskId: string | number): Promise<boolean> => {
    try {
      const res = await getImportTaskStatus(taskId);
      const apiData = res?.data;

      if (apiData?.code !== 200) {
        return false;
      }

      const taskData = apiData?.data;
      const taskItem = Array.isArray(taskData?.tasks) ? taskData.tasks[0] : taskData;
      const status = typeof taskItem === 'object' ? taskItem?.status : undefined;
      const mapped = STATUS_MAP[status] || 'idle';
      setTaskStatus(mapped);

      if (mapped === 'success') {
        const successCount = taskItem?.succCount ?? 0;
        const existCount = taskItem?.existCount ?? 0;
        const msg = `成功导入 ${successCount} 首${existCount > 0 ? `，${existCount} 首已存在` : ''}`;
        setTaskMessage(msg);
        if (pollRef.current) clearInterval(pollRef.current);
        setImporting(false);
        // Keep modal open to show result; refresh playlists in background
        useUserStore.getState().fetchUserPlaylists();
        return true;
      } else if (mapped === 'failed') {
        const failMsg = taskItem?.msg || taskData?.message || apiData?.message || '导入失败，请重试';
        setTaskMessage(failMsg);
        if (pollRef.current) clearInterval(pollRef.current);
        setImporting(false);
        // Keep modal open to show result
        return true;
      }
      // Still pending/processing
      return false;
    } catch {
      return false;
    }
  }, [navigation]);

  const startPolling = useCallback((id: string | number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setShowProgressModal(true);
    let count = 0;
    let failCount = 0;

    // 首次立即查询，不等 3 秒
    checkTaskStatus(id);

    pollRef.current = setInterval(async () => {
      count++;
      try {
        const res = await getImportTaskStatus(id);
        const apiData = res?.data;

        // API 返回非 200 状态码
        if (apiData?.code !== 200) {
          failCount++;
          // 连续 2 次查询失败，尝试通过刷新歌单列表验证是否实际成功
          if (failCount >= 2) {
            if (pollRef.current) clearInterval(pollRef.current);
            setImporting(false);
            // 刷新歌单列表来验证
            const fetchUserPlaylists = useUserStore.getState().fetchUserPlaylists;
            await fetchUserPlaylists();
            const playlists = useUserStore.getState().playlists;
            const hasNewPlaylist = playlists.some(p =>
              p.name?.includes('导入音乐') || p.name?.includes('我喜欢')
            );
            if (hasNewPlaylist) {
              setTaskStatus('success');
              setTaskMessage('导入似乎已成功，请在"我的"页面查看歌单');
            } else {
              setTaskStatus('failed');
              setTaskMessage(apiData?.message || apiData?.msg || '查询导入状态失败');
            }
          }
          return;
        }

        failCount = 0; // 重置失败计数
        const taskData = apiData?.data;
        // API returns { data: { tasks: [{ status: 'COMPLETE', ... }] } }
        const taskItem = Array.isArray(taskData?.tasks) ? taskData.tasks[0] : taskData;
        const status = typeof taskItem === 'object' ? taskItem?.status : undefined;
        const mapped = STATUS_MAP[status] || 'idle';
        setTaskStatus(mapped);

        if (mapped === 'success') {
          const successCount = taskItem?.succCount ?? 0;
          const existCount = taskItem?.existCount ?? 0;
          const msg = `成功导入 ${successCount} 首${existCount > 0 ? `，${existCount} 首已存在` : ''}`;
          setTaskMessage(msg);
          if (pollRef.current) clearInterval(pollRef.current);
          setImporting(false);
          // Keep modal open to show result
          useUserStore.getState().fetchUserPlaylists();
        } else if (mapped === 'failed') {
          const failMsg = taskItem?.msg || taskData?.message || apiData?.message || '导入失败，请重试';
          setTaskMessage(failMsg);
          if (pollRef.current) clearInterval(pollRef.current);
          setImporting(false);
        }
        // 超过 20 次轮询（约 60 秒）仍未完成
        if (count >= 20 && mapped !== 'success' && mapped !== 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setImporting(false);
          setTaskStatus('failed');
          setTaskMessage('导入超时，请稍后在"我的"页面查看歌单是否已创建');
        }
      } catch {
        failCount++;
        if (failCount >= 2) {
          setTaskStatus('failed');
          setTaskMessage('查询导入状态失败，请检查网络');
          if (pollRef.current) clearInterval(pollRef.current);
          setImporting(false);
        }
      }
    }, 3000);
  }, [navigation, checkTaskStatus]);

  const handleImport = useCallback(async () => {
    if (!user) {
      Alert.alert('提示', '请先登录');
      return;
    }

    if (activeMethod === 'text' && !textInput.trim()) {
      Alert.alert('提示', '请输入歌曲信息');
      return;
    }
    if (activeMethod === 'link' && !linkInput.trim()) {
      Alert.alert('提示', '请输入歌单链接');
      return;
    }

    setImporting(true);
    setTaskStatus('pending');
    setTaskMessage('');

    try {
      const params: any = {};
      if (importToStar) {
        params.importStarPlaylist = true;
      } else if (playlistName.trim()) {
        params.playlistName = playlistName.trim();
      }

      if (activeMethod === 'text') {
        params.text = textInput.trim();
      } else {
        // link mode: parse as JSON array
        const links = linkInput.trim().split('\n').filter(l => l.trim());
        const linkValue = links.length === 1
          ? JSON.stringify([links[0].trim()])
          : JSON.stringify(links.map(l => l.trim()));
        params.link = linkValue;
      }

      console.log('[PlaylistImport] Sending import request:', {
        method: activeMethod,
        paramsKeys: Object.keys(params),
        textLength: params.text?.length,
        linkLength: params.link?.length,
      });

      const res = await importPlaylist(params);
      const apiData = res?.data;

      console.log('[PlaylistImport] API response:', {
        status: res?.status,
        code: apiData?.code,
        dataKeys: apiData?.data ? Object.keys(apiData.data) : null,
        dataType: typeof apiData?.data,
        message: apiData?.message || apiData?.msg,
      });

      // API 返回非 200 状态码
      if (apiData?.code !== 200) {
        setTaskStatus('failed');
        setTaskMessage(apiData?.message || apiData?.msg || '创建导入任务失败');
        setImporting(false);
        return;
      }

      // 安全提取 task id：data 可能是对象 {taskId, ...} 也可能是直接的 id 值
      const taskData = apiData?.data;
      const id = typeof taskData === 'object' ? (taskData?.taskId ?? taskData?.id) : taskData;

      if (id && (typeof id === 'string' || typeof id === 'number')) {
        setTaskId(id);
        startPolling(id);
      } else {
        setTaskStatus('failed');
        setTaskMessage('创建导入任务失败');
        setImporting(false);
      }
    } catch (err: any) {
      setTaskStatus('failed');
      setTaskMessage(err?.message || '导入请求失败');
      setImporting(false);
    }
  }, [activeMethod, textInput, linkInput, importToStar, playlistName, user, startPolling]);

  const renderMethodTabs = () => {
    const methods: { key: ImportMethod; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
      { key: 'text', label: '文字导入', icon: 'text' },
      { key: 'link', label: '链接导入', icon: 'link-variant' },
    ];
    return (
      <View style={[styles.methodBar, { backgroundColor: colors.surface }]}>
        {methods.map((m) => {
          const active = activeMethod === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodTab, active && { backgroundColor: colors.primary }]}
              onPress={() => setActiveMethod(m.key)}
            >
              <MaterialCommunityIcons name={m.icon} size={15} color={active ? '#fff' : colors.textSecondary} />
              <Text style={[styles.methodTabText, active && styles.methodTabTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderTextInput = () => (
    <View style={styles.inputSection}>
      <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
        每行一首歌，格式：歌曲名 歌手名
      </Text>
      <TextInput
        style={[styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        value={textInput}
        onChangeText={setTextInput}
        placeholder={'晴天 周杰伦\n七里香 周杰伦\n光年之外 邓紫棋'}
        placeholderTextColor={colors.textTertiary}
        multiline
        textAlignVertical="top"
      />
    </View>
  );

  const renderLinkInput = () => (
    <View style={styles.inputSection}>
      <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
        粘贴歌单分享链接（QQ音乐、网易云等），每行一个
      </Text>
      <TextInput
        style={[styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        value={linkInput}
        onChangeText={setLinkInput}
        placeholder={'https://y.qq.com/n/ryqq/playlist/...\nhttps://music.163.com/#/playlist?id=...'}
        placeholderTextColor={colors.textTertiary}
        multiline
        textAlignVertical="top"
      />
      <Text style={[styles.linkTip, { color: colors.textTertiary }]}>
        支持将歌单分享到微信/微博/QQ后复制链接，或直接复制歌单链接
      </Text>
    </View>
  );

  const renderOptions = () => (
    <View style={styles.optionsCard}>
      <View style={[styles.optionRow, { borderBottomColor: colors.divider }]}>
        <View style={styles.optionLeft}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>导入到我喜欢的音乐</Text>
          <Text style={[styles.optionHint, { color: colors.textTertiary }]}>开启后将歌曲添加到我喜欢的音乐</Text>
        </View>
        <Switch
          value={importToStar}
          onValueChange={setImportToStar}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#ffffff"
        />
      </View>
      {!importToStar && (
        <View style={styles.optionColumn}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>歌单名称</Text>
          <TextInput
            style={[styles.nameInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={playlistName}
            onChangeText={setPlaylistName}
            placeholder="导入音乐（默认名称）"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
          />
        </View>
      )}
    </View>
  );

  const renderStatus = () => {
    if (taskStatus === 'idle') return null;
    const isSuccess = taskStatus === 'success';
    const isFailed = taskStatus === 'failed';
    const statusColor = STATUS_COLOR[taskStatus];
    return (
      <View style={[styles.statusCard, { backgroundColor: isSuccess ? '#22c55e15' : isFailed ? '#ef444415' : colors.surface }]}>
        <View style={styles.statusRow}>
          <MaterialCommunityIcons
            name={STATUS_ICON[taskStatus] as any}
            size={20}
            color={statusColor}
          />
          <Text style={[styles.statusText, { color: colors.text }]}>
            {STATUS_LABEL[taskStatus]}
          </Text>
          {(taskStatus === 'pending' || taskStatus === 'processing') && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
          )}
        </View>
        {taskMessage ? (
          <Text style={[styles.statusMessage, { color: colors.textSecondary }]}>{taskMessage}</Text>
        ) : null}
        {taskId && (
          <Text style={[styles.taskIdText, { color: colors.textTertiary }]}>任务 ID: {safeTaskId}</Text>
        )}
      </View>
    );
  };

  const renderProgressModal = () => {
    const isFinished = taskStatus === 'success' || taskStatus === 'failed';
    const statusColor = STATUS_COLOR[taskStatus] || colors.textTertiary;

    return (
      <Modal
        visible={showProgressModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (isFinished) {
            setShowProgressModal(false);
            if (taskStatus === 'success') navigation.goBack();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            {/* Status icon */}
            <View style={[styles.statusIconWrap, { backgroundColor: statusColor + '18' }]}>
              {(taskStatus === 'pending' || taskStatus === 'processing') ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <MaterialCommunityIcons
                    name="loading"
                    size={36}
                    color={statusColor}
                  />
                </Animated.View>
              ) : (
                <MaterialCommunityIcons
                  name={STATUS_ICON[taskStatus] as any}
                  size={36}
                  color={statusColor}
                />
              )}
            </View>

            {/* Title */}
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {STATUS_LABEL[taskStatus] || '处理中'}
            </Text>

            {/* Task ID */}
            {safeTaskId ? (
              <Text style={[styles.modalTaskId, { color: colors.textTertiary }]}>
                任务 #{String(safeTaskId).slice(-8)}
              </Text>
            ) : null}

            {/* Steps indicator */}
            <View style={styles.stepsWrap}>
              {(['pending', 'processing', 'success'] as TaskStatus[]).map((step, i) => {
                const isActive = taskStatus === step;
                const isDone = taskStatus === 'success' && step !== taskStatus
                  ? true
                  : (['pending', 'processing', 'success'].indexOf(taskStatus) > i);
                const stepIcons: Record<string, string> = {
                  pending: 'clock-outline',
                  processing: 'cog-outline',
                  success: 'check-circle-outline',
                };
                const stepLabels: Record<string, string> = {
                  pending: '排队中',
                  processing: '导入中',
                  success: '完成',
                };
                return (
                  <React.Fragment key={step}>
                    {i > 0 && (
                      <View style={[
                        styles.stepLine,
                        { backgroundColor: isDone ? STATUS_COLOR.success : colors.border }
                      ]} />
                    )}
                    <View style={styles.stepItem}>
                      <View style={[
                        styles.stepDot,
                        {
                          backgroundColor: isDone ? STATUS_COLOR.success
                            : isActive ? statusColor
                            : colors.border,
                        }
                      ]}>
                        <MaterialCommunityIcons
                          name={(isDone ? 'check' : stepIcons[step]) as any}
                          size={14}
                          color="#fff"
                        />
                      </View>
                      <Text style={[
                        styles.stepLabel,
                        { color: isActive ? colors.text : colors.textTertiary }
                      ]}>
                        {stepLabels[step]}
                      </Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>

            {/* Result details */}
            {taskStatus === 'success' && (
              <View style={[styles.resultBox, { backgroundColor: STATUS_COLOR.success + '12' }]}>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>成功导入</Text>
                  <Text style={[styles.resultValue, { color: STATUS_COLOR.success }]}>
                    {taskMessage || '完成'}
                  </Text>
                </View>
              </View>
            )}

            {taskStatus === 'failed' && (
              <View style={[styles.resultBox, { backgroundColor: STATUS_COLOR.failed + '12' }]}>
                <Text style={[styles.resultValue, { color: STATUS_COLOR.failed }]}>
                  {taskMessage || '导入失败，请重试'}
                </Text>
              </View>
            )}

            {/* Pending/processing hint */}
            {!isFinished && (
              <View style={styles.modalProgressHint}>
                <ActivityIndicator size="small" color={statusColor} />
                <Text style={[styles.modalProgressHintText, { color: colors.textTertiary }]}>
                  导入可能需要几秒到几分钟，请勿退出
                </Text>
              </View>
            )}

            {/* Action buttons */}
            {isFinished && (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setShowProgressModal(false);
                    if (taskStatus === 'success') navigation.goBack();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnText}>
                    {taskStatus === 'success' ? '查看歌单' : '知道了'}
                  </Text>
                </TouchableOpacity>
                {taskStatus === 'failed' && (
                  <TouchableOpacity
                    style={[styles.modalBtnSecondary, { borderColor: colors.border }]}
                    onPress={() => {
                      setShowProgressModal(false);
                      setTaskStatus('idle');
                      setTaskMessage('');
                      setTaskId(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalBtnSecondaryText, { color: colors.text }]}>
                      重新导入
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>歌单导入</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Method Tabs */}
        {renderMethodTabs()}

        {/* Input Area */}
        {activeMethod === 'text' ? renderTextInput() : renderLinkInput()}

        {/* Options */}
        {renderOptions()}

        {/* Import Button */}
        <TouchableOpacity
          style={[styles.importBtn, { backgroundColor: importing ? colors.border : colors.primary }]}
          onPress={handleImport}
          disabled={importing}
          activeOpacity={0.8}
        >
          {importing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.importBtnText}>开始导入</Text>
          )}
        </TouchableOpacity>

        {/* Status */}
        {renderStatus()}
      </ScrollView>

      {/* Progress Modal */}
      {renderProgressModal()}
    </View>
  );
}

function useStyleCreator(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      ...Typography.h4,
      fontWeight: '600',
    },

    scrollContent: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
    },

    // Method tabs
    methodBar: {
      flexDirection: 'row',
      borderRadius: BorderRadius.xxl,
      padding: 3,
      marginBottom: Spacing.lg,
    },
    methodTab: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.xxl,
    },
    methodTabText: {
      ...Typography.body2,
      color: colors.textSecondary,
      fontWeight: '500',
      marginLeft: 4,
    },
    methodTabTextActive: {
      color: '#ffffff',
      fontWeight: '600',
    },

    // Input
    inputSection: {
      marginBottom: Spacing.lg,
    },
    inputHint: {
      ...Typography.caption,
      marginBottom: Spacing.sm,
    },
    textArea: {
      minHeight: 160,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
      ...Typography.body2,
      borderWidth: 1,
    },
    linkTip: {
      ...Typography.overline,
      marginTop: Spacing.sm,
      lineHeight: 16,
    },

    // Options
    optionsCard: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      backgroundColor: colors.card,
      marginBottom: Spacing.lg,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    optionLeft: {
      flex: 1,
      marginRight: Spacing.md,
    },
    optionLabel: {
      ...Typography.body2,
    },
    optionHint: {
      ...Typography.caption,
      marginTop: 2,
    },
    optionColumn: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    nameInput: {
      ...Typography.body2,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      marginTop: Spacing.xs,
      borderWidth: 1,
    },

    // Import button
    importBtn: {
      borderRadius: BorderRadius.xxl,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      height: 48,
      marginBottom: Spacing.lg,
    },
    importBtnText: {
      ...Typography.body2,
      color: '#ffffff',
      fontWeight: '600',
    },

    // Status
    statusCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusText: {
      ...Typography.body2,
      fontWeight: '500',
      marginLeft: 8,
    },
    statusMessage: {
      ...Typography.caption,
      marginTop: Spacing.sm,
    },
    taskIdText: {
      ...Typography.overline,
      marginTop: Spacing.xs,
    },

    // Progress Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCard: {
      width: Dimensions.get('window').width - 64,
      borderRadius: BorderRadius.xl,
      padding: Spacing.xl,
      alignItems: 'center',
    },
    statusIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitle: {
      ...Typography.h4,
      fontWeight: '600',
      marginTop: Spacing.lg,
    },
    modalTaskId: {
      ...Typography.overline,
      marginTop: 4,
    },
    stepsWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.lg,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.sm,
    },
    stepItem: {
      alignItems: 'center',
    },
    stepDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepLabel: {
      ...Typography.overline,
      marginTop: 4,
    },
    stepLine: {
      flex: 1,
      height: 2,
      marginHorizontal: 4,
      marginBottom: 20,
      borderRadius: 1,
    },
    resultBox: {
      width: '100%',
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginTop: Spacing.sm,
    },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    resultLabel: {
      ...Typography.body2,
    },
    resultValue: {
      ...Typography.body2,
      fontWeight: '600',
    },
    modalProgressHint: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.lg,
      gap: 8,
    },
    modalProgressHintText: {
      ...Typography.caption,
      lineHeight: 16,
      flex: 1,
    },
    modalActions: {
      flexDirection: 'row',
      marginTop: Spacing.lg,
      gap: Spacing.md,
      width: '100%',
    },
    modalBtn: {
      flex: 1,
      borderRadius: BorderRadius.xxl,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      height: 44,
    },
    modalBtnText: {
      ...Typography.body2,
      color: '#ffffff',
      fontWeight: '600',
    },
    modalBtnSecondary: {
      flex: 1,
      borderRadius: BorderRadius.xxl,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      height: 44,
      borderWidth: 1,
    },
    modalBtnSecondaryText: {
      ...Typography.body2,
      fontWeight: '600',
    },
  });
}
