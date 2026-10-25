import { Schema, model, models, Model } from 'mongoose';
import { IVaultReward } from '@/types/database';

const VaultRewardSchema = new Schema<IVaultReward>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true }, // null for global default catalog
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    pointCost: { type: Number, required: true, min: 1 },
    monetaryValue: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    category: {
      type: String,
      enum: ['FINANCIAL', 'GADGET', 'TECH', 'EXPERIENCE', 'LEISURE', 'OTHER'],
      default: 'FINANCIAL',
    },
    icon: { type: String, default: '🎁' },
    isRedeemed: { type: Boolean, default: false },
    redeemedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const VaultReward: Model<IVaultReward> =
  models.VaultReward || model<IVaultReward>('VaultReward', VaultRewardSchema);
export default VaultReward;

