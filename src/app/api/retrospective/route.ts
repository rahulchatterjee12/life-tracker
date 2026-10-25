import { NextResponse } from 'next/server';
import { connectToDatabase, User, Task, Transaction } from '@/models';
import { generateAIRetrospective } from '@/lib/ai/retrospective';

const DEFAULT_USER_EMAIL = 'lead.engineer@lifemetric.app';

export async function GET() {
  try {
    await connectToDatabase();

    let user = await User.findOne({ email: DEFAULT_USER_EMAIL });
    if (!user) {
      user = await User.create({
        email: DEFAULT_USER_EMAIL,
        name: 'Lead Architect',
        vaultBalance: 550,
        totalPointsEarned: 1250,
      });
    }

    const tasks = await Task.find({ userId: user._id });
    const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 });

    const report = await generateAIRetrospective(user, tasks, transactions);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Failed to get retrospective:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    await connectToDatabase();

    let user = await User.findOne({ email: DEFAULT_USER_EMAIL });
    if (!user) {
      user = await User.create({
        email: DEFAULT_USER_EMAIL,
        name: 'Lead Architect',
      });
    }

    // Get 7-day window
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
    const tasks = await Task.find({
      userId: user._id,
      updatedAt: { $gte: oneWeekAgo },
    });

    const transactions = await Transaction.find({
      userId: user._id,
      createdAt: { $gte: oneWeekAgo },
    }).sort({ createdAt: -1 });

    const report = await generateAIRetrospective(user, tasks, transactions);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Failed to generate retrospective:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

