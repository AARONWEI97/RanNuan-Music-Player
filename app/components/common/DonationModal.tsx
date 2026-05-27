import React, { useCallback } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';

import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { Typography } from '../../theme/typography';

// ★★★ 替换为你的真实二维码图片 ★★★
// 支付宝收款码：把真实二维码放到 assets/images/alipay_qr.png，然后取消下面注释
const ALIPAY_QR_IMAGE = require('../../../assets/images/alipay_qr.png');

// 微信收款码：把真实二维码放到 assets/images/wechat_qr.png，然后取消下面注释
const WECHAT_QR_IMAGE = require('../../../assets/images/wechat_qr.png');

const GITHUB_URL = 'https://github.com/AARONWEI97/RanNuan-Music-Player';

interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
}

/** 渲染二维码区域（支付宝/微信复用） */
function QrBlock({
  label,
  icon,
  iconColor,
  qrImage,
  placeholderText,
}: {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
  qrImage: any;
  placeholderText: string;
}) {
  const { colors } = useAppTheme();

  const handleLongPress = useCallback(async () => {
    if (!qrImage) return;
    try {
      // 1. 请求相册权限
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要相册权限才能保存二维码，请在设置中开启');
        return;
      }
      // 2. 通过 Asset 从 bundle 下载到缓存
      const { Asset } = require('expo-asset');
      const asset = Asset.fromModule(qrImage);
      await asset.downloadAsync();
      const sourceUri = asset.localUri || asset.uri;
      if (!sourceUri) {
        Alert.alert('错误', '无法读取二维码图片');
        return;
      }
      // 3. 复制到 document 目录（MediaLibrary 需要 file:// URI）
      const filename = `${label}_qr_${Date.now()}.png`;
      const docDir = FileSystem.documentDirectory;
      if (!docDir) {
        Alert.alert('错误', '无法访问文件系统');
        return;
      }
      const dest = `${docDir}${filename}`;
      await FileSystem.copyAsync({ from: sourceUri, to: dest });
      // 4. 保存到系统相册
      await MediaLibrary.createAssetAsync(dest);
      // 5. 清理临时文件
      await FileSystem.deleteAsync(dest, { idempotent: true });
      Alert.alert('保存成功', `二维码已保存到相册，请打开${label} → 扫一扫 → 相册选取`);
    } catch (e: any) {
      console.warn('[DonationModal] save error:', e);
      Alert.alert('保存失败', '请手动截图保存二维码');
    }
  }, [label, qrImage]);

  return (
    <View style={styles.qrSection}>
      <View style={styles.qrHeader}>
        <View style={[styles.payIconWrap, { backgroundColor: iconColor }]}>
          <MaterialCommunityIcons name={icon} size={24} color="#fff" />
        </View>
        <View style={styles.payInfo}>
          <Text style={[styles.payLabel, { color: colors.text }]}>{label}打赏</Text>
          <Text style={[styles.payHint, { color: colors.textTertiary }]}>长按保存二维码 → {label}扫一扫</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.qrContainer}
        onLongPress={handleLongPress}
        activeOpacity={0.9}
      >
        {qrImage ? (
          <Image source={qrImage} style={[styles.qrImage,{borderColor:colors.border}]} resizeMode="contain" />
        ) : (
          <View style={styles.qrPlaceholder}>
            <MaterialCommunityIcons name="qrcode" size={48} color="#ccc" />
            <Text style={[styles.qrPlaceholderText,{color:colors.textTertiary}]}>{placeholderText}</Text>
            <Text style={[styles.qrPlaceholderHint,{color:colors.textTertiary}]}>请将二维码图片放到{'\n'}assets/images/ 目录</Text>
          </View>
        )}
        <Text style={[styles.qrTip, { color: colors.textTertiary }]}>
          {qrImage ? '长按二维码保存到相册' : '（占位图，待替换真实二维码）'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DonationModal({ visible, onClose }: DonationModalProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const handleOpenGithub = useCallback(() => {
    Linking.openURL(GITHUB_URL).catch(() => {});
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { paddingBottom: insets.bottom + 20 }]}>
          {/* 关闭按钮 */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {/* 顶部装饰 — Logo */}
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53', '#FFA726']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Image source={require('../../../assets/top-logo.png')} style={styles.headerLogo} />
            <Text style={styles.headerTitle}>支持开发者</Text>
            <Text style={styles.headerSubtitle}>您的每一份支持都是持续更新的动力 ❤️</Text>
          </LinearGradient>

          {/* 打赏方式 */}
          <View style={styles.body}>
            {/* 支付宝二维码 */}
            <QrBlock
              label="支付宝"
              icon="alpha-a-circle"
              iconColor="#1677FF"
              qrImage={ALIPAY_QR_IMAGE}
              placeholderText="支付宝收款码"
            />

            <View style={[styles.verticalDivider, { backgroundColor: colors.divider }]} />

            {/* 微信二维码 */}
            <QrBlock
              label="微信"
              icon="wechat"
              iconColor="#07C160"
              qrImage={WECHAT_QR_IMAGE}
              placeholderText="微信收款码"
            />
          </View>

          {/* 底部：关闭 + GitHub */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.dismissRow} onPress={onClose}>
              <Text style={[styles.dismissText, { color: colors.textTertiary }]}>暂不打赏</Text>
            </TouchableOpacity>
            <View style={styles.githubRow}>
              <Text style={[styles.githubText, { color: colors.textTertiary }]}>
                不捐赠也没关系哦 为作者献上一个免费的star⭐吧！
              </Text>
              <TouchableOpacity onPress={handleOpenGithub} style={styles.githubLinkRow}>
                <MaterialCommunityIcons name="github" size={14} color={colors.textTertiary} style={{ marginRight: 4 }} />
                <Text style={[styles.githubLink, { color: colors.primary }]}>
                  github.com/AARONWEI97/RanNuan-Music-Player
                </Text>           
              </TouchableOpacity>
              <Text style={[styles.githubText, { color: colors.textTertiary }]}>
                PS：捐赠弹窗关闭后 点击左上角logo图标可再次唤醒。
              </Text>                   
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  headerLogo: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  headerTitle: {
    ...Typography.h4,
    color: '#fff',
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  qrSection: {
    flex:1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  payIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  payInfo: {
    flex: 1,
  },
  payLabel: {
    ...Typography.body2,
    fontWeight: '500',
  },
  payHint: {
    ...Typography.caption,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xs,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  qrImage: {
    width: 140,
    height: 140,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#eee',
  },
  qrTip: {
    ...Typography.overline,
    marginTop: Spacing.xs,
  },
  qrPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  qrPlaceholderText: {
    ...Typography.caption,
    color: '#999',
    marginTop: Spacing.xs,
  },
  qrPlaceholderHint: {
    ...Typography.overline,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  dismissRow: {
    paddingVertical: Spacing.sm,
  },
  dismissText: {
    ...Typography.caption,
  },
  githubRow: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  githubText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  githubLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  githubLink: {
    ...Typography.caption,
    textDecorationLine: 'underline',
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',        // 自动拉伸高度
    marginHorizontal: Spacing.sm,    
  }
});
