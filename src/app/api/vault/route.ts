import { NextResponse } from 'next/server';
import { connectToDatabase, VaultReward, Transaction, User, RewardCategory } from '@/models';

const DEFAULT_USER_EMAIL = 'lead.engineer@lifemetric.app';

interface DefaultRewardItem {
  title: string;
  description: string;
  pointCost: number;
  monetaryValue: number;
  currency: string;
  category: RewardCategory;
  icon: string;
  isRedeemed: boolean;
}

const DEFAULT_REWARDS: DefaultRewardItem[] = [
  {
    title: 'Weekend Specialty Pour-Over Coffee',
    description: 'Reward an intensive week of focus with an artisan brew at your favorite cafe.',
    pointCost: 200,
    monetaryValue: 20,
    currency: 'INR',
    category: 'LEISURE',
    icon: '☕',
    isRedeemed: false,
  },
  {
    title: 'Educational Architecture / Focus Book',
    description: 'Purchase any high-impact engineering or productivity book on Kindle.',
    pointCost: 1000,
    monetaryValue: 100,
    currency: 'INR',
    category: 'TECH',
    icon: '📚',
    isRedeemed: false,
  },
  {
    title: 'Index Fund Investment Deposit',
    description: 'Transfer real pegged savings into your long-term mutual fund / ETF portfolio.',
    pointCost: 5000,
    monetaryValue: 500,
    currency: 'INR',
    category: 'FINANCIAL',
    icon: '📈',
    isRedeemed: false,
  },
];

export async function GET() {
  try {
    await connectToDatabase();

    let user = await User.findOne({ email: DEFAULT_USER_EMAIL });
    if (!user) {
      user = await User.create({
        email: DEFAULT_USER_EMAIL,
        name: 'Lead Architect',
        vaultBalance: 550,
        totalPointsEarned: 1250,
      });
    }

    let rewards = await VaultReward.find().sort({ pointCost: 1 });
    if (rewards.length === 0) {
      rewards = await VaultReward.insertMany(DEFAULT_REWARDS);
    }

    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    return NextResponse.json({
      success: true,
      user,
      rewards,
      transactions,
    });
  } catch (error) {
    console.error('Failed to load Vault data:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
