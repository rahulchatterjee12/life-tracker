import { NextResponse } from 'next/server';
import { connectToDatabase, Task, User } from '@/models';
import { getSession } from '@/lib/auth';

const DEFAULT_USER_EMAIL = 'lead.engineer@lifemetric.app';

async function getTargetUser() {
  const session = await getSession();
  if (session?.userId) {
    const user = await User.findById(session.userId);
    if (user) return user;
  }

  // Ensure default demo user exists for offline / unauthenticated exploration
  let user = await User.findOne({ email: DEFAULT_USER_EMAIL });
  if (!user) {
    user = await User.create({
      email: DEFAULT_USER_EMAIL,
      name: 'Lead Architect',
      password: 'default-demo-password',
      totalPointsEarned: 1250,
      vaultBalance: 550,
      currentStreak: 7,
      longestStreak: 14,
      streakFreezesCount: 1,
      currencyPeg: {
        pointsPerUnit: 10,
        currencyCode: 'INR',
        symbol: '₹',
      },
    });
  }
  return user;
}

export async function GET() {
  try {
    await connectToDatabase();
    const user = await getTargetUser();
    const tasks = await Task.find({ userId: user._id }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      user,
      tasks,
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const user = await getTargetUser();

    // If tagging as Eat That Frog, reset other frogs for today
    if (body.isFrog) {
      await Task.updateMany({ userId: user._id, isFrog: true }, { isFrog: false });
    }

    const newTask = await Task.create({
      ...body,
      userId: user._id,
    });

    return NextResponse.json({
      success: true,
      task: newTask,
    });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
