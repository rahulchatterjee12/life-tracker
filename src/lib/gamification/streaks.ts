import { HabitFrequency, AdminRecurringCycle } from '@/types/database';

export interface HabitDetailsLike {
  frequency?: HabitFrequency;
  customDays?: number[];
  streakCount?: number;
  bestStreak?: number;
  monthlyGoal?: number;
  completedDates?: string[];
  lastCompletedDate?: string;
  nextTaskId?: string | unknown;
}

export interface TaskLike {
  _id?: string | unknown;
  type: string;
  completed?: boolean;
  completedAt?: Date | string;
  createdAt?: Date | string;
  completionHistory?: Array<{
    completedAt: Date | string;
    dateStr: string;
    pointsAwarded?: number;
    durationSeconds?: number;
    subtasksCompletedCount?: number;
    isFrog?: boolean;
  }>;
  habitDetails?: HabitDetailsLike;
  adminDetails?: {
    dueDate?: Date | string;
    isRecurring?: boolean;
    recurringCycle?: AdminRecurringCycle;
    subtasks?: Array<{
      id: string;
      title: string;
      completed: boolean;
      offsetDaysBeforeParent?: number;
    }>;
  };
}

/**
 * Returns YYYY-MM-DD in local time
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a specific Date or YYYY-MM-DD string is scheduled for a habit
 */
export function isDayScheduledForHabit(
  habitDetails?: HabitDetailsLike,
  dateInput: Date | string = new Date()
): boolean {
  if (!habitDetails) return true;
  const freq = habitDetails.frequency || 'daily';
  if (freq === 'daily') return true;

  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T00:00:00`) : dateInput;
  const dayOfWeek = date.getDay(); // 0 for Sunday, 6 for Saturday

  if (freq === 'weekdays') {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }
  if (freq === 'weekends') {
    return dayOfWeek === 0 || dayOfWeek === 6;
  }
  if (freq === 'custom') {
    const customDays = habitDetails.customDays;
    if (!customDays || customDays.length === 0) return true;
    return customDays.includes(dayOfWeek);
  }
  return true;
}

/**
 * Formula for total scheduled days per month for a habit.
 * Accurately iterates through all calendar days of the specified month (default current month)
 * and tallies days matching the habit's frequency and custom recurrence days.
 */
export function getMonthlyScheduledDays(
  habitDetails?: HabitDetailsLike,
  referenceDate: Date | string = new Date()
): number {
  if (!habitDetails) return 31;
  const date = typeof referenceDate === 'string' ? new Date(`${referenceDate}T00:00:00`) : referenceDate;
  const year = date.getFullYear();
  const monthIndex = date.getMonth(); // 0-indexed
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const freq = habitDetails.frequency || 'daily';
  const customDays = habitDetails.customDays;

  if (freq === 'daily' || (!freq && (!customDays || customDays.length === 7))) {
    return daysInMonth;
  }

  let scheduledCount = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, monthIndex, day);
    if (isDayScheduledForHabit(habitDetails, dayDate)) {
      scheduledCount++;
    }
  }

  return scheduledCount > 0 ? scheduledCount : habitDetails.monthlyGoal || daysInMonth;
}

/**
 * Calculates current streak and best streak for a habit.
 * 
 * Rules:
 * 1. Tracking starts from habit's createdAt date.
 * 2. If completed today, streak includes today (+1).
 * 3. If NOT completed today, today is still in progress (does NOT break streak).
 *    The streak continues from the previous scheduled day.
 * 4. Off-days (non-scheduled days) do NOT break streaks and are NOT counted as missed.
 * 5. If a prior scheduled day (after creation date) was missed, the streak is broken (0 if not completed today).
 * 6. Best streak is the all-time maximum consecutive scheduled days completed without an unexcused miss.
 */
export function calculateHabitStreak(
  task: TaskLike,
  asOfDateStr?: string
): { currentStreak: number; bestStreak: number } {
  if (!task.habitDetails) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const todayStr = asOfDateStr || getLocalDateString();
  const todayDate = new Date(`${todayStr}T00:00:00`);

  const completedSet = new Set<string>(task.habitDetails.completedDates || []);
  if (task.completionHistory && Array.isArray(task.completionHistory)) {
    task.completionHistory.forEach((ev) => {
      if (ev.dateStr) completedSet.add(ev.dateStr);
    });
  }
  const isDoneTodayExplicitly =
    task.habitDetails.completedDates?.includes(todayStr) === true ||
    task.completionHistory?.some((e) => e.dateStr === todayStr) === true ||
    task.habitDetails.lastCompletedDate === todayStr ||
    Boolean(task.completed && task.completedAt && getLocalDateString(new Date(task.completedAt)) === todayStr);

  if (isDoneTodayExplicitly) {
    completedSet.add(todayStr);
  }

  // Determine habit creation day
  let createdDate: Date;
  if (task.createdAt) {
    const d = new Date(task.createdAt);
    createdDate = isNaN(d.getTime()) ? todayDate : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  } else {
    createdDate = todayDate;
  }
  const createdDateStr = getLocalDateString(createdDate);

  // --- Calculate Current Streak ---
  let currentStreak = 0;
  const isDoneToday = completedSet.has(todayStr);

  const cursor = new Date(todayDate);

  if (isDoneToday) {
    currentStreak = 1;
    // Step cursor back 1 day to check past days
    cursor.setDate(cursor.getDate() - 1);
  } else {
    // Not done today yet. Check backwards from yesterday.
    cursor.setDate(cursor.getDate() - 1);
  }

  // Scan backwards up to 365 days or until creation date
  for (let i = 0; i < 365; i++) {
    const cursorStr = getLocalDateString(cursor);

    // Stop if before creation date
    if (cursorStr < createdDateStr) {
      break;
    }

    const isScheduled = isDayScheduledForHabit(task.habitDetails, cursor);
    if (!isScheduled) {
      // Off-day: skip without breaking streak
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    // Scheduled day:
    if (completedSet.has(cursorStr)) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      // Scheduled day was MISSED!
      // Streak broken.
      break;
    }
  }

  // --- Calculate Best Streak ---
  // Iterate all scheduled days from creation date (or earliest completion date) up to today
  let earliestDate = new Date(createdDate);
  completedSet.forEach((dStr) => {
    const d = new Date(`${dStr}T00:00:00`);
    if (d < earliestDate) {
      earliestDate = d;
    }
  });

  let maxStreak = task.habitDetails.bestStreak || 0;
  let runningStreak = 0;

  const forwardCursor = new Date(earliestDate);
  while (forwardCursor <= todayDate) {
    const forwardStr = getLocalDateString(forwardCursor);
    const isScheduled = isDayScheduledForHabit(task.habitDetails, forwardCursor);

    if (isScheduled) {
      if (completedSet.has(forwardStr)) {
        runningStreak += 1;
        if (runningStreak > maxStreak) {
          maxStreak = runningStreak;
        }
      } else {
        // Scheduled day missed: if it's before today, streak resets
        if (forwardStr < todayStr) {
          runningStreak = 0;
        }
      }
    }

    forwardCursor.setDate(forwardCursor.getDate() + 1);
  }

  const bestStreak = Math.max(maxStreak, currentStreak);

  return {
    currentStreak,
    bestStreak,
  };
}

/**
 * Calculates updated user streak based on last active date and today's date.
 */
export function calculateUserStreak(
  lastActiveDate: string | undefined,
  currentStreak: number = 0,
  longestStreak: number = 0,
  asOfDateStr: string = getLocalDateString()
): { currentStreak: number; longestStreak: number; isActiveToday: boolean } {
  if (!lastActiveDate) {
    return { currentStreak, longestStreak, isActiveToday: false };
  }

  if (lastActiveDate === asOfDateStr) {
    return { currentStreak, longestStreak, isActiveToday: true };
  }

  const today = new Date(`${asOfDateStr}T00:00:00`);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  if (lastActiveDate === yesterdayStr) {
    // User was active yesterday. Today is active in progress, so current streak is preserved!
    return { currentStreak, longestStreak, isActiveToday: false };
  }

  // User was last active more than 1 day ago. Active streak has reset to 0.
  return { currentStreak: 0, longestStreak, isActiveToday: false };
}

/**
 * Applies daily reset logic across a list of tasks for a given date (default today).
 * - For HABIT tasks: if completed on a prior date, resets completed to false.
 *   Recalculates streakCount and bestStreak based on history.
 * - For ADMIN tasks with isRecurring: resets completed and subtasks if recurrence cycle has passed.
 */
export function applyDailyResetToTasks<T extends TaskLike>(
  tasks: T[],
  todayStr: string = getLocalDateString()
): { updatedTasks: T[]; modifiedCount: number } {
  let modifiedCount = 0;

  const updatedTasks = tasks.map((task) => {
    let hasChanged = false;

    if (task.type === 'HABIT') {
      const isCompletedToday =
        task.habitDetails?.completedDates?.includes(todayStr) === true ||
        task.completionHistory?.some((e) => e.dateStr === todayStr) === true ||
        (task.habitDetails?.lastCompletedDate === todayStr && task.completed === true);

      // Check if task was completed on a previous day and needs daily reset to false
      if (task.completed && !isCompletedToday) {
        task.completed = false;
        task.completedAt = undefined;
        hasChanged = true;
      } else if (!task.completed && isCompletedToday) {
        task.completed = true;
        hasChanged = true;
      }

      // Recalculate streak
      if (task.habitDetails) {
        const { currentStreak, bestStreak } = calculateHabitStreak(task, todayStr);
        if (task.habitDetails.streakCount !== currentStreak) {
          task.habitDetails.streakCount = currentStreak;
          hasChanged = true;
        }
        if (task.habitDetails.bestStreak !== bestStreak) {
          task.habitDetails.bestStreak = bestStreak;
          hasChanged = true;
        }
      }
    } else if (task.type === 'ADMIN' && task.adminDetails?.isRecurring) {
      const adminDetails = task.adminDetails;
      const cycle = adminDetails.recurringCycle;
      const completedAt = task.completedAt ? new Date(task.completedAt) : null;

      if (task.completed && completedAt) {
        const completedStr = getLocalDateString(completedAt);
        if (completedStr !== todayStr) {
          let shouldReset = false;
          const todayDate = new Date(`${todayStr}T00:00:00`);

          if (cycle === 'weekly') {
            const startOfWeek = (d: Date) => {
              const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
              c.setDate(c.getDate() - c.getDay());
              c.setHours(0, 0, 0, 0);
              return c.getTime();
            };
            shouldReset = startOfWeek(todayDate) > startOfWeek(completedAt);
          } else if (cycle === 'monthly') {
            shouldReset =
              todayDate.getMonth() !== completedAt.getMonth() ||
              todayDate.getFullYear() !== completedAt.getFullYear();
          } else if (cycle === 'yearly') {
            shouldReset = todayDate.getFullYear() !== completedAt.getFullYear();
          }

          if (shouldReset) {
            task.completed = false;
            task.completedAt = undefined;
            if (adminDetails.subtasks) {
              adminDetails.subtasks.forEach((s) => {
                s.completed = false;
              });
            }
            hasChanged = true;
          }
        }
      }
    }

    if (hasChanged) {
      modifiedCount++;
      (task as any)._dailyResetModified = true;
      if (typeof (task as any).markModified === 'function') {
        (task as any).markModified('completed');
        (task as any).markModified('habitDetails');
        (task as any).markModified('adminDetails');
      }
    }

    return task;
  });

  return { updatedTasks, modifiedCount };
}
