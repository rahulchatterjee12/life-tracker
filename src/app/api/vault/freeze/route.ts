import { NextResponse } from 'next/server';
import { connectToDatabase, User, Transaction } from '@/models';
import { STREAK_FREEZE_POINT_COST } from '@/lib/gamification/engine';

const DEFAULT_USER_EMAIL = 'lead.engineer@lifemetric.app';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json().catch(() => ({ action: 'BUY' }));
    const { action = 'BUY', reason = 'Emergency rest day protection' } = body;

    let user = await User.findOne({ email: DEFAULT_USER_EMAIL });
    if (!user) {
      user = await User.create({
        email: DEFAULT_USER_EMAIL,
        name: 'Lead Architect',
        vaultBalance: 550,
      });
    }

    if (action === 'BUY') {
      if (user.vaultBalance < STREAK_FREEZE_POINT_COST) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient points. You need ${STREAK_FREEZE_POINT_COST} points to buy a Streak Freeze. Available: ${user.vaultBalance} pts.`,
          },
          { status: 400 }
        );
      }

      user.vaultBalance -= STREAK_FREEZE_POINT_COST;
      user.streakFreezesCount += 1;
      await user.save();

      const transaction = await Transaction.create({
        userId: user._id,
        type: 'FREEZE_PURCHASE',
        pointsDelta: -STREAK_FREEZE_POINT_COST,
        resultingBalance: user.vaultBalance,
        description: 'Purchased 1x Streak Freeze insurance',
        metadata: {
          streakFreezesCount: user.streakFreezesCount,
          cost: STREAK_FREEZE_POINT_COST,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'BUY',
        streakFreezesCount: user.streakFreezesCount,
        vaultBalance: user.vaultBalance,
        transaction,
      });
    } else if (action === 'CONSUME') {
      if (user.streakFreezesCount <= 0) {
        return NextResponse.json(
          { success: false, error: 'No Streak Freezes available in inventory.' },
          { status: 400 }
        );
      }

      user.streakFreezesCount -= 1;
      await user.save();

      const transaction = await Transaction.create({
        userId: user._id,
        type: 'FREEZE_CONSUMED',
        pointsDelta: 0,
        resultingBalance: user.vaultBalance,
        description: `Consumed Streak Freeze: ${reason}`,
        metadata: {
          streakProtected: user.currentStreak,
          remainingFreezes: user.streakFreezesCount,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'CONSUME',
        streakFreezesCount: user.streakFreezesCount,
        vaultBalance: user.vaultBalance,
        transaction,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Streak freeze transaction error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

