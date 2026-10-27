import { Schema, model, models, Model } from 'mongoose';
import {
  ITask,
  ITaskCompletionEvent,
  IDeepWorkDetails,
  IHabitDetails,
  IAdminDetails,
  IDeepWorkSession,
  IAdminSubtask,
} from '@/types/database';

const CompletionEventSchema = new Schema<ITaskCompletionEvent>(
  {
    completedAt: { type: Date, required: true },
    dateStr: { type: String, required: true }, // YYYY-MM-DD
    pointsAwarded: { type: Number, default: 0 },
    durationSeconds: { type: Number },
    subtasksCompletedCount: { type: Number },
    isFrog: { type: Boolean, default: false },
    note: { type: String },
  },
  { _id: true, timestamps: true }
);

const DeepWorkSessionSchema = new Schema<IDeepWorkSession>(
  {
    id: { type: String, required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    durationSeconds: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const DeepWorkDetailsSchema = new Schema<IDeepWorkDetails>(
  {
    targetDurationMinutes: { type: Number, required: true, min: 1 },
    actualDurationSeconds: { type: Number, default: 0 },
    isLiveTracked: { type: Boolean, default: true },
    overtimeBonusAwarded: { type: Boolean, default: false },
    overtimeSeconds: { type: Number, default: 0 },
    sessions: { type: [DeepWorkSessionSchema], default: [] },
  },
  { _id: false }
);

const HabitDetailsSchema = new Schema<IHabitDetails>(
  {
    frequency: {
      type: String,
      enum: ['daily', 'weekdays', 'weekends', 'custom'],
      default: 'daily',
    },
    customDays: { type: [Number], default: [] }, // 0 (Sun) - 6 (Sat)
    streakCount: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String }, // YYYY-MM-DD
    completedDates: { type: [String], default: [] },
    monthlyGoal: { type: Number, default: 31 },
    nextTaskId: { type: Schema.Types.ObjectId, ref: 'Task' }, // Habit Stacking pointer
  },
  { _id: false }
);

const AdminSubtaskSchema = new Schema<IAdminSubtask>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date },
    offsetDaysBeforeParent: { type: Number, default: 0 },
  },
  { _id: false }
);

const AdminDetailsSchema = new Schema<IAdminDetails>(
  {
    dueDate: { type: Date, required: true },
    isRecurring: { type: Boolean, default: false },
    recurringCycle: {
      type: String,
      enum: ['none', 'weekly', 'monthly', 'yearly'],
      default: 'none',
    },
    dayOfMonth: { type: Number, min: 1, max: 31 },
    subtasks: { type: [AdminSubtaskSchema], default: [] },
  },
  { _id: false }
);

const TaskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    url: { type: String, trim: true },
    type: {
      type: String,
      enum: ['DEEP_WORK', 'HABIT', 'ADMIN'],
      required: true,
      index: true,
    },
    importance: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      default: 3,
    },
    isFrog: { type: Boolean, default: false },
    frogCompletedBeforeNoon: { type: Boolean, default: false },
    completed: { type: Boolean, default: false, index: true },
    completedAt: { type: Date },
    pointsAwarded: { type: Number, default: 0 },
    completionHistory: { type: [CompletionEventSchema], default: [] },

    // Type-specific subdocuments
    deepWorkDetails: { type: DeepWorkDetailsSchema },
    habitDetails: { type: HabitDetailsSchema },
    adminDetails: { type: AdminDetailsSchema },
  },
  {
    timestamps: true,
  }
);

// Helpful compound indexes for dashboard queries
TaskSchema.index({ userId: 1, completed: 1, type: 1 });
TaskSchema.index({ userId: 1, isFrog: 1 });

if (models.Task) {
  delete (models as Record<string, unknown>).Task;
}
export const Task: Model<ITask> = model<ITask>('Task', TaskSchema);
export default Task;

