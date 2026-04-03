import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import {
  alertMessage,
  confirmDestructive,
  confirmNeutral,
} from '../../utils/confirmAction';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';

type Sponsor = {
  id: string;
  companyName: string;
  description?: string;
  category?: string;
  websiteUrl?: string;
  status: string;
  createdAt?: string;
};

type SponsorsData = { pending: Sponsor[]; active: Sponsor[] };

export default function AdminSponsorsScreen() {
  const { studios } = useAuth();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [data, setData] = useState<SponsorsData>({ pending: [], active: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<SponsorsData>('/admin/sponsors', {}, tenantId);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load sponsors.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function approve(id: string, name: string) {
    const ok = await confirmNeutral(
      'Approve sponsor',
      `Approve ${name}? An email will be sent.`,
      'Approve & send email'
    );
    if (!ok) return;
    try {
      await apiFetch(
        `/admin/sponsors/${id}/approve`,
        { method: 'POST' },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not approve.'
      );
    }
  }

  async function reject(id: string, name: string) {
    const ok = await confirmDestructive(
      'Reject sponsor',
      `Reject ${name}?`,
      'Reject'
    );
    if (!ok) return;
    try {
      await apiFetch(
        `/admin/sponsors/${id}/reject`,
        { method: 'POST' },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not reject.'
      );
    }
  }

  async function suspend(id: string, name: string) {
    const ok = await confirmDestructive(
      'Suspend sponsor',
      `Suspend ${name}? They will be removed from active sponsors.`,
      'Suspend'
    );
    if (!ok) return;
    try {
      await apiFetch(
        `/admin/sponsors/${id}/suspend`,
        { method: 'POST' },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not suspend.'
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
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {data.pending.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Pending approval ({data.pending.length})
          </Text>
          {data.pending.map((s) => (
            <View key={s.id} style={[styles.card, styles.cardPending]}>
              <Text style={styles.companyName}>{s.companyName}</Text>
              {s.category ? <Text style={styles.meta}>{s.category}</Text> : null}
              {s.description ? (
                <Text style={styles.desc}>{s.description}</Text>
              ) : null}
              {s.websiteUrl ? (
                <Text style={styles.link}>{s.websiteUrl}</Text>
              ) : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnApprove]}
                  onPress={() => void approve(s.id, s.companyName)}
                >
                  <Text style={[styles.btnText, { color: colors.moss }]}>
                    Approve → send email
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnDanger]}
                  onPress={() => void reject(s.id, s.companyName)}
                >
                  <Text style={[styles.btnText, { color: colors.error }]}>
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          Active sponsors ({data.active.length})
        </Text>
        {data.active.length === 0 ? (
          <Text style={styles.emptyText}>No active sponsors yet.</Text>
        ) : (
          data.active.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={styles.companyName}>{s.companyName}</Text>
                  {s.category ? (
                    <Text style={styles.meta}>{s.category}</Text>
                  ) : null}
                  {s.websiteUrl ? (
                    <Text style={styles.link}>{s.websiteUrl}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.btn, styles.btnDanger]}
                  onPress={() => void suspend(s.id)}
                >
                  <Text style={[styles.btnText, { color: colors.error }]}>
                    Suspend
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingBottom: spacing[6] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  section: { padding: spacing[4], gap: spacing[2] },
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardPending: {
    borderColor: colors.clayBorder,
    borderLeftWidth: 2,
    borderLeftColor: colors.clay,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: { flex: 1 },
  companyName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  meta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  desc: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  link: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.clay,
  },
  actions: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  btn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  btnApprove: { borderColor: colors.moss + '44' },
  btnDanger: { borderColor: colors.error + '44' },
  btnText: { fontFamily: typography.mono, fontSize: fontSize.xs },
});
