import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import { useAuth } from '../../hooks/useAuth';
import {
  apiFetch,
  resolveCommunityStudioSlugForTenant,
} from '../../services/api';
import { alertMessage } from '../../utils/confirmAction';
import { Avatar, Button } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import type { AppStackParamList, MainTabParamList } from '../../navigation/types';

type NotifType =
  | 'forum_reply'
  | 'forum_reply_thread'
  | 'new_member'
  | 'new_event'
  | 'studio_join_request'
  | 'studio_join_request_update';

type Notification = {
  id: string;
  type: NotifType;
  read: boolean;
  actorName: string;
  actorAvatarUrl?: string;
  title: string;
  body: string;
  refId?: string;
  refType?: string;
  /** When present (e.g. join-request notifications), used for deep link target studio. */
  tenantId?: string;
  /** Community slug when backend includes it (applicant notifications). */
  studioSlug?: string;
  createdAt?: string;
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function NotifIcon({ type }: { type: NotifType }) {
  const bg =
    type === 'forum_reply' || type === 'forum_reply_thread'
      ? colors.clayLight
      : type === 'new_member'
        ? colors.mossLight
        : type === 'studio_join_request' || type === 'studio_join_request_update'
          ? colors.mossLight
          : colors.cream;
  const label =
    type === 'forum_reply' || type === 'forum_reply_thread'
      ? '💬'
      : type === 'new_member'
        ? '👤'
        : type === 'studio_join_request' || type === 'studio_join_request_update'
          ? '🏛'
          : '📅';
  return (
    <View style={[styles.icon, { backgroundColor: bg }]}>
      <Text style={styles.iconText}>{label}</Text>
    </View>
  );
}

const NOTIF_TYPES: NotifType[] = [
  'forum_reply',
  'forum_reply_thread',
  'new_member',
  'new_event',
  'studio_join_request',
  'studio_join_request_update',
];

function parseNotification(raw: Record<string, unknown>): Notification | null {
  const id = String(raw.id ?? raw._id ?? '').trim();
  if (!id) return null;
  const typeRaw = String(raw.type ?? 'new_event');
  const type = NOTIF_TYPES.includes(typeRaw as NotifType)
    ? (typeRaw as NotifType)
    : 'new_event';
  return {
    id,
    type,
    read: Boolean(raw.read ?? raw.is_read),
    actorName: String(raw.actorName ?? raw.actor_name ?? ''),
    actorAvatarUrl: (() => {
      const v = raw.actorAvatarUrl ?? raw.actor_avatar_url;
      if (v == null || String(v).trim() === '') return undefined;
      return String(v).trim();
    })(),
    title: String(raw.title ?? ''),
    body: String(raw.body ?? ''),
    refId:
      raw.refId != null
        ? String(raw.refId)
        : raw.ref_id != null
          ? String(raw.ref_id)
          : undefined,
    refType:
      raw.refType != null
        ? String(raw.refType)
        : raw.ref_type != null
          ? String(raw.ref_type)
          : undefined,
    tenantId:
      raw.tenantId != null
        ? String(raw.tenantId)
        : raw.tenant_id != null
          ? String(raw.tenant_id)
          : undefined,
    studioSlug:
      raw.studioSlug != null
        ? String(raw.studioSlug)
        : raw.studio_slug != null
          ? String(raw.studio_slug)
          : undefined,
    createdAt:
      raw.createdAt != null
        ? String(raw.createdAt)
        : raw.created_at != null
          ? String(raw.created_at)
          : undefined,
  };
}

export default function NotificationsScreen() {
  const navigation =
    useNavigation<MaterialTopTabNavigationProp<MainTabParamList>>();
  const { studios, activeTenantId } = useAuth();
  const currentStudio =
    studios.find((s) => s.tenantId === activeTenantId) ??
    studios.find((s) => s.status === 'active') ??
    studios[0];
  const fallbackTenantId = activeTenantId || currentStudio?.tenantId || '';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{
        notifications?: unknown[];
        unread?: number;
      }>('/notifications', {}, fallbackTenantId);
      const rawList = Array.isArray(res.notifications) ? res.notifications : [];
      const list = rawList
        .map((item) =>
          item && typeof item === 'object'
            ? parseNotification(item as Record<string, unknown>)
            : null
        )
        .filter((n): n is Notification => n != null);
      setNotifications(list);
      setUnread(typeof res.unread === 'number' ? res.unread : list.filter((n) => !n.read).length);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load notifications.');
      setNotifications([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }, [fallbackTenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function markAllRead() {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' }, fallbackTenantId);
      await load();
    } catch {
      /* silent */
    }
  }

  async function onPressNotif(item: Notification) {
    const stack =
      navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
    try {
      await apiFetch(`/notifications/${item.id}/read`, { method: 'POST' }, fallbackTenantId);
      await load();
    } catch {
      /* still try navigation */
    }

    const rt = (item.refType ?? '').toLowerCase();

    if (
      item.type === 'studio_join_request' ||
      rt === 'studio_join_request'
    ) {
      const tid = item.tenantId ?? fallbackTenantId;
      if (tid) {
        stack?.navigate('StudioJoinRequests', {
          tenantId: tid,
          focusRequestId: item.refId,
        });
      }
      return;
    }

    if (
      item.type === 'studio_join_request_update' ||
      rt === 'studio_join_request_update'
    ) {
      void (async () => {
        let slug = item.studioSlug?.trim();
        if (!slug && item.tenantId) {
          slug =
            (await resolveCommunityStudioSlugForTenant(item.tenantId)) ??
            undefined;
        }
        if (!slug && !item.tenantId && fallbackTenantId) {
          slug =
            (await resolveCommunityStudioSlugForTenant(fallbackTenantId)) ??
            undefined;
        }
        if (slug) {
          stack?.navigate('StudioPublicProfile', {
            studioSlug: slug,
            studioName: '',
          });
          return;
        }
        alertMessage(
          String(item.title ?? '').trim() || 'Studio',
          String(item.body ?? '').trim() || 'No further details.'
        );
      })();
      return;
    }
    if (rt === 'forum_post' && item.refId) {
      stack?.navigate('ForumPost', { postId: item.refId });
      return;
    }
    if ((rt === 'studio' || rt === 'tenant') && item.refId) {
      stack?.navigate('Members', { tenantId: item.refId });
      return;
    }
    if (item.type === 'new_member' && (item.refId || fallbackTenantId)) {
      stack?.navigate('Members', {
        tenantId: item.refId ?? fallbackTenantId,
      });
      return;
    }
    if (item.type === 'new_event' && (item.refId || fallbackTenantId)) {
      stack?.navigate('EventList', {
        tenantId: item.refId ?? fallbackTenantId,
      });
    }
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerBar}>
        {unread > 0 ? (
          <Button
            label="Mark all read"
            variant="ghost"
            onPress={() => void markAllRead()}
            hitSlop={8}
            accessibilityLabel="Mark all notifications as read"
            style={styles.markAllReadBtn}
          />
        ) : (
          <View />
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No notifications yet.</Text>
          <Text style={styles.emptyHint}>
            You&apos;ll see forum replies, new members, join requests and events
            here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          style={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.row,
                item.read ? styles.rowRead : styles.rowUnread,
              ]}
              onPress={() => void onPressNotif(item)}
              activeOpacity={0.75}
            >
              {item.actorAvatarUrl ? (
                <Avatar
                  name={item.actorName || '?'}
                  size="md"
                  variant="clay"
                  imageUrl={item.actorAvatarUrl}
                />
              ) : (
                <NotifIcon type={item.type} />
              )}
              <View style={styles.textWrap}>
                <Text
                  style={[styles.title, !item.read && styles.titleUnread]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  list: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
    minHeight: 36,
  },
  markAllReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing[1],
    minHeight: 36,
  },
  row: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    alignItems: 'flex-start',
  },
  rowUnread: { backgroundColor: colors.surface },
  rowRead: { backgroundColor: colors.cream },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  textWrap: { flex: 1, gap: 2 },
  title: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  titleUnread: { fontWeight: '500' },
  body: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 16,
  },
  time: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[2],
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
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
});
