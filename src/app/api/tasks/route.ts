import { NextResponse } from 'next/server';
import { connectToDatabase, Task, User } from '@/models';
import { getSession } from '@/lib/auth';
import {
  applyDailyResetToTasks,
  calculateHabitStreak,
  calculateUserStreak,
  getLocalDateString,
} from '@/lib/gamification/streaks';
import { ITaskCompletionEvent } from '@/types/database';

const DEFAULT_USER_EMAIL = 'lead.engineer@lifemetric.app';

async function getTargetUser() {
  const session = await getSession();
  if (session?.userId) {
    const user = await User.findById(session.userId);
    if (user) return user;
  }

  // Ensure default demo user exists for offline / unauthenticated exploration
  let user = await User.findOne({ email: DEFAULT_USER_EMAIL });
  if (!user) {
    user = await User.create({
      email: DEFAULT_USER_EMAIL,
      name: 'Lead Architect',
      password: 'default-demo-password',
      totalPointsEarned: 0,
      vaultBalance: 0,
      currentStreak: 0,
      longestStreak: 0,
      streakFreezesCount: 0,
      currencyPeg: {
        pointsPerUnit: 10,
        currencyCode: 'INR',
        symbol: '₹',
      },
    });
  }
  return user;
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const user = await getTargetUser();
    const { searchParams } = new URL(request.url);
    const clientToday = searchParams.get('today');
    const todayStr = clientToday && /^\d{4}-\d{2}-\d{2}$/.test(clientToday) ? clientToday : getLocalDateString();

    const tasks = await Task.find({ userId: user._id }).sort({ createdAt: -1 });

    // Apply daily reset and recalculate streaks dynamically for all tasks
    const { updatedTasks, modifiedCount } = applyDailyResetToTasks(tasks as any[], todayStr);

    if (modifiedCount > 0) {
      await Promise.all(
        (updatedTasks as any[]).map((t) => {
          if (t && typeof t.isModified === 'function' && t.isModified()) {
            return t.save();
          }
          return Promise.resolve();
        })
      );
    }

    // Check user active streak status
    const userStreakInfo = calculateUserStreak(
      user.lastActiveDate,
      user.currentStreak,
      user.longestStreak,
      todayStr
    );
    if (user.currentStreak !== userStreakInfo.currentStreak) {
      user.currentStreak = userStreakInfo.currentStreak;
      await user.save();
    }

    return NextResponse.json({
      success: true,
      user,
      tasks: updatedTasks,
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const user = await getTargetUser();

    // If tagging as Eat That Frog, reset other frogs for today
    if (body.isFrog) {
      await Task.updateMany({ userId: user._id, isFrog: true }, { isFrog: false });
    }

    const newTask = await Task.create({
      ...body,
      userId: user._id,
    });

    return NextResponse.json({
      success: true,
      task: newTask,
    });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Task id is required' },
        { status: 400 }
      );
    }

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    if (updates.isFrog) {
      await Task.updateMany({ userId: task.userId, isFrog: true }, { isFrog: false });
    }

    const todayStr = getLocalDateString();

    // If updating completion status
    if (updates.completed === false) {
      task.completed = false;
      task.completedAt = undefined;
      const pointsToDeduct = task.pointsAwarded || 0;
      task.pointsAwarded = 0;

      // Revert user vault balance and total points earned
      if (pointsToDeduct > 0) {
        const user = await User.findById(task.userId);
        if (user) {
          user.vaultBalance = Math.max(0, (user.vaultBalance || 0) - pointsToDeduct);
          user.totalPointsEarned = Math.max(0, (user.totalPointsEarned || 0) - pointsToDeduct);
          await user.save();
        }
      }

      // Remove today from habit completed dates
      if (task.type === 'HABIT' && task.habitDetails) {
        if (task.habitDetails.completedDates) {
          task.habitDetails.completedDates = task.habitDetails.completedDates.filter(
            (d) => d !== todayStr
          );
        }
        if (task.habitDetails.lastCompletedDate === todayStr) {
          const remaining = task.habitDetails.completedDates || [];
          task.habitDetails.lastCompletedDate =
            remaining.length > 0 ? remaining[remaining.length - 1] : undefined;
        }
      }

      // Remove today's event from completion history
      if (task.completionHistory) {
        task.completionHistory = task.completionHistory.filter((e) => e.dateStr !== todayStr);
      }

      // Recalculate streak
      if (task.type === 'HABIT') {
        const { currentStreak, bestStreak } = calculateHabitStreak(task, todayStr);
        if (task.habitDetails) {
          task.habitDetails.streakCount = currentStreak;
          task.habitDetails.bestStreak = Math.max(task.habitDetails.bestStreak || 0, bestStreak);
        }
      }

      task.markModified('completionHistory');
      task.markModified('habitDetails');
      task.markModified('habitDetails.completedDates');
    } else if (updates.completed === true) {
      task.completed = true;
      task.completedAt = new Date();

      const completionEvent: ITaskCompletionEvent = {
        completedAt: task.completedAt,
        dateStr: todayStr,
        pointsAwarded: updates.pointsAwarded || task.pointsAwarded || 25,
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

      if (task.type === 'HABIT' && task.habitDetails) {
        if (!task.habitDetails.completedDates) {
          task.habitDetails.completedDates = [];
        }
        if (!task.habitDetails.completedDates.includes(todayStr)) {
          task.habitDetails.completedDates.push(todayStr);
        }
        task.habitDetails.lastCompletedDate = todayStr;

        const { currentStreak, bestStreak } = calculateHabitStreak(task, todayStr);
        task.habitDetails.streakCount = currentStreak;
        task.habitDetails.bestStreak = Math.max(task.habitDetails.bestStreak || 0, bestStreak);
      }

      task.markModified('completionHistory');
      task.markModified('habitDetails');
      task.markModified('habitDetails.completedDates');
    }

    // Apply standard updates (title, description, url, importance, details)
    if (updates.title !== undefined) task.title = updates.title;
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.url !== undefined) task.url = updates.url;
    if (updates.importance !== undefined) task.importance = updates.importance;
    if (updates.isFrog !== undefined) task.isFrog = updates.isFrog;

    if (updates.habitDetails && task.habitDetails) {
      if (updates.habitDetails.frequency) task.habitDetails.frequency = updates.habitDetails.frequency;
      if (updates.habitDetails.customDays) task.habitDetails.customDays = updates.habitDetails.customDays;
      if (updates.habitDetails.monthlyGoal) task.habitDetails.monthlyGoal = updates.habitDetails.monthlyGoal;
      if (updates.habitDetails.nextTaskId !== undefined) task.habitDetails.nextTaskId = updates.habitDetails.nextTaskId;
      task.markModified('habitDetails');
    }
    if (updates.adminDetails && task.adminDetails) {
      if (updates.adminDetails.dueDate) task.adminDetails.dueDate = updates.adminDetails.dueDate;
      if (updates.adminDetails.isRecurring !== undefined) task.adminDetails.isRecurring = updates.adminDetails.isRecurring;
      if (updates.adminDetails.recurringCycle) task.adminDetails.recurringCycle = updates.adminDetails.recurringCycle;
      if (updates.adminDetails.subtasks) task.adminDetails.subtasks = updates.adminDetails.subtasks;
      task.markModified('adminDetails');
    }
    if (updates.deepWorkDetails && task.deepWorkDetails) {
      if (updates.deepWorkDetails.targetDurationMinutes) {
        task.deepWorkDetails.targetDurationMinutes = updates.deepWorkDetails.targetDurationMinutes;
      }
      task.markModified('deepWorkDetails');
    }

    task.updatedAt = new Date();
    await task.save();

    const targetUser = await User.findById(task.userId);
    return NextResponse.json({
      success: true,
      task,
      user: targetUser
        ? {
            vaultBalance: targetUser.vaultBalance,
            totalPointsEarned: targetUser.totalPointsEarned,
            currentStreak: targetUser.currentStreak,
            longestStreak: targetUser.longestStreak,
          }
        : undefined,
    });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Task id is required' },
        { status: 400 }
      );
    }

    await Task.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
