import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Avatar, Button, SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { confirmNeutral } from '../../utils/confirmAction';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CostDetail'>;
type Route = RouteProp<AppStackParamList, 'CostDetail'>;

type CostData = {
  period: string;
  memberName: string;
  /** From live costs payload when API includes member avatar. */
  memberAvatarUrl?: string;
  membershipFee: number;
  openStudioTotal: number;
  kilnTotal: number;
  eventsTotal: number;
  materialsTotal: number;
  miscTotal: number;
  grandTotal: number;
  breakdown: {
    kilnItems: Array<{
      date?: string;
      type?: string;
      kg?: number;
      cost?: number;
    }>;
    bookingItems: Array<{ date?: string; hours?: number; cost?: number }>;
    eventItems: Array<{ title?: string; cost?: number }>;
    materialItems: Array<{
      itemName?: string;
      qty?: number;
      unit?: string;
      cost?: number;
      date?: string;
    }>;
    miscItems: Array<{ description?: string; cost?: number; date?: string }>;
  };
};

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function capitalizeWords(s: string): string {
  const t = s.trim() || '—';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function formatEuro(n: number): string {
  return `€${Number(n).toFixed(2)}`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function periodLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** Header / display: always matches selected period (not API `period` slug). */
function periodLabelDisplay(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function isAfterCurrentMonth(y: number, m: number): boolean {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  if (y > cy) return true;
  if (y === cy && m > cm) return true;
  return false;
}

function bumpMonthForward(year: number, month: number): { y: number; m: number } {
  if (month >= 12) return { y: year + 1, m: 1 };
  return { y: year, m: month + 1 };
}

function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function livePeriodMatchesMonthStr(
  periodStr: string,
  y: number,
  mo: number
): boolean {
  const t = periodStr.trim();
  if (!t) return false;
  const parts = t.split('-');
  if (parts.length < 2) return false;
  return Number(parts[0]) === y && Number(parts[1]) === mo;
}

function normalizeHistoryPayload(
  raw: unknown,
  year: number,
  month: number
): Record<string, unknown> {
  const want = periodKey(year, month);
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const hit = raw.find(
      (x) =>
        x &&
        typeof x === 'object' &&
        str((x as Record<string, unknown>).period) === want
    );
    const row = hit ?? raw[0];
    return row && typeof row === 'object'
      ? (row as Record<string, unknown>)
      : {};
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (o.data != null) return normalizeHistoryPayload(o.data, year, month);
    if (o.summary != null && typeof o.summary === 'object') {
      return o.summary as Record<string, unknown>;
    }
    return o;
  }
  return {};
}

function parseCostData(o: Record<string, unknown>): CostData {
  const br = (o.breakdown ?? {}) as Record<string, unknown>;
  const kilnRaw = br.kilnItems ?? br.kiln_items;
  const bookRaw = br.bookingItems ?? br.booking_items;
  const eventRaw = br.eventItems ?? br.event_items;
  const matRaw = br.materialItems ?? br.material_items;
  const miscRaw = br.miscItems ?? br.misc_items;

  const mapArr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

  const kilnItems = mapArr(kilnRaw).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      date: str(r.date),
      type: str(r.type),
      kg: num(r.kg),
      cost: num(r.cost),
    };
  });
  const bookingItems = mapArr(bookRaw).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      date: str(r.date),
      hours: num(r.hours),
      cost: num(r.cost),
    };
  });
  const eventItems = mapArr(eventRaw).map((row) => {
    const r = row as Record<string, unknown>;
    return { title: str(r.title), cost: num(r.cost) };
  });
  const materialItems = mapArr(matRaw).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      itemName: str(r.itemName ?? r.item_name),
      qty: num(r.qty),
      unit: str(r.unit),
      cost: num(r.cost),
      date: str(r.date),
    };
  });
  const miscItems = mapArr(miscRaw).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      description: str(r.description),
      cost: num(r.cost),
      date: str(r.date),
    };
  });

  const avRaw = o.avatarUrl ?? o.avatar_url;
  const memberAvatarUrl =
    avRaw != null && String(avRaw).trim() !== ''
      ? String(avRaw).trim()
      : undefined;

  return {
    period: str(o.period),
    memberName: str(o.memberName ?? o.member_name),
    memberAvatarUrl,
    membershipFee: num(o.membershipFee ?? o.membership_fee),
    openStudioTotal: num(o.openStudioTotal ?? o.open_studio_total),
    kilnTotal: num(o.kilnTotal ?? o.kiln_total),
    eventsTotal: num(o.eventsTotal ?? o.events_total),
    materialsTotal: num(o.materialsTotal ?? o.materials_total),
    miscTotal: num(o.miscTotal ?? o.misc_total),
    grandTotal: num(o.grandTotal ?? o.grand_total),
    breakdown: {
      kilnItems,
      bookingItems,
      eventItems,
      materialItems,
      miscItems,
    },
  };
}

/** True when there is nothing to show (e.g. my-history has no row for this month yet). */
function memberCostLooksEmpty(parsed: CostData): boolean {
  return (
    parsed.grandTotal === 0 &&
    parsed.membershipFee === 0 &&
    parsed.openStudioTotal === 0 &&
    parsed.kilnTotal === 0 &&
    parsed.eventsTotal === 0 &&
    parsed.materialsTotal === 0 &&
    parsed.miscTotal === 0
  );
}

function extractSummaryId(o: Record<string, unknown>): string {
  return str(o.summaryId ?? o.summary_id ?? o.id ?? o._id).trim();
}

function isCostPayload(x: unknown): x is Record<string, unknown> {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    'grandTotal' in o ||
    'breakdown' in o ||
    'membershipFee' in o ||
    'membership_fee' in o
  );
}

function extractPdfUrlFromRecord(o: Record<string, unknown>): string {
  return str(o.pdf_url ?? o.pdfUrl ?? o.pdf).trim();
}

async function fetchPdfFromEndpoint(
  tenantId: string,
  summaryId: string
): Promise<string | null> {
  try {
    const res = await apiFetch<Record<string, unknown>>(
      `/studios/${tenantId}/costs/${summaryId}/pdf`,
      {},
      tenantId
    );
    // Case 1: external URL
    if (res.pdfUrl && typeof res.pdfUrl === 'string') {
      return res.pdfUrl;
    }
    // Case 2: HTML base64 (new format)
    if (res.htmlBase64 && typeof res.htmlBase64 === 'string') {
      const filename =
        typeof res.filename === 'string' ? res.filename : 'aruru-costs.html';
      const html = atob(res.htmlBase64);
      if (typeof window !== 'undefined') {
        // Open in a new window for print
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
          win.print();
        }
      }
      return 'html_exported';
    }
    // Case 3: PDF base64 (legacy fallback)
    if (res.pdfBase64 && typeof res.pdfBase64 === 'string') {
      const filename =
        typeof res.filename === 'string' ? res.filename : 'aruru-costs.pdf';
      const dataUrl = `data:application/pdf;base64,${res.pdfBase64}`;
      if (typeof window !== 'undefined') {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return dataUrl;
    }
    return null;
  } catch {
    return null;
  }
}

export default function CostDetailScreen({ route }: { route: Route }) {
  const {
    tenantId,
    userId,
    memberName: routeMemberName,
    memberEmail,
    year: routeYear,
    month: routeMonth,
    memberAvatarUrl: routeMemberAvatarUrl,
  } = route.params;
  const navigation = useNavigation<Nav>();
  const { user, studios } = useAuth();

  const currentStudio =
    studios.find((s) => s.tenantId === tenantId) ??
    studios.find((s) => s.status === 'active') ??
    studios[0];
  const isOwner = currentStudio?.role === 'owner';

  const [selectedYear, setSelectedYear] = useState(routeYear);
  const [selectedMonth, setSelectedMonth] = useState(routeMonth);
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [pdfReadyUrl, setPdfReadyUrl] = useState<string | null>(null);

  const displayName = routeMemberName || data?.memberName || 'Member';

  useLayoutEffect(() => {
    if (!isOwner && user?.id !== userId) {
      if (typeof window !== 'undefined') {
        window.alert('You can only view your own cost summary.');
      }
      navigation.goBack();
    }
  }, [isOwner, user?.id, userId, navigation]);

  const loadCostData = useCallback(async () => {
    if (!isOwner && user?.id !== userId) return;
    setLoading(true);
    const y = selectedYear;
    const m = selectedMonth;
    const q = `?year=${y}&month=${m}`;
    const wantPeriod = periodKey(y, m);
    try {
      let raw: unknown;
      if (isOwner) {
        let genRecord: Record<string, unknown> | null = null;
        try {
          raw = await apiFetch<unknown>(
            `/studios/${tenantId}/costs/live/${userId}${q}`,
            {},
            tenantId
          );
          const first = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
          const p = str(first.period);
          if (p && p !== wantPeriod) {
            throw new Error('period mismatch');
          }
        } catch {
          const gen = await apiFetch<Record<string, unknown>>(
            `/studios/${tenantId}/costs/generate`,
            {
              method: 'POST',
              body: JSON.stringify({
                userId,
                year: y,
                month: m,
              }),
            },
            tenantId
          );
          genRecord = gen;
          if (isCostPayload(gen)) {
            raw = gen;
          } else {
            raw = await apiFetch<unknown>(
              `/studios/${tenantId}/costs/live/${userId}${q}`,
              {},
              tenantId
            );
          }
        }
        const o =
          raw && typeof raw === 'object'
            ? (raw as Record<string, unknown>)
            : {};
        const parsed = parseCostData(o);
        setData(parsed);
        const sid =
          extractSummaryId(o) ||
          (genRecord ? extractSummaryId(genRecord) : '');
        setSummaryId(sid || null);
      } else {
        let o: Record<string, unknown> = {};
        try {
          raw = await apiFetch<unknown>(
            `/studios/${tenantId}/costs/my-history${q}`,
            {},
            tenantId
          );
          raw = normalizeHistoryPayload(raw, y, m);
          o =
            raw && typeof raw === 'object'
              ? (raw as Record<string, unknown>)
              : {};
        } catch {
          o = {};
        }
        let parsed = parseCostData(o);
        if (memberCostLooksEmpty(parsed)) {
          try {
            const live = await apiFetch<unknown>(
              `/studios/${tenantId}/costs/live/mine?year=${y}&month=${m}`,
              {},
              tenantId
            );
            if (live && typeof live === 'object') {
              const lo = live as Record<string, unknown>;
              const p = str(lo.period);
              if (
                !p ||
                p === wantPeriod ||
                livePeriodMatchesMonthStr(p, y, m)
              ) {
                o = lo;
                parsed = parseCostData(o);
              }
            }
          } catch {
            /* keep my-history / empty */
          }
        }
        if (memberCostLooksEmpty(parsed)) {
          try {
            const now = new Date();
            const viewingCurrentMonth =
              y === now.getFullYear() && m === now.getMonth() + 1;
            const liveBare = await apiFetch<unknown>(
              `/studios/${tenantId}/costs/live/mine`,
              {},
              tenantId
            );
            if (liveBare && typeof liveBare === 'object') {
              const lb = liveBare as Record<string, unknown>;
              const pBare = str(lb.period ?? '');
              const tryParsed = parseCostData(lb);
              if (
                !memberCostLooksEmpty(tryParsed) &&
                (livePeriodMatchesMonthStr(pBare, y, m) ||
                  (!pBare && viewingCurrentMonth))
              ) {
                o = lb;
                parsed = tryParsed;
              }
            }
          } catch {
            /* keep previous */
          }
        }
        setData(parsed);
        const sid = extractSummaryId(o);
        setSummaryId(sid || null);
      }
    } catch {
      setData(null);
      setSummaryId(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, isOwner, user?.id, selectedYear, selectedMonth]);

  useEffect(() => {
    setPdfReadyUrl(null);
    void loadCostData();
  }, [selectedYear, selectedMonth, loadCostData]);

  function goPrevMonth() {
    if (selectedMonth <= 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    const { y: ny, m: nm } = bumpMonthForward(selectedYear, selectedMonth);
    if (isAfterCurrentMonth(ny, nm)) return;
    setSelectedYear(ny);
    setSelectedMonth(nm);
  }

  const nextPeriod = bumpMonthForward(selectedYear, selectedMonth);
  const nextMonthDisabled = isAfterCurrentMonth(nextPeriod.y, nextPeriod.m);

  function openPdfUrl(url: string) {
    if (typeof window !== 'undefined') {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aruru-cost-summary.pdf';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  async function onGeneratePdf() {
    if (!isOwner) return;
    setGenerating(true);
    setPdfReadyUrl(null);
    const y = selectedYear;
    const mo = selectedMonth;
    try {
      const res = await apiFetch<Record<string, unknown>>(
        `/studios/${tenantId}/costs/generate`,
        {
          method: 'POST',
          body: JSON.stringify({
            userId,
            year: y,
            month: mo,
          }),
        },
        tenantId
      );
      const sid = extractSummaryId(res);
      if (sid) setSummaryId(sid);

      let pdfUrl = extractPdfUrlFromRecord(res);
      if (!pdfUrl && sid) {
        pdfUrl = (await fetchPdfFromEndpoint(tenantId, sid)) ?? '';
      }
      if (pdfUrl) setPdfReadyUrl(pdfUrl);

      if (isCostPayload(res)) {
        setData(parseCostData(res));
      } else {
        await loadCostData();
      }
    } catch (e) {
      if (typeof window !== 'undefined') {
        window.alert(
          e instanceof Error ? e.message : 'Could not generate summary.'
        );
      }
    } finally {
      setGenerating(false);
    }
  }

  async function onSendToMember() {
    if (!isOwner) return;
    if (!summaryId) {
      if (typeof window !== 'undefined') {
        window.alert('Generate a summary first.');
      }
      return;
    }
    const ok = await confirmNeutral(
      'Send cost summary',
      `Send cost summary to ${displayName}?`,
      'Send'
    );
    if (!ok) return;
    setSending(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/costs/${summaryId}/send`,
        { method: 'POST' },
        tenantId
      );
      const to = memberEmail?.trim() || displayName;
      if (typeof window !== 'undefined') {
        window.alert(`Sent to ${to}`);
      }
    } catch (e) {
      if (typeof window !== 'undefined') {
        window.alert(
          e instanceof Error ? e.message : 'Could not send summary.'
        );
      }
    } finally {
      setSending(false);
    }
  }

  const d = data;
  const grand = d?.grandTotal ?? 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.periodBox}>
        <View style={styles.periodTop}>
          <Text style={styles.periodLabel}>PERIOD</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={goPrevMonth}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <Text style={styles.monthNavChevron}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthNavTitle}>
              {periodLabel(selectedYear, selectedMonth)}
            </Text>
            <TouchableOpacity
              onPress={goNextMonth}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              disabled={nextMonthDisabled}
            >
              <Text
                style={[
                  styles.monthNavChevron,
                  nextMonthDisabled && styles.monthNavChevronDisabled,
                ]}
              >
                ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : (
        <>
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <Avatar
                name={displayName}
                size="md"
                imageUrl={
                  d?.memberAvatarUrl ?? routeMemberAvatarUrl
                }
              />
              <Text style={styles.headerName}>{displayName}</Text>
            </View>
            <Text style={styles.headerPeriod}>
              {periodLabelDisplay(selectedYear, selectedMonth)}
            </Text>
            <Text style={styles.headerTotal}>{formatEuro(grand)}</Text>
          </View>

          {d && d.membershipFee > 0 ? (
            <View style={styles.section}>
              <SectionLabel>MEMBERSHIP</SectionLabel>
              <View style={styles.lineRow}>
                <Text style={styles.lineLeft}>Monthly fee</Text>
                <Text style={styles.lineRight}>{formatEuro(d.membershipFee)}</Text>
              </View>
            </View>
          ) : null}

          {d && d.kilnTotal > 0 ? (
            <View style={styles.section}>
              <SectionLabel>KILN FIRINGS</SectionLabel>
              {d.breakdown.kilnItems.map((item, i) => (
                <View
                  key={`k-${i}`}
                  style={[
                    styles.kilnRow,
                    i < d.breakdown.kilnItems.length - 1 && styles.kilnRowBorder,
                  ]}
                >
                  <View style={styles.lineCol}>
                    <Text style={styles.body13}>
                      {formatDate(item.date ?? '')}{' '}
                      {capitalizeWords(item.type ?? '')}
                    </Text>
                  </View>
                  <Text style={styles.kilnRight}>
                    {item.kg != null && item.kg > 0 ? `${item.kg} kg · ` : ''}
                    {formatEuro(item.cost ?? 0)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalBand}>
                <Text style={styles.totalBandLeft}>Kiln total</Text>
                <Text style={styles.totalBandRight}>{formatEuro(d.kilnTotal)}</Text>
              </View>
            </View>
          ) : null}

          {d && d.openStudioTotal > 0 ? (
            <View style={styles.section}>
              <SectionLabel>OPEN STUDIO</SectionLabel>
              {d.breakdown.bookingItems.map((item, i) => (
                <View key={`b-${i}`} style={styles.lineRow}>
                  <Text style={styles.lineLeft}>
                    {formatDate(item.date ?? '')} · {item.hours ?? 0}h
                  </Text>
                  <Text style={styles.lineRightMono}>
                    {formatEuro(item.cost ?? 0)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalBand}>
                <Text style={styles.totalBandLeft}>Open studio total</Text>
                <Text style={styles.totalBandRight}>
                  {formatEuro(d.openStudioTotal)}
                </Text>
              </View>
            </View>
          ) : null}

          {d && d.eventsTotal > 0 ? (
            <View style={styles.section}>
              <SectionLabel>EVENTS & WORKSHOPS</SectionLabel>
              {d.breakdown.eventItems.map((item, i) => (
                <View key={`e-${i}`} style={styles.lineRow}>
                  <Text style={styles.lineLeft}>{item.title || 'Event'}</Text>
                  <Text style={styles.lineRightMono}>
                    {formatEuro(item.cost ?? 0)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalBand}>
                <Text style={styles.totalBandLeft}>Events total</Text>
                <Text style={styles.totalBandRight}>
                  {formatEuro(d.eventsTotal)}
                </Text>
              </View>
            </View>
          ) : null}

          {d && d.materialsTotal > 0 ? (
            <View style={styles.section}>
              <SectionLabel>MATERIALS</SectionLabel>
              {d.breakdown.materialItems.map((item, i) => (
                <View key={`m-${i}`} style={styles.lineRow}>
                  <Text style={styles.lineLeft}>{item.itemName || 'Item'}</Text>
                  <Text style={styles.lineRightMono}>
                    {formatEuro(item.cost ?? 0)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalBand}>
                <Text style={styles.totalBandLeft}>Materials total</Text>
                <Text style={styles.totalBandRight}>
                  {formatEuro(d.materialsTotal)}
                </Text>
              </View>
            </View>
          ) : null}

          {d && d.miscTotal > 0 ? (
            <View style={styles.section}>
              <SectionLabel>ADDITIONAL CHARGES</SectionLabel>
              {d.breakdown.miscItems.map((item, i) => (
                <View key={`x-${i}`} style={styles.lineRow}>
                  <Text style={styles.lineLeft}>
                    {item.description || 'Charge'}
                  </Text>
                  <Text style={styles.lineRightMono}>
                    {formatEuro(item.cost ?? 0)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalBand}>
                <Text style={styles.totalBandLeft}>Additional total</Text>
                <Text style={styles.totalBandRight}>
                  {formatEuro(d.miscTotal)}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.grandBand}>
            <Text style={styles.grandLabel}>TOTAL</Text>
            <Text style={styles.grandValue}>{formatEuro(grand)}</Text>
          </View>

          {isOwner ? (
            <View style={styles.pdfBlock}>
              <SectionLabel>SUMMARY</SectionLabel>
              <Button
                label="Generate PDF"
                variant="ghost"
                onPress={() => void onGeneratePdf()}
                fullWidth
                loading={generating}
                style={styles.btnClay}
              />
              {pdfReadyUrl && pdfReadyUrl !== 'html_exported' ? (
                <View style={styles.pdfLinkWrap}>
                  <Button
                    label="↓ Cost summary ready — tap to open"
                    variant="ghost"
                    onPress={() => openPdfUrl(pdfReadyUrl)}
                    fullWidth
                    accessibilityLabel="Open cost summary"
                  />
                </View>
              ) : pdfReadyUrl === 'html_exported' ? (
                <View style={styles.pdfLinkWrap}>
                  <Text style={styles.pdfLinkText}>
                    ✓ Summary opened in new window
                  </Text>
                </View>
              ) : null}
              <Button
                label="Send to member"
                variant="ghost"
                onPress={() => void onSendToMember()}
                fullWidth
                loading={sending}
                style={styles.btnMoss}
              />
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, paddingBottom: 40 },
  periodBox: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  periodTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodLabel: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  monthNavChevron: {
    fontFamily: typography.mono,
    fontSize: 18,
    color: colors.ink,
    paddingHorizontal: 4,
  },
  monthNavChevronDisabled: { color: colors.inkFaint },
  monthNavTitle: {
    fontFamily: typography.mono,
    fontSize: 13,
    color: colors.ink,
  },
  loadingWrap: {
    paddingVertical: spacing[10],
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  headerName: {
    flex: 1,
    fontFamily: typography.display,
    fontSize: 22,
    color: colors.ink,
  },
  headerPeriod: {
    fontFamily: typography.mono,
    fontSize: 12,
    color: colors.inkLight,
    marginTop: spacing[2],
  },
  headerTotal: {
    fontFamily: typography.display,
    fontSize: 28,
    color: colors.clayDark,
    marginTop: 8,
  },
  section: { marginBottom: spacing[4] },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: spacing[2],
  },
  lineCol: { flex: 1 },
  lineLeft: {
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.ink,
    flex: 1,
  },
  lineRight: {
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  lineRightMono: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clayDark,
  },
  body13: {
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  kilnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: spacing[2],
  },
  kilnRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  kilnRight: {
    fontFamily: typography.mono,
    fontSize: 12,
    color: colors.clayDark,
  },
  totalBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.mossLight,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: spacing[2],
  },
  totalBandLeft: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  totalBandRight: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.mossDark,
  },
  grandBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.mossLight,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 16,
  },
  grandLabel: {
    fontFamily: typography.mono,
    fontSize: 12,
    color: colors.mossDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  grandValue: {
    fontFamily: typography.display,
    fontSize: 24,
    color: colors.mossDark,
  },
  pdfBlock: { marginTop: 24 },
  btnClay: {
    borderWidth: 0.5,
    borderColor: colors.clay,
    marginTop: spacing[2],
  },
  btnMoss: {
    borderWidth: 0.5,
    borderColor: colors.moss,
    marginTop: 8,
  },
  pdfLinkWrap: {
    marginTop: spacing[2],
    paddingVertical: spacing[2],
  },
  pdfLinkText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.clay,
    textDecorationLine: 'underline',
  },
});
