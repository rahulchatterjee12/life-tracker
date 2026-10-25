import { NextResponse } from 'next/server';
import { connectToDatabase, Task, User, Transaction } from '@/models';
import {
  calculateDeepWorkPoints,
  calculateHabitPoints,
  calculateAdminPoints,
} from '@/lib/gamification/engine';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { taskId, actualDurationSeconds, isLiveTracked, sessions } = body;

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const user = await User.findById(task.userId);
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

    const completedAt = new Date();

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
      const currentStreak = (task.habitDetails?.streakCount || 0) + 1;
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

      if (task.habitDetails) {
        task.habitDetails.streakCount = currentStreak;
        if (currentStreak > (task.habitDetails.bestStreak || 0)) {
          task.habitDetails.bestStreak = currentStreak;
        }
        task.habitDetails.lastCompletedDate = completedAt.toISOString().split('T')[0];
      }
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

    // Mark task completed
    task.completed = true;
    task.completedAt = completedAt;
    task.pointsAwarded = pointsAwarded;
    if (task.isFrog) {
      task.frogCompletedBeforeNoon = completedAt.getHours() < 12;
    }
    await task.save();

    // Update user point balances
    user.vaultBalance += pointsAwarded;
    user.totalPointsEarned += pointsAwarded;
    user.lastActiveDate = completedAt.toISOString().split('T')[0];
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

