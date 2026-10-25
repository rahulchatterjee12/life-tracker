import { Schema, model, models, Model } from 'mongoose';
import { ITransaction } from '@/types/database';

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'TASK_COMPLETION',
        'OVERTIME_BONUS',
        'MANUAL_PENALTY',
        'FROG_BONUS',
        'STREAK_BONUS',
        'FREEZE_PURCHASE',
        'FREEZE_CONSUMED',
        'VAULT_REDEMPTION',
        'ADJUSTMENT',
      ],
      required: true,
      index: true,
    },
    pointsDelta: { type: Number, required: true },
    resultingBalance: { type: Number, required: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    rewardId: { type: Schema.Types.ObjectId, ref: 'VaultReward' },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable ledger
  }
);

TransactionSchema.index({ userId: 1, createdAt: -1 });

export const Transaction: Model<ITransaction> =
  models.Transaction || model<ITransaction>('Transaction', TransactionSchema);
export default Transaction;

