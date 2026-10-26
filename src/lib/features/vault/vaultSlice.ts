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

const initialState: VaultState = {
  vaultBalance: 0,
  totalPointsEarned: 0,
  currencyPeg: {
    pointsPerUnit: 10, // 100 points = ₹10
    currencyCode: 'INR',
    symbol: '₹',
  },
  streakFreezesCount: 0,
  streakFreezeCost: 200,
  rewards: [],
  transactions: [],
  badges: [],
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

    setUserVaultStats: (
      state,
      action: PayloadAction<{
        vaultBalance: number;
        totalPointsEarned: number;
        streakFreezesCount: number;
        badges?: IUserBadge[];
      }>
    ) => {
      state.vaultBalance = action.payload.vaultBalance;
      state.totalPointsEarned = action.payload.totalPointsEarned;
      state.streakFreezesCount = action.payload.streakFreezesCount;
      if (action.payload.badges && action.payload.badges.length > 0) {
        state.badges = action.payload.badges;
      }
    },
  },
});

export const {
  awardPoints,
  purchaseStreakFreeze,
  consumeStreakFreeze,
  redeemVaultReward,
  clearVaultError,
  setUserVaultStats,
} = vaultSlice.actions;

export const setVaultUserData = setUserVaultStats;

export default vaultSlice.reducer;
