import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import { alertMessage } from '../../utils/confirmAction';

type Status = 'open' | 'in_progress' | 'resolved';

type Ticket = {
  id: string;
  userEmail: string;
  userName: string;
  topic: string;
  topicLabel: string;
  message: string;
  status: Status;
  adminReply?: string;
  repliedAt?: string;
  createdAt?: string;
};

const STATUS_FILTERS: { key: Status | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
];

function statusColor(s: Status): string {
  if (s === 'open') return colors.clay;
  if (s === 'in_progress') return '#EF9F27';
  return colors.moss;
}

function formatStatusLabel(s: Status): string {
  return s.replace(/_/g, ' ');
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function AdminSupportScreen() {
  const { studios } = useAuth();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter !== 'all' ? `?status=${filter}` : '';
      const res = await apiFetch<{ tickets: Ticket[]; openCount: number }>(
        `/admin/support${qs}`,
        {},
        tenantId
      );
      setTickets(res.tickets ?? []);
      setOpenCount(res.openCount ?? 0);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [filter, tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function handleStatusChange(id: string, status: Status) {
    setStatusLoading(id);
    try {
      await apiFetch(
        `/admin/support/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not update status.'
      );
    } finally {
      setStatusLoading(null);
    }
  }

  async function handleReply(ticket: Ticket) {
    if (!reply.trim()) {
      alertMessage('Error', 'Reply cannot be empty.');
      return;
    }
    setReplyLoading(true);
    try {
      await apiFetch(
        `/admin/support/${ticket.id}/reply`,
        {
          method: 'POST',
          body: JSON.stringify({ reply: reply.trim() }),
        },
        tenantId
      );
      setReply('');
      setExpanded(null);
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not send reply.'
      );
    } finally {
      setReplyLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {openCount > 0 ? (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            {openCount} open {openCount === 1 ? 'ticket' : 'tickets'} waiting
          </Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.clay} style={{ marginTop: spacing[8] }} />
      ) : tickets.length === 0 ? (
        <Text style={styles.empty}>No tickets.</Text>
      ) : (
        tickets.map((t) => (
          <View key={t.id} style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => {
                setExpanded(expanded === t.id ? null : t.id);
                setReply('');
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={
                expanded === t.id ? 'Collapse ticket' : 'Expand ticket'
              }
            >
              <View style={styles.cardLeft}>
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor(t.status) }]}
                />
                <View style={styles.cardMeta}>
                  <Text style={styles.cardName}>{t.userName || t.userEmail}</Text>
                  <Text style={styles.cardEmail}>{t.userEmail}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardTopic}>{t.topicLabel}</Text>
                <Text style={styles.cardDate}>{formatDate(t.createdAt)}</Text>
              </View>
            </TouchableOpacity>

            {expanded === t.id ? (
              <View style={styles.cardBody}>
                <Text style={styles.cardMessage}>{t.message}</Text>

                {t.adminReply ? (
                  <View style={styles.replyBlock}>
                    <Text style={styles.replyBlockLabel}>Your reply</Text>
                    <Text style={styles.replyBlockText}>{t.adminReply}</Text>
                  </View>
                ) : null}

                <View style={styles.statusRow}>
                  {(['open', 'in_progress', 'resolved'] as Status[]).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusBtn,
                        t.status === s && {
                          backgroundColor: statusColor(s),
                          borderColor: statusColor(s),
                        },
                      ]}
                      onPress={() => void handleStatusChange(t.id, s)}
                      disabled={statusLoading === t.id}
                    >
                      <Text
                        style={[
                          styles.statusBtnText,
                          t.status === s && { color: '#fff' },
                        ]}
                      >
                        {formatStatusLabel(s)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.replyInput}
                  value={reply}
                  onChangeText={setReply}
                  placeholder="Write a reply — sent to the user's email…"
                  placeholderTextColor={colors.inkLight}
                  multiline
                  numberOfLines={4}
                />
                <Button
                  label="Send reply & mark resolved"
                  variant="primary"
                  onPress={() => void handleReply(t)}
                  loading={replyLoading}
                  fullWidth
                  style={{ marginTop: spacing[2] }}
                />
              </View>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[4], paddingBottom: spacing[10] },
  alertBanner: {
    backgroundColor: colors.clayLight,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderWidth: 0.5,
    borderColor: colors.clay,
  },
  alertText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.clayDark,
    textAlign: 'center',
  },
  filterRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.clay, borderColor: colors.clay },
  filterChipText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  filterChipTextActive: { color: '#fff' },
  empty: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: spacing[8],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    gap: spacing[3],
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  cardMeta: { flex: 1 },
  cardName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  cardEmail: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  cardRight: { alignItems: 'flex-end' },
  cardTopic: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  cardDate: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  cardBody: {
    padding: spacing[4],
    paddingTop: 0,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  cardMessage: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    lineHeight: 20,
    marginBottom: spacing[4],
  },
  replyBlock: {
    backgroundColor: colors.cream,
    borderRadius: radius.sm,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  replyBlockLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginBottom: 4,
  },
  replyBlockText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    lineHeight: 20,
  },
  statusRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  statusBtn: {
    flex: 1,
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statusBtnText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  replyInput: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    backgroundColor: colors.surface,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
