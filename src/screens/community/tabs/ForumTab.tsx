import React, { createElement, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import { useAuth } from '../../../hooks/useAuth';
import { apiFetch } from '../../../services/api';
import { AvatarImage } from '../../../components/AvatarImage';
import { Button } from '../../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../../theme/tokens';
import type { AppStackParamList, MainTabParamList } from '../../../navigation/types';

type Nav = MaterialTopTabNavigationProp<MainTabParamList>;

type Post = {
  id: string;
  title: string;
  category: string;
  authorName: string;
  authorAvatarUrl?: string;
  replyCount: number;
  viewCount: number;
  createdAt?: string;
  isPinned?: boolean;
  lastReplyAt?: string;
};

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'technique', label: 'Technique' },
  { key: 'clay_glazes', label: 'Clay & glazes' },
  { key: 'kiln', label: 'Kiln' },
  { key: 'business', label: 'Business' },
  { key: 'general', label: 'General' },
];

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

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

async function pickAndUploadForumImage(
  tenantId: string
): Promise<string | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        if (file.size > 3_000_000) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          void (async () => {
            try {
              const res = await apiFetch<{ imageUrl: string }>(
                '/uploads/forum-image',
                {
                  method: 'POST',
                  body: JSON.stringify({
                    imageBase64: base64,
                    mimeType: file.type,
                  }),
                },
                tenantId
              );
              resolve(res.imageUrl ?? null);
            } catch {
              resolve(null);
            }
          })();
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }
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

type WebEditorProps = {
  title: string;
  content: string;
  category: string;
  categories: { key: string; label: string }[];
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  posting: boolean;
  error: string;
  postImages: string[];
  onPostImagesChange: React.Dispatch<React.SetStateAction<string[]>>;
  tenantId: string;
};

function WebForumEditor({
  title,
  content,
  category,
  categories,
  onTitleChange,
  onContentChange,
  onCategoryChange,
  onSubmit,
  onCancel,
  posting,
  error,
  postImages,
  onPostImagesChange,
  tenantId,
}: WebEditorProps) {
  const [uploadingImage, setUploadingImage] = useState(false);

  if (typeof document === 'undefined') return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '16px',
    fontFamily: 'inherit',
    border: '0.5px solid rgba(90,70,50,0.2)',
    borderRadius: '6px',
    backgroundColor: '#F7F3ED',
    color: '#1E1A16',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '8px',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '260px',
    maxHeight: '400px',
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
    overflowY: 'auto',
  };

  return (
    <View style={webEditorStyles.overlay}>
      <View style={webEditorStyles.container}>
        <View style={webEditorStyles.header}>
          <Text style={webEditorStyles.heading}>New discussion</Text>
          <TouchableOpacity onPress={onCancel} hitSlop={8}>
            <Text style={webEditorStyles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={webEditorStyles.label}>TITLE</Text>
        {createElement('input', {
          style: inputStyle,
          value: title,
          onChange: (e: { target: { value: string } }) =>
            onTitleChange(e.target.value),
          placeholder: 'What would you like to discuss?',
        })}

        <Text style={webEditorStyles.label}>CATEGORY</Text>
        <View style={webEditorStyles.catRow}>
          {categories.filter((c) => c.key).map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[
                webEditorStyles.chip,
                category === c.key && webEditorStyles.chipActive,
              ]}
              onPress={() => onCategoryChange(c.key)}
            >
              <Text
                style={[
                  webEditorStyles.chipLabel,
                  category === c.key && webEditorStyles.chipLabelActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={webEditorStyles.label}>CONTENT</Text>
        <View style={webEditorStyles.toolbar}>
          {(
            [
              {
                label: 'B',
                title: 'Bold',
                wrap: ['**', '**'] as const,
                style: { fontWeight: '700' as const },
              },
              {
                label: 'I',
                title: 'Italic',
                wrap: ['_', '_'] as const,
                style: { fontStyle: 'italic' as const },
              },
            ] as const
          ).map((btn) => (
            <TouchableOpacity
              key={btn.label}
              style={webEditorStyles.toolbarBtn}
              accessibilityLabel={btn.title}
              onPress={() => {
                const el = document.getElementById(
                  'forum-content'
                ) as HTMLTextAreaElement | null;
                if (!el) return;
                const start = el.selectionStart ?? 0;
                const end = el.selectionEnd ?? 0;
                const selected = content.slice(start, end) || 'text';
                const next =
                  content.slice(0, start) +
                  btn.wrap[0] +
                  selected +
                  btn.wrap[1] +
                  content.slice(end);
                onContentChange(next);
                setTimeout(() => {
                  el.focus();
                }, 0);
              }}
            >
              <Text style={[webEditorStyles.toolbarBtnText, btn.style]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={webEditorStyles.toolbarBtn}
            accessibilityLabel="Link"
            onPress={() => {
              if (typeof window === 'undefined') return;
              const url = window.prompt('URL:', 'https://');
              if (!url) return;
              const el = document.getElementById(
                'forum-content'
              ) as HTMLTextAreaElement | null;
              const start = el?.selectionStart ?? content.length;
              const end = el?.selectionEnd ?? content.length;
              const selected = content.slice(start, end) || 'link text';
              const next =
                content.slice(0, start) +
                `[${selected}](${url})` +
                content.slice(end);
              onContentChange(next);
              setTimeout(() => el?.focus(), 0);
            }}
          >
            <Text style={webEditorStyles.toolbarBtnText}>Link</Text>
          </TouchableOpacity>
        </View>

        {createElement('textarea', {
          id: 'forum-content',
          style: textareaStyle,
          value: content,
          onChange: (e: { target: { value: string } }) =>
            onContentChange(e.target.value),
          placeholder:
            "What's on your mind? Share a technique, ask a question, start a conversation...",
        })}

        <View style={webEditorStyles.imageStrip}>
          {postImages.map((url, i) => (
            <View
              key={`${url}-${i}`}
              style={webEditorStyles.imageThumbnailWrap}
            >
              {createElement('img', {
                src: url,
                style: {
                  width: 56,
                  height: 56,
                  borderRadius: 6,
                  objectFit: 'cover',
                },
                alt: '',
              })}
              <TouchableOpacity
                style={webEditorStyles.imageThumbnailRemove}
                onPress={() =>
                  onPostImagesChange((prev) => prev.filter((_, j) => j !== i))
                }
                hitSlop={4}
              >
                <Text style={webEditorStyles.imageThumbnailRemoveText}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          {postImages.length < 2 ? (
            <TouchableOpacity
              style={webEditorStyles.attachBtn}
              onPress={() => {
                void (async () => {
                  if (uploadingImage) return;
                  setUploadingImage(true);
                  const url = await pickAndUploadForumImage(tenantId);
                  if (url) {
                    onPostImagesChange((prev) => [...prev, url].slice(0, 2));
                  }
                  setUploadingImage(false);
                })();
              }}
              disabled={uploadingImage}
              accessibilityLabel="Add image"
              hitSlop={8}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.clay} />
              ) : (
                <Text style={webEditorStyles.attachBtnText}>⌅</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        {error ? <Text style={webEditorStyles.error}>{error}</Text> : null}

        <View style={webEditorStyles.actions}>
          <TouchableOpacity
            style={webEditorStyles.cancelBtn}
            onPress={onCancel}
          >
            <Text style={webEditorStyles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[webEditorStyles.postBtn, posting && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={posting}
          >
            <Text style={webEditorStyles.postBtnText}>
              {posting ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const webEditorStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30,26,22,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: spacing[4],
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing[5],
    width: '100%',
    maxWidth: 680,
    gap: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  closeBtn: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    padding: spacing[2],
  },
  label: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.5,
    marginBottom: -spacing[1],
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  chipActive: {
    backgroundColor: colors.clay,
    borderColor: colors.clay,
  },
  chipLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  chipLabelActive: {
    color: '#fff',
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  toolbarBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  toolbarBtnText: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.sm,
  },
  cancelBtnText: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
  },
  postBtn: {
    backgroundColor: colors.clay,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radius.sm,
  },
  postBtnText: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.md,
    color: '#fff',
  },
  imageStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  imageThumbnailWrap: {
    position: 'relative',
    width: 56,
    height: 56,
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
  },
  attachBtnText: {
    fontSize: 20,
    color: colors.inkLight,
  },
});

export default function ForumTab() {
  const { studios } = useAuth();
  const navigation = useNavigation<Nav>();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [sort, setSort] = useState<'latest' | 'active' | 'popular'>('latest');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const contentInputRef = useRef<TextInput>(null);
  const [postImages, setPostImages] = useState<string[]>([]);
  const [uploadingPostImage, setUploadingPostImage] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (category) qs.set('category', category);
      if (sort !== 'latest') qs.set('sort', sort);
      if (search) qs.set('q', search);
      const q = qs.toString();
      const res = await apiFetch<{ posts: Post[] }>(
        `/community/forum${q ? `?${q}` : ''}`,
        {},
        tenantId
      );
      const rawPosts = res.posts ?? [];
      setPosts(
        rawPosts.map((p) => ({
          ...p,
          authorAvatarUrl:
            p.authorAvatarUrl ??
            (p as { author_avatar_url?: string }).author_avatar_url,
          isPinned:
            p.isPinned ?? Boolean((p as { is_pinned?: boolean }).is_pinned),
          lastReplyAt:
            p.lastReplyAt ??
            (p as { last_reply_at?: string }).last_reply_at,
        }))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load forum.');
    } finally {
      setLoading(false);
    }
  }, [category, tenantId, sort, search]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function goPost(postId: string) {
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('ForumPost', { postId });
  }

  async function onSubmitPost() {
    setPostError('');
    if (!newTitle.trim()) {
      setPostError('Title is required.');
      return;
    }
    if (!newContent.trim() && postImages.length === 0) {
      setPostError('Content is required.');
      return;
    }
    setPosting(true);
    try {
      await apiFetch(
        '/community/forum',
        {
          method: 'POST',
          body: JSON.stringify({
            title: newTitle.trim(),
            content: newContent.trim(),
            category: newCategory,
            image_urls: postImages.slice(0, 2),
          }),
        },
        tenantId
      );
      setNewTitle('');
      setNewContent('');
      setNewCategory('general');
      setPostImages([]);
      setSelectionStart(0);
      setSelectionEnd(0);
      setShowNewPost(false);
      await load();
    } catch (e: unknown) {
      setPostError(e instanceof Error ? e.message : 'Could not post.');
    } finally {
      setPosting(false);
    }
  }

  function wrapSelection(before: string, after: string) {
    const selected = newContent.slice(selectionStart, selectionEnd);
    const wrapped = before + (selected || 'text') + after;
    const next =
      newContent.slice(0, selectionStart) +
      wrapped +
      newContent.slice(selectionEnd);
    setNewContent(next);
  }

  function insertLink() {
    const url =
      typeof window !== 'undefined'
        ? window.prompt('Enter URL:', 'https://')
        : null;
    if (!url) return;
    const selected = newContent.slice(selectionStart, selectionEnd);
    const label = selected || 'link text';
    const next =
      newContent.slice(0, selectionStart) +
      `[${label}](${url})` +
      newContent.slice(selectionEnd);
    setNewContent(next);
  }

  return (
    <View style={styles.root}>
      <View style={styles.sortRow}>
        {(['latest', 'active', 'popular'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sortChip, sort === s && styles.sortChipActive]}
            onPress={() => setSort(s)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.sortChipText,
                sort === s && styles.sortChipTextActive,
              ]}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.filterRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key || 'all'}
            style={[styles.chip, category === c.key && styles.chipActive]}
            onPress={() => setCategory(c.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipLabel,
                category === c.key && styles.chipLabelActive,
              ]}
            >
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={(v) => {
            setSearchInput(v);
            if (!v) setSearch('');
          }}
          placeholder="Search posts..."
          placeholderTextColor={colors.inkLight}
          returnKeyType="search"
          onSubmitEditing={() => setSearch(searchInput)}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No posts yet.</Text>
          <Text style={styles.emptyHint}>
            Be the first to start a discussion.
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item: p }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => goPost(p.id)}
              activeOpacity={0.75}
            >
              <View style={styles.cardRow}>
                <View style={styles.postAvatarWrap}>
                  <AvatarImage
                    url={p.authorAvatarUrl}
                    initials={authorInitials(p.authorName)}
                    size={40}
                    borderRadius={20}
                    bgColor={colors.clayLight}
                    textColor={colors.clay}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.postTitle}>{p.title}</Text>
                  {p.isPinned ? (
                    <Text style={styles.pinnedBadge}>Pinned</Text>
                  ) : null}
                  <Text style={styles.postMeta}>
                    {p.authorName} · {timeAgo(p.createdAt)} ·{' '}
                    {categoryLabel(p.category)}
                  </Text>
                  <View style={styles.statsRow}>
                    <Text style={styles.stat}>{p.replyCount} replies</Text>
                    <Text style={styles.stat}>{p.viewCount} views</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewPost(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabLabel}>+</Text>
      </TouchableOpacity>

      {showNewPost ? (
        Platform.OS === 'web' ? (
          <WebForumEditor
            title={newTitle}
            content={newContent}
            category={newCategory}
            categories={CATEGORIES}
            onTitleChange={setNewTitle}
            onContentChange={setNewContent}
            onCategoryChange={setNewCategory}
            onSubmit={() => void onSubmitPost()}
            onCancel={() => {
              setShowNewPost(false);
              setNewTitle('');
              setNewContent('');
              setNewCategory('general');
              setPostImages([]);
              setPostError('');
              setSelectionStart(0);
              setSelectionEnd(0);
            }}
            posting={posting}
            error={postError}
            postImages={postImages}
            onPostImagesChange={setPostImages}
            tenantId={tenantId}
          />
        ) : (
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKav}
            >
              <ScrollView
                style={styles.modal}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                scrollEnabled
              >
                <Text style={styles.modalTitle}>New discussion</Text>
                <TextInput
                  style={styles.input}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Title"
                  placeholderTextColor={colors.inkLight}
                />
                <View style={styles.catRow}>
                  {CATEGORIES.filter((c) => c.key).map((c) => (
                    <TouchableOpacity
                      key={c.key}
                      style={[
                        styles.chip,
                        newCategory === c.key && styles.chipActive,
                      ]}
                      onPress={() => setNewCategory(c.key)}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          newCategory === c.key && styles.chipLabelActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.toolbar}>
                  <TouchableOpacity
                    style={styles.toolbarBtn}
                    onPress={() => wrapSelection('**', '**')}
                    accessibilityLabel="Bold"
                  >
                    <Text style={styles.toolbarBtnText}>B</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.toolbarBtn}
                    onPress={() => wrapSelection('_', '_')}
                    accessibilityLabel="Italic"
                  >
                    <Text
                      style={[
                        styles.toolbarBtnText,
                        { fontStyle: 'italic' },
                      ]}
                    >
                      I
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.toolbarBtn}
                    onPress={insertLink}
                    accessibilityLabel="Link"
                  >
                    <Text style={styles.toolbarBtnText}>🔗</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  ref={contentInputRef}
                  style={[styles.input, styles.textarea]}
                  value={newContent}
                  onChangeText={setNewContent}
                  placeholder="What's on your mind?"
                  placeholderTextColor={colors.inkLight}
                  multiline
                  numberOfLines={8}
                  onSelectionChange={(e) => {
                    setSelectionStart(e.nativeEvent.selection.start);
                    setSelectionEnd(e.nativeEvent.selection.end);
                  }}
                />
                <View style={styles.newPostImageStrip}>
                  {postImages.map((url, i) => (
                    <View
                      key={`${url}-${i}`}
                      style={styles.imageThumbnailWrap}
                    >
                      <Image
                        source={{ uri: url }}
                        style={styles.replyThumbNative}
                        accessibilityLabel=""
                      />
                      <TouchableOpacity
                        style={styles.imageThumbnailRemove}
                        onPress={() =>
                          setPostImages((prev) =>
                            prev.filter((_, j) => j !== i)
                          )
                        }
                        hitSlop={4}
                      >
                        <Text style={styles.imageThumbnailRemoveText}>
                          ×
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {postImages.length < 2 ? (
                    <TouchableOpacity
                      style={styles.attachBtn}
                      onPress={() => {
                        void (async () => {
                          if (uploadingPostImage) return;
                          setUploadingPostImage(true);
                          const url = await pickAndUploadForumImage(tenantId);
                          if (url) {
                            setPostImages((prev) =>
                              [...prev, url].slice(0, 2)
                            );
                          }
                          setUploadingPostImage(false);
                        })();
                      }}
                      disabled={uploadingPostImage}
                      accessibilityLabel="Add image"
                      hitSlop={8}
                    >
                      {uploadingPostImage ? (
                        <ActivityIndicator size="small" color={colors.clay} />
                      ) : (
                        <Text style={styles.attachBtnText}>⌅</Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
                {postError ? (
                  <Text style={styles.errorText}>{postError}</Text>
                ) : null}
                <View style={styles.modalBtns}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={() => {
                      setShowNewPost(false);
                      setPostImages([]);
                      setSelectionStart(0);
                      setSelectionEnd(0);
                    }}
                  />
                  <Button
                    label="Post"
                    onPress={() => void onSubmitPost()}
                    loading={posting}
                  />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  sortRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  sortChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.clay,
    borderColor: colors.clay,
  },
  sortChipText: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    letterSpacing: 0.4,
  },
  sortChipTextActive: { color: colors.surface },
  filterRow: {
    flexDirection: 'row',
    padding: spacing[2],
    paddingHorizontal: spacing[3],
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.moss, borderColor: colors.moss },
  chipLabel: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
  },
  chipLabelActive: { color: colors.surface },
  searchRow: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    paddingTop: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  searchInput: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: 8,
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  pinnedBadge: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.moss,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[2],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textAlign: 'center',
  },
  sep: { height: 0.5, backgroundColor: colors.border },
  card: {
    backgroundColor: colors.surface,
    padding: spacing[4],
    gap: spacing[1],
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  postAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.clayLight,
  },
  cardBody: { flex: 1, minWidth: 0, gap: spacing[1] },
  postTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  postMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  stat: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.clay,
  },
  fab: {
    position: 'absolute',
    bottom: spacing[4],
    right: spacing[4],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLabel: {
    fontSize: 24,
    color: colors.surface,
    lineHeight: 28,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30,26,22,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalKav: {
    width: '100%',
    maxWidth: 600,
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalScrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  modalTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    backgroundColor: colors.cream,
  },
  textarea: {
    minHeight: 200,
    maxHeight: 320,
    textAlignVertical: 'top',
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing[1],
    paddingVertical: spacing[2],
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    marginTop: spacing[1],
  },
  toolbarBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toolbarBtnText: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  modalBtns: {
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'flex-end',
  },
  newPostImageStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
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
  },
  attachBtnText: {
    fontSize: 20,
    color: colors.inkLight,
  },
});
