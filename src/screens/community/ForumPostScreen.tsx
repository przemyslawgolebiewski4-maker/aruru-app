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
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { AvatarImage } from '../../components/AvatarImage';
import { Button, Divider } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { renderMarkdown } from '../../utils/renderMarkdown';
import {
  openWebImageFilePicker,
  readImageFileAsBase64,
  uploadForumImage,
} from '../../utils/webImagePick';

type Props = NativeStackScreenProps<AppStackParamList, 'ForumPost'>;

type Reply = {
  id: string;
  content: string;
  authorName: string;
  authorAvatarUrl?: string;
  createdAt?: string;
  authorId?: string;
  parentReplyId?: string | null;
  imageUrls?: string[];
  _optimistic?: boolean;
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
  imageUrls?: string[];
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
    parentReplyId: (() => {
      const v = r.parentReplyId ?? r.parent_reply_id;
      if (v == null || v === '') return null;
      return String(v);
    })(),
    imageUrls: (() => {
      const v = r.imageUrls ?? r.image_urls;
      if (!Array.isArray(v)) return [];
      return v.map(String).filter(Boolean).slice(0, 2);
    })(),
  }));
  const postImageUrlsRaw = raw.imageUrls ?? raw.image_urls;
  const postImageUrls = Array.isArray(postImageUrlsRaw)
    ? postImageUrlsRaw.map(String).filter(Boolean).slice(0, 2)
    : [];
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
    imageUrls: postImageUrls,
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
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState<string | null>(null);
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

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
    if (!reply.trim() && replyImages.length === 0) return;
    setPosting(true);
    setReplyError('');

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticReply: Reply = {
      id: optimisticId,
      content: reply.trim(),
      authorName: user?.name ?? 'You',
      authorAvatarUrl: user?.avatarUrl ?? undefined,
      createdAt: new Date().toISOString(),
      authorId: user?.id ?? '',
      parentReplyId: replyToId ?? null,
      imageUrls: [...replyImages],
      _optimistic: true,
    };

    setPost((prev) =>
      prev
        ? {
            ...prev,
            replies: [...(prev.replies ?? []), optimisticReply],
            replyCount: (prev.replyCount ?? 0) + 1,
          }
        : prev
    );

    const replyText = reply.trim();
    const images = [...replyImages];
    setReply('');
    setReplyImages([]);
    setReplyToId(null);
    setReplyToName(null);

    try {
      await apiFetch(
        `/community/forum/${postId}/replies`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: replyText,
            parent_reply_id: replyToId ?? null,
            image_urls: images,
          }),
        },
        tenantId
      );
      void load();
    } catch (e: unknown) {
      setPost((prev) =>
        prev
          ? {
              ...prev,
              replies: (prev.replies ?? []).filter(
                (r) => r.id !== optimisticId
              ),
              replyCount: Math.max((prev.replyCount ?? 0) - 1, 0),
            }
          : prev
      );
      setReplyError(
        e instanceof Error ? e.message : 'Could not send reply.'
      );
      setReply(replyText);
    } finally {
      setPosting(false);
    }
  }

  async function pickAndUploadImage(): Promise<string | null> {
    try {
      const { default: ImagePicker } = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return null;
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.8,
      });
      if (picked.canceled || !picked.assets[0]) return null;
      const asset = picked.assets[0];
      const res = await apiFetch<{ imageUrl: string }>(
        '/uploads/forum-image',
        {
          method: 'POST',
          body: JSON.stringify({
            imageBase64: asset.base64 ?? '',
            mimeType: 'image/jpeg',
          }),
        },
        tenantId
      );
      return res.imageUrl ?? null;
    } catch {
      return null;
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
          <TouchableOpacity
            style={styles.postAuthorRow}
            onPress={() => {
              if (post.authorId) {
                navigation.navigate('ArtistProfile', {
                  userId: post.authorId,
                });
              }
            }}
            activeOpacity={post.authorId ? 0.7 : 1}
            accessibilityRole={post.authorId ? 'button' : 'none'}
            accessibilityLabel={
              post.authorId
                ? `View ${post.authorName}'s profile`
                : undefined
            }
          >
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
          </TouchableOpacity>
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
            {renderMarkdown(post.content ?? '', styles.content2)}
            {(post.imageUrls ?? []).length > 0 ? (
              <View style={styles.postImages}>
                {(post.imageUrls ?? []).map((url) =>
                  Platform.OS === 'web' ? (
                    createElement('img', {
                      key: url,
                      src: url,
                      style: {
                        width: '100%',
                        maxWidth: 420,
                        borderRadius: 8,
                        marginBottom: 8,
                        display: 'block',
                      },
                      alt: '',
                    })
                  ) : (
                    <Image
                      key={url}
                      source={{ uri: url }}
                      style={styles.postImageNative}
                      accessibilityLabel=""
                    />
                  )
                )}
              </View>
            ) : null}
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
              <View
                key={r.id}
                style={[
                  styles.replyItem,
                  r.parentReplyId ? styles.replyItemNested : null,
                  r._optimistic ? styles.replyItemOptimistic : null,
                ]}
              >
                <View style={styles.replyTop}>
                  <TouchableOpacity
                    style={styles.replyAuthorRow}
                    onPress={() => {
                      if (r.authorId) {
                        navigation.navigate('ArtistProfile', {
                          userId: r.authorId,
                        });
                      }
                    }}
                    activeOpacity={r.authorId ? 0.7 : 1}
                    accessibilityRole={r.authorId ? 'button' : 'none'}
                    accessibilityLabel={
                      r.authorId
                        ? `View ${r.authorName}'s profile`
                        : undefined
                    }
                  >
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
                    </View>
                  </TouchableOpacity>
                  <View style={styles.replyBody}>
                    {renderMarkdown(r.content ?? '', styles.replyContent)}
                    {(r.imageUrls ?? []).length > 0 ? (
                      <View style={styles.postImages}>
                        {(r.imageUrls ?? []).map((url) =>
                          Platform.OS === 'web' ? (
                            createElement('img', {
                              key: url,
                              src: url,
                              style: {
                                width: '100%',
                                maxWidth: 360,
                                borderRadius: 8,
                                marginBottom: 8,
                                display: 'block',
                              },
                              alt: '',
                            })
                          ) : (
                            <Image
                              key={url}
                              source={{ uri: url }}
                              style={styles.replyImageNative}
                              accessibilityLabel=""
                            />
                          )
                        )}
                      </View>
                    ) : null}
                    <TouchableOpacity
                      onPress={() => {
                        setReplyToId(r.id);
                        setReplyToName(r.authorName ?? 'user');
                        const handle = (r.authorName ?? 'user').replace(
                          /\s+/g,
                          ''
                        );
                        setReply((prev) => {
                          const mention = `@${handle} `;
                          const t = prev.trim();
                          if (!t) return mention;
                          if (t.startsWith(`@${handle}`)) return prev;
                          return `${mention}${prev}`;
                        });
                      }}
                      hitSlop={8}
                      style={styles.replyBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Reply to ${r.authorName ?? 'user'}`}
                    >
                      <Text style={styles.replyBtnText}>Reply</Text>
                    </TouchableOpacity>
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

      <View style={styles.replyBarWrap}>
        {replyToName ? (
          <View style={styles.replyingTo}>
            <Text style={styles.replyingToText}>
              Replying to {replyToName}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setReplyToId(null);
                setReplyToName(null);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cancel reply to"
            >
              <Text style={styles.replyingToCancel}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {replyImages.length > 0 ? (
          <View style={styles.imageStrip}>
            {replyImages.map((url, i) => (
              <View key={`${url}-${i}`} style={styles.imageThumbnailWrap}>
                {Platform.OS === 'web'
                  ? createElement('img', {
                      src: url,
                      style: {
                        width: 56,
                        height: 56,
                        borderRadius: 6,
                        objectFit: 'cover',
                      },
                      alt: '',
                    })
                  : (
                    <Image
                      source={{ uri: url }}
                      style={styles.replyThumbNative}
                      accessibilityLabel=""
                    />
                  )}
                <TouchableOpacity
                  style={styles.imageThumbnailRemove}
                  onPress={() =>
                    setReplyImages((prev) => prev.filter((_, j) => j !== i))
                  }
                  hitSlop={4}
                >
                  <Text style={styles.imageThumbnailRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.replyBar}>
          {replyImages.length < 2 ? (
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={() => {
                if (uploadingImage) return;
                if (Platform.OS === 'web') {
                  openWebImageFilePicker((file) => {
                    void (async () => {
                      if (!file) return;
                      setUploadingImage(true);
                      try {
                        const picked = await readImageFileAsBase64(file);
                        if (!picked) return;
                        const url = await uploadForumImage(tenantId, picked);
                        if (url) {
                          setReplyImages((prev) =>
                            [...prev, url].slice(0, 2)
                          );
                        }
                      } finally {
                        setUploadingImage(false);
                      }
                    })();
                  });
                  return;
                }
                void (async () => {
                  setUploadingImage(true);
                  try {
                    const url = await pickAndUploadImage();
                    if (url) {
                      setReplyImages((prev) =>
                        [...prev, url].slice(0, 2)
                      );
                    }
                  } finally {
                    setUploadingImage(false);
                  }
                })();
              }}
              disabled={uploadingImage}
              accessibilityLabel="Add image"
              hitSlop={8}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.clay} />
              ) : (
                <Text style={styles.attachBtnText}>⌅</Text>
              )}
            </TouchableOpacity>
          ) : null}
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
            disabled={
              (!reply.trim() && replyImages.length === 0) || posting
            }
            loading={posting}
            style={styles.sendBtn}
          />
        </View>
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
  replyItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[3],
    gap: spacing[1],
  },
  replyItemNested: {
    marginLeft: spacing[6],
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: spacing[3],
  },
  replyItemOptimistic: {
    opacity: 0.6,
  },
  replyTop: {
    gap: spacing[2],
  },
  replyAuthorRow: {
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
  replyBody: {
    gap: spacing[1],
  },
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
  replyBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing[1],
  },
  replyBtnText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textDecorationLine: 'underline',
  },
  replyBarWrap: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingBottom: Platform.OS === 'ios' ? spacing[6] : spacing[2],
  },
  replyingTo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.clayLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  replyingToText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.clay,
  },
  replyingToCancel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    padding: spacing[1],
  },
  replyBar: {
    flexDirection: 'row',
    gap: spacing[2],
    padding: spacing[3],
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
    minHeight: Platform.OS === 'web' ? 80 : 44,
    maxHeight: Platform.OS === 'web' ? 180 : 120,
    textAlignVertical: 'top',
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
  imageStrip: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  imageThumbnailWrap: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  replyThumbNative: {
    width: 56,
    height: 56,
    borderRadius: 6,
  },
  imageThumbnailRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageThumbnailRemoveText: {
    color: colors.surface,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
  },
  attachBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attachBtnText: {
    fontSize: 20,
    color: colors.inkLight,
  },
  postImages: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
  postImageNative: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  replyImageNative: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'cover',
  },
});
