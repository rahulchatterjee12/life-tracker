import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User, OtpVerification } from '@/models';
import { hashPassword, signToken, AUTH_COOKIE_NAME, getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { EmailOtpType } from '@/lib/email/mailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp, type, newPassword } = body;

    if (!email || !otp || !type) {
      return NextResponse.json(
        { success: false, error: 'Email, OTP, and verification type are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpType = type as EmailOtpType;
    const cleanOtp = String(otp).trim();

    await connectToDatabase();

    const record = await OtpVerification.findOne({
      email: normalizedEmail,
      type: otpType,
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'No active verification code found or it has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(record.expiresAt)) {
      await OtpVerification.deleteOne({ _id: record._id });
      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    if (record.attempts >= 5) {
      await OtpVerification.deleteOne({ _id: record._id });
      return NextResponse.json(
        { success: false, error: 'Too many incorrect attempts. Code invalidated. Please request a new code.' },
        { status: 429 }
      );
    }

    if (record.otp !== cleanOtp) {
      record.attempts += 1;
      await record.save();
      const remaining = 5 - record.attempts;
      return NextResponse.json(
        { success: false, error: `Invalid verification code. ${remaining} attempts remaining.` },
        { status: 400 }
      );
    }

    // OTP is valid! Proceed according to type
    if (otpType === 'SIGNUP') {
      const { name, hashedPassword } = record.tempData || {};
      if (!name || !hashedPassword) {
        return NextResponse.json(
          { success: false, error: 'Registration session expired. Please start registration again.' },
          { status: 400 }
        );
      }

      // Check once more in case another signup finalized simultaneously
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        await OtpVerification.deleteOne({ _id: record._id });
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      const newUser = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        isEmailVerified: true,
        totalPointsEarned: 0,
        vaultBalance: 0,
        currentStreak: 0,
        longestStreak: 0,
        streakFreezesCount: 1, // Welcome bonus freeze
        badges: [],
        currencyPeg: {
          pointsPerUnit: 10,
          currencyCode: 'INR',
          symbol: '₹',
        },
      });

      // Issue session cookie
      const token = await signToken({
        userId: String(newUser._id),
        email: newUser.email,
        name: newUser.name,
      });

      const cookieStore = await cookies();
      cookieStore.set(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });

      await OtpVerification.deleteOne({ _id: record._id });

      return NextResponse.json({
        success: true,
        message: 'Email verified and account created successfully!',
        user: {
          id: String(newUser._id),
          email: newUser.email,
          name: newUser.name,
          isEmailVerified: true,
          vaultBalance: newUser.vaultBalance,
          totalPointsEarned: newUser.totalPointsEarned,
          currentStreak: newUser.currentStreak,
          streakFreezesCount: newUser.streakFreezesCount,
          badges: newUser.badges,
        },
      });
    }

    if (otpType === 'FORGOT_PASSWORD') {
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Account not found' },
          { status: 404 }
        );
      }

      user.password = await hashPassword(newPassword);
      user.isEmailVerified = true;
      await user.save();

      // Issue session cookie so user is logged in immediately
      const token = await signToken({
        userId: String(user._id),
        email: user.email,
        name: user.name,
      });

      const cookieStore = await cookies();
      cookieStore.set(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      await OtpVerification.deleteOne({ _id: record._id });

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully!',
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          isEmailVerified: true,
          vaultBalance: user.vaultBalance,
          totalPointsEarned: user.totalPointsEarned,
          currentStreak: user.currentStreak,
          streakFreezesCount: user.streakFreezesCount,
          badges: user.badges,
        },
      });
    }

    if (otpType === 'CHANGE_PASSWORD') {
      const session = await getSession();
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized. Please sign in.' },
          { status: 401 }
        );
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      const user = await User.findById(session.userId);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Account not found' },
          { status: 404 }
        );
      }

      user.password = await hashPassword(newPassword);
      user.isEmailVerified = true;
      await user.save();

      await OtpVerification.deleteOne({ _id: record._id });

      return NextResponse.json({
        success: true,
        message: 'Password changed successfully!',
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported verification type' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Failed to verify OTP:', error);
    const message = error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
