import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { musicParser } from '../services/musicParserService';
import { usePlayer } from './usePlayer';
import type { SongResult } from '../types';

export function useReparse() {
  const { playSong } = usePlayer();
  const [reparseSong, setReparseSong] = useState<SongResult | null>(null);
  const [reparseVisible, setReparseVisible] = useState(false);
  const [reparsing, setReparsing] = useState(false);

  const handleOpenReparse = useCallback((song: SongResult) => {
    setReparseSong(song);
    setReparseVisible(true);
  }, []);

  const handleCloseReparse = useCallback(() => {
    setReparseVisible(false);
  }, []);

  const handleSelectSource = useCallback(async (source: string) => {
    if (!reparseSong) return;
    setReparseVisible(false);
    setReparsing(true);

    const url = await musicParser.parseMusicWithSource(
      reparseSong.id,
      reparseSong,
      'exhigh',
      source,
    );

    setReparsing(false);

    if (url) {
      // 缓存已写入，直接 playSong 会复用缓存 URL
      playSong(reparseSong);
    } else {
      Alert.alert('解析失败', `${source} 音源未找到可用链接，请尝试其他音源`);
    }
  }, [reparseSong, playSong]);

  return {
    reparseSong,
    reparseVisible,
    reparsing,
    handleOpenReparse,
    handleCloseReparse,
    handleSelectSource,
  };
}
