import { NextResponse } from 'next/server';
import { connectToDatabase, Task, User, Transaction } from '@/models';
import { getSession } from '@/lib/auth';
import {
  calculateDeepWorkPoints,
  calculateHabitPoints,
  calculateAdminPoints,
} from '@/lib/gamification/engine';
import { calculateHabitStreak, getLocalDateString } from '@/lib/gamification/streaks';
import { ITaskCompletionEvent } from '@/types/database';

const DEFAULT_USER_EMAIL = 'lead.engineer@lifemetric.app';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { taskId, actualDurationSeconds, isLiveTracked, sessions, completedAt: clientCompletedAt } = body;

    if (!taskId) {
      return NextResponse.json({ success: false, error: 'Task ID is required' }, { status: 400 });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    let user = await User.findById(task.userId);
    if (!user) {
      const session = await getSession();
      if (session?.userId) {
        user = await User.findById(session.userId);
      }
    }
    if (!user) {
      user = await User.findOne({ email: DEFAULT_USER_EMAIL });
    }
    if (!user) {
      user = await User.findOne();
    }
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let pointsAwarded = 0;
    let description = '';
    const metadata: Record<string, unknown> = {
      taskType: task.type,
      importance: task.importance,
      isFrog: task.isFrog,
    };

    const completedAt = clientCompletedAt ? new Date(clientCompletedAt) : new Date();
    const todayStr = getLocalDateString(completedAt);

    if (task.type === 'DEEP_WORK') {
      const targetMinutes = task.deepWorkDetails?.targetDurationMinutes || 30;
      const durationSeconds = actualDurationSeconds || targetMinutes * 60;
      const live = isLiveTracked !== undefined ? isLiveTracked : true;

      const result = calculateDeepWorkPoints({
        targetMinutes,
        actualDurationSeconds: durationSeconds,
        importance: task.importance,
        isLiveTracked: live,
        isFrog: task.isFrog,
        completedAt,
      });

      pointsAwarded = result.totalPoints;
      description = `Completed Deep Work: ${task.title} (${Math.round(durationSeconds / 60)}m, ${
        live ? 'Live Focus' : 'Manual Entry [-10%]'
      })`;

      metadata.overtimeBonus = result.overtimeBonus;
      metadata.manualPenaltyDeduction = result.manualPenaltyDeduction;
      metadata.frogMultiplier = result.frogMultiplier;
      metadata.breakdown = result.breakdown;

      task.deepWorkDetails = {
        targetDurationMinutes: targetMinutes,
        actualDurationSeconds: durationSeconds,
        isLiveTracked: live,
        overtimeBonusAwarded: result.isOvertimeEligible,
        overtimeSeconds: result.overtimeSeconds,
        sessions: sessions || [],
      };
    } else if (task.type === 'HABIT') {
      if (task.habitDetails) {
        if (!task.habitDetails.completedDates) {
          task.habitDetails.completedDates = [];
        }
        if (!task.habitDetails.completedDates.includes(todayStr)) {
          task.habitDetails.completedDates.push(todayStr);
        }
        task.habitDetails.lastCompletedDate = todayStr;
      }
      task.completed = true;

      // Calculate mathematically accurate streak from habit schedule and dates
      const { currentStreak, bestStreak } = calculateHabitStreak(task, todayStr);

      if (task.habitDetails) {
        task.habitDetails.streakCount = currentStreak;
        task.habitDetails.bestStreak = Math.max(task.habitDetails.bestStreak || 0, bestStreak);
      }

      const result = calculateHabitPoints({
        importance: task.importance,
        streakCount: currentStreak,
        isFrog: task.isFrog,
        completedAt,
      });

      pointsAwarded = result.totalPoints;
      description = `Completed Habit: ${task.title} (Streak: ${currentStreak} days)`;

      metadata.streakCount = currentStreak;
      metadata.streakMultiplier = result.streakMultiplier;
      metadata.breakdown = result.breakdown;
    } else if (task.type === 'ADMIN') {
      const totalSubtasks = task.adminDetails?.subtasks?.length || 0;
      const completedSubtasks =
        task.adminDetails?.subtasks?.filter((s) => s.completed).length || 0;

      const result = calculateAdminPoints({
        importance: task.importance,
        totalSubtasks,
        completedSubtasks,
        isFrog: task.isFrog,
        completedAt,
      });

      pointsAwarded = result.totalPoints;
      description = `Completed Admin Task: ${task.title} (${completedSubtasks}/${totalSubtasks} subtasks)`;

      metadata.subtaskBonus = result.subtaskBonus;
      metadata.breakdown = result.breakdown;
    }

    // Record completion event in historical log with timestamp
    const completionEvent: ITaskCompletionEvent = {
      completedAt,
      dateStr: todayStr,
      pointsAwarded,
      durationSeconds:
        task.type === 'DEEP_WORK'
          ? (actualDurationSeconds || (task.deepWorkDetails?.targetDurationMinutes || 45) * 60)
          : undefined,
      subtasksCompletedCount:
        task.type === 'ADMIN'
          ? (task.adminDetails?.subtasks?.filter((s) => s.completed).length || 0)
          : undefined,
      isFrog: Boolean(task.isFrog),
    };

    if (!task.completionHistory) {
      task.completionHistory = [];
    }

    const existingIdx = task.completionHistory.findIndex((e) => e.dateStr === todayStr);
    if (existingIdx >= 0) {
      task.completionHistory[existingIdx] = completionEvent as any;
    } else {
      task.completionHistory.push(completionEvent as any);
    }

    // Mark task completed
    task.completed = true;
    task.completedAt = completedAt;
    task.pointsAwarded = pointsAwarded;
    if (task.isFrog) {
      task.frogCompletedBeforeNoon = completedAt.getHours() < 12;
    }

    task.markModified('completionHistory');
    if (task.type === 'HABIT') {
      task.markModified('habitDetails');
      task.markModified('habitDetails.completedDates');
    }
    await task.save();

    // Update user point balances and user streak
    user.vaultBalance += pointsAwarded;
    user.totalPointsEarned += pointsAwarded;

    const yesterday = new Date(completedAt);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (user.lastActiveDate === todayStr) {
      // Already active today; streak maintained
    } else if (user.lastActiveDate === yesterdayStr) {
      user.currentStreak = (user.currentStreak || 0) + 1;
    } else {
      user.currentStreak = 1;
    }
    user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak);
    user.lastActiveDate = todayStr;
    await user.save();

    // Log double-entry ledger transaction
    const transaction = await Transaction.create({
      userId: user._id,
      type: 'TASK_COMPLETION',
      pointsDelta: pointsAwarded,
      resultingBalance: user.vaultBalance,
      taskId: task._id,
      description,
      metadata,
    });

    return NextResponse.json({
      success: true,
      task,
      user: {
        vaultBalance: user.vaultBalance,
        totalPointsEarned: user.totalPointsEarned,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
      },
      pointsAwarded,
      transaction,
    });
  } catch (error) {
    console.error('Task completion error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

