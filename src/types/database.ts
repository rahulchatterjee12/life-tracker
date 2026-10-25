import { Types } from 'mongoose';

export type TaskType = 'DEEP_WORK' | 'HABIT' | 'ADMIN';
export type TaskImportance = 1 | 2 | 3 | 4 | 5;

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';
export type AdminRecurringCycle = 'none' | 'weekly' | 'monthly' | 'yearly';

export type TransactionType =
  | 'TASK_COMPLETION'
  | 'OVERTIME_BONUS'
  | 'MANUAL_PENALTY'
  | 'FROG_BONUS'
  | 'STREAK_BONUS'
  | 'FREEZE_PURCHASE'
  | 'FREEZE_CONSUMED'
  | 'VAULT_REDEMPTION'
  | 'ADJUSTMENT';

export type RewardCategory =
  | 'FINANCIAL'
  | 'GADGET'
  | 'TECH'
  | 'EXPERIENCE'
  | 'LEISURE'
  | 'OTHER';

// ================= USER & PROFILE =================
export interface IUserBadge {
  id: string;
  title: string;
  description: string;
  unlockedAt: Date;
  icon: string;
  rewardId?: Types.ObjectId | string;
}

export interface ICurrencyPeg {
  pointsPerUnit: number; // e.g. 10 points = 1 currency unit
  currencyCode: string;  // e.g. 'INR', 'USD'
  symbol: string;        // e.g. '₹', '$'
}

export interface IUser {
  _id?: Types.ObjectId;
  email: string;
  name: string;
  password?: string;
  totalPointsEarned: number;
  vaultBalance: number;
  currentStreak: number;
  longestStreak: number;
  streakFreezesCount: number;
  lastActiveDate?: string; // YYYY-MM-DD
  currencyPeg: ICurrencyPeg;
  badges: IUserBadge[];
  createdAt?: Date;
  updatedAt?: Date;
}

// ================= DEEP WORK DETAILS =================
export interface IDeepWorkSession {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
}

export interface IDeepWorkDetails {
  targetDurationMinutes: number;
  actualDurationSeconds: number;
  isLiveTracked: boolean;
  overtimeBonusAwarded: boolean;
  overtimeSeconds: number;
  sessions: IDeepWorkSession[];
}

// ================= HABIT DETAILS =================
export interface IHabitDetails {
  frequency: HabitFrequency;
  customDays?: number[]; // 0 for Sunday, 6 for Saturday
  streakCount: number;
  bestStreak: number;
  lastCompletedDate?: string; // YYYY-MM-DD
  nextTaskId?: Types.ObjectId | string; // Habit Stacking link
}

// ================= ADMIN DETAILS & RELATIONAL SUB-TASKS =================
export interface IAdminSubtask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  offsetDaysBeforeParent?: number; // e.g. 7 days prior to birthday/due date
}

export interface IAdminDetails {
  dueDate: Date;
  isRecurring: boolean;
  recurringCycle: AdminRecurringCycle;
  dayOfMonth?: number; // e.g. 15 for credit card statement
  subtasks: IAdminSubtask[];
}

// ================= TASK BASE =================
export interface ITask {
  _id?: Types.ObjectId;
  userId: Types.ObjectId | string;
  title: string;
  description?: string;
  type: TaskType;
  importance: TaskImportance;
  isFrog: boolean; // Eat That Frog flag
  frogCompletedBeforeNoon?: boolean;
  completed: boolean;
  completedAt?: Date;
  pointsAwarded: number;
  deepWorkDetails?: IDeepWorkDetails;
  habitDetails?: IHabitDetails;
  adminDetails?: IAdminDetails;
  createdAt?: Date;
  updatedAt?: Date;
}

// ================= VAULT REWARDS =================
export interface IVaultReward {
  _id?: Types.ObjectId;
  userId?: Types.ObjectId | string; // null indicates system default reward
  title: string;
  description: string;
  pointCost: number;
  monetaryValue: number;
  currency: string;
  category: RewardCategory;
  icon: string;
  isRedeemed: boolean;
  redeemedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// ================= TRANSACTION HISTORY =================
export interface ITransaction {
  _id?: Types.ObjectId;
  userId: Types.ObjectId | string;
  type: TransactionType;
  pointsDelta: number; // positive for credits, negative for debits
  resultingBalance: number;
  taskId?: Types.ObjectId | string;
  rewardId?: Types.ObjectId | string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

