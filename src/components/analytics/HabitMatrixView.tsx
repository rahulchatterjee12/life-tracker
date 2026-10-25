'use client';

import { useState } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { useMounted } from '@/lib/useMounted';
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

const DAYS_IN_MONTH = 31;
const DAYS_ARRAY = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);

// Active tracking day in March 2026 reflecting the dashboard tasks
const ACTIVE_DAY = 27;
const MONTH_YEAR = '2026-03';

// Week groupings matching calendar (March 2026 starts on Sunday)
const WEEKS = [
  { label: 'Week 1', days: [1, 2, 3, 4, 5, 6, 7] },
  { label: 'Week 2', days: [8, 9, 10, 11, 12, 13, 14] },
  { label: 'Week 3', days: [15, 16, 17, 18, 19, 20, 21] },
  { label: 'Week 4', days: [22, 23, 24, 25, 26, 27, 28] },
  { label: 'Week 5', days: [29, 30, 31] },
];

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function HabitMatrixView() {
  const tasks = useAppSelector((state) => state.tasks.items);
  const isMounted = useMounted();
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Filter only habits (matching the daily habits from user's spreadsheet)
  const habits = tasks.filter((t) => t.type === 'HABIT' && t.habitDetails);

  // Helper: check if habit is completed on a specific day
  // For ACTIVE_DAY (day 27), it reads directly from habit.completed (dashboard pending/completed state)!
  // For other days, it reads from habit.habitDetails.completedDates.
  const isHabitCompletedOnDay = (habit: (typeof habits)[0], day: number) => {
    if (day === ACTIVE_DAY) {
      return Boolean(habit.completed);
    }
    const dateStr = `${MONTH_YEAR}-${String(day).padStart(2, '0')}`;
    return habit.habitDetails?.completedDates?.includes(dateStr) ?? false;
  };

  // Completed count for a habit across all 31 days
  const getHabitCompletedCount = (habit: (typeof habits)[0]) => {
    return DAYS_ARRAY.filter((day) => isHabitCompletedOnDay(habit, day)).length;
  };

  // Calculate daily stats across all habits for each day 1..31
  const dailyStats = DAYS_ARRAY.map((day) => {
    const completedCount = habits.filter((h) => isHabitCompletedOnDay(h, day)).length;
    const totalHabits = habits.length;
    const percentage = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;
    return {
      day,
      completed: completedCount,
      total: totalHabits,
      percentage,
    };
  });

  // Calculate overall monthly metrics
  const totalPossibleChecks = habits.reduce((acc, h) => acc + (h.habitDetails?.monthlyGoal || 31), 0);
  const totalCompletedChecks = habits.reduce((acc, h) => acc + getHabitCompletedCount(h), 0);
  const monthlyCompletionRate = totalPossibleChecks > 0 ? Math.round((totalCompletedChecks / totalPossibleChecks) * 100) : 0;

  // Today's dashboard completion stats
  const todayCompletedCount = habits.filter((h) => h.completed).length;
  const todayPendingCount = habits.filter((h) => !h.completed).length;

  // Best habit by completion rate
  const sortedByRate = [...habits].sort((a, b) => {
    const rateA = getHabitCompletedCount(a) / (a.habitDetails?.monthlyGoal || 31);
    const rateB = getHabitCompletedCount(b) / (b.habitDetails?.monthlyGoal || 31);
    return rateB - rateA;
  });

  const bestStreak = habits.reduce((max, h) => Math.max(max, h.habitDetails?.streakCount || 0), 0);
  const topHabit = sortedByRate[0];

  // Weekly breakdown stats
  const weeklyStats = WEEKS.map((w) => {
    const totalSlots = habits.length * w.days.length;
    let completedInWeek = 0;
    w.days.forEach((day) => {
      habits.forEach((h) => {
        if (isHabitCompletedOnDay(h, day)) {
          completedInWeek += 1;
        }
      });
    });
    const pct = totalSlots > 0 ? Math.round((completedInWeek / totalSlots) * 100) : 0;
    return {
      label: w.label,
      days: `${w.days[0]}–${w.days[w.days.length - 1]}`,
      completed: completedInWeek,
      total: totalSlots,
      percentage: pct,
    };
  });

  // SVG Chart path generation
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

  // Donut Ring calculation
  const donutRadius = 42;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutOffset = donutCircumference * (1 - monthlyCompletionRate / 100);

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
              March 2026
            </span>
            <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-surface-2 text-txt-2 border border-border-light font-medium">
              <Lock className="w-3 h-3 text-txt-3" />
              Read-only · Synced from Dashboard
            </span>
          </div>
          <p className="text-xs text-txt-2 mt-1">
            Real-time visual curves, monthly progress ring, and weekly momentum driven by your dashboard tasks.
          </p>
        </div>

        {/* Quick KPI badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border-light text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
            <span className="text-txt-2">Today:</span>
            <span className="font-semibold text-txt">
              {todayCompletedCount}/{habits.length} Done
            </span>
            {todayPendingCount > 0 && (
              <span className="text-[10px] text-txt-3">({todayPendingCount} pending)</span>
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
            <span className="text-txt-2">Rate:</span>
            <span className="font-semibold text-txt">{isMounted ? monthlyCompletionRate : 56}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border-light text-xs">
            <Flame className="w-3.5 h-3.5 text-warn" />
            <span className="text-txt-2">Streak:</span>
            <span className="font-semibold text-txt">{isMounted ? bestStreak : 14}d</span>
          </div>
        </div>
      </div>

      {/* === ROW 1: CHARTS & STATS === */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Daily Completion Trend Line Chart (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
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
                          : 'fill-accent'
                      }
                    />
                    {/* Transparent touch/hover hit zone */}
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
              <span className="text-accent font-semibold">Day 27 (Today)</span>
              <span>Day 31</span>
            </div>
          </div>
        </div>

        {/* Overview Monthly Progress Donut (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-ok/10 text-ok">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-txt">Monthly Progress</h3>
              <p className="text-[11px] text-txt-3">Target vs executed checks</p>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="flex items-center justify-center my-3 relative">
            <svg width="120" height="120" className="-rotate-90">
              <circle
                cx="60"
                cy="60"
                r={donutRadius}
                fill="none"
                stroke="currentColor"
                className="text-surface-2"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r={donutRadius}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="8"
                strokeDasharray={donutCircumference}
                strokeDashoffset={isMounted ? donutOffset : donutCircumference * 0.44}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-bold text-txt">
                {isMounted ? monthlyCompletionRate : 56}%
              </span>
              <span className="text-[10px] text-txt-3">Completed</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-light text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-txt-3 font-medium">Completed</p>
              <p className="text-base font-semibold text-ok mt-0.5">{isMounted ? totalCompletedChecks : 194}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-txt-3 font-medium">Remaining</p>
              <p className="text-base font-semibold text-txt mt-0.5">
                {isMounted ? totalPossibleChecks - totalCompletedChecks : 172}
              </p>
            </div>
          </div>
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

      {/* === ROW 3: TOP 10 HABITS LEADERBOARD === */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-txt-2">
            Top Consistency Leaderboard
          </h3>
          <span className="text-xs text-txt-3">Ranked by monthly execution</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedByRate.slice(0, 6).map((habit, idx) => {
            const completedCount = getHabitCompletedCount(habit);
            const monthlyGoal = habit.habitDetails?.monthlyGoal || 31;
            const rate = Math.round((completedCount / monthlyGoal) * 100);
            const streak = habit.habitDetails?.streakCount || 0;

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
                        {completedCount}/{monthlyGoal} ({rate}%)
                      </span>
                      {habit.completed ? (
                        <span className="text-[10px] text-ok font-medium flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Done
                        </span>
                      ) : (
                        <span className="text-[10px] text-txt-3">Pending</span>
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
      </div>

      {/* === ROW 4: 31-DAY READ-ONLY HABIT MATRIX === */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-txt">
              31-Day Habit Tracking Matrix
            </h3>
            <p className="text-xs text-txt-3">
              Read-only matrix synchronized with your dashboard pending and completed tasks.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-txt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-ok/20 border border-ok/40 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-ok" />
              </div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-surface-2 border border-dashed border-txt-3/50" />
              <span>Pending Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-surface-2/40 border border-border-light" />
              <span>Unmarked</span>
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
                  Daily Habits ({habits.length})
                </th>
                <th className="px-2 py-2 text-center border-r border-border-light min-w-[65px]">
                  Today
                </th>
                <th className="px-2 py-2 text-center border-r border-border-light min-w-[50px]">
                  Goal
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
                  Progress
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
                  Days
                </th>
                {DAYS_ARRAY.map((day) => {
                  const dayOfWeek = DAY_NAMES[(day - 1) % 7];
                  const isWeekEnd = day % 7 === 0;
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
                <th className="px-2 py-1 text-center font-normal">Rate</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border-light bg-bg text-xs">
              {habits.map((habit) => {
                const habitId = String(habit._id);
                const completedCount = getHabitCompletedCount(habit);
                const monthlyGoal = habit.habitDetails?.monthlyGoal || 31;
                const rate = Math.round((completedCount / monthlyGoal) * 100);
                const streak = habit.habitDetails?.streakCount || 0;
                const isDoneToday = Boolean(habit.completed);

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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-2 text-txt-3 border border-border-light">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Goal Column */}
                    <td className="px-2 py-2.5 text-center font-mono text-[11px] text-txt-3 border-r border-border-light">
                      {monthlyGoal}
                    </td>

                    {/* 31 Day Read-Only Matrix Cells */}
                    {DAYS_ARRAY.map((day) => {
                      const isCompleted = isHabitCompletedOnDay(habit, day);
                      const isWeekEnd = day % 7 === 0;
                      const isToday = day === ACTIVE_DAY;

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
                              isCompleted
                                ? 'bg-ok/20 text-ok border border-ok/40'
                                : isToday
                                ? 'bg-surface-2 border border-dashed border-txt-3/50 text-transparent'
                                : 'bg-surface-2/40 border border-border-light/60 text-transparent'
                            }`}
                            title={
                              isToday
                                ? `Day ${day} (Today): ${isCompleted ? 'Done on Dashboard' : 'Pending on Dashboard'}`
                                : `Day ${day}: ${isCompleted ? 'Completed' : 'Unmarked'}`
                            }
                          >
                            {isCompleted ? <Check className="w-3 h-3 stroke-[2.5]" /> : null}
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
                            {completedCount}/{monthlyGoal}
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
