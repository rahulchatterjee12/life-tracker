import { NextResponse } from 'next/server';
import { connectToDatabase, Task, User } from '@/models';

// Default demo user identifier
const DEFAULT_USER_EMAIL = 'lead.engineer@lifemetric.app';

export async function GET() {
  try {
    await connectToDatabase();

    // Ensure default user exists
    let user = await User.findOne({ email: DEFAULT_USER_EMAIL });
    if (!user) {
      user = await User.create({
        email: DEFAULT_USER_EMAIL,
        name: 'Lead Architect',
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

    let user = await User.findOne({ email: DEFAULT_USER_EMAIL });
    if (!user) {
      user = await User.create({
        email: DEFAULT_USER_EMAIL,
        name: 'Lead Architect',
      });
    }

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

