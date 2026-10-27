import { Schema, model, models, Model } from 'mongoose';

export type OtpVerificationType = 'SIGNUP' | 'FORGOT_PASSWORD' | 'CHANGE_PASSWORD';

export interface IOtpVerification {
  _id?: string;
  email: string;
  otp: string;
  type: OtpVerificationType;
  tempData?: {
    name?: string;
    hashedPassword?: string;
    userId?: string;
  };
  attempts: number;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const OtpVerificationSchema = new Schema<IOtpVerification>(
  {
    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['SIGNUP', 'FORGOT_PASSWORD', 'CHANGE_PASSWORD'],
      index: true,
    },
    tempData: {
      type: Schema.Types.Mixed,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: MongoDB auto-removes expired documents
    },
  },
  {
    timestamps: true,
  }
);

export const OtpVerification: Model<IOtpVerification> =
  models.OtpVerification || model<IOtpVerification>('OtpVerification', OtpVerificationSchema);
export default OtpVerification;
