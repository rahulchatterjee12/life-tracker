'use client';

import { useState, useSyncExternalStore } from 'react';
import { useAppSelector } from '@/lib/hooks';
import {
  Flame,
  Check,
  TrendingUp,
  Award,
  Sparkles,
  Calendar as CalendarIcon,
  Lock,
  CheckCircle2,
} from 'lucide-react';

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const emptySubscribe = () => () => {};

export default function HabitMatrixView() {
  const tasks = useAppSelector((state) => state.tasks.items);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<'completed' | 'missed' | 'pending' | 'upcoming' | null>(null);

  // Dynamic date calculations via useSyncExternalStore for hydration-safe server & client synchronization
  const todayDateStr = useSyncExternalStore(
    emptySubscribe,
    () => new Date().toISOString().split('T')[0],
    () => '2026-10-26'
  );

  const [dateYear, dateMonthNum, dateDayNum] = todayDateStr.split('-').map(Number);
  const currentYear = dateYear || 2026;
  const currentMonthNumber = dateMonthNum || 10;
  const currentMonthIndex = currentMonthNumber - 1; // 0-indexed
  const ACTIVE_DAY = dateDayNum || 26;
  const DAYS_IN_MONTH = new Date(currentYear, currentMonthNumber, 0).getDate();
  const DAYS_ARRAY = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);
  const MONTH_YEAR = `${currentYear}-${String(currentMonthNumber).padStart(2, '0')}`;
  const now = new Date(currentYear, currentMonthIndex, ACTIVE_DAY);
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Dynamically group days into weeks
  const WEEKS: Array<{ label: string; days: number[] }> = [];
  for (let i = 0; i < DAYS_IN_MONTH; i += 7) {
    const weekNum = Math.floor(i / 7) + 1;
    const weekDays: number[] = [];
    for (let d = i + 1; d <= Math.min(i + 7, DAYS_IN_MONTH); d++) {
      weekDays.push(d);
    }
    WEEKS.push({ label: `Week ${weekNum}`, days: weekDays });
  }

  // EXCLUSIVELY display habits that are part of a daily routine (filtering out DEEP_WORK, ADMIN, and non-daily tasks)
  const dailyHabits = tasks.filter(
    (t) =>
      t.type === 'HABIT' &&
      t.habitDetails &&
      (!t.habitDetails.frequency || t.habitDetails.frequency === 'daily')
  );

  // Helper: Get habit start day in the active month
  // Tracking begins exactly from creation date (prior days do not register as missed)
  const getHabitStartDay = (habit: (typeof dailyHabits)[0]): number => {
    if (!habit.createdAt) return 1;
    const created = new Date(habit.createdAt);
    if (isNaN(created.getTime())) return 1;

    const createdYear = created.getFullYear();
    const createdMonth = created.getMonth();

    if (createdYear < currentYear || (createdYear === currentYear && createdMonth < currentMonthIndex)) {
      return 1;
    }
    if (createdYear > currentYear || (createdYear === currentYear && createdMonth > currentMonthIndex)) {
      return DAYS_IN_MONTH + 1; // Future month: not active yet in current month
    }
    return Math.min(DAYS_IN_MONTH, Math.max(1, created.getDate()));
  };

  // Helper: check if a habit was completed on a specific day
  const isHabitCompletedOnDay = (habit: (typeof dailyHabits)[0], day: number) => {
    const dateStr = `${MONTH_YEAR}-${String(day).padStart(2, '0')}`;
    if (day === ACTIVE_DAY) {
      return Boolean(
        habit.completed ||
        habit.habitDetails?.completedDates?.includes(dateStr) ||
        habit.habitDetails?.lastCompletedDate === dateStr
      );
    }
    return Boolean(
      habit.habitDetails?.completedDates?.includes(dateStr) ||
      habit.habitDetails?.lastCompletedDate === dateStr
    );
  };

  // Completed count for a habit across its valid tracking days
  const getHabitCompletedCount = (habit: (typeof dailyHabits)[0]) => {
    const startDay = getHabitStartDay(habit);
    return DAYS_ARRAY.filter((day) => day >= startDay && isHabitCompletedOnDay(habit, day)).length;
  };

  // 4-SEGMENT AGGREGATE CALCULATIONS
  // Completed, Missed, Pending, and Upcoming
  let totalCompleted = 0;
  let totalMissed = 0;
  let totalPending = 0;
  let totalUpcoming = 0;

  dailyHabits.forEach((habit) => {
    const startDay = getHabitStartDay(habit);
    for (let d = startDay; d <= DAYS_IN_MONTH; d++) {
      const isDone = isHabitCompletedOnDay(habit, d);
      if (d < ACTIVE_DAY) {
        if (isDone) {
          totalCompleted += 1;
        } else {
          totalMissed += 1;
        }
      } else if (d === ACTIVE_DAY) {
        if (isDone) {
          totalCompleted += 1;
        } else {
          totalPending += 1;
        }
      } else {
        // d > ACTIVE_DAY (future day)
        totalUpcoming += 1;
      }
    }
  });

  const totalTrackedChecks = totalCompleted + totalMissed + totalPending + totalUpcoming;

  const completedPct = totalTrackedChecks > 0 ? (totalCompleted / totalTrackedChecks) * 100 : 0;
  const missedPct = totalTrackedChecks > 0 ? (totalMissed / totalTrackedChecks) * 100 : 0;
  const pendingPct = totalTrackedChecks > 0 ? (totalPending / totalTrackedChecks) * 100 : 0;
  const upcomingPct = totalTrackedChecks > 0 ? (totalUpcoming / totalTrackedChecks) * 100 : 0;

  // Today's dashboard completion stats
  const todayActiveHabits = dailyHabits.filter((h) => getHabitStartDay(h) <= ACTIVE_DAY);
  const todayCompletedCount = todayActiveHabits.filter((h) => isHabitCompletedOnDay(h, ACTIVE_DAY)).length;
  const todayPendingCount = todayActiveHabits.filter((h) => !isHabitCompletedOnDay(h, ACTIVE_DAY)).length;

  // Best habit by execution rate from creation date
  const sortedByRate = [...dailyHabits].sort((a, b) => {
    const startA = getHabitStartDay(a);
    const trackedA = Math.max(1, DAYS_IN_MONTH - startA + 1);
    const rateA = getHabitCompletedCount(a) / trackedA;

    const startB = getHabitStartDay(b);
    const trackedB = Math.max(1, DAYS_IN_MONTH - startB + 1);
    const rateB = getHabitCompletedCount(b) / trackedB;

    return rateB - rateA;
  });

  const bestStreak = dailyHabits.reduce((max, h) => Math.max(max, h.habitDetails?.streakCount || 0), 0);
  const topHabit = sortedByRate[0];

  // Daily Consistency Trend across active habits on each day
  const dailyStats = DAYS_ARRAY.map((day) => {
    const activeOnDay = dailyHabits.filter((h) => getHabitStartDay(h) <= day);
    const completedCount = activeOnDay.filter((h) => isHabitCompletedOnDay(h, day)).length;
    const totalHabits = activeOnDay.length;
    const percentage = totalHabits > 0 && day <= ACTIVE_DAY ? Math.round((completedCount / totalHabits) * 100) : 0;
    return {
      day,
      completed: completedCount,
      total: totalHabits,
      percentage,
      isFuture: day > ACTIVE_DAY,
    };
  });

  // Weekly breakdown stats
  const weeklyStats = WEEKS.map((w) => {
    let completedInWeek = 0;
    let totalSlotsInWeek = 0;

    dailyHabits.forEach((h) => {
      const startDay = getHabitStartDay(h);
      w.days.forEach((day) => {
        if (day >= startDay) {
          totalSlotsInWeek += 1;
          if (isHabitCompletedOnDay(h, day)) {
            completedInWeek += 1;
          }
        }
      });
    });

    const pct = totalSlotsInWeek > 0 ? Math.round((completedInWeek / totalSlotsInWeek) * 100) : 0;
    return {
      label: w.label,
      days: `${w.days[0]}–${w.days[w.days.length - 1]}`,
      completed: completedInWeek,
      total: totalSlotsInWeek,
      percentage: pct,
    };
  });

  // SVG Chart path generation for Daily Consistency Trend
  const chartWidth = 720;
  const chartHeight = 160;
  const paddingX = 20;
  const paddingY = 20;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  const points = dailyStats.map((d, idx) => {
    const x = paddingX + (idx / (DAYS_IN_MONTH - 1)) * innerWidth;
    const y = paddingY + (1 - d.percentage / 100) * innerHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, idx) => {
    if (idx === 0) return `M ${p.x} ${p.y}`;
    const prev = points[idx - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  // 4-Segment Donut Ring Geometry
  const donutRadius = 42;
  const donutCircumference = 2 * Math.PI * donutRadius; // ≈ 263.89

  const completedLen = (completedPct / 100) * donutCircumference;
  const missedLen = (missedPct / 100) * donutCircumference;
  const pendingLen = (pendingPct / 100) * donutCircumference;
  const upcomingLen = (upcomingPct / 100) * donutCircumference;

  const completedOffset = 0;
  const missedOffset = completedLen;
  const pendingOffset = completedLen + missedLen;
  const upcomingOffset = completedLen + missedLen + pendingLen;

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* === TOP TITLE & CONTROLS === */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-semibold text-txt tracking-tight">
              Habit Consistency Matrix &amp; Visual Analytics
            </h2>
            <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
              <CalendarIcon className="w-3 h-3" />
              {monthLabel}
            </span>
            <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-surface-2 text-txt-2 border border-border-light font-medium">
              <Lock className="w-3 h-3 text-txt-3" />
              Daily Routines · Synced from Dashboard
            </span>
          </div>
          <p className="text-xs text-txt-2 mt-1">
            Real-time 4-segment execution breakdown, daily consistency curve, and 31-day tracking matrix.
          </p>
        </div>

        {/* Quick KPI badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border-light text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
            <span className="text-txt-2">Today:</span>
            <span className="font-semibold text-txt">
              {todayCompletedCount}/{todayActiveHabits.length} Done
            </span>
            {todayPendingCount > 0 && (
              <span className="text-[10px] text-warn font-medium">({todayPendingCount} pending)</span>
            )}
          </div>
          {topHabit && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border-light text-xs">
              <Award className="w-3.5 h-3.5 text-accent" />
              <span className="text-txt-2">Top:</span>
              <span className="font-semibold text-txt truncate max-w-[110px]">{topHabit.title}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border-light text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-ok" />
            <span className="text-txt-2">Completed:</span>
            <span className="font-semibold text-txt">{completedPct.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border-light text-xs">
            <Flame className="w-3.5 h-3.5 text-warn" />
            <span className="text-txt-2">Streak:</span>
            <span className="font-semibold text-txt">{bestStreak}d</span>
          </div>
        </div>
      </div>

      {/* === ROW 1: CHARTS & STATS === */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Daily Completion Trend Line Chart (7 cols on lg) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-accent/10 text-accent">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-txt">Daily Consistency Trend</h3>
                <p className="text-[11px] text-txt-3">Daily completion percentage across 31 days (updates with dashboard)</p>
              </div>
            </div>

            {hoveredDay ? (
              <div className="text-xs font-mono px-2 py-1 rounded-md bg-surface-2 text-txt font-medium">
                Day {hoveredDay}{hoveredDay === ACTIVE_DAY ? ' (Today)' : ''}: {dailyStats[hoveredDay - 1]?.completed}/{dailyStats[hoveredDay - 1]?.total} ({dailyStats[hoveredDay - 1]?.percentage}%)
              </div>
            ) : (
              <div className="text-[11px] text-txt-3 font-mono">
                Day {ACTIVE_DAY} (Today): {dailyStats[ACTIVE_DAY - 1]?.percentage}%
              </div>
            )}
          </div>

          {/* SVG Line / Area Graph */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-40 overflow-visible"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              {[0, 25, 50, 75, 100].map((pct) => {
                const y = paddingY + (1 - pct / 100) * innerHeight;
                return (
                  <g key={pct}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="currentColor"
                      className="text-border-light"
                      strokeWidth="1"
                      strokeDasharray={pct === 0 || pct === 100 ? undefined : '3 3'}
                    />
                    <text
                      x={paddingX - 4}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[9px] fill-txt-3 font-mono"
                    >
                      {pct}%
                    </text>
                  </g>
                );
              })}

              {/* Area & Line */}
              <path d={areaD} fill="url(#areaGradient)" />
              <path
                d={pathD}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data Points */}
              {points.map((p) => {
                const isHovered = hoveredDay === p.day;
                const isTodayPoint = p.day === ACTIVE_DAY;
                return (
                  <g
                    key={p.day}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredDay(p.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {isTodayPoint && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={7}
                        className="fill-accent/20 animate-ping"
                      />
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 5 : isTodayPoint ? 4 : 2.5}
                      className={
                        isHovered
                          ? 'fill-accent stroke-bg stroke-2 transition-all'
                          : isTodayPoint
                          ? 'fill-ok stroke-bg stroke-1'
                          : p.isFuture
                          ? 'fill-txt-3/30'
                          : 'fill-accent'
                      }
                    />
                    <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
                  </g>
                );
              })}
            </svg>

            {/* X-axis day ticks */}
            <div className="flex justify-between px-5 text-[10px] font-mono text-txt-3 pt-1">
              <span>Day 1</span>
              <span>Day 8</span>
              <span>Day 15</span>
              <span>Day 22</span>
              <span className="text-accent font-semibold">Day {ACTIVE_DAY} (Today)</span>
              <span>Day {DAYS_IN_MONTH}</span>
            </div>
          </div>
        </div>

        {/* HABIT METRICS CARD (5 cols on lg) - 4 DISTINCT SEGMENTS */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-ok/10 text-ok">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-txt">Habit Metrics</h3>
                <p className="text-[11px] text-txt-3">Monthly daily routine execution &amp; forecast</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium whitespace-nowrap">
              {dailyHabits.length} Daily Habits
            </span>
          </div>

          {/* 4-Segment Donut Chart */}
          <div className="flex items-center justify-center relative my-1">
            <svg width="130" height="130" className="-rotate-90 overflow-visible">
              {/* Background ring */}
              <circle
                cx="65"
                cy="65"
                r={donutRadius}
                fill="none"
                stroke="currentColor"
                className="text-surface-2"
                strokeWidth="9"
              />

              {/* Segment 1: Completed (Green) */}
              {completedLen > 0 && (
                <circle
                  cx="65"
                  cy="65"
                  r={donutRadius}
                  fill="none"
                  stroke="var(--ok)"
                  strokeWidth={hoveredSegment === 'completed' ? 11 : 9}
                  strokeDasharray={`${Math.max(0, completedLen - 1)} ${donutCircumference}`}
                  strokeDashoffset={-completedOffset}
                  className="transition-all duration-500 ease-out cursor-pointer"
                  onMouseEnter={() => setHoveredSegment('completed')}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              )}

              {/* Segment 2: Missed (Red) */}
              {missedLen > 0 && (
                <circle
                  cx="65"
                  cy="65"
                  r={donutRadius}
                  fill="none"
                  stroke="var(--bad)"
                  strokeWidth={hoveredSegment === 'missed' ? 11 : 9}
                  strokeDasharray={`${Math.max(0, missedLen - 1)} ${donutCircumference}`}
                  strokeDashoffset={-missedOffset}
                  className="transition-all duration-500 ease-out cursor-pointer"
                  onMouseEnter={() => setHoveredSegment('missed')}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              )}

              {/* Segment 3: Pending (Amber) */}
              {pendingLen > 0 && (
                <circle
                  cx="65"
                  cy="65"
                  r={donutRadius}
                  fill="none"
                  stroke="var(--warn)"
                  strokeWidth={hoveredSegment === 'pending' ? 11 : 9}
                  strokeDasharray={`${Math.max(0, pendingLen - 1)} ${donutCircumference}`}
                  strokeDashoffset={-pendingOffset}
                  className="transition-all duration-500 ease-out cursor-pointer"
                  onMouseEnter={() => setHoveredSegment('pending')}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              )}

              {/* Segment 4: Upcoming (Indigo / Subtle neutral) */}
              {upcomingLen > 0 && (
                <circle
                  cx="65"
                  cy="65"
                  r={donutRadius}
                  fill="none"
                  stroke="var(--accent)"
                  opacity={0.45}
                  strokeWidth={hoveredSegment === 'upcoming' ? 11 : 9}
                  strokeDasharray={`${Math.max(0, upcomingLen - 1)} ${donutCircumference}`}
                  strokeDashoffset={-upcomingOffset}
                  className="transition-all duration-500 ease-out cursor-pointer"
                  onMouseEnter={() => setHoveredSegment('upcoming')}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              )}
            </svg>

            {/* Dynamic Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              {hoveredSegment === 'missed' ? (
                <>
                  <span className="text-2xl font-bold text-bad tabular-nums">
                    {missedPct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-bad uppercase font-medium tracking-wider">Missed</span>
                </>
              ) : hoveredSegment === 'pending' ? (
                <>
                  <span className="text-2xl font-bold text-warn tabular-nums">
                    {pendingPct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-warn uppercase font-medium tracking-wider">Pending</span>
                </>
              ) : hoveredSegment === 'upcoming' ? (
                <>
                  <span className="text-2xl font-bold text-accent tabular-nums">
                    {upcomingPct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-accent uppercase font-medium tracking-wider">Upcoming</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-ok tabular-nums">
                    {completedPct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-txt-3 uppercase font-medium tracking-wider">Completed</span>
                </>
              )}
            </div>
          </div>

          {/* 4-Segment Horizontal Progress Distribution Bar */}
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-surface-2 flex overflow-hidden p-0.5 gap-0.5">
              {completedPct > 0 && (
                <div
                  style={{ width: `${completedPct}%` }}
                  className="h-full rounded-sm bg-ok transition-all duration-500"
                  title={`Completed: ${completedPct.toFixed(1)}%`}
                />
              )}
              {missedPct > 0 && (
                <div
                  style={{ width: `${missedPct}%` }}
                  className="h-full rounded-sm bg-bad transition-all duration-500"
                  title={`Missed: ${missedPct.toFixed(1)}%`}
                />
              )}
              {pendingPct > 0 && (
                <div
                  style={{ width: `${pendingPct}%` }}
                  className="h-full rounded-sm bg-warn transition-all duration-500"
                  title={`Pending: ${pendingPct.toFixed(1)}%`}
                />
              )}
              {upcomingPct > 0 && (
                <div
                  style={{ width: `${upcomingPct}%` }}
                  className="h-full rounded-sm bg-accent/45 transition-all duration-500"
                  title={`Upcoming: ${upcomingPct.toFixed(1)}%`}
                />
              )}
            </div>
          </div>

          {/* 4 Distinct KPI Segments Grid */}
          <div className="grid grid-cols-2 gap-2 text-left">
            {/* Completed */}
            <div
              onMouseEnter={() => setHoveredSegment('completed')}
              onMouseLeave={() => setHoveredSegment(null)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                hoveredSegment === 'completed'
                  ? 'bg-ok/10 border-ok shadow-xs'
                  : 'bg-surface-2/60 border-border-light hover:border-ok/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-txt-2">
                  <span className="w-2 h-2 rounded-full bg-ok" />
                  Completed
                </span>
                <span className="text-xs font-mono font-bold text-ok">
                  {completedPct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-[11px]">
                <span className="text-txt font-semibold">{totalCompleted}</span>
                <span className="text-[10px] text-txt-3">checks</span>
              </div>
            </div>

            {/* Missed */}
            <div
              onMouseEnter={() => setHoveredSegment('missed')}
              onMouseLeave={() => setHoveredSegment(null)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                hoveredSegment === 'missed'
                  ? 'bg-bad/10 border-bad shadow-xs'
                  : 'bg-surface-2/60 border-border-light hover:border-bad/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-txt-2">
                  <span className="w-2 h-2 rounded-full bg-bad" />
                  Missed
                </span>
                <span className="text-xs font-mono font-bold text-bad">
                  {missedPct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-[11px]">
                <span className="text-txt font-semibold">{totalMissed}</span>
                <span className="text-[10px] text-txt-3">checks</span>
              </div>
            </div>

            {/* Pending */}
            <div
              onMouseEnter={() => setHoveredSegment('pending')}
              onMouseLeave={() => setHoveredSegment(null)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                hoveredSegment === 'pending'
                  ? 'bg-warn/10 border-warn shadow-xs'
                  : 'bg-surface-2/60 border-border-light hover:border-warn/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-txt-2">
                  <span className="w-2 h-2 rounded-full bg-warn" />
                  Pending
                </span>
                <span className="text-xs font-mono font-bold text-warn">
                  {pendingPct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-[11px]">
                <span className="text-txt font-semibold">{totalPending}</span>
                <span className="text-[10px] text-txt-3">today</span>
              </div>
            </div>

            {/* Upcoming */}
            <div
              onMouseEnter={() => setHoveredSegment('upcoming')}
              onMouseLeave={() => setHoveredSegment(null)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                hoveredSegment === 'upcoming'
                  ? 'bg-accent/15 border-accent shadow-xs'
                  : 'bg-surface-2/60 border-border-light hover:border-accent/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-txt-2">
                  <span className="w-2 h-2 rounded-full bg-accent/60" />
                  Upcoming
                </span>
                <span className="text-xs font-mono font-bold text-accent">
                  {upcomingPct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-[11px]">
                <span className="text-txt font-semibold">{totalUpcoming}</span>
                <span className="text-[10px] text-txt-3">future days</span>
              </div>
            </div>
          </div>

          {/* Creation date rule footnote */}
          <p className="text-[10px] text-txt-3 leading-tight pt-2 border-t border-border-light text-center">
            Tracking starts from item creation date (prior days not missed) · Daily habits only
          </p>
        </div>
      </div>

      {/* === ROW 2: WEEKLY BREAKDOWN PROGRESS BARS === */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-txt-2">
          Weekly Progress Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {weeklyStats.map((w, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-surface border border-border-light space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-txt">{w.label}</span>
                <span className="text-txt-3 font-mono text-[11px]">{w.days}</span>
              </div>
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-bold text-txt">{w.percentage}%</span>
                  <span className="text-[11px] text-txt-3 font-mono">
                    {w.completed}/{w.total}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${w.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* === ROW 3: TOP HABITS LEADERBOARD === */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-txt-2">
            Top Consistency Leaderboard
          </h3>
          <span className="text-xs text-txt-3">Ranked by execution rate since creation</span>
        </div>

        {dailyHabits.length === 0 ? (
          <div className="p-6 rounded-xl bg-surface border border-border-light text-center space-y-1">
            <p className="text-xs font-medium text-txt">No daily habits created yet</p>
            <p className="text-[11px] text-txt-3">
              Add daily routine habits in Manage Tasks to view your consistency rankings here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedByRate.slice(0, 6).map((habit, idx) => {
              const startDay = getHabitStartDay(habit);
              const trackedDays = Math.max(1, DAYS_IN_MONTH - startDay + 1);
              const completedCount = getHabitCompletedCount(habit);
              const rate = Math.round((completedCount / trackedDays) * 100);
              const streak = habit.habitDetails?.streakCount || 0;
              const isDoneToday = isHabitCompletedOnDay(habit, ACTIVE_DAY);

              return (
                <div
                  key={String(habit._id)}
                  className="p-3.5 rounded-xl bg-surface border border-border-light flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-surface-2 flex items-center justify-center text-xs font-bold text-txt-3 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-txt truncate">{habit.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-txt-3 font-mono">
                          {completedCount}/{trackedDays} ({rate}%)
                        </span>
                        {isDoneToday ? (
                          <span className="text-[10px] text-ok font-medium flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Done
                          </span>
                        ) : (
                          <span className="text-[10px] text-warn font-medium">Pending</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {streak > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-warn font-semibold font-mono px-2 py-0.5 rounded-md bg-warn/10">
                        <Flame className="w-3 h-3" />
                        {streak}d
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === ROW 4: 31-DAY READ-ONLY HABIT MATRIX === */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-txt">
              31-Day Habit Tracking Matrix
            </h3>
            <p className="text-xs text-txt-3">
              Read-only matrix synchronized with your dashboard pending and completed habits.
            </p>
          </div>

          {/* 5-State Legend */}
          <div className="flex items-center gap-3 text-xs text-txt-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-ok/20 border border-ok/40 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-ok" />
              </div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-bad/15 border border-bad/30 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-bad" />
              </div>
              <span>Missed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-warn/15 border border-dashed border-warn" />
              <span>Pending Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-surface-2/40 border border-border-light" />
              <span>Upcoming</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-txt-3/50 font-bold">—</span>
              <span>Prior to Creation</span>
            </div>
          </div>
        </div>

        {/* Scrollable Matrix Table */}
        <div className="overflow-x-auto rounded-xl border border-border-light">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              {/* Week Column Spans */}
              <tr className="bg-surface-2/60 border-b border-border-light text-[11px] text-txt-2">
                <th className="sticky left-0 z-20 bg-surface-2 px-3 py-2 min-w-[170px]">
                  Daily Habits ({dailyHabits.length})
                </th>
                <th className="px-2 py-2 text-center border-r border-border-light min-w-[65px]">
                  Today
                </th>
                <th className="px-2 py-2 text-center border-r border-border-light min-w-[50px]">
                  Days
                </th>
                {WEEKS.map((w) => (
                  <th
                    key={w.label}
                    colSpan={w.days.length}
                    className="px-2 py-1.5 text-center border-r border-border-light font-medium"
                  >
                    {w.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-center min-w-[110px]">
                  Rate
                </th>
              </tr>

              {/* Day Number Sub-Headers */}
              <tr className="bg-surface-2/30 border-b border-border-light text-[10px] font-mono text-txt-3">
                <th className="sticky left-0 z-20 bg-surface px-3 py-1 font-normal text-txt-2">
                  Habit Name
                </th>
                <th className="px-1 py-1 text-center border-r border-border-light text-txt-2">
                  Status
                </th>
                <th className="px-1 py-1 text-center border-r border-border-light">
                  Active
                </th>
                {DAYS_ARRAY.map((day) => {
                  const dayDate = new Date(currentYear, currentMonthIndex, day);
                  const dayOfWeek = DAY_NAMES[dayDate.getDay()];
                  const isWeekEnd = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                  const isToday = day === ACTIVE_DAY;
                  return (
                    <th
                      key={day}
                      className={`py-1 text-center font-normal min-w-[24px] ${
                        isToday ? 'bg-accent/10 rounded-t-md' : ''
                      } ${
                        isWeekEnd ? 'border-r border-border-light' : ''
                      }`}
                    >
                      <div className={`text-[9px] ${isToday ? 'font-bold text-accent' : 'text-txt-3'}`}>
                        {isToday ? '★' : dayOfWeek}
                      </div>
                      <div className={`text-[10px] font-semibold ${isToday ? 'text-accent font-bold' : 'text-txt'}`}>
                        {day}
                      </div>
                    </th>
                  );
                })}
                <th className="px-2 py-1 text-center font-normal">Progress</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border-light bg-bg text-xs">
              {dailyHabits.length === 0 ? (
                <tr>
                  <td
                    colSpan={DAYS_IN_MONTH + 4}
                    className="py-12 text-center text-txt-3 bg-surface/30"
                  >
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <Flame className="w-6 h-6 text-txt-3 opacity-40 mb-1" />
                      <p className="text-xs font-medium text-txt">No daily routine habits to display</p>
                      <p className="text-[11px] text-txt-3 max-w-sm">
                        Create habits in Manage Tasks to track your 31-day visual streak matrix. One-off deep work tasks and admin items are excluded.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                dailyHabits.map((habit) => {
                  const habitId = String(habit._id);
                  const startDay = getHabitStartDay(habit);
                  const trackedDays = Math.max(1, DAYS_IN_MONTH - startDay + 1);
                  const completedCount = getHabitCompletedCount(habit);
                  const rate = Math.round((completedCount / trackedDays) * 100);
                  const streak = habit.habitDetails?.streakCount || 0;
                  const isDoneToday = isHabitCompletedOnDay(habit, ACTIVE_DAY);

                  return (
                    <tr
                      key={habitId}
                      className="hover:bg-surface-2/40 transition-colors group"
                    >
                      {/* Sticky Left: Habit Title & Streak */}
                      <td className="sticky left-0 z-10 bg-bg group-hover:bg-surface-2/40 px-3 py-2.5 font-medium text-txt truncate max-w-[180px] border-r border-border-light shadow-[1px_0_0_0_var(--border-light)]">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="truncate">{habit.title}</span>
                          {streak > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-warn font-semibold font-mono shrink-0">
                              <Flame className="w-3 h-3" />
                              {streak}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Today's Status Column */}
                      <td className="px-2 py-2.5 text-center border-r border-border-light">
                        {isDoneToday ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-ok/10 text-ok border border-ok/20">
                            <Check className="w-2.5 h-2.5" /> Done
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-warn/10 text-warn border border-warn/20">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Active Days Column */}
                      <td className="px-2 py-2.5 text-center font-mono text-[11px] text-txt-3 border-r border-border-light">
                        {trackedDays}d
                      </td>

                      {/* 31 Day Read-Only Matrix Cells */}
                      {DAYS_ARRAY.map((day) => {
                        const dayDate = new Date(currentYear, currentMonthIndex, day);
                        const isWeekEnd = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                        const isPrior = day < startDay;
                        const isCompleted = isHabitCompletedOnDay(habit, day);
                        const isToday = day === ACTIVE_DAY;
                        const isFuture = day > ACTIVE_DAY;
                        const isMissed = !isPrior && !isToday && !isFuture && !isCompleted;

                        return (
                          <td
                            key={day}
                            className={`p-0.5 text-center align-middle ${
                              isToday ? 'bg-accent/5' : ''
                            } ${
                              isWeekEnd ? 'border-r border-border-light' : ''
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-md mx-auto flex items-center justify-center transition-all select-none ${
                                isPrior
                                  ? 'text-txt-3/30'
                                  : isCompleted
                                  ? 'bg-ok/20 text-ok border border-ok/40'
                                  : isToday
                                  ? 'bg-warn/15 border border-dashed border-warn text-transparent'
                                  : isMissed
                                  ? 'bg-bad/10 border border-bad/30 text-bad/60'
                                  : 'bg-surface-2/40 border border-border-light/60 text-transparent'
                              }`}
                              title={
                                isPrior
                                  ? `Day ${day}: Prior to habit creation (${habit.createdAt ? new Date(habit.createdAt).toLocaleDateString() : 'Day ' + startDay}) - Not counted as missed`
                                  : isToday
                                  ? `Day ${day} (Today): ${isCompleted ? 'Done on Dashboard' : 'Pending on Dashboard'}`
                                  : isCompleted
                                  ? `Day ${day}: Completed`
                                  : isMissed
                                  ? `Day ${day}: Missed`
                                  : `Day ${day}: Upcoming`
                              }
                            >
                              {isPrior ? (
                                <span className="font-mono text-[9px] text-txt-3/40 font-bold">—</span>
                              ) : isCompleted ? (
                                <Check className="w-3 h-3 stroke-[2.5]" />
                              ) : isMissed ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-bad/60" />
                              ) : null}
                            </div>
                          </td>
                        );
                      })}

                      {/* Right Progress Meter Column */}
                      <td className="px-3 py-2.5 min-w-[110px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-txt font-mono">{rate}%</span>
                            <span className="text-[10px] text-txt-3 font-mono">
                              {completedCount}/{trackedDays}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                rate >= 75 ? 'bg-ok' : rate >= 50 ? 'bg-accent' : 'bg-warn'
                              }`}
                              style={{ width: `${Math.min(100, rate)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
