import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type { Task } from '../screens/tasks/TaskListScreen';
import { Badge } from './ui';
import { colors, typography, fontSize, spacing, radius } from '../theme/tokens';

type Props = {
  tasks: Task[];
  onTaskPress: (t: Task) => void;
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

function taskDueDay(t: Task): Date | null {
  const s = t.dueAt;
  if (s == null || String(s).trim() === '') return null;
  const d = new Date(String(s));
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
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

function normStatus(t: Task): string {
  const raw = (t.status ?? 'todo')
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return raw;
}

function statusBg(t: Task): string {
  const s = normStatus(t);
  if (s === 'done') return colors.mossLight;
  if (s === 'in_progress') return colors.clayLight;
  if (s === 'cancelled' || s === 'canceled') return colors.creamDark;
  return colors.surface;
}

function statusDot(t: Task): string {
  const s = normStatus(t);
  if (s === 'done') return colors.moss;
  if (s === 'in_progress') return colors.clay;
  if (s === 'cancelled' || s === 'canceled') return colors.inkMid;
  return colors.inkLight;
}

function statusBadgeVariant(
  t: Task
): 'clay' | 'moss' | 'neutral' | 'error' {
  const s = normStatus(t);
  if (s === 'done') return 'moss';
  if (s === 'in_progress') return 'clay';
  if (s === 'cancelled' || s === 'canceled') return 'neutral';
  return 'neutral';
}

function statusBadgeLabel(t: Task): string {
  const s = normStatus(t);
  if (s === 'done') return 'Done';
  if (s === 'in_progress') return 'In progress';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  return 'To do';
}

function formatDueLine(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function taskId(t: Task): string {
  const o = t as Task & { _id?: string };
  return String(t.id ?? o._id ?? '').trim();
}

export default function TaskCalendar({ tasks, onTaskPress }: Props) {
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

  const tasksInMonth = useMemo(() => {
    return tasks.filter((t) => {
      const day = taskDueDay(t);
      if (!day) return false;
      return day.getFullYear() === cursor.y && day.getMonth() === cursor.m;
    });
  }, [tasks, cursor.y, cursor.m]);

  const dayHasTask = (day: number) => {
    const d = new Date(cursor.y, cursor.m, day);
    return tasksInMonth.some((t) => {
      const td = taskDueDay(t);
      return td != null && sameLocalDay(td, d);
    });
  };

  const listTasks = useMemo(() => {
    if (selectedDay == null) {
      return [...tasksInMonth].sort((a, b) => {
        const da = a.dueAt ? new Date(a.dueAt).getTime() : 0;
        const db = b.dueAt ? new Date(b.dueAt).getTime() : 0;
        return da - db;
      });
    }
    const d = new Date(cursor.y, cursor.m, selectedDay);
    return tasksInMonth
      .filter((t) => {
        const td = taskDueDay(t);
        return td != null && sameLocalDay(td, d);
      })
      .sort((a, b) => {
        const da = a.dueAt ? new Date(a.dueAt).getTime() : 0;
        const db = b.dueAt ? new Date(b.dueAt).getTime() : 0;
        return da - db;
      });
  }, [tasksInMonth, selectedDay, cursor.y, cursor.m]);

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
            const has = dayHasTask(day);
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
          ? 'All tasks due this month'
          : `Tasks due ${selectedDay} ${new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-GB', { month: 'long' })}`}
      </Text>

      {listTasks.length === 0 ? (
        <Text style={styles.emptyList}>No tasks in this view.</Text>
      ) : (
        listTasks.map((t, idx) => {
          const id = taskId(t) || `t-${idx}`;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.taskCard, { backgroundColor: statusBg(t) }]}
              activeOpacity={0.75}
              onPress={() => onTaskPress(t)}
            >
              <View style={styles.taskRowInner}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: statusDot(t) },
                  ]}
                />
                <View style={styles.taskMid}>
                  <Text style={styles.taskTitle} numberOfLines={2}>
                    {(t.title ?? 'Untitled').trim()}
                  </Text>
                  <Text style={styles.taskMeta} numberOfLines={1}>
                    {t.dueAt ? `Due ${formatDueLine(String(t.dueAt))}` : 'No due date'}
                  </Text>
                </View>
                <Badge
                  label={statusBadgeLabel(t)}
                  variant={statusBadgeVariant(t)}
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
  taskCard: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  taskRowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  taskMid: {
    flex: 1,
    marginLeft: 10,
    marginRight: spacing[2],
    minWidth: 0,
  },
  taskTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  taskMeta: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 2,
  },
});
