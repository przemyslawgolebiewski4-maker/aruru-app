import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Avatar, Button, Input, SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch, postStudioMiscCharge } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { confirmDestructive } from '../../utils/confirmAction';

type Nav = NativeStackNavigationProp<AppStackParamList, 'KilnLoadMembers'>;
type Route = RouteProp<AppStackParamList, 'KilnLoadMembers'>;

export type StudioMember = {
  userId: string;
  email?: string;
  name?: string;
  status?: string;
  avatarUrl?: string;
};

type FiringItem = {
  id?: string;
  _id?: string;
  userId?: string;
  weightKg?: number;
  memberName?: string;
  member_name?: string;
  externalName?: string;
  external_name?: string;
  isExternal?: boolean;
  is_external?: boolean;
};

function memberDisplayLabel(m: StudioMember) {
  return (m?.name || m?.email || '').trim();
}

function itemMemberFallback(it: FiringItem | undefined) {
  return (
    it?.memberName?.trim() ||
    it?.member_name?.trim() ||
    it?.externalName?.trim() ||
    it?.external_name?.trim() ||
    'Member'
  );
}

function extractItems(data: unknown): FiringItem[] {
  if (!data || typeof data !== 'object') return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.items)) return o.items as FiringItem[];
  if (
    o.firing &&
    typeof o.firing === 'object' &&
    Array.isArray((o.firing as { items?: FiringItem[] }).items)
  ) {
    return (o.firing as { items: FiringItem[] }).items;
  }
  return [];
}

export default function KilnLoadMembersScreen({ route }: { route: Route }) {
  const { tenantId, firingId } = route.params;
  const navigation = useNavigation<Nav>();
  const { studios } = useAuth();
  const studioCurrency = (
    studios.find((s) => s.tenantId === tenantId)?.currency ?? 'EUR'
  ).toUpperCase();

  const [members, setMembers] = useState<StudioMember[]>([]);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [items, setItems] = useState<FiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [mossInputIds, setMossInputIds] = useState<Record<string, boolean>>({});
  const [externalName, setExternalName] = useState('');
  const [externalWeight, setExternalWeight] = useState('');
  const [externalSaving, setExternalSaving] = useState(false);
  const [externalError, setExternalError] = useState('');
  const [showDamage, setShowDamage] = useState(false);
  const [damageUserId, setDamageUserId] = useState('');
  const [damageDesc, setDamageDesc] = useState('');
  const [damageAmount, setDamageAmount] = useState('');
  const [damageSaving, setDamageSaving] = useState(false);
  const [damageError, setDamageError] = useState('');
  const [damageSaved, setDamageSaved] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const [memRes, fireData] = await Promise.all([
        apiFetch<{ members: StudioMember[] }>(
          `/studios/${tenantId}/members`,
          {},
          tenantId
        ),
        apiFetch<unknown>(
          `/studios/${tenantId}/kiln/firings/${firingId}`,
          {},
          tenantId
        ),
      ]);
      const active = (memRes.members ?? [])
        .filter((m) => (m.status || '').toLowerCase() === 'active')
        .map((m) => ({
          ...m,
          avatarUrl:
            m.avatarUrl ?? (m as { avatar_url?: string }).avatar_url,
        }));
      setMembers(active);
      const nextItems = extractItems(fireData);
      setItems(nextItems);

      const nextInputs: Record<string, string> = {};
      for (const m of active) {
        nextInputs[m.userId] = '';
      }
      for (const it of nextItems) {
        if (it.userId != null && it.weightKg != null) {
          nextInputs[it.userId] = String(it.weightKg);
        }
      }
      setWeightInputs(nextInputs);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, firingId]);

  const refreshItems = useCallback(async () => {
    const fireData = await apiFetch<unknown>(
      `/studios/${tenantId}/kiln/firings/${firingId}`,
      {},
      tenantId
    );
    setItems(extractItems(fireData));
  }, [tenantId, firingId]);

  useEffect(() => {
    load();
  }, [load]);

  const canSave = useMemo(() => {
    return members.some((m) => {
      const raw = (weightInputs[m.userId] ?? '').trim();
      if (!raw) return false;
      const n = parseFloat(raw.replace(',', '.'));
      return Number.isFinite(n) && n > 0;
    });
  }, [members, weightInputs]);

  const totalsByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      const uid = it.userId;
      if (!uid) continue;
      map.set(uid, (map.get(uid) ?? 0) + (Number(it.weightKg) || 0));
    }
    return map;
  }, [items]);

  const sessionTotalRows = useMemo(() => {
    const rows: {
      key: string;
      kg: number;
      name: string;
      isExternal: boolean;
    }[] = [];
    for (const [userId, kg] of totalsByUser.entries()) {
      if (kg <= 0) continue;
      const m = members.find((x) => x.userId === userId);
      const sample = items.find((i) => i.userId === userId);
      const name = m
        ? memberDisplayLabel(m) || itemMemberFallback(sample)
        : itemMemberFallback(sample);
      rows.push({
        key: userId,
        kg,
        name: name || 'Member',
        isExternal: false,
      });
    }
    let extIdx = 0;
    for (const it of items) {
      if (it.userId != null && String(it.userId).trim() !== '') continue;
      const kg = Number(it.weightKg) || 0;
      if (kg <= 0) continue;
      const extFlag = it.isExternal ?? it.is_external;
      rows.push({
        key: String(it.id ?? it._id ?? `external-${extIdx++}`),
        kg,
        name: itemMemberFallback(it) || 'External guest',
        isExternal: extFlag !== false,
      });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [totalsByUser, members, items]);

  const grandTotalKg = useMemo(() => {
    let s = 0;
    for (const it of items) {
      s += Number(it.weightKg) || 0;
    }
    return s;
  }, [items]);

  function setWeight(userId: string, text: string) {
    setWeightInputs((prev) => ({ ...prev, [userId]: text }));
    setSaveError('');
  }

  async function saveWeight() {
    if (!canSave) return;
    setSaving(true);
    setSaveError('');
    const pairs: { userId: string; w: number }[] = [];
    for (const m of members) {
      const raw = (weightInputs[m.userId] ?? '').trim();
      if (!raw) continue;
      const n = parseFloat(raw.replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0) continue;
      pairs.push({ userId: m.userId, w: n });
    }

    const errors: string[] = [];
    const savedIds: string[] = [];

    try {
      for (const { userId, w } of pairs) {
        try {
          await apiFetch(
            `/studios/${tenantId}/kiln/firings/${firingId}/items`,
            {
              method: 'POST',
              body: JSON.stringify({ userId, weightKg: w }),
            },
            tenantId
          );
          savedIds.push(userId);
        } catch (e: unknown) {
          const msg =
            e instanceof Error ? e.message : 'Save failed for a member.';
          errors.push(msg);
        }
      }

      try {
        await refreshItems();
      } catch (e: unknown) {
        errors.push(
          e instanceof Error ? e.message : 'Could not refresh firing.'
        );
      }

      if (errors.length > 0) {
        setSaveError(errors.join('\n'));
      }

      if (errors.length === 0 && savedIds.length > 0) {
        const cleared: Record<string, string> = {};
        for (const m of members) {
          cleared[m.userId] = '';
        }
        setWeightInputs(cleared);
        const flash: Record<string, boolean> = {};
        for (const id of savedIds) {
          flash[id] = true;
        }
        setMossInputIds(flash);
        setTimeout(() => setMossInputIds({}), 1000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddExternal() {
    setExternalError('');
    const name = externalName.trim();
    if (!name) {
      setExternalError('Name is required.');
      return;
    }
    const kg = parseFloat(externalWeight.replace(',', '.'));
    if (isNaN(kg) || kg <= 0) {
      setExternalError('Enter a valid weight.');
      return;
    }
    setExternalSaving(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/kiln/firings/${firingId}/items/external`,
        {
          method: 'POST',
          body: JSON.stringify({ externalName: name, weightKg: kg }),
        },
        tenantId
      );
      setExternalName('');
      setExternalWeight('');
      await load();
    } catch (e: unknown) {
      setExternalError(
        e instanceof Error ? e.message : 'Could not add external guest.'
      );
    } finally {
      setExternalSaving(false);
    }
  }

  async function onLeaveOpen() {
    const ok =
      typeof window !== 'undefined'
        ? window.confirm(
            'Leave this firing open? It will stay active until you close it after unloading.'
          )
        : true;
    if (!ok) return;
    navigation.goBack();
  }

  async function saveDamage() {
    setDamageError('');
    if (!damageUserId) {
      setDamageError('Select a member.');
      return;
    }
    if (!damageDesc.trim()) {
      setDamageError('Add a description.');
      return;
    }
    const amount = parseFloat(damageAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      setDamageError('Enter a valid amount.');
      return;
    }
    setDamageSaving(true);
    try {
      await postStudioMiscCharge(tenantId, {
        userId: damageUserId,
        description: `Kiln damage: ${damageDesc.trim()}`,
        cost: amount,
      });
      setDamageSaved(true);
      setShowDamage(false);
      setDamageDesc('');
      setDamageAmount('');
      setDamageUserId('');
    } catch (e: unknown) {
      setDamageError(
        e instanceof Error ? e.message : 'Could not save damage report.'
      );
    } finally {
      setDamageSaving(false);
    }
  }

  async function onCloseSession() {
    const ok = await confirmDestructive(
      'Close session',
      'Close this kiln session? Members will no longer be able to add pieces.',
      'Close'
    );
    if (!ok) return;
    setClosing(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/kiln/firings/${firingId}/close`,
        { method: 'POST' },
        tenantId
      );
      navigation.navigate('KilnDetail', { tenantId, firingId });
    } catch (e: unknown) {
      setSaveError(
        e instanceof Error ? e.message : 'Could not close session.'
      );
    } finally {
      setClosing(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {loadError ? (
        <Text style={styles.errorBanner}>{loadError}</Text>
      ) : null}

      <SectionLabel>MEMBER WEIGHT KG</SectionLabel>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : (
        members.map((m, idx) => {
          const val = weightInputs[m.userId] ?? '';
          const label = memberDisplayLabel(m) || m.email || '';
          const mossBorder = mossInputIds[m.userId];
          const isLastMember = idx === members.length - 1;
          return (
            <View
              key={m.userId}
              style={[
                styles.memberRow,
                !isLastMember && styles.memberRowBorder,
              ]}
            >
              <Avatar
                name={label || '?'}
                size="sm"
                imageUrl={m.avatarUrl}
              />
              <Text style={styles.memberName} numberOfLines={1}>
                {label || 'Member'}
              </Text>
              <View style={styles.inputKgRow}>
                <TextInput
                  value={val}
                  onChangeText={(t) => setWeight(m.userId, t)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.inkFaint}
                  style={[
                    styles.weightInput,
                    {
                      borderColor: mossBorder ? colors.moss : colors.clay,
                    },
                  ]}
                />
                <Text style={styles.kgSuffix}>kg</Text>
              </View>
            </View>
          );
        })
      )}

      <View style={styles.externalSection}>
        <SectionLabel>External guest</SectionLabel>
        <Text style={styles.externalHint}>
          Not a studio member - pieces are loaded and costs tracked separately.
        </Text>
        <View style={styles.externalRow}>
          <TextInput
            style={[styles.externalInput, styles.externalNameInput]}
            value={externalName}
            onChangeText={(v) => {
              setExternalName(v);
              setExternalError('');
            }}
            placeholder="Guest name"
            placeholderTextColor={colors.inkLight}
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.externalInput, styles.externalWeightInput]}
            value={externalWeight}
            onChangeText={(v) => {
              setExternalWeight(v);
              setExternalError('');
            }}
            placeholder="kg"
            placeholderTextColor={colors.inkLight}
            keyboardType="decimal-pad"
          />
          <Button
            label="Add"
            variant="secondary"
            onPress={() => void handleAddExternal()}
            loading={externalSaving}
          />
        </View>
        {externalError ? (
          <Text style={styles.externalError}>{externalError}</Text>
        ) : null}
      </View>

      {saveError ? <View style={styles.errorBox}><Text style={styles.errorBoxText}>{saveError}</Text></View> : null}

      <Button
        label="Save weight"
        variant="primary"
        onPress={() => void saveWeight()}
        loading={saving}
        disabled={!canSave}
        fullWidth
        style={styles.saveButton}
      />

      <View style={styles.damageSection}>
        {damageSaved && !showDamage ? (
          <Text style={styles.damageSaved}>Damage report saved.</Text>
        ) : null}
        {!showDamage ? (
          <Button
            label="+ Report kiln damage"
            variant="ghost"
            onPress={() => {
              setShowDamage(true);
              setDamageSaved(false);
            }}
            fullWidth
          />
        ) : (
          <View style={styles.damageForm}>
            <Text style={styles.damageTitle}>Kiln damage report</Text>
            <Text style={styles.damageSub}>
              Select the member whose work caused damage, add a description and
              the cost to repair.
            </Text>

            <Text style={styles.damageLabel}>Member</Text>
            {members.map((m) => (
              <TouchableOpacity
                key={m.userId}
                style={[
                  styles.damageMemberRow,
                  damageUserId === m.userId && styles.damageMemberSelected,
                ]}
                onPress={() => setDamageUserId(m.userId)}
                activeOpacity={0.75}
              >
                <Text style={styles.damageMemberName}>
                  {memberDisplayLabel(m) || m.email || 'Member'}
                </Text>
                {damageUserId === m.userId ? (
                  <Text style={styles.damageMemberCheck}>✓</Text>
                ) : null}
              </TouchableOpacity>
            ))}

            <Text style={styles.damageLabel}>Description</Text>
            <Input
              value={damageDesc}
              onChangeText={setDamageDesc}
              placeholder="e.g. shelf broken by overloaded piece"
              multiline
              numberOfLines={2}
            />

            <Text style={styles.damageLabel}>
              {`Amount (${studioCurrency})`}
            </Text>
            <Input
              value={damageAmount}
              onChangeText={setDamageAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            {damageError ? (
              <Text style={styles.damageError}>{damageError}</Text>
            ) : null}

            <Button
              label="Save damage report"
              variant="secondary"
              onPress={() => void saveDamage()}
              loading={damageSaving}
              fullWidth
            />
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => {
                setShowDamage(false);
                setDamageError('');
              }}
              fullWidth
            />
          </View>
        )}
      </View>

      {items.length > 0 ? (
        <>
          <View style={styles.sectionSpacer} />
          <SectionLabel>SESSION TOTALS</SectionLabel>
          {sessionTotalRows.map((row, idx) => (
            <View
              key={row.key}
              style={[
                styles.totalMemberRow,
                idx < sessionTotalRows.length - 1 && styles.memberRowBorder,
              ]}
            >
              <View style={styles.sessionNameRow}>
                <Text style={styles.sessionMemberName} numberOfLines={1}>
                  {row.name}
                </Text>
                {row.isExternal ? (
                  <Text style={styles.externalBadge}>External</Text>
                ) : null}
              </View>
              <Text style={styles.sessionMemberKg}>
                {row.kg.toFixed(1)} kg total
              </Text>
            </View>
          ))}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {grandTotalKg.toFixed(1)} kg
            </Text>
          </View>
        </>
      ) : null}

      <Button
        label="Leave open"
        variant="ghost"
        onPress={() => void onLeaveOpen()}
        fullWidth
        style={{ marginBottom: spacing[2], marginTop: spacing[6] }}
      />
      <Button
        label="Close session"
        variant="danger"
        onPress={() => void onCloseSession()}
        disabled={closing}
        loading={closing}
        fullWidth
        style={styles.closeSessionBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[5], paddingBottom: spacing[10] },
  loadingRow: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  errorBanner: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[3],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  memberName: {
    flex: 1,
    marginLeft: 10,
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  inputKgRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightInput: {
    width: 120,
    minWidth: 120,
    height: 48,
    fontSize: 20,
    textAlign: 'right',
    fontFamily: typography.mono,
    color: colors.clayDark,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceRaised,
  },
  kgSuffix: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginLeft: 6,
  },
  errorBox: {
    marginTop: spacing[3],
    padding: spacing[3],
    borderRadius: radius.sm,
    backgroundColor: colors.errorLight,
    borderWidth: 0.5,
    borderColor: colors.error,
  },
  errorBoxText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  saveButton: {
    marginTop: spacing[4],
    height: 48,
    minHeight: 48,
  },
  sectionSpacer: {
    height: spacing[6],
  },
  totalMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: spacing[2],
  },
  sessionNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    marginRight: spacing[2],
  },
  sessionMemberName: {
    flexShrink: 1,
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
  },
  sessionMemberKg: {
    fontFamily: typography.mono,
    fontSize: 13,
    color: colors.mossDark,
  },
  grandTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.mossLight,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  grandTotalValue: {
    fontFamily: typography.monoMedium,
    fontSize: 14,
    color: colors.mossDark,
    fontWeight: '500',
  },
  closeSessionBtn: {
    marginTop: 0,
    borderColor: colors.moss,
  },
  damageSection: {
    marginTop: spacing[4],
    gap: spacing[2],
  },
  damageForm: {
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[4],
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  damageTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  damageSub: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
  },
  damageLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  damageMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  damageMemberSelected: {
    borderColor: colors.clay,
    backgroundColor: colors.clayLight,
  },
  damageMemberName: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  damageMemberCheck: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.clay,
  },
  damageError: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  damageSaved: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.moss,
  },
  externalSection: {
    marginTop: spacing[6],
    paddingTop: spacing[4],
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  externalHint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  externalRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  externalInput: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  externalNameInput: { flex: 1 },
  externalWeightInput: { width: 64 },
  externalError: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing[2],
  },
  externalBadge: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.clay,
    marginLeft: spacing[1],
  },
});
