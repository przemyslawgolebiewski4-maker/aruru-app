import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';

type Post = {
  id: string;
  title: string;
  category?: string;
  authorName: string;
  authorEmail: string;
  replyCount: number;
  createdAt?: string;
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function postMetaLine(p: Post): string {
  const parts = [p.authorName];
  if (p.category) parts.push(p.category);
  const ago = timeAgo(p.createdAt);
  if (ago) parts.push(ago);
  return parts.join(' · ');
}

export default function AdminForumScreen() {
  const { studios } = useAuth();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ posts: Post[] }>(
        '/admin/forum/posts',
        {},
        tenantId
      );
      setPosts(res.posts ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load posts.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function deletePost(post: Post) {
    const ok = await confirmDestructive(
      'Delete post',
      `Delete "${post.title}"? This cannot be undone.`,
      'Delete'
    );
    if (!ok) return;
    try {
      await apiFetch(
        `/admin/forum/posts/${post.id}`,
        { method: 'DELETE' },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not delete.'
      );
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );

  return (
    <FlatList
      style={styles.root}
      data={posts}
      keyExtractor={(p) => p.id}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>No posts.</Text>
        </View>
      }
      renderItem={({ item: p }) => (
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardInfo}>
              <Text style={styles.postTitle}>{p.title}</Text>
              <Text style={styles.postMeta}>{postMetaLine(p)}</Text>
              <Text style={styles.postSub}>
                {p.replyCount} replies · {p.authorEmail}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => void deletePost(p)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Delete post ${p.title}`}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  sep: { height: 0.5, backgroundColor: colors.border },
  card: { backgroundColor: colors.surface, padding: spacing[4] },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  cardInfo: { flex: 1, gap: 2 },
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
  postSub: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  deleteBtn: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.error + '44',
  },
  deleteBtnText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.error,
  },
});
