import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { Divider } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ForumPost'>;

type Reply = {
  id: string;
  content: string;
  authorName: string;
  createdAt?: string;
};

type PostDetail = {
  id: string;
  title: string;
  content: string;
  category: string;
  authorName: string;
  replyCount: number;
  viewCount: number;
  createdAt?: string;
  replies: Reply[];
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ForumPostScreen({ route }: Props) {
  const { postId } = route.params;
  const { studios } = useAuth();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [replyError, setReplyError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<PostDetail>(
        `/community/forum/${postId}`,
        {},
        tenantId
      );
      setError('');
      setPost(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load post.');
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [postId, tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

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

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.postHeader}>
          <Text style={styles.category}>
            {post.category.replace(/_/g, ' ')}
          </Text>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.meta}>
            {post.authorName} · {timeAgo(post.createdAt)}
          </Text>
          <View style={styles.stats}>
            <Text style={styles.stat}>{post.replyCount} replies</Text>
            <Text style={styles.stat}>{post.viewCount} views</Text>
          </View>
        </View>

        <View style={styles.postBody}>
          <Text style={styles.content2}>{post.content}</Text>
        </View>

        <Divider />

        {replies.length > 0 ? (
          <View style={styles.replies}>
            <Text style={styles.repliesLabel}>Replies</Text>
            {replies.map((r) => (
              <View key={r.id} style={styles.replyCard}>
                <Text style={styles.replyAuthor}>
                  {r.authorName}{' '}
                  <Text style={styles.replyTime}>{timeAgo(r.createdAt)}</Text>
                </Text>
                <Text style={styles.replyContent}>{r.content}</Text>
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
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!reply.trim() || posting) && styles.sendBtnDisabled,
          ]}
          onPress={() => void onReply()}
          disabled={!reply.trim() || posting}
          activeOpacity={0.8}
        >
          {posting ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : (
            <Text style={styles.sendLabel}>Send</Text>
          )}
        </TouchableOpacity>
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
    backgroundColor: colors.clay,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.surface,
  },
});
