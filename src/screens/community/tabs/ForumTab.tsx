import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = category ? `?category=${category}` : '';
      const res = await apiFetch<{ posts: Post[] }>(
        `/community/forum${qs}`,
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
        }))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load forum.');
    } finally {
      setLoading(false);
    }
  }, [category, tenantId]);

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
    if (!newContent.trim()) {
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
          }),
        },
        tenantId
      );
      setNewTitle('');
      setNewContent('');
      setNewCategory('general');
      setShowNewPost(false);
      await load();
    } catch (e: unknown) {
      setPostError(e instanceof Error ? e.message : 'Could not post.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <View style={styles.root}>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
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
            <TextInput
              style={[styles.input, styles.textarea]}
              value={newContent}
              onChangeText={setNewContent}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.inkLight}
              multiline
              numberOfLines={5}
            />
            {postError ? (
              <Text style={styles.errorText}>{postError}</Text>
            ) : null}
            <View style={styles.modalBtns}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setShowNewPost(false)}
              />
              <Button
                label="Post"
                onPress={() => void onSubmitPost()}
                loading={posting}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
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
    borderRadius: 999,
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
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing[4],
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
  textarea: { height: 100, textAlignVertical: 'top' },
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
});
