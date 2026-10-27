import { Schema, model, models, Model } from 'mongoose';
import { IUser } from '@/types/database';

const UserBadgeSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
    icon: { type: String, default: '🏆' },
    rewardId: { type: Schema.Types.ObjectId, ref: 'VaultReward' },
  },
  { _id: false }
);

const CurrencyPegSchema = new Schema(
  {
    pointsPerUnit: { type: Number, default: 10 },
    currencyCode: { type: String, default: 'INR' },
    symbol: { type: String, default: '₹' },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: true },
    totalPointsEarned: { type: Number, default: 0 },
    vaultBalance: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    streakFreezesCount: { type: Number, default: 0 },
    lastActiveDate: { type: String },
    currencyPeg: {
      type: CurrencyPegSchema,
      default: () => ({
        pointsPerUnit: 10,
        currencyCode: 'INR',
        symbol: '₹',
      }),
    },
    badges: { type: [UserBadgeSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> = models.User || model<IUser>('User', UserSchema);
export default User;

