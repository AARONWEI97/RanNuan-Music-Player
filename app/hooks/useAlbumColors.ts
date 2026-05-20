import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { getColors } from 'react-native-image-colors';

export interface AlbumColors {
  /** 主强调色（用于按钮、光晕、高亮） */
  accent: string;
  /** 振动色（更鲜艳，用于进度条、活跃元素） */
  vibrant: string;
  /** 暗色调（用于背景渐变底层） */
  dark: string;
  /** 柔和色调（用于面板背景） */
  muted: string;
}

const colorCache = new Map<string, AlbumColors>();

/**
 * 从专辑封面提取主题色系
 * - Android: Palette API（dominant / vibrant / darkMuted）
 * - iOS: UIImageColors（primary / secondary / background）
 * - 结果缓存，相同 URL 不重复提取
 */
export function useAlbumColors(imageUrl: string | undefined): AlbumColors {
  const [colors, setColors] = useState<AlbumColors>(DEFAULT_COLORS);
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const url = imageUrl || '';
    if (!url) {
      setColors(DEFAULT_COLORS);
      return;
    }

    // Hit cache
    const cached = colorCache.get(url);
    if (cached) {
      setColors(cached);
      return;
    }

    // Prevent duplicate requests for the same URL
    if (processingRef.current.has(url)) return;
    processingRef.current.add(url);

    let cancelled = false;

    getColors(url, {
      fallback: '#023c69',
      cache: true,
      key: url,
    })
      .then((result) => {
        if (cancelled) return;

        let extracted: AlbumColors;

        if (result.platform === 'android') {
          extracted = {
            accent: result.dominant || result.vibrant || '#023c69',
            vibrant: result.vibrant || result.dominant || '#0277bd',
            dark: result.darkMuted || result.darkVibrant || '#0a1628',
            muted: result.muted || result.lightMuted || '#1a2a3a',
          };
        } else if (result.platform === 'ios') {
          extracted = {
            accent: result.primary || '#023c69',
            vibrant: result.secondary || result.detail || '#0277bd',
            dark: result.background || '#0a1628',
            muted: result.detail || result.secondary || '#1a2a3a',
          };
        } else {
          // Web fallback
          const anyResult = result as any;
          const dominant = anyResult?.dominant || anyResult?.vibrant;
          const vibrant = anyResult?.vibrant || anyResult?.dominant;
          const dark = anyResult?.darkMuted || anyResult?.darkVibrant;
          const muted = anyResult?.muted || anyResult?.lightMuted;
          extracted = {
            accent: dominant || '#023c69',
            vibrant: vibrant || '#0277bd',
            dark: dark || '#0a1628',
            muted: muted || '#1a2a3a',
          };
        }

        colorCache.set(url, extracted);
        if (!cancelled) setColors(extracted);
      })
      .catch(() => {
        // Fallback to defaults on error
        if (!cancelled) setColors(DEFAULT_COLORS);
      })
      .finally(() => {
        processingRef.current.delete(url);
      });

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return colors;
}

const DEFAULT_COLORS: AlbumColors = {
  accent: '#023c69',
  vibrant: '#0277bd',
  dark: '#0a1628',
  muted: '#1a2a3a',
};
