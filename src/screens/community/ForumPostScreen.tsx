import React, { createElement, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { AvatarImage } from '../../components/AvatarImage';
import { Button, Divider } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ForumPost'>;

type Reply = {
  id: string;
  content: string;
  authorName: string;
  authorAvatarUrl?: string;
  createdAt?: string;
  authorId?: string;
};

type PostDetail = {
  id: string;
  title: string;
  content: string;
  category: string;
  authorName: string;
  authorAvatarUrl?: string;
  replyCount: number;
  viewCount: number;
  createdAt?: string;
  replies: Reply[];
  authorId?: string;
  isPinned?: boolean;
};

function authorInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function normalizeForumPost(raw: PostDetail & Record<string, unknown>): PostDetail {
  const repliesRaw = (raw.replies ?? []) as Record<string, unknown>[];
  const replies: Reply[] = repliesRaw.map((r) => ({
    id: String(r.id ?? ''),
    content: String(r.content ?? ''),
    authorName: String(r.authorName ?? r.author_name ?? ''),
    authorAvatarUrl: (r.authorAvatarUrl ?? r.author_avatar_url) as
      | string
      | undefined,
    createdAt: (r.createdAt ?? r.created_at) as string | undefined,
    authorId: String(r.authorId ?? r.author_id ?? ''),
  }));
  return {
    id: String(raw.id),
    title: String(raw.title ?? ''),
    content: String(raw.content ?? ''),
    category: String(raw.category ?? ''),
    authorName: String(raw.authorName ?? raw.author_name ?? ''),
    authorAvatarUrl: (raw.authorAvatarUrl ?? raw.author_avatar_url) as
      | string
      | undefined,
    replyCount: Number(raw.replyCount ?? raw.reply_count ?? 0),
    viewCount: Number(raw.viewCount ?? raw.view_count ?? 0),
    createdAt: (raw.createdAt ?? raw.created_at) as string | undefined,
    replies,
    authorId: String(raw.authorId ?? raw.author_id ?? ''),
    isPinned: Boolean(raw.isPinned ?? raw.is_pinned),
  };
}

export default function ForumPostScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { user, studios } = useAuth();
  const currentUserId = user?.id;
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [replyError, setReplyError] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<PostDetail & Record<string, unknown>>(
        `/community/forum/${postId}`,
        {},
        tenantId
      );
      setError('');
      setPost(normalizeForumPost(res));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load post.');
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [postId, tenantId]);

  async function handleDeletePost() {
    const ok =
      typeof window !== 'undefined'
        ? window.confirm('Delete this post? This cannot be undone.')
        : true;
    if (!ok) return;
    try {
      await apiFetch(
        `/community/forum/${postId}`,
        { method: 'DELETE' },
        tenantId
      );
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not delete post.');
    }
  }

  async function handleDeleteReply(replyId: string) {
    const ok =
      typeof window !== 'undefined'
        ? window.confirm('Delete this reply?')
        : true;
    if (!ok) return;
    try {
      await apiFetch(
        `/community/forum/${postId}/replies/${replyId}`,
        { method: 'DELETE' },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not delete reply.');
    }
  }

  async function handleReport() {
    const ok =
      typeof window !== 'undefined'
        ? window.confirm('Report this post as inappropriate?')
        : true;
    if (!ok) return;
    try {
      await apiFetch(
        `/community/forum/${postId}/report`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: 'Inappropriate content' }),
        },
        tenantId
      );
      setReportSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not report post.');
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function saveEdit() {
    if (!editContent.trim()) return;
    setEditSaving(true);
    setEditError('');
    try {
      await apiFetch(
        `/community/forum/${postId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: editTitle.trim() || post?.title,
            content: editContent.trim(),
          }),
        },
        tenantId
      );
      setEditing(false);
      void load();
    } catch (e: unknown) {
      setEditError(
        e instanceof Error ? e.message : 'Could not save edits.'
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function onReply() {
    if (!reply.trim()) return;
    setPosting(true);
    setReplyError('');
    try {
      await apiFetch(
        `/community/forum/${postId}/replies`,
        {
          method: 'POST',
          body: JSON.stringify({ content: reply.trim() }),
        },
        tenantId
      );
      setReply('');
      await load();
    } catch (e: unknown) {
      setReplyError(
        e instanceof Error ? e.message : 'Could not post reply.'
      );
    } finally {
      setPosting(false);
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  if (error || !post)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Post not found.'}</Text>
      </View>
    );

  const replies = post.replies ?? [];
  const isAuthor =
    Boolean(currentUserId && post.authorId) &&
    currentUserId === post.authorId;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.postHeader}>
          <Text style={styles.category}>
            {post.category.replace(/_/g, ' ')}
          </Text>
          <View style={styles.postAuthorRow}>
            <View style={styles.postAvatarWrap}>
              <AvatarImage
                url={post.authorAvatarUrl}
                initials={authorInitials(post.authorName)}
                size={44}
                borderRadius={22}
                bgColor={colors.clayLight}
                textColor={colors.clay}
              />
            </View>
            <View style={styles.postAuthorText}>
              <Text style={styles.title}>{post.title}</Text>
              <Text style={styles.meta}>
                {post.authorName} · {timeAgo(post.createdAt)}
              </Text>
            </View>
          </View>
          <View style={styles.stats}>
            <Text style={styles.stat}>{post.replyCount} replies</Text>
            <Text style={styles.stat}>{post.viewCount} views</Text>
          </View>
          <View style={styles.postActions}>
            {post.authorId === currentUserId ? (
              <Button
                label="Delete post"
                variant="danger"
                onPress={() => void handleDeletePost()}
              />
            ) : reportSent ? (
              <Text style={styles.reportedText}>Reported</Text>
            ) : (
              <Button
                label="Report"
                variant="ghost"
                onPress={() => void handleReport()}
              />
            )}
          </View>
        </View>

        {!editing ? (
          <View style={styles.postBody}>
            <Text style={styles.content2}>{post.content}</Text>
          </View>
        ) : null}

        {isAuthor && !editing ? (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => {
              setEditTitle(post.title ?? '');
              setEditContent(post.content ?? '');
              setEditing(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit post"
          >
            <Text style={styles.editBtnText}>Edit post</Text>
          </TouchableOpacity>
        ) : null}

        {isAuthor && editing ? (
          <View style={styles.editForm}>
            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title"
              placeholderTextColor={colors.inkLight}
            />
            {Platform.OS === 'web'
              ? createElement('textarea', {
                  style: {
                    width: '100%',
                    minHeight: '200px',
                    padding: '12px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    lineHeight: '1.65',
                    border: '0.5px solid rgba(90,70,50,0.2)',
                    borderRadius: '6px',
                    backgroundColor: '#F7F3ED',
                    color: '#1E1A16',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  },
                  value: editContent,
                  onChange: (e: { target: { value: string } }) =>
                    setEditContent(e.target.value),
                })
              : (
                <TextInput
                  style={[styles.editInput, styles.editTextarea]}
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="Content"
                  placeholderTextColor={colors.inkLight}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                />
              )}
            {editError ? (
              <Text style={styles.editError}>{editError}</Text>
            ) : null}
            <View style={styles.editActions}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setEditing(false)}
              />
              <Button
                label="Save changes"
                variant="primary"
                onPress={() => void saveEdit()}
                loading={editSaving}
              />
            </View>
          </View>
        ) : null}

        <Divider />

        {replies.length > 0 ? (
          <View style={styles.replies}>
            <Text style={styles.repliesLabel}>Replies</Text>
            {replies.map((r) => (
              <View key={r.id} style={styles.replyCard}>
                <View style={styles.replyTop}>
                  <View style={styles.replyAvatarWrap}>
                    <AvatarImage
                      url={r.authorAvatarUrl}
                      initials={authorInitials(r.authorName)}
                      size={32}
                      borderRadius={16}
                      bgColor={colors.mossLight}
                      textColor={colors.moss}
                    />
                  </View>
                  <View style={styles.replyHeadText}>
                    <Text style={styles.replyAuthor}>
                      {r.authorName}{' '}
                      <Text style={styles.replyTime}>
                        {timeAgo(r.createdAt)}
                      </Text>
                    </Text>
                    <Text style={styles.replyContent}>{r.content}</Text>
                    {r.authorId === currentUserId ? (
                      <TouchableOpacity
                        onPress={() => void handleDeleteReply(r.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Delete reply"
                      >
                        <Text style={styles.deleteReplyBtn}>Delete</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {replyError ? (
        <Text style={styles.replyErrorText}>{replyError}</Text>
      ) : null}

      <View style={styles.replyBar}>
        <TextInput
          style={styles.replyInput}
          value={reply}
          onChangeText={setReply}
          placeholder="Write a reply..."
          placeholderTextColor={colors.inkLight}
          multiline
        />
        <Button
          label="Send"
          variant="primary"
          onPress={() => void onReply()}
          disabled={!reply.trim() || posting}
          loading={posting}
          style={styles.sendBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  replyErrorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    backgroundColor: colors.surface,
  },
  content: { paddingBottom: 100 },
  postHeader: {
    padding: spacing[4],
    backgroundColor: colors.surface,
    gap: spacing[2],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  category: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  postAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.clayLight,
  },
  postAuthorText: { flex: 1, minWidth: 0, gap: spacing[1] },
  title: {
    fontFamily: typography.body,
    fontSize: fontSize.xl,
    color: colors.ink,
  },
  meta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  stats: { flexDirection: 'row', gap: spacing[3] },
  stat: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.clay,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing[2],
    marginBottom: spacing[3],
  },
  reportedText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  postBody: {
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  content2: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    lineHeight: 22,
  },
  replies: { padding: spacing[4], gap: spacing[3] },
  repliesLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  replyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[3],
    gap: spacing[1],
  },
  replyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  replyAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.mossLight,
  },
  replyHeadText: { flex: 1, minWidth: 0, gap: spacing[1] },
  replyAuthor: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  replyTime: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  replyContent: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    lineHeight: 20,
  },
  deleteReplyBtn: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing[1],
  },
  replyBar: {
    flexDirection: 'row',
    gap: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  replyInput: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[2],
    paddingHorizontal: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    maxHeight: 80,
  },
  sendBtn: {
    flexShrink: 0,
    alignSelf: 'flex-end',
  },
  editBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginTop: spacing[2],
    marginHorizontal: spacing[4],
  },
  editBtnText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  editForm: {
    gap: spacing[3],
    marginTop: spacing[3],
    marginHorizontal: spacing[4],
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  editInput: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    backgroundColor: colors.cream,
  },
  editTextarea: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
  },
  editError: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
});
