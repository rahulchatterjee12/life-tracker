import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ITask,
  TaskType,
  TaskImportance,
  HabitFrequency,
  AdminRecurringCycle,
  IDeepWorkSession,
  IAdminSubtask,
} from '@/types/database';

export interface TasksState {
  items: ITask[];
  selectedCategory: 'ALL' | TaskType;
  filterStatus: 'all' | 'active' | 'completed';
  dailyFrogId: string | null;
  activeHabitStackModal: {
    isOpen: boolean;
    completedHabitTitle?: string;
    nextTaskId?: string;
    nextTaskTitle?: string;
  };
  isLoading: boolean;
  error: string | null;
}

const makeDates = (days: number[]) => days.map((d) => `2026-03-${String(d).padStart(2, '0')}`);

const mockInitialTasks: ITask[] = [
  {
    _id: 'deep-1' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Core Architecture Deep Work',
    description: 'Design the database schemas and Redux state tree',
    type: 'DEEP_WORK',
    importance: 5,
    isFrog: true,
    completed: false,
    pointsAwarded: 0,
    deepWorkDetails: {
      targetDurationMinutes: 45,
      actualDurationSeconds: 0,
      isLiveTracked: true,
      overtimeBonusAwarded: false,
      overtimeSeconds: 0,
      sessions: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Real habits extracted from user's habit tracker spreadsheet
  {
    _id: 'habit-water' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Drink 3L Water',
    description: 'Hydration requirement (3 liters daily)',
    type: 'HABIT',
    importance: 4,
    isFrog: false,
    completed: true,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'daily' as HabitFrequency,
      streakCount: 14,
      bestStreak: 26,
      monthlyGoal: 31,
      completedDates: makeDates([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'habit-dsa' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'DSA',
    description: 'Solve 2 problems on LeetCode / Algo',
    type: 'HABIT',
    importance: 5,
    isFrog: false,
    completed: true,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'daily' as HabitFrequency,
      streakCount: 10,
      bestStreak: 25,
      monthlyGoal: 31,
      completedDates: makeDates([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'habit-wake' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Wake Up On Time',
    description: 'Out of bed before 6:30 AM',
    type: 'HABIT',
    importance: 4,
    isFrog: false,
    completed: true,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'daily' as HabitFrequency,
      streakCount: 8,
      bestStreak: 24,
      monthlyGoal: 31,
      completedDates: makeDates([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27]),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'habit-expenses' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Track Expenses',
    description: 'Audit and log daily spending',
    type: 'HABIT',
    importance: 3,
    isFrog: false,
    completed: true,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'daily' as HabitFrequency,
      streakCount: 12,
      bestStreak: 23,
      monthlyGoal: 31,
      completedDates: makeDates([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27]),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'habit-typing' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Typing',
    description: '15 mins speed drill (Monkeytype)',
    type: 'HABIT',
    importance: 2,
    isFrog: false,
    completed: false,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'daily' as HabitFrequency,
      streakCount: 5,
      bestStreak: 20,
      monthlyGoal: 31,
      completedDates: makeDates([1, 2, 4, 5, 7, 8, 9, 10, 11, 12, 14, 15, 17, 18, 19, 20, 22, 24, 25, 26]),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'habit-chess' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Chess',
    description: '3 tactical puzzles & 1 rapid match',
    type: 'HABIT',
    importance: 3,
    isFrog: false,
    completed: false,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'daily' as HabitFrequency,
      streakCount: 4,
      bestStreak: 18,
      monthlyGoal: 31,
      completedDates: makeDates([1, 2, 3, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 21, 22, 24, 25]),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'habit-food' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: "Don't Eat Bad Food",
    description: 'No junk food or excess sugar',
    type: 'HABIT',
    importance: 4,
    isFrog: false,
    completed: true,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'daily' as HabitFrequency,
      streakCount: 3,
      bestStreak: 19,
      monthlyGoal: 31,
      completedDates: makeDates([1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 18, 19, 20, 22, 24, 26, 27]),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'habit-workout' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Workout',
    description: 'Weight training / cardio gym session',
    type: 'HABIT',
    importance: 4,
    isFrog: false,
    completed: false,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'daily' as HabitFrequency,
      streakCount: 2,
      bestStreak: 9,
      monthlyGoal: 31,
      completedDates: makeDates([1, 3, 5, 8, 10, 12, 15, 17, 22]),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'habit-project' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Project Work',
    description: 'Side project execution block',
    type: 'HABIT',
    importance: 4,
    isFrog: false,
    completed: false,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'daily' as HabitFrequency,
      streakCount: 1,
      bestStreak: 9,
      monthlyGoal: 31,
      completedDates: makeDates([2, 4, 6, 9, 11, 13, 16, 18, 23]),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'habit-dev' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Development',
    description: 'Build & push GitHub commits',
    type: 'HABIT',
    importance: 4,
    isFrog: false,
    completed: false,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'weekdays' as HabitFrequency,
      streakCount: 2,
      bestStreak: 8,
      monthlyGoal: 25,
      completedDates: makeDates([2, 3, 5, 9, 10, 12, 16, 19]),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'habit-clean' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Clean Room',
    description: 'Keep workspace & desk organized',
    type: 'HABIT',
    importance: 2,
    isFrog: false,
    completed: false,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'daily' as HabitFrequency,
      streakCount: 2,
      bestStreak: 12,
      monthlyGoal: 31,
      completedDates: makeDates([1, 4, 6, 8, 11, 13, 15, 18, 20, 22, 25, 26]),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'habit-meditation' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Meditation',
    description: '10 min mindfulness breathing',
    type: 'HABIT',
    importance: 3,
    isFrog: false,
    completed: false,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'daily' as HabitFrequency,
      streakCount: 1,
      bestStreak: 3,
      monthlyGoal: 31,
      completedDates: makeDates([1, 2, 4]),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'admin-1' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Credit Card Bill Payment & Audit',
    description: 'Monthly statement cycle verification',
    type: 'ADMIN',
    importance: 4,
    isFrog: false,
    completed: false,
    pointsAwarded: 0,
    adminDetails: {
      dueDate: new Date(Date.now() + 86400000 * 3),
      isRecurring: true,
      recurringCycle: 'monthly' as AdminRecurringCycle,
      dayOfMonth: 28,
      subtasks: [
        {
          id: 'sub-1',
          title: 'Review statement for unknown transactions',
          completed: true,
        },
        {
          id: 'sub-2',
          title: 'Pay balance via netbanking',
          completed: false,
        },
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const initialState: TasksState = {
  items: mockInitialTasks,
  selectedCategory: 'ALL',
  filterStatus: 'all',
  dailyFrogId: 'deep-1',
  activeHabitStackModal: {
    isOpen: false,
  },
  isLoading: false,
  error: null,
};

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<ITask[]>) => {
      state.items = action.payload;
    },

    setSelectedCategory: (state, action: PayloadAction<'ALL' | TaskType>) => {
      state.selectedCategory = action.payload;
    },

    setFilterStatus: (state, action: PayloadAction<'all' | 'active' | 'completed'>) => {
      state.filterStatus = action.payload;
    },

    addDeepWorkTask: (
      state,
      action: PayloadAction<{
        title: string;
        description?: string;
        targetDurationMinutes: number;
        importance?: TaskImportance;
        isFrog?: boolean;
      }>
    ) => {
      const id = 'task-' + Date.now();
      const newTask: ITask = {
        _id: id as unknown as import('mongoose').Types.ObjectId,
        userId: 'user-default',
        title: action.payload.title,
        description: action.payload.description,
        type: 'DEEP_WORK',
        importance: action.payload.importance || 3,
        isFrog: !!action.payload.isFrog,
        completed: false,
        pointsAwarded: 0,
        deepWorkDetails: {
          targetDurationMinutes: action.payload.targetDurationMinutes,
          actualDurationSeconds: 0,
          isLiveTracked: true,
          overtimeBonusAwarded: false,
          overtimeSeconds: 0,
          sessions: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (newTask.isFrog) {
        state.items.forEach((t) => (t.isFrog = false));
        state.dailyFrogId = id;
      }

      state.items.unshift(newTask);
    },

    addHabitTask: (
      state,
      action: PayloadAction<{
        title: string;
        description?: string;
        frequency: HabitFrequency;
        customDays?: number[];
        importance?: TaskImportance;
        nextTaskId?: string;
      }>
    ) => {
      const newTask: ITask = {
        _id: ('task-' + Date.now()) as unknown as import('mongoose').Types.ObjectId,
        userId: 'user-default',
        title: action.payload.title,
        description: action.payload.description,
        type: 'HABIT',
        importance: action.payload.importance || 3,
        isFrog: false,
        completed: false,
        pointsAwarded: 0,
        habitDetails: {
          frequency: action.payload.frequency,
          customDays: action.payload.customDays || [],
          streakCount: 0,
          bestStreak: 0,
          nextTaskId: action.payload.nextTaskId,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      state.items.unshift(newTask);
    },

    addAdminTask: (
      state,
      action: PayloadAction<{
        title: string;
        description?: string;
        dueDate: string;
        isRecurring?: boolean;
        recurringCycle?: AdminRecurringCycle;
        dayOfMonth?: number;
        importance?: TaskImportance;
        subtasks?: Array<{ title: string; offsetDaysBeforeParent?: number }>;
      }>
    ) => {
      const subtasks: IAdminSubtask[] = (action.payload.subtasks || []).map((s, idx) => ({
        id: `sub-${Date.now()}-${idx}`,
        title: s.title,
        completed: false,
        offsetDaysBeforeParent: s.offsetDaysBeforeParent || 0,
      }));

      const newTask: ITask = {
        _id: ('task-' + Date.now()) as unknown as import('mongoose').Types.ObjectId,
        userId: 'user-default',
        title: action.payload.title,
        description: action.payload.description,
        type: 'ADMIN',
        importance: action.payload.importance || 3,
        isFrog: false,
        completed: false,
        pointsAwarded: 0,
        adminDetails: {
          dueDate: new Date(action.payload.dueDate),
          isRecurring: !!action.payload.isRecurring,
          recurringCycle: action.payload.recurringCycle || 'none',
          dayOfMonth: action.payload.dayOfMonth,
          subtasks,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      state.items.unshift(newTask);
    },

    toggleHabitCompletion: (state, action: PayloadAction<string>) => {
      const habit = state.items.find((t) => String(t._id) === action.payload);
      if (habit && habit.type === 'HABIT' && habit.habitDetails) {
        habit.completed = !habit.completed;
        const activeDateStr = '2026-03-27';
        const dates = habit.habitDetails.completedDates || [];

        if (habit.completed) {
          habit.completedAt = new Date();
          habit.habitDetails.streakCount += 1;
          if (habit.habitDetails.streakCount > habit.habitDetails.bestStreak) {
            habit.habitDetails.bestStreak = habit.habitDetails.streakCount;
          }
          habit.habitDetails.lastCompletedDate = activeDateStr;
          if (!dates.includes(activeDateStr)) {
            habit.habitDetails.completedDates = [...dates, activeDateStr];
          }

          // Trigger Habit Stacking modal if a nextTaskId is chained!
          if (habit.habitDetails.nextTaskId) {
            const nextTask = state.items.find(
              (t) => String(t._id) === String(habit.habitDetails?.nextTaskId)
            );
            state.activeHabitStackModal = {
              isOpen: true,
              completedHabitTitle: habit.title,
              nextTaskId: String(habit.habitDetails.nextTaskId),
              nextTaskTitle: nextTask?.title || 'Next Stacked Task',
            };
          }
        } else {
          habit.completedAt = undefined;
          habit.habitDetails.streakCount = Math.max(0, habit.habitDetails.streakCount - 1);
          habit.habitDetails.completedDates = dates.filter((d) => d !== activeDateStr);
        }
      }
    },

    closeHabitStackModal: (state) => {
      state.activeHabitStackModal = {
        isOpen: false,
      };
    },

    completeDeepWorkTask: (
      state,
      action: PayloadAction<{
        taskId: string;
        actualDurationSeconds: number;
        isLiveTracked: boolean;
        pointsEarned: number;
        overtimeSeconds: number;
        overtimeBonusAwarded: boolean;
        sessions: IDeepWorkSession[];
      }>
    ) => {
      const task = state.items.find((t) => String(t._id) === action.payload.taskId);
      if (task && task.type === 'DEEP_WORK' && task.deepWorkDetails) {
        task.completed = true;
        task.completedAt = new Date();
        task.pointsAwarded = action.payload.pointsEarned;
        task.deepWorkDetails.actualDurationSeconds = action.payload.actualDurationSeconds;
        task.deepWorkDetails.isLiveTracked = action.payload.isLiveTracked;
        task.deepWorkDetails.overtimeSeconds = action.payload.overtimeSeconds;
        task.deepWorkDetails.overtimeBonusAwarded = action.payload.overtimeBonusAwarded;
        task.deepWorkDetails.sessions = action.payload.sessions;

        if (task.isFrog) {
          const now = new Date();
          task.frogCompletedBeforeNoon = now.getHours() < 12;
        }
      }
    },

    toggleAdminSubtask: (
      state,
      action: PayloadAction<{ taskId: string; subtaskId: string }>
    ) => {
      const task = state.items.find((t) => String(t._id) === action.payload.taskId);
      if (task && task.type === 'ADMIN' && task.adminDetails) {
        const sub = task.adminDetails.subtasks.find((s) => s.id === action.payload.subtaskId);
        if (sub) {
          sub.completed = !sub.completed;
        }
      }
    },

    toggleAdminTaskCompletion: (state, action: PayloadAction<string>) => {
      const task = state.items.find((t) => String(t._id) === action.payload);
      if (task && task.type === 'ADMIN') {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date() : undefined;
      }
    },

    setDailyFrog: (state, action: PayloadAction<string>) => {
      state.items.forEach((t) => {
        t.isFrog = String(t._id) === action.payload;
      });
      state.dailyFrogId = action.payload;
    },

    deleteTask: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((t) => String(t._id) !== action.payload);
      if (state.dailyFrogId === action.payload) {
        state.dailyFrogId = null;
      }
    },

    updateTask: (
      state,
      action: PayloadAction<{
        id: string;
        title: string;
        description?: string;
        importance?: TaskImportance;
        isFrog?: boolean;
        type?: TaskType;
        habitDetails?: {
          frequency?: HabitFrequency;
          monthlyGoal?: number;
          streakCount?: number;
          bestStreak?: number;
          nextTaskId?: string;
        };
        deepWorkDetails?: {
          targetDurationMinutes?: number;
        };
        adminDetails?: {
          dueDate?: string;
          isRecurring?: boolean;
          recurringCycle?: AdminRecurringCycle;
        };
      }>
    ) => {
      const task = state.items.find((t) => String(t._id) === action.payload.id);
      if (!task) return;

      task.title = action.payload.title;
      task.description = action.payload.description;
      if (action.payload.importance !== undefined) {
        task.importance = action.payload.importance;
      }

      if (action.payload.isFrog !== undefined) {
        if (action.payload.isFrog) {
          state.items.forEach((t) => (t.isFrog = false));
          state.dailyFrogId = String(task._id);
        } else if (task.isFrog) {
          state.dailyFrogId = null;
        }
        task.isFrog = action.payload.isFrog;
      }

      if (action.payload.habitDetails && task.habitDetails) {
        if (action.payload.habitDetails.frequency) {
          task.habitDetails.frequency = action.payload.habitDetails.frequency;
        }
        if (action.payload.habitDetails.monthlyGoal !== undefined) {
          task.habitDetails.monthlyGoal = action.payload.habitDetails.monthlyGoal;
        }
        if (action.payload.habitDetails.nextTaskId !== undefined) {
          task.habitDetails.nextTaskId = action.payload.habitDetails.nextTaskId;
        }
      }

      if (action.payload.deepWorkDetails && task.deepWorkDetails) {
        if (action.payload.deepWorkDetails.targetDurationMinutes) {
          task.deepWorkDetails.targetDurationMinutes = action.payload.deepWorkDetails.targetDurationMinutes;
        }
      }

      if (action.payload.adminDetails && task.adminDetails) {
        if (action.payload.adminDetails.dueDate) {
          task.adminDetails.dueDate = new Date(action.payload.adminDetails.dueDate);
        }
        if (action.payload.adminDetails.isRecurring !== undefined) {
          task.adminDetails.isRecurring = action.payload.adminDetails.isRecurring;
        }
        if (action.payload.adminDetails.recurringCycle) {
          task.adminDetails.recurringCycle = action.payload.adminDetails.recurringCycle;
        }
      }

      task.updatedAt = new Date();
    },

    toggleHabitDay: (
      state,
      action: PayloadAction<{ taskId: string; day: number; monthYear?: string }>
    ) => {
      const { taskId, day, monthYear = '2026-03' } = action.payload;
      const habit = state.items.find((t) => String(t._id) === taskId);
      if (!habit || habit.type !== 'HABIT' || !habit.habitDetails) return;

      const dateStr = `${monthYear}-${String(day).padStart(2, '0')}`;
      const dates = habit.habitDetails.completedDates || [];
      const exists = dates.includes(dateStr);

      if (exists) {
        habit.habitDetails.completedDates = dates.filter((d) => d !== dateStr);
        habit.habitDetails.streakCount = Math.max(0, habit.habitDetails.streakCount - 1);
      } else {
        habit.habitDetails.completedDates = [...dates, dateStr];
        habit.habitDetails.streakCount += 1;
        habit.habitDetails.bestStreak = Math.max(
          habit.habitDetails.bestStreak,
          habit.habitDetails.streakCount
        );
      }
    },
  },
});

export const {
  setTasks,
  setSelectedCategory,
  setFilterStatus,
  addDeepWorkTask,
  addHabitTask,
  addAdminTask,
  toggleHabitCompletion,
  toggleHabitDay,
  closeHabitStackModal,
  completeDeepWorkTask,
  toggleAdminSubtask,
  toggleAdminTaskCompletion,
  setDailyFrog,
  deleteTask,
  updateTask,
} = tasksSlice.actions;

export default tasksSlice.reducer;
