import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { hashPassword, signToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    await connectToDatabase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      totalPointsEarned: 0,
      vaultBalance: 0,
      currentStreak: 0,
      longestStreak: 0,
      streakFreezesCount: 1, // 1 welcome streak freeze
      badges: [],
      currencyPeg: {
        pointsPerUnit: 10,
        currencyCode: 'INR',
        symbol: '₹',
      },
    });

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

    return NextResponse.json({
      success: true,
      user: {
        id: String(newUser._id),
        email: newUser.email,
        name: newUser.name,
        vaultBalance: newUser.vaultBalance,
        totalPointsEarned: newUser.totalPointsEarned,
        currentStreak: newUser.currentStreak,
        streakFreezesCount: newUser.streakFreezesCount,
        badges: newUser.badges,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Signup failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

