import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Linking,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch, type PatchStudioAdminBody } from '../../services/api';
import {
  alertMessage,
  confirmDestructive,
  confirmNeutral,
  pickTrialExtensionDays,
} from '../../utils/confirmAction';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';

type Studio = {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  subscriptionStatus: string;
  subscriptionTier: string;
  memberCount: number;
  trialEndsAt?: string;
  stripeCustomerId?: string;
  createdAt?: string;
  suspensionReason?: string | null;
};

function parseAdminStudio(raw: Record<string, unknown>): Studio {
  const trial = raw.trialEndsAt ?? raw.trial_ends_at;
  const sr = raw.suspensionReason ?? raw.suspension_reason;
  let suspensionReason: string | null = null;
  if (sr != null && sr !== '') {
    const t = String(sr).trim();
    suspensionReason = t.length ? t : null;
  }
  const stripeRaw = raw.stripeCustomerId ?? raw.stripe_customer_id;
  return {
    id: String(raw.id ?? raw._id ?? ''),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    ownerEmail: String(raw.ownerEmail ?? raw.owner_email ?? ''),
    subscriptionStatus: String(
      raw.subscriptionStatus ?? raw.subscription_status ?? ''
    ),
    subscriptionTier: String(
      raw.subscriptionTier ?? raw.subscription_tier ?? ''
    ),
    memberCount: Number(raw.memberCount ?? raw.member_count ?? 0) || 0,
    trialEndsAt:
      trial != null && String(trial).trim() !== '' ? String(trial) : undefined,
    stripeCustomerId:
      stripeRaw != null && String(stripeRaw).trim() !== ''
        ? String(stripeRaw)
        : undefined,
    createdAt:
      raw.createdAt != null || raw.created_at != null
        ? String(raw.createdAt ?? raw.created_at)
        : undefined,
    suspensionReason,
  };
}

function statusColor(s: string): string {
  if (s === 'active') return colors.moss;
  if (s === 'trial') return colors.clay;
  if (s === 'past_due') return colors.error;
  if (s === 'suspended') return colors.error;
  if (s === 'cancelled') return colors.inkLight;
  return colors.inkLight;
}

function timeLeft(iso?: string): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days <= 0) return 'expired';
  return `${days}d left`;
}

type ReasonModalState = {
  studio: Studio;
  mode: 'suspend' | 'edit_reason';
};

export default function AdminStudiosScreen() {
  const { studios } = useAuth();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [list, setList] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState('');
  const [reasonModal, setReasonModal] = useState<ReasonModalState | null>(null);
  const [reasonDraft, setReasonDraft] = useState('');
  const [reasonSaving, setReasonSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = debouncedSearch
        ? `?search=${encodeURIComponent(debouncedSearch)}`
        : '';
      const res = await apiFetch<{ studios: unknown[] }>(
        `/admin/studios${qs}`,
        {},
        tenantId
      );
      const rows = (res.studios ?? []) as Record<string, unknown>[];
      setList(rows.map((r) => parseAdminStudio(r)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load studios.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function extendTrial(studio: Studio) {
    const days = await pickTrialExtensionDays(studio.name);
    if (days == null) return;
    await patchStudio(studio.id, { extendTrialDays: days });
  }

  async function patchStudio(
    id: string,
    body: PatchStudioAdminBody
  ): Promise<boolean> {
    try {
      await apiFetch(
        `/admin/studios/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
        tenantId
      );
      await load();
      return true;
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not update studio.'
      );
      return false;
    }
  }

  async function suspendStudio(studio: Studio) {
    const ok = await confirmDestructive(
      'Suspend studio',
      `Suspend ${studio.name}? Owner will lose access.`,
      'Suspend'
    );
    if (!ok) return;
    setReasonDraft('');
    setReasonModal({ studio, mode: 'suspend' });
  }

  async function submitReasonModal() {
    if (!reasonModal) return;
    const trimmed = reasonDraft.trim();
    const payload: PatchStudioAdminBody =
      reasonModal.mode === 'suspend'
        ? {
            subscriptionStatus: 'suspended',
            suspensionReason: trimmed.length ? trimmed : null,
          }
        : { suspensionReason: trimmed.length ? trimmed : null };
    setReasonSaving(true);
    try {
      const ok = await patchStudio(reasonModal.studio.id, payload);
      if (ok) {
        setReasonModal(null);
        setReasonDraft('');
      }
    } finally {
      setReasonSaving(false);
    }
  }

  /** No separate unsuspend route: PATCH accepts subscriptionStatus (same as suspend). */
  async function reactivateStudio(studio: Studio) {
    const ok = await confirmNeutral(
      'Reactivate studio',
      `Restore access for ${studio.name}? The owner will be able to use the studio again.`,
      'Reactivate'
    );
    if (!ok) return;
    await patchStudio(studio.id, { subscriptionStatus: 'active' });
  }

  function openEditReason(studio: Studio) {
    setReasonDraft(studio.suspensionReason?.trim() ?? '');
    setReasonModal({ studio, mode: 'edit_reason' });
  }

  function openStripeCustomer(studio: Studio) {
    const id = studio.stripeCustomerId?.trim();
    if (!id) return;
    const url = `https://dashboard.stripe.com/customers/${encodeURIComponent(id)}`;
    void Linking.openURL(url);
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email..."
          placeholderTextColor={colors.inkLight}
          autoCapitalize="none"
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
      ) : (
        <FlatList
          style={styles.list}
          data={list}
          keyExtractor={(s) => s.id}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item: s }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.studioName}>{s.name}</Text>
                  <Text style={styles.studioEmail}>{s.ownerEmail}</Text>
                  <Text style={styles.studioMeta}>
                    {s.memberCount} members · {s.subscriptionTier}
                    {s.trialEndsAt ? ` · ${timeLeft(s.trialEndsAt)}` : ''}
                  </Text>
                  {s.subscriptionStatus === 'suspended' &&
                  s.suspensionReason ? (
                    <Text style={styles.suspensionReason}>
                      {s.suspensionReason}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor(s.subscriptionStatus) + '22' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusColor(s.subscriptionStatus) },
                    ]}
                  >
                    {s.subscriptionStatus}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                {s.subscriptionStatus === 'trial' && (
                  <Button
                    label="Extend trial"
                    variant="secondary"
                    onPress={() => void extendTrial(s)}
                  />
                )}
                {s.stripeCustomerId ? (
                  <Button
                    label="Open in Stripe ↗"
                    variant="secondary"
                    onPress={() => openStripeCustomer(s)}
                  />
                ) : null}
                {s.subscriptionStatus === 'suspended' ? (
                  <>
                    <Button
                      label="Reactivate"
                      variant="secondary"
                      onPress={() => void reactivateStudio(s)}
                    />
                    <Button
                      label="Edit suspension reason"
                      variant="secondary"
                      onPress={() => openEditReason(s)}
                    />
                  </>
                ) : (
                  <Button
                    label="Suspend"
                    variant="danger"
                    onPress={() => void suspendStudio(s)}
                  />
                )}
              </View>
            </View>
          )}
        />
      )}

      <Modal
        visible={reasonModal != null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!reasonSaving) setReasonModal(null);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            if (!reasonSaving) setReasonModal(null);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKb}
          >
            <Pressable
              style={styles.modalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>
                {reasonModal?.mode === 'suspend'
                  ? 'Suspension message'
                  : 'Edit suspension message'}
              </Text>
              <Text style={styles.modalHint}>
                Optional note for the studio owner (max 2000 characters). Sent
                as suspensionReason in the API.
              </Text>
              <TextInput
                style={styles.modalInput}
                value={reasonDraft}
                onChangeText={setReasonDraft}
                placeholder="e.g. Payment failed. Please contact support@…"
                placeholderTextColor={colors.inkLight}
                multiline
                maxLength={2000}
                editable={!reasonSaving}
              />
              <View style={styles.modalActions}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => {
                    if (!reasonSaving) setReasonModal(null);
                  }}
                />
                <Button
                  label={
                    reasonModal?.mode === 'suspend' ? 'Confirm suspend' : 'Save'
                  }
                  variant={
                    reasonModal?.mode === 'suspend' ? 'danger' : 'primary'
                  }
                  loading={reasonSaving}
                  onPress={() => void submitReasonModal()}
                />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  list: { flex: 1 },
  searchBar: {
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing[2],
    paddingHorizontal: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  sep: { height: 0.5, backgroundColor: colors.border },
  card: {
    backgroundColor: colors.surface,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: { flex: 1, gap: 2 },
  studioName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  studioEmail: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  studioMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  suspensionReason: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    marginTop: spacing[2],
    lineHeight: 15,
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusText: { fontFamily: typography.mono, fontSize: 9 },
  actions: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 26, 22, 0.45)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  modalKb: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },
  modalTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  modalHint: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
  },
  modalInput: {
    minHeight: 100,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
});
