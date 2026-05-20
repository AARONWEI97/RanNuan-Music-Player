import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { likeSong } from '../api/music';
import { usePlaylist } from './usePlaylist';
import { useDownload } from './useDownload';
import { showToast } from '../components/ui/Toast';
import type { SongActionItem } from '../components/music/SongActionSheet';
import type { SongResult } from '../types';

interface ExtraActions {
  /** 在操作菜单中追加自定义操作项 */
  extra?: SongActionItem[];
  /** 是否属于自己的歌单（控制显示删除按钮） */
  isOwnPlaylist?: boolean;
  /** 歌单 ID（删除时需要） */
  playlistId?: number;
  /** 歌单歌曲删除回调 */
  onRemoveFromPlaylist?: (songId: string | number) => void;
}

/**
 * 统一的歌曲三点操作菜单 Hook
 * 在所有使用 SongList 的页面中复用
 */
export function useSongActionSheet(extra?: ExtraActions) {
  const navigation = useNavigation<any>();
  const { addToNext } = usePlaylist();
  const { download } = useDownload();
  const [actionSong, setActionSong] = useState<SongResult | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [commentSongId, setCommentSongId] = useState('');
  const [showComments, setShowComments] = useState(false);

  const handlePress = useCallback((song: SongResult, _index: number) => {
    setActionSong(song);
    setShowSheet(true);
  }, []);

  const handleClose = useCallback(() => {
    setShowSheet(false);
    setSubmitting(null);
  }, []);

  const actionItems: SongActionItem[] = useMemo(() => {
    if (!actionSong) return [];
    const s = actionSong;
    const items: SongActionItem[] = [
      {
        key: 'play-next',
        label: '下一首播放',
        icon: 'skip-next',
        onPress: () => {
          addToNext(s);
          showToast({ title: '已添加', message: `「${s.name}」将在当前歌曲播放完后播放`, type: 'success' });
          handleClose();
        },
      },
      {
        key: 'like',
        label: '收藏',
        icon: 'heart-outline',
        loading: submitting === 'like',
        onPress: async () => {
          setSubmitting('like');
          try {
            await likeSong(Number(s.id), true);
            showToast({ title: '已收藏', type: 'success' });
            handleClose();
          } catch { showToast({ title: '收藏失败', type: 'error' }); }
          setSubmitting(null);
        },
      },
      {
        key: 'download',
        label: '下载',
        icon: 'download-outline',
        onPress: () => {
          download(s);
          showToast({ title: '已加入下载', type: 'success' });
          handleClose();
        },
      },
    ];

    // 自己的歌单 → 删除
    if (extra?.isOwnPlaylist && extra.playlistId) {
      items.push({
        key: 'remove',
        label: '从歌单中删除',
        icon: 'trash-can-outline',
        destructive: true,
        loading: submitting === 'remove',
        onPress: async () => {
          setSubmitting('remove');
          try {
            const { updatePlaylistTracks } = await import('../api/music');
            await updatePlaylistTracks({ op: 'del', pid: extra.playlistId!, tracks: String(s.id) });
            extra?.onRemoveFromPlaylist?.(s.id);
            showToast({ title: '已删除', type: 'success' });
            handleClose();
          } catch { showToast({ title: '删除失败', type: 'error' }); }
          setSubmitting(null);
        },
      });
    }

    // 评论
    items.push({
      key: 'comment',
      label: '查看歌曲评论',
      icon: 'comment-text-outline',
      onPress: () => {
        handleClose();
        setCommentSongId(String(s.id));
        setShowComments(true);
      },
    });

    // 歌手
    items.push({
      key: 'artist',
      label: `歌手: ${s.ar?.map((a: any) => a.name).join('/') || '未知'}`,
      icon: 'account-music-outline',
      onPress: () => {
        handleClose();
        const artistId = s.ar?.[0]?.id;
        if (artistId) navigation.navigate('ArtistDetail', { id: Number(artistId) });
      },
    });

    // 额外操作
    if (extra?.extra) items.push(...extra.extra);

    return items;
  }, [actionSong, submitting, addToNext, download, handleClose, navigation, extra]);

  return {
    actionSong,
    showSheet,
    actionItems,
    handlePress,
    handleClose,
    commentSongId,
    showComments,
    setShowComments,
  };
}
