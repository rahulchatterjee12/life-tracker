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
  {
    _id: 'habit-1' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    title: 'Morning Mindfulness & Meditation',
    description: '10 minutes box breathing before beginning deep work',
    type: 'HABIT',
    importance: 3,
    isFrog: false,
    completed: false,
    pointsAwarded: 0,
    habitDetails: {
      frequency: 'daily' as HabitFrequency,
      streakCount: 7,
      bestStreak: 14,
      nextTaskId: 'deep-1', // Habit stacking anchor
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
        if (habit.completed) {
          habit.completedAt = new Date();
          habit.habitDetails.streakCount += 1;
          if (habit.habitDetails.streakCount > habit.habitDetails.bestStreak) {
            habit.habitDetails.bestStreak = habit.habitDetails.streakCount;
          }
          habit.habitDetails.lastCompletedDate = new Date().toISOString().split('T')[0];

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
  closeHabitStackModal,
  completeDeepWorkTask,
  toggleAdminSubtask,
  toggleAdminTaskCompletion,
  setDailyFrog,
  deleteTask,
} = tasksSlice.actions;

export default tasksSlice.reducer;
