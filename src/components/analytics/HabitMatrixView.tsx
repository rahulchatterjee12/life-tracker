'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { toggleHabitDay } from '@/lib/features/tasks/tasksSlice';
import { useMounted } from '@/lib/useMounted';
import {
  Flame,
  Check,
  TrendingUp,
  Award,
  Sparkles,
  Calendar as CalendarIcon,
} from 'lucide-react';

const DAYS_IN_MONTH = 31;
const DAYS_ARRAY = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);

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
  const dispatch = useAppDispatch();
  const tasks = useAppSelector((state) => state.tasks.items);
  const isMounted = useMounted();
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Filter only habits
  const habits = tasks.filter((t) => t.type === 'HABIT' && t.habitDetails);

  const monthYear = '2026-03';

  // Helper: check if habit is completed on a specific day
  const isHabitCompletedOnDay = (habitId: string, day: number) => {
    const habit = habits.find((h) => String(h._id) === habitId);
    if (!habit?.habitDetails?.completedDates) return false;
    const dateStr = `${monthYear}-${String(day).padStart(2, '0')}`;
    return habit.habitDetails.completedDates.includes(dateStr);
  };

  // Calculate daily stats across all habits for each day 1..31
  const dailyStats = DAYS_ARRAY.map((day) => {
    const completedCount = habits.filter((h) => isHabitCompletedOnDay(String(h._id), day)).length;
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
  const totalCompletedChecks = habits.reduce((acc, h) => acc + (h.habitDetails?.completedDates?.length || 0), 0);
  const monthlyCompletionRate = totalPossibleChecks > 0 ? Math.round((totalCompletedChecks / totalPossibleChecks) * 100) : 0;

  // Best habit by streak and rate
  const sortedByRate = [...habits].sort((a, b) => {
    const rateA = (a.habitDetails?.completedDates?.length || 0) / (a.habitDetails?.monthlyGoal || 31);
    const rateB = (b.habitDetails?.completedDates?.length || 0) / (b.habitDetails?.monthlyGoal || 31);
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
        if (isHabitCompletedOnDay(String(h._id), day)) {
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
    // Bezier smoothing
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
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-semibold text-txt tracking-tight">
              Habit Tracker &amp; Analytics
            </h2>
            <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
              <CalendarIcon className="w-3 h-3" />
              March 2026
            </span>
          </div>
          <p className="text-xs text-txt-2 mt-1">
            Visual consistency matrix, daily completion curves, and streak momentum.
          </p>
        </div>

        {/* Quick KPI badges */}
        <div className="flex items-center gap-2">
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
        {/* Daily Completion Trend Line Chart (7 cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-accent/10 text-accent">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-txt">Daily Consistency Trend</h3>
                <p className="text-[11px] text-txt-3">Daily completion percentage across March</p>
              </div>
            </div>

            {hoveredDay && (
              <div className="text-xs font-mono px-2 py-1 rounded-md bg-surface-2 text-txt font-medium">
                Day {hoveredDay}: {dailyStats[hoveredDay - 1]?.completed}/{dailyStats[hoveredDay - 1]?.total} ({dailyStats[hoveredDay - 1]?.percentage}%)
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
                return (
                  <g
                    key={p.day}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredDay(p.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 5 : 2.5}
                      className={isHovered ? 'fill-accent stroke-bg stroke-2 transition-all' : 'fill-accent'}
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
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${w.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* === ROW 3: TOP 10 DAILY HABITS LEADERBOARD === */}
      <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-warn/10 text-warn">
              <Award className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-txt">Top 10 Habits &amp; Streaks</h3>
              <p className="text-[11px] text-txt-3">Ranked by monthly execution consistency</p>
            </div>
          </div>
          <span className="text-xs text-txt-3">{habits.length} habits tracked</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {sortedByRate.slice(0, 9).map((habit, rank) => {
            const completedDays = habit.habitDetails?.completedDates?.length || 0;
            const goal = habit.habitDetails?.monthlyGoal || 31;
            const rate = Math.round((completedDays / goal) * 100);
            const streak = habit.habitDetails?.streakCount || 0;

            return (
              <div
                key={String(habit._id)}
                className="p-3 rounded-xl bg-bg border border-border-light flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-surface-2 text-txt-2 flex items-center justify-center text-[10px] font-bold shrink-0 font-mono">
                    {rank + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-txt truncate">{habit.title}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-txt-3 mt-0.5">
                      <span>{completedDays}/{goal} days</span>
                      {streak > 0 && (
                        <span className="flex items-center gap-0.5 text-warn font-medium">
                          <Flame className="w-3 h-3" />
                          {streak}d
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold font-mono ${
                    rate >= 75 ? 'text-ok' : rate >= 50 ? 'text-accent' : 'text-txt-2'
                  }`}>
                    {rate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* === ROW 4: THE INTERACTIVE 31-DAY HABIT MATRIX === */}
      <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-txt">Daily Habit Matrix</h3>
            <p className="text-[11px] text-txt-3">
              Click any day cell to toggle completion. Real-time streak recalculation.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-txt-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-accent text-white flex items-center justify-center text-[9px] font-bold">✓</span>
              Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md border border-border bg-bg" />
              Pending
            </span>
          </div>
        </div>

        {/* Scrollable Matrix Grid Table */}
        <div className="overflow-x-auto rounded-xl border border-border-light">
          <table className="w-full border-collapse text-left">
            <thead>
              {/* Week Super-Headers */}
              <tr className="bg-surface-2/60 border-b border-border-light text-[10px] font-semibold uppercase tracking-wider text-txt-2">
                <th className="sticky left-0 z-20 bg-surface-2 px-3 py-2 min-w-[170px]">
                  Daily Habits ({habits.length})
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
                <th className="px-1 py-1 text-center border-r border-border-light">
                  Days
                </th>
                {DAYS_ARRAY.map((day) => {
                  const dayOfWeek = DAY_NAMES[(day - 1) % 7];
                  const isWeekEnd = day % 7 === 0;
                  return (
                    <th
                      key={day}
                      className={`py-1 text-center font-normal min-w-[24px] ${
                        isWeekEnd ? 'border-r border-border-light' : ''
                      }`}
                    >
                      <div className="text-[9px] text-txt-3">{dayOfWeek}</div>
                      <div className="text-[10px] font-semibold text-txt">{day}</div>
                    </th>
                  );
                })}
                <th className="px-2 py-1 text-center font-normal">Rate</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border-light bg-bg text-xs">
              {habits.map((habit) => {
                const habitId = String(habit._id);
                const completedCount = habit.habitDetails?.completedDates?.length || 0;
                const monthlyGoal = habit.habitDetails?.monthlyGoal || 31;
                const rate = Math.round((completedCount / monthlyGoal) * 100);
                const streak = habit.habitDetails?.streakCount || 0;

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

                    {/* Goal Column */}
                    <td className="px-2 py-2.5 text-center font-mono text-[11px] text-txt-3 border-r border-border-light">
                      {monthlyGoal}
                    </td>

                    {/* 31 Day Checkbox Cells */}
                    {DAYS_ARRAY.map((day) => {
                      const isCompleted = isHabitCompletedOnDay(habitId, day);
                      const isWeekEnd = day % 7 === 0;

                      return (
                        <td
                          key={day}
                          className={`p-0.5 text-center align-middle ${
                            isWeekEnd ? 'border-r border-border-light' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              dispatch(
                                toggleHabitDay({
                                  taskId: habitId,
                                  day,
                                  monthYear,
                                })
                              )
                            }
                            className={`w-5 h-5 rounded-md mx-auto flex items-center justify-center transition-all cursor-pointer ${
                              isCompleted
                                ? 'bg-accent text-white shadow-xs scale-95'
                                : 'bg-surface-2/60 border border-border-light hover:border-accent/60 text-transparent'
                            }`}
                            title={`Toggle Day ${day} for ${habit.title}`}
                          >
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </button>
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

