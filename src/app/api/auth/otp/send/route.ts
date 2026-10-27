import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { User, OtpVerification } from '@/models';
import { hashPassword, getSession } from '@/lib/auth';
import { sendOtpEmail, EmailOtpType } from '@/lib/email/mailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, type, name, password } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpType = type as EmailOtpType;

    if (!['SIGNUP', 'FORGOT_PASSWORD', 'CHANGE_PASSWORD'].includes(otpType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP verification type' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let targetUserName: string | undefined = undefined;
    let tempData: Record<string, unknown> | undefined = undefined;

    if (otpType === 'SIGNUP') {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Full name is required for registration' },
          { status: 400 }
        );
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      // Ensure email is not already taken
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'An account with this email address already exists. Please sign in instead.' },
          { status: 409 }
        );
      }

      targetUserName = name.trim();
      const hashedPassword = await hashPassword(password);
      tempData = {
        name: targetUserName,
        hashedPassword,
      };
    } else if (otpType === 'FORGOT_PASSWORD') {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (!existingUser) {
        return NextResponse.json(
          { success: false, error: 'No account registered with this email address' },
          { status: 404 }
        );
      }
      targetUserName = existingUser.name;
    } else if (otpType === 'CHANGE_PASSWORD') {
      const session = await getSession();
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized. Please sign in.' },
          { status: 401 }
        );
      }
      if (session.email.toLowerCase() !== normalizedEmail) {
        return NextResponse.json(
          { success: false, error: 'Email does not match active session' },
          { status: 403 }
        );
      }
      targetUserName = session.name;
      tempData = { userId: session.userId };
    }

    // Generate secure 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing active OTP for this email and type to prevent collision
    await OtpVerification.deleteMany({ email: normalizedEmail, type: otpType });

    // Store new OTP record
    await OtpVerification.create({
      email: normalizedEmail,
      otp,
      type: otpType,
      tempData,
      attempts: 0,
      expiresAt,
    });

    // Send email
    const emailResult = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      type: otpType,
      userName: targetUserName,
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}`,
      previewOtp: emailResult.previewOtp,
    });
  } catch (error: unknown) {
    console.error('Failed to send OTP:', error);
    const message = error instanceof Error ? error.message : 'Failed to send OTP';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
