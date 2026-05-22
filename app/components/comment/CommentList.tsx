import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { getHotComment, getFloorComment, getNewComment, sendComment, likeComment, reportComment, hugComment, getCommentHugList } from '../../api/comment';
import { useUserStore } from '../../store/userStore';
import { showToast } from '../ui/Toast';

interface CommentData {
  commentId: number;
  content: string;
  time: number;
  likedCount: number;
  liked: boolean;
  user: { userId: number; nickname: string; avatarUrl: string };
  beReplied?: { content: string; user: { nickname: string } }[];
}

interface CommentListProps {
  songId?: number;
  playlistId?: number;
  albumId?: number;
  mvId?: number;
  type: 'music' | 'playlist' | 'album' | 'mv';
}

const COMMENT_TYPE_MAP: Record<string, number> = { music: 0, mv: 1, playlist: 2, album: 3 };
const PAGE_SIZE = 25;

export default function CommentList({ songId, playlistId, albumId, mvId, type }: CommentListProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const id = songId || playlistId || albumId || mvId || 0;
  const commentType = COMMENT_TYPE_MAP[type] || 0;

  const [tab, setTab] = useState<'hot' | 'new'>('hot');
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [submittingLike, setSubmittingLike] = useState<Set<number>>(new Set());

  // ── Floor replies ──
  const [floorId, setFloorId] = useState<number | null>(null);
  const [floorReplies, setFloorReplies] = useState<CommentData[]>([]);
  const [floorLoading, setFloorLoading] = useState(false);

  // ── Hug list ──
  const [hugListId, setHugListId] = useState<number | null>(null);
  const [hugListData, setHugListData] = useState<{ userId: number; nickname: string; avatarUrl: string }[]>([]);
  const [hugListLoading, setHugListLoading] = useState(false);

  // ── Comment input ──
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ cid: number; name: string } | null>(null);

  // Pagination state
  const pageNoRef = useRef(1);

  const fetchComments = useCallback(async (isLoadMore = false, currentTab = tab) => {
    if (!id) { setLoading(false); return; }
    if (isLoadMore && (!hasMore || loadingMore)) return;

    if (isLoadMore) setLoadingMore(true); else { setLoading(true); pageNoRef.current = 1; }

    try {
      let res;
      if (currentTab === 'hot') {
        res = await getHotComment({ id, type: commentType, limit: PAGE_SIZE, offset: isLoadMore ? (pageNoRef.current - 1) * PAGE_SIZE : 0 });
        if (isLoadMore) pageNoRef.current += 1;
      } else {
        // 新版评论接口 — 支持分页+排序
        res = await getNewComment({
          id, type: commentType,
          pageNo: isLoadMore ? pageNoRef.current : 1,
          pageSize: PAGE_SIZE,
          sortType: 3, // 3=按时间排序
        });
        if (isLoadMore) pageNoRef.current += 1;
      }

      // 热评返回 hotComments，最新和 getNewComment 返回 comments
      const newComments: CommentData[] = currentTab === 'hot'
        ? (res?.data?.data?.hotComments || res?.data?.hotComments || [])
        : (res?.data?.data?.comments || res?.data?.comments || []);
      const resTotal = currentTab === 'hot'
        ? (res?.data?.total || res?.data?.data?.total || 0)
        : (res?.data?.total || res?.data?.data?.total || 0);
      // hasMore：API 字段优先，否则按返回数量判断，0 条时强制 false
      const hasMoreApi = res?.data?.hasMore ?? res?.data?.data?.hasMore;
      const hasMoreRes = hasMoreApi !== undefined && hasMoreApi !== null
        ? hasMoreApi && newComments.length === PAGE_SIZE
        : newComments.length === PAGE_SIZE;

      setComments(prev => isLoadMore ? [...prev, ...newComments] : newComments);
      setTotal(resTotal || (isLoadMore ? total : newComments.length));
      setHasMore(hasMoreRes);
    } catch {} finally { setLoading(false); setLoadingMore(false); }
  }, [id, commentType, hasMore, loadingMore, tab, total]);

  useEffect(() => { fetchComments(false, tab); }, [id, tab]);

  const handleLoadMore = () => { if (!loadingMore && hasMore) fetchComments(true); };

  const handleLike = async (cid: number) => {
    setSubmittingLike(prev => new Set(prev).add(cid));
    try {
      await likeComment({ id, cid, t: 1, type: commentType });
      setComments(prev => prev.map(c => c.commentId === cid ? { ...c, liked: !c.liked, likedCount: c.liked ? c.likedCount - 1 : c.likedCount + 1 } : c));
    } catch { showToast({ title: '操作失败', type: 'error' }); }
    setSubmittingLike(prev => { const s = new Set(prev); s.delete(cid); return s; });
  };

  const handleHug = async (uid: number, cid: number, sid: number) => {
    try {
      await hugComment({ uid, cid, sid });
      showToast({ title: '已发送抱抱', type: 'success' });
    } catch { showToast({ title: '操作失败', type: 'error' }); }
  };

  const toggleHugList = async (uid: number, cid: number, sid: number) => {
    if (hugListId === cid) { setHugListId(null); setHugListData([]); return; }
    setHugListId(cid);
    setHugListLoading(true);
    try {
      const res = await getCommentHugList({ uid, cid, sid, limit: 20 });
      setHugListData(res?.data?.data || res?.data || []);
    } catch {}
    setHugListLoading(false);
  };

  // ── Report ──
  const handleReport = (cid: number) => {
    Alert.alert('举报评论', '确定举报该评论？', [
      { text: '取消', style: 'cancel' },
      {
        text: '违规内容', onPress: async () => {
          try { await reportComment({ id, cid, reason: '违规内容', type: commentType }); showToast({ title: '已举报', type: 'success' }); }
          catch { showToast({ title: '操作失败', type: 'error' }); }
        }
      },
      {
        text: '垃圾广告', onPress: async () => {
          try { await reportComment({ id, cid, reason: '垃圾广告', type: commentType }); showToast({ title: '已举报', type: 'success' }); }
          catch { showToast({ title: '操作失败', type: 'error' }); }
        }
      },
    ]);
  };

  // ── Floor replies ──
  const toggleFloor = async (parentCommentId: number) => {
    if (floorId === parentCommentId) { setFloorId(null); setFloorReplies([]); return; }
    setFloorId(parentCommentId);
    setFloorLoading(true);
    try {
      const res = await getFloorComment({ parentCommentId, id, type: commentType, limit: 20 });
      setFloorReplies(res?.data?.data?.comments || res?.data?.comments || []);
    } catch {}
    setFloorLoading(false);
  };

  // ── Send comment ──
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    const user = useUserStore.getState().user;
    if (!user) { Alert.alert('提示', '请先登录'); return; }

    setSending(true);
    try {
      const t = replyTo ? 2 : 1;
      await sendComment({ t, type: commentType, id, content: text, commentId: replyTo?.cid });
      showToast({ title: t === 2 ? '回复成功' : '评论成功', type: 'success' });
      setInputText('');
      setReplyTo(null);
      // Refresh
      fetchComments(false);
    } catch { showToast({ title: '发送失败', type: 'error' }); }
    setSending(false);
  };

  // ── Render ──
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const renderComment = (c: CommentData, isReply = false, _parentId?: number) => (
    <TouchableOpacity
      key={c.commentId}
      activeOpacity={0.9}
      onLongPress={() => handleReport(c.commentId)}
      style={[styles.item, isReply && styles.replyItem]}
    >
      <View style={styles.avatar}>
        {c.user.avatarUrl ? (
          <Image source={{ uri: c.user.avatarUrl }} style={[styles.avatarImg, isReply && styles.avatarImgSmall]} />
        ) : (
          <MaterialCommunityIcons name="account-circle" size={isReply ? 26 : 32} color={colors.textSecondary} />
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={[styles.nickname, { color: colors.primary }]}>{c.user.nickname}</Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>{formatTime(c.time)}</Text>
        </View>
        {c.beReplied?.map((r, i) => (
          <Text key={i} style={[styles.replyQuote, { color: colors.primary }]}>回复 {r.user.nickname}：{r.content}</Text>
        ))}
        <Text style={[styles.content, { color: colors.text }]}>{c.content}</Text>
        <View style={styles.likeRow}>
          <TouchableOpacity onPress={() => handleLike(c.commentId)} disabled={submittingLike.has(c.commentId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name={c.liked ? 'thumb-up' : 'thumb-up-outline'} size={14} color={c.liked ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.likeCount, { color: colors.textSecondary }]}>{c.likedCount || ''}</Text>
          <TouchableOpacity onPress={() => handleHug(useUserStore.getState().user?.userId || 0, c.commentId, id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="hand-heart" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => toggleHugList(c.user.userId, c.commentId, id)} style={styles.replyBtn}>
            <Text style={[styles.floorLabel, { color: hugListId === c.commentId ? colors.primary : colors.textSecondary }]}>抱抱</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setReplyTo({ cid: c.commentId, name: c.user.nickname }); }} style={styles.replyBtn}>
            <MaterialCommunityIcons name="reply" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
          {!isReply && (
            <TouchableOpacity onPress={() => toggleFloor(c.commentId)} style={styles.replyBtn}>
              <Text style={[styles.floorLabel, { color: floorId === c.commentId ? colors.primary : colors.textSecondary }]}>
                {floorId === c.commentId ? '收起回复' : '查看回复'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Floor replies */}
        {!isReply && floorId === c.commentId && (
          <View style={[styles.floorWrap, { backgroundColor: colors.surfaceVariant || 'rgba(128,128,128,0.05)' }]}>
            {floorLoading ? <ActivityIndicator size="small" color={colors.primary} /> : floorReplies.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>暂无回复</Text>
            ) : floorReplies.map(r => renderComment(r, true, c.commentId))}
          </View>
        )}
        {/* Hug list */}
        {!isReply && hugListId === c.commentId && (
          <View style={[styles.floorWrap, { backgroundColor: colors.surfaceVariant || 'rgba(128,128,128,0.05)' }]}>
            {hugListLoading ? <ActivityIndicator size="small" color={colors.primary} /> : hugListData.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>暂无抱抱</Text>
            ) : hugListData.map((u, i) => (
              <View key={i} style={styles.hugItem}>
                {u.avatarUrl ? (
                  <Image source={{ uri: u.avatarUrl }} style={styles.hugAvatar} />
                ) : (
                  <MaterialCommunityIcons name="account-circle" size={22} color={colors.textSecondary} />
                )}
                <Text style={[styles.hugName, { color: colors.text }]}>{u.nickname}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 24 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={comments}
        keyExtractor={(c) => String(c.commentId)}
        ListHeaderComponent={
          <>
            <View style={styles.tabRow}>
              <TouchableOpacity style={[styles.tab, tab === 'hot' && styles.tabActive]} onPress={() => setTab('hot')}>
                <Text style={[styles.tabText, { color: tab === 'hot' ? colors.primary : colors.textSecondary }]}>热门</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, tab === 'new' && styles.tabActive]} onPress={() => setTab('new')}>
                <Text style={[styles.tabText, { color: tab === 'new' ? colors.primary : colors.textSecondary }]}>最新</Text>
              </TouchableOpacity>
              <Text style={[styles.total, { color: colors.textSecondary }]}>{total} 条</Text>
            </View>
          </>
        }
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>暂无评论</Text>}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 16 }} /> : null}
        renderItem={({ item }) => renderComment(item)}
        contentContainerStyle={styles.container}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* ── Input bar ── */}
      <View style={[styles.inputBar, { backgroundColor: colors.card || colors.background, paddingBottom: insets.bottom + 8 }]}>
        {replyTo && (
          <View style={styles.replyHint}>
            <Text style={[styles.replyHintText, { color: colors.primary }]}>回复 @{replyTo.name}</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceVariant || 'rgba(128,128,128,0.06)', borderColor: colors.divider || 'rgba(128,128,128,0.15)' }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={replyTo ? `回复 @${replyTo.name}...` : '写评论...'}
            placeholderTextColor={colors.textSecondary}
            maxLength={1000}
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: sending ? colors.primary + '80' : colors.primary }]} onPress={handleSend} disabled={sending || !inputText.trim()}>
            <MaterialCommunityIcons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  tabRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, paddingTop: Spacing.sm },
  tab: { paddingVertical: 6, paddingHorizontal: Spacing.md, marginRight: Spacing.sm, borderRadius: BorderRadius.full },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '600' },
  total: { fontSize: 12, marginLeft: 'auto' },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  item: { flexDirection: 'row', marginBottom: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.1)' },
  replyItem: { marginLeft: 30, borderBottomWidth: 0, marginBottom: Spacing.sm, paddingBottom: 0 },
  avatar: { marginRight: Spacing.sm },
  avatarImg: { width: 32, height: 32, borderRadius: 16 },
  avatarImgSmall: { width: 26, height: 26, borderRadius: 13 },
  body: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  nickname: { fontSize: 13, fontWeight: '600' },
  time: { fontSize: 11 },
  replyQuote: { fontSize: 12, borderRadius: BorderRadius.sm, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4, overflow: 'hidden' },
  content: { fontSize: 14, lineHeight: 20 },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  likeCount: { fontSize: 11 },
  replyBtn: { marginLeft: 12 },
  floorLabel: { fontSize: 12, fontWeight: '500' },
  floorWrap: { marginTop: 8, padding: Spacing.md, borderRadius: BorderRadius.md },
  hugItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  hugAvatar: { width: 22, height: 22, borderRadius: 11 },
  hugName: { fontSize: 13 },
  inputBar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.15)', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  replyHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  replyHintText: { fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: 8, fontSize: 14, maxHeight: 80 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
