import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type { StudioEvent } from '../screens/events/EventListScreen';
import { Badge } from './ui';
import { colors, typography, fontSize, spacing, radius } from '../theme/tokens';

type Props = {
  events: StudioEvent[];
  onEventPress: (e: StudioEvent) => void;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventDay(e: StudioEvent): Date | null {
  const s = e.startsAt;
  if (!s) return null;
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return null;
  return startOfDay(t);
}

function formatRowDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRowTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function kindColor(kind: string | undefined): string {
  const v = (kind ?? '').toLowerCase();
  if (v === 'member_booking') return colors.clayLight;
  return colors.surface;
}

function kindDotColor(kind: string | undefined) {
  const v = (kind ?? '').toLowerCase();
  if (v === 'workshop') return colors.clay;
  if (v === 'open_studio') return colors.moss;
  if (v === 'private_event') return colors.inkMid;
  if (v === 'member_booking') return colors.clay;
  return colors.inkLight;
}

function kindBadgeVariant(
  kind: string | undefined
): 'clay' | 'moss' | 'neutral' {
  const v = (kind ?? '').toLowerCase();
  if (v === 'workshop') return 'clay';
  if (v === 'open_studio') return 'moss';
  if (v === 'member_booking') return 'clay';
  return 'neutral';
}

function kindBadgeLabel(kind: string | undefined): string {
  const v = (kind ?? '').toLowerCase();
  if (v === 'workshop') return 'Workshop';
  if (v === 'open_studio') return 'Open studio';
  if (v === 'private_event') return 'Private';
  if (v === 'member_booking') return 'Studio booking';
  return 'Other';
}

function monthMatrix(year: number, monthIndex: number): (number | null)[][] {
  const first = new Date(year, monthIndex, 1);
  let startDow = first.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export default function EventCalendar({ events, onEventPress }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const matrix = useMemo(
    () => monthMatrix(cursor.y, cursor.m),
    [cursor.y, cursor.m]
  );

  const eventsInMonth = useMemo(() => {
    return events.filter((e) => {
      const day = eventDay(e);
      if (!day) return false;
      return day.getFullYear() === cursor.y && day.getMonth() === cursor.m;
    });
  }, [events, cursor.y, cursor.m]);

  const dayHasEvent = (day: number) => {
    const d = new Date(cursor.y, cursor.m, day);
    return eventsInMonth.some((e) => {
      const ed = eventDay(e);
      return ed != null && sameLocalDay(ed, d);
    });
  };

  const listEvents = useMemo(() => {
    if (selectedDay == null) {
      return [...eventsInMonth].sort((a, b) => {
        const ta = new Date(a.startsAt ?? 0).getTime();
        const tb = new Date(b.startsAt ?? 0).getTime();
        return ta - tb;
      });
    }
    const d = new Date(cursor.y, cursor.m, selectedDay);
    return eventsInMonth
      .filter((e) => {
        const ed = eventDay(e);
        return ed != null && sameLocalDay(ed, d);
      })
      .sort((a, b) => {
        const ta = new Date(a.startsAt ?? 0).getTime();
        const tb = new Date(b.startsAt ?? 0).getTime();
        return ta - tb;
      });
  }, [eventsInMonth, selectedDay, cursor.y, cursor.m]);

  function prevMonth() {
    setSelectedDay(null);
    setCursor((c) =>
      c.m <= 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }
    );
  }

  function nextMonth() {
    setSelectedDay(null);
    setCursor((c) =>
      c.m >= 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }
    );
  }

  const monthTitle = new Date(cursor.y, cursor.m, 1).toLocaleDateString(
    'en-GB',
    { month: 'long', year: 'numeric' }
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthTitle}</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      {matrix.map((row, ri) => (
        <View key={`r-${ri}`} style={styles.gridRow}>
          {row.map((day, di) => {
            if (day == null) {
              return <View key={`e-${ri}-${di}`} style={styles.cell} />;
            }
            const isToday = sameLocalDay(
              new Date(cursor.y, cursor.m, day),
              today
            );
            const has = dayHasEvent(day);
            const sel = selectedDay === day;
            return (
              <TouchableOpacity
                key={`d-${day}`}
                style={[
                  styles.cell,
                  isToday && styles.cellToday,
                  sel && styles.cellSelected,
                ]}
                onPress={() =>
                  setSelectedDay((s) => (s === day ? null : day))
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.cellNum,
                    isToday && styles.cellNumToday,
                    sel && styles.cellNumSelected,
                  ]}
                >
                  {day}
                </Text>
                {has ? <View style={styles.dot} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <Text style={styles.listHint}>
        {selectedDay == null
          ? 'All events this month'
          : `Events on ${selectedDay} ${new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-GB', { month: 'long' })}`}
      </Text>

      {listEvents.length === 0 ? (
        <Text style={styles.emptyList}>No events in this view.</Text>
      ) : (
        listEvents.map((e, idx) => {
          const id = String(e.id ?? idx);
          const loc = (e.location ?? '').trim();
          const max = e.maxParticipants;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.eventCard, { backgroundColor: kindColor(e.kind) }]}
              activeOpacity={0.75}
              onPress={() => onEventPress(e)}
            >
              <View style={styles.eventRowInner}>
                <View
                  style={[
                    styles.kindDot,
                    { backgroundColor: kindDotColor(e.kind) },
                  ]}
                />
                <View style={styles.eventMid}>
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {e.title || 'Untitled'}
                  </Text>
                  <Text style={styles.eventMeta} numberOfLines={2}>
                    {e.startsAt
                      ? `${formatRowDate(e.startsAt)} · ${formatRowTime(e.startsAt)}`
                      : '—'}
                    {loc ? ` · ${loc}` : ''}
                  </Text>
                  {max != null && max > 0 ? (
                    <Text style={styles.eventMax}>Max {max} participants</Text>
                  ) : null}
                </View>
                <Badge
                  label={kindBadgeLabel(e.kind)}
                  variant={kindBadgeVariant(e.kind)}
                />
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing[2] },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  navBtn: { padding: spacing[2] },
  navBtnText: {
    fontFamily: typography.mono,
    fontSize: 20,
    color: colors.clay,
  },
  monthTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing[1],
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    letterSpacing: 0.5,
  },
  gridRow: { flexDirection: 'row', marginBottom: 2 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  cellToday: { backgroundColor: colors.cream },
  cellSelected: { backgroundColor: colors.clayLight },
  cellNum: {
    fontFamily: typography.mono,
    fontSize: 12,
    color: colors.inkMid,
  },
  cellNumToday: { color: colors.clay, fontFamily: typography.monoMedium },
  cellNumSelected: { color: colors.clayDark },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.clay,
    marginTop: 2,
  },
  listHint: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  emptyList: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    paddingVertical: spacing[2],
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  eventRowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  kindDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  eventMid: {
    flex: 1,
    marginLeft: 10,
    marginRight: spacing[2],
    minWidth: 0,
  },
  eventTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  eventMeta: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 2,
  },
  eventMax: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    marginTop: 4,
  },
});
