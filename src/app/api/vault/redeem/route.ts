import { NextResponse } from 'next/server';
import { connectToDatabase, User, VaultReward, Transaction } from '@/models';
import { getSession } from '@/lib/auth';

const DEFAULT_USER_EMAIL = 'lead.engineer@lifemetric.app';

async function getTargetUser() {
  const session = await getSession();
  if (session?.userId) {
    const user = await User.findById(session.userId);
    if (user) return user;
  }

  let user = await User.findOne({ email: DEFAULT_USER_EMAIL });
  if (!user) {
    user = await User.create({
      email: DEFAULT_USER_EMAIL,
      name: 'Lead Architect',
      password: 'default-demo-password',
      vaultBalance: 0,
      totalPointsEarned: 0,
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

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { rewardId } = body;

    if (!rewardId) {
      return NextResponse.json({ success: false, error: 'rewardId is required' }, { status: 400 });
    }

    const reward = await VaultReward.findById(rewardId);
    if (!reward) {
      return NextResponse.json({ success: false, error: 'Vault reward not found' }, { status: 404 });
    }

    const user = await getTargetUser();

    const isAlreadyRedeemedByUser =
      reward.isRedeemed ||
      (user.badges && user.badges.some((b: any) => String(b.rewardId) === String(reward._id)));

    if (isAlreadyRedeemedByUser) {
      return NextResponse.json(
        { success: false, error: 'You have already redeemed this reward.' },
        { status: 400 }
      );
    }

    if (user.vaultBalance < reward.pointCost) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient points in The Vault. Need ${reward.pointCost} points, but available balance is ${user.vaultBalance} points.`,
        },
        { status: 400 }
      );
    }

    // 1. Deduct balance
    user.vaultBalance -= reward.pointCost;

    // 2. Generate permanent Redemption Badge on profile
    const badgeId = `badge-redeem-${Date.now()}`;
    const newBadge = {
      id: badgeId,
      title: `Redeemed: ${reward.title}`,
      description: `Pegged ${reward.pointCost} focus points to ${user.currencyPeg.symbol}${reward.monetaryValue} real-world reward`,
      unlockedAt: new Date(),
      icon: reward.icon || '🎖️',
      rewardId: reward._id,
    };
    user.badges.push(newBadge);
    await user.save();

    // 3. Mark reward redeemed only if it belongs to this user specifically
    if (reward.userId) {
      reward.isRedeemed = true;
      reward.redeemedAt = new Date();
      await reward.save();
    }

    // 4. Log double-entry transaction
    const transaction = await Transaction.create({
      userId: user._id,
      type: 'VAULT_REDEMPTION',
      pointsDelta: -reward.pointCost,
      resultingBalance: user.vaultBalance,
      rewardId: reward._id,
      description: `Redeemed Vault Reward: ${reward.title} (${user.currencyPeg.symbol}${reward.monetaryValue})`,
      metadata: {
        rewardTitle: reward.title,
        monetaryValue: reward.monetaryValue,
        pointCost: reward.pointCost,
        badgeId,
      },
    });

    return NextResponse.json({
      success: true,
      reward,
      user: {
        vaultBalance: user.vaultBalance,
        badges: user.badges,
      },
      badge: newBadge,
      transaction,
    });
  } catch (error) {
    console.error('Vault redemption error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
