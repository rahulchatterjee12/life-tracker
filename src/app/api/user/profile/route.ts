import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User, Task, Transaction } from '@/models';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.userId).select('-password');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Fetch user's tasks to calculate activity statistics
    const tasks = await Task.find({ userId: user._id });

    const deepWorkTasks = tasks.filter((t) => t.type === 'DEEP_WORK' && t.completed);
    const totalDeepWorkSeconds = deepWorkTasks.reduce(
      (acc, t) => acc + (t.deepWorkDetails?.actualDurationSeconds || 0),
      0
    );
    const liveSessionsCount = deepWorkTasks.filter((t) => t.deepWorkDetails?.isLiveTracked !== false).length;

    const habitTasks = tasks.filter((t) => t.type === 'HABIT');
    const completedHabitsCount = habitTasks.filter((t) => t.completed).length;

    const adminTasks = tasks.filter((t) => t.type === 'ADMIN');
    const completedAdminTasks = adminTasks.filter((t) => t.completed).length;

    const frogTasks = tasks.filter((t) => t.isFrog);
    const completedFrogs = frogTasks.filter((t) => t.completed);
    const frogsBeforeNoon = completedFrogs.filter((t) => t.frogCompletedBeforeNoon).length;

    // Fetch user's recent ledger transactions (last 25)
    const recentTransactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(25);

    return NextResponse.json({
      success: true,
      profile: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified ?? true,
        createdAt: user.createdAt,
        vaultBalance: user.vaultBalance,
        totalPointsEarned: user.totalPointsEarned,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        streakFreezesCount: user.streakFreezesCount,
        currencyPeg: user.currencyPeg,
        badges: user.badges || [],
      },
      stats: {
        deepWork: {
          totalMinutes: Math.round(totalDeepWorkSeconds / 60),
          completedSessions: deepWorkTasks.length,
          liveSessions: liveSessionsCount,
        },
        habits: {
          total: habitTasks.length,
          completedToday: completedHabitsCount,
        },
        admin: {
          total: adminTasks.length,
          completed: completedAdminTasks,
        },
        frogs: {
          totalConquered: completedFrogs.length,
          conqueredBeforeNoon: frogsBeforeNoon,
        },
      },
      recentActivity: recentTransactions,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch user profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch profile';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, currencyPeg } = body;

    await connectToDatabase();
    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      user.name = name.trim();
    }

    if (currencyPeg) {
      if (currencyPeg.pointsPerUnit !== undefined) {
        user.currencyPeg.pointsPerUnit = Math.max(1, Number(currencyPeg.pointsPerUnit));
      }
      if (currencyPeg.currencyCode) {
        user.currencyPeg.currencyCode = String(currencyPeg.currencyCode).trim().toUpperCase();
      }
      if (currencyPeg.symbol) {
        user.currencyPeg.symbol = String(currencyPeg.symbol).trim();
      }
    }

    await user.save();

    return NextResponse.json({
      success: true,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified ?? true,
        vaultBalance: user.vaultBalance,
        totalPointsEarned: user.totalPointsEarned,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        streakFreezesCount: user.streakFreezesCount,
        currencyPeg: user.currencyPeg,
        badges: user.badges,
      },
    });
  } catch (error: unknown) {
    console.error('Failed to update user profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
