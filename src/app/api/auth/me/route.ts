import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.userId).select('-password');
    if (!user) {
      return NextResponse.json({ success: false, user: null }, { status: 404 });
    }

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
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

