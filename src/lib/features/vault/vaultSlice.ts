import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ICurrencyPeg,
  ITransaction,
  IUserBadge,
  IVaultReward,
  TransactionType,
} from '@/types/database';

export interface VaultState {
  vaultBalance: number;
  totalPointsEarned: number;
  currencyPeg: ICurrencyPeg;
  streakFreezesCount: number;
  streakFreezeCost: number;
  rewards: IVaultReward[];
  transactions: ITransaction[];
  badges: IUserBadge[];
  isLoading: boolean;
  error: string | null;
}

const mockRewards: IVaultReward[] = [
  {
    _id: 'rew-1' as unknown as import('mongoose').Types.ObjectId,
    title: 'Weekend Specialty Coffee Experience',
    description: 'Treat yourself to a top-tier pour-over brew at your favorite cafe.',
    pointCost: 200,
    monetaryValue: 20,
    currency: 'INR',
    category: 'LEISURE',
    icon: '☕',
    isRedeemed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'rew-2' as unknown as import('mongoose').Types.ObjectId,
    title: 'New Programming / Focus Book',
    description: 'Order any educational or self-development Kindle book.',
    pointCost: 1000,
    monetaryValue: 100,
    currency: 'INR',
    category: 'TECH',
    icon: '📚',
    isRedeemed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'rew-3' as unknown as import('mongoose').Types.ObjectId,
    title: 'Financial Index Fund Investment Deposit',
    description: 'Transfer real pegged savings into your index fund investment account.',
    pointCost: 5000,
    monetaryValue: 500,
    currency: 'INR',
    category: 'FINANCIAL',
    icon: '📈',
    isRedeemed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockBadges: IUserBadge[] = [
  {
    id: 'badge-1',
    title: 'First Deep Focus',
    description: 'Completed your first 45-minute live tracked session',
    unlockedAt: new Date(),
    icon: '⚡',
  },
  {
    id: 'badge-2',
    title: '7-Day Habit Sentinel',
    description: 'Maintained continuous daily morning mindfulness streak',
    unlockedAt: new Date(),
    icon: '🔥',
  },
];

const mockTransactions: ITransaction[] = [
  {
    _id: 'tx-1' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    type: 'TASK_COMPLETION',
    pointsDelta: 150,
    resultingBalance: 350,
    description: 'Completed Deep Work session with 0% overtime',
    createdAt: new Date(Date.now() - 3600000 * 4),
  },
  {
    _id: 'tx-2' as unknown as import('mongoose').Types.ObjectId,
    userId: 'user-default',
    type: 'STREAK_BONUS',
    pointsDelta: 200,
    resultingBalance: 550,
    description: 'Achieved 7-day habit streak multiplier',
    createdAt: new Date(Date.now() - 3600000 * 2),
  },
];

const initialState: VaultState = {
  vaultBalance: 550,
  totalPointsEarned: 1250,
  currencyPeg: {
    pointsPerUnit: 10, // 100 points = ₹10
    currencyCode: 'INR',
    symbol: '₹',
  },
  streakFreezesCount: 1,
  streakFreezeCost: 200,
  rewards: mockRewards,
  transactions: mockTransactions,
  badges: mockBadges,
  isLoading: false,
  error: null,
};

export const vaultSlice = createSlice({
  name: 'vault',
  initialState,
  reducers: {
    awardPoints: (
      state,
      action: PayloadAction<{
        pointsDelta: number;
        type: TransactionType;
        description: string;
        taskId?: string;
        metadata?: Record<string, unknown>;
      }>
    ) => {
      const { pointsDelta, type, description, taskId, metadata } = action.payload;
      state.vaultBalance += pointsDelta;
      state.totalPointsEarned += pointsDelta;

      const newTx: ITransaction = {
        _id: ('tx-' + Date.now()) as unknown as import('mongoose').Types.ObjectId,
        userId: 'user-default',
        type,
        pointsDelta,
        resultingBalance: state.vaultBalance,
        taskId: taskId as unknown as import('mongoose').Types.ObjectId,
        description,
        metadata,
        createdAt: new Date(),
      };
      state.transactions.unshift(newTx);
    },

    purchaseStreakFreeze: (state) => {
      if (state.vaultBalance < state.streakFreezeCost) {
        state.error = 'Insufficient points in The Vault to purchase a Streak Freeze.';
        return;
      }

      state.vaultBalance -= state.streakFreezeCost;
      state.streakFreezesCount += 1;
      state.error = null;

      const newTx: ITransaction = {
        _id: ('tx-' + Date.now()) as unknown as import('mongoose').Types.ObjectId,
        userId: 'user-default',
        type: 'FREEZE_PURCHASE',
        pointsDelta: -state.streakFreezeCost,
        resultingBalance: state.vaultBalance,
        description: 'Purchased 1x Streak Freeze insurance',
        createdAt: new Date(),
      };
      state.transactions.unshift(newTx);
    },

    consumeStreakFreeze: (state, action: PayloadAction<{ reason: string }>) => {
      if (state.streakFreezesCount <= 0) return;
      state.streakFreezesCount -= 1;

      const newTx: ITransaction = {
        _id: ('tx-' + Date.now()) as unknown as import('mongoose').Types.ObjectId,
        userId: 'user-default',
        type: 'FREEZE_CONSUMED',
        pointsDelta: 0,
        resultingBalance: state.vaultBalance,
        description: `Consumed Streak Freeze: ${action.payload.reason}`,
        createdAt: new Date(),
      };
      state.transactions.unshift(newTx);
    },

    redeemVaultReward: (state, action: PayloadAction<string>) => {
      const reward = state.rewards.find((r) => String(r._id) === action.payload);
      if (!reward) return;

      if (state.vaultBalance < reward.pointCost) {
        state.error = `Insufficient points to redeem "${reward.title}". Need ${reward.pointCost} points.`;
        return;
      }

      state.vaultBalance -= reward.pointCost;
      reward.isRedeemed = true;
      reward.redeemedAt = new Date();
      state.error = null;

      // Add permanent Redemption Badge to profile
      const newBadge: IUserBadge = {
        id: 'badge-redeem-' + Date.now(),
        title: `Redeemed: ${reward.title}`,
        description: `Successfully converted ${reward.pointCost} points into real-world ${state.currencyPeg.symbol}${reward.monetaryValue} value`,
        unlockedAt: new Date(),
        icon: reward.icon || '🎖️',
        rewardId: reward._id,
      };
      state.badges.unshift(newBadge);

      // Log transaction
      const newTx: ITransaction = {
        _id: ('tx-' + Date.now()) as unknown as import('mongoose').Types.ObjectId,
        userId: 'user-default',
        type: 'VAULT_REDEMPTION',
        pointsDelta: -reward.pointCost,
        resultingBalance: state.vaultBalance,
        rewardId: reward._id,
        description: `Redeemed Vault Reward: ${reward.title} (${state.currencyPeg.symbol}${reward.monetaryValue})`,
        metadata: {
          rewardTitle: reward.title,
          monetaryValue: reward.monetaryValue,
          currency: reward.currency,
        },
        createdAt: new Date(),
      };
      state.transactions.unshift(newTx);
    },

    clearVaultError: (state) => {
      state.error = null;
    },
  },
});

export const {
  awardPoints,
  purchaseStreakFreeze,
  consumeStreakFreeze,
  redeemVaultReward,
  clearVaultError,
} = vaultSlice.actions;

export default vaultSlice.reducer;

