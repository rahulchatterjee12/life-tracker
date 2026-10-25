import { TaskImportance } from '@/types/database';

export interface DeepWorkScoringInput {
  targetMinutes: number;
  actualDurationSeconds: number;
  importance: TaskImportance;
  isLiveTracked: boolean;
  isFrog?: boolean;
  completedAt?: Date;
}

export interface DeepWorkScoringResult {
  basePoints: number;
  overtimeSeconds: number;
  isOvertimeEligible: boolean;
  overtimeBonus: number;
  manualPenaltyDeduction: number;
  frogMultiplier: number;
  totalPoints: number;
  breakdown: string[];
}

export interface HabitScoringInput {
  importance: TaskImportance;
  streakCount: number;
  isFrog?: boolean;
  completedAt?: Date;
}

export interface HabitScoringResult {
  basePoints: number;
  streakMultiplier: number;
  frogMultiplier: number;
  totalPoints: number;
  breakdown: string[];
}

export interface AdminScoringInput {
  importance: TaskImportance;
  totalSubtasks: number;
  completedSubtasks: number;
  isFrog?: boolean;
  completedAt?: Date;
}

export interface AdminScoringResult {
  basePoints: number;
  subtaskBonus: number;
  frogMultiplier: number;
  totalPoints: number;
  breakdown: string[];
}

export const STREAK_FREEZE_POINT_COST = 200;
export const OVERTIME_MINIMUM_THRESHOLD_RATIO = 0.2; // 20% rule
export const MANUAL_LOGGING_PENALTY_RATIO = 0.1; // 10% penalty
export const FROG_EARLY_BIRD_MULTIPLIER = 1.5; // Eat That Frog before 12:00 PM multiplier

/**
 * Evaluates points for Deep Work focus sessions:
 * 1. Base Points = targetMinutes * (importance / 3) * 10
 * 2. Overtime Rule: Bonus awarded ONLY IF extra time >= 20% of target duration
 * 3. Manual Penalty: 10% deduction if isLiveTracked === false
 * 4. Eat That Frog: 1.5x multiplier if completed before 12:00 PM
 */
export function calculateDeepWorkPoints(input: DeepWorkScoringInput): DeepWorkScoringResult {
  const {
    targetMinutes,
    actualDurationSeconds,
    importance,
    isLiveTracked,
    isFrog = false,
    completedAt = new Date(),
  } = input;

  const targetSeconds = Math.max(1, targetMinutes * 60);
  const importanceRatio = (importance || 3) / 3;
  const breakdown: string[] = [];

  // 1. Base points scaled to completion percentage (up to 100%)
  const completionRatio = Math.min(1, actualDurationSeconds / targetSeconds);
  const basePoints = Math.round(targetMinutes * importanceRatio * 10 * completionRatio);
  breakdown.push(`Base points (${Math.round(completionRatio * 100)}% of ${targetMinutes}m target): ${basePoints} pts`);

  // 2. The Overtime Rule
  const overtimeSeconds = Math.max(0, actualDurationSeconds - targetSeconds);
  const minRequiredOvertimeSeconds = targetSeconds * OVERTIME_MINIMUM_THRESHOLD_RATIO;
  const isOvertimeEligible = overtimeSeconds >= minRequiredOvertimeSeconds;

  let overtimeBonus = 0;
  if (isOvertimeEligible) {
    const overtimeMinutes = overtimeSeconds / 60;
    overtimeBonus = Math.round(overtimeMinutes * importanceRatio * 10);
    breakdown.push(`Overtime bonus (+${Math.round(overtimeMinutes)}m >= 20% threshold): +${overtimeBonus} pts`);
  } else if (overtimeSeconds > 0) {
    breakdown.push(
      `Overtime recorded (+${Math.round(overtimeSeconds / 60)}m), but below the required 20% threshold (+${Math.round(minRequiredOvertimeSeconds / 60)}m). No bonus awarded.`
    );
  }

  let accumulatedPoints = basePoints + overtimeBonus;

  // 3. Manual Logging Penalty (10% reduction)
  let manualPenaltyDeduction = 0;
  if (!isLiveTracked) {
    manualPenaltyDeduction = Math.round(accumulatedPoints * MANUAL_LOGGING_PENALTY_RATIO);
    accumulatedPoints = Math.max(0, accumulatedPoints - manualPenaltyDeduction);
    breakdown.push(`Manual logging penalty (-10%): -${manualPenaltyDeduction} pts`);
  }

  // 4. "Eat That Frog" before 12:00 PM Multiplier
  let frogMultiplier = 1;
  if (isFrog) {
    const completionHour = new Date(completedAt).getHours();
    if (completionHour < 12) {
      frogMultiplier = FROG_EARLY_BIRD_MULTIPLIER;
      const bonusFrogPoints = Math.round(accumulatedPoints * (frogMultiplier - 1));
      accumulatedPoints += bonusFrogPoints;
      breakdown.push(`Eat That Frog Morning Multiplier (1.5x before noon): +${bonusFrogPoints} pts`);
    } else {
      breakdown.push('Eat That Frog completed after 12:00 PM. Standard points applied.');
    }
  }

  return {
    basePoints,
    overtimeSeconds,
    isOvertimeEligible,
    overtimeBonus,
    manualPenaltyDeduction,
    frogMultiplier,
    totalPoints: accumulatedPoints,
    breakdown,
  };
}

/**
 * Evaluates points for Binary Habits:
 * Base: 25 pts * (importance / 3)
 * Streak bonus: +5% per 7 days of streak, capped at 2.0x (100% bonus)
 * Eat That Frog: 1.5x multiplier if done before 12:00 PM
 */
export function calculateHabitPoints(input: HabitScoringInput): HabitScoringResult {
  const { importance, streakCount, isFrog = false, completedAt = new Date() } = input;
  const breakdown: string[] = [];

  const basePoints = Math.round(25 * ((importance || 3) / 3));
  breakdown.push(`Habit base points: ${basePoints} pts`);

  // Streak Multiplier: +5% per week of streak up to 2.0x
  const weekBlocks = Math.floor(streakCount / 7);
  const streakMultiplier = Math.min(2.0, 1 + weekBlocks * 0.05);
  let accumulated = Math.round(basePoints * streakMultiplier);

  if (streakMultiplier > 1) {
    breakdown.push(`Streak multiplier (${streakCount} days => ${streakMultiplier.toFixed(2)}x): +${accumulated - basePoints} pts`);
  }

  let frogMultiplier = 1;
  if (isFrog) {
    const hour = new Date(completedAt).getHours();
    if (hour < 12) {
      frogMultiplier = FROG_EARLY_BIRD_MULTIPLIER;
      const frogBonus = Math.round(accumulated * (frogMultiplier - 1));
      accumulated += frogBonus;
      breakdown.push(`Eat That Frog Morning Bonus (1.5x): +${frogBonus} pts`);
    }
  }

  return {
    basePoints,
    streakMultiplier,
    frogMultiplier,
    totalPoints: accumulated,
    breakdown,
  };
}

/**
 * Evaluates points for Admin/Calendar tasks:
 * Base: 30 pts * (importance / 3)
 * Subtask bonus: +10 pts per relational subtask completed
 * Eat That Frog: 1.5x multiplier if done before 12:00 PM
 */
export function calculateAdminPoints(input: AdminScoringInput): AdminScoringResult {
  const { importance, totalSubtasks, completedSubtasks, isFrog = false, completedAt = new Date() } = input;
  const breakdown: string[] = [];

  const basePoints = Math.round(30 * ((importance || 3) / 3));
  breakdown.push(`Admin task base points: ${basePoints} pts`);

  const subtaskBonus = completedSubtasks * 10;
  if (totalSubtasks > 0) {
    breakdown.push(`Relational subtasks (${completedSubtasks}/${totalSubtasks}): +${subtaskBonus} pts`);
  }

  let accumulated = basePoints + subtaskBonus;
  let frogMultiplier = 1;
  if (isFrog) {
    const hour = new Date(completedAt).getHours();
    if (hour < 12) {
      frogMultiplier = FROG_EARLY_BIRD_MULTIPLIER;
      const frogBonus = Math.round(accumulated * (frogMultiplier - 1));
      accumulated += frogBonus;
      breakdown.push(`Eat That Frog Morning Multiplier (1.5x): +${frogBonus} pts`);
    }
  }

  return {
    basePoints,
    subtaskBonus,
    frogMultiplier,
    totalPoints: accumulated,
    breakdown,
  };
}

