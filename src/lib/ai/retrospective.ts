import { GoogleGenAI } from '@google/genai';
import { ITask, ITransaction, IUser } from '@/types/database';

export interface WeeklyMetrics {
  totalDeepWorkMinutes: number;
  liveTrackedSessionsCount: number;
  manualLoggedSessionsCount: number;
  liveFocusRatioPercentage: number;
  overtimeBonusSessionsCount: number;
  totalHabitsCompleted: number;
  bestActiveStreak: number;
  frogCompletedCount: number;
  frogCompletedBeforeNoonCount: number;
  frogMorningSuccessRate: number;
  totalPointsEarnedWeek: number;
  vaultRedemptionsCount: number;
  streakFreezesPurchasedCount: number;
}

export interface AIRetrospectiveReport {
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  title: string;
  executiveSummary: string;
  keyStrengths: string[];
  vulnerabilitiesAndPenalties: string[];
  prescriptiveAdjustments: string[];
  metricsSnapshot: WeeklyMetrics;
  generatedAt: string;
  source: 'GEMINI_API' | 'HEURISTIC_ENGINE';
}

export function compileWeeklyMetrics(
  tasks: ITask[],
  transactions: ITransaction[] = []
): WeeklyMetrics {
  const deepWorkTasks = tasks.filter((t) => t.type === 'DEEP_WORK' && t.completed);
  const habitTasks = tasks.filter((t) => t.type === 'HABIT' && t.completed);
  const frogTasks = tasks.filter((t) => t.isFrog && t.completed);

  const totalDeepWorkSeconds = deepWorkTasks.reduce(
    (acc, t) => acc + (t.deepWorkDetails?.actualDurationSeconds || 0),
    0
  );
  const liveSessions = deepWorkTasks.filter((t) => t.deepWorkDetails?.isLiveTracked !== false);
  const manualSessions = deepWorkTasks.filter((t) => t.deepWorkDetails?.isLiveTracked === false);
  const overtimeSessions = deepWorkTasks.filter(
    (t) => t.deepWorkDetails?.overtimeBonusAwarded === true
  );

  const bestStreak = tasks.reduce(
    (max, t) => Math.max(max, t.habitDetails?.streakCount || 0),
    0
  );

  const frogBeforeNoon = frogTasks.filter((t) => t.frogCompletedBeforeNoon === true).length;

  const totalPoints = transactions
    .filter((tx) => tx.pointsDelta > 0)
    .reduce((acc, tx) => acc + tx.pointsDelta, 0);

  const redemptions = transactions.filter((tx) => tx.type === 'VAULT_REDEMPTION').length;
  const freezes = transactions.filter((tx) => tx.type === 'FREEZE_PURCHASE').length;

  const totalDeepWorkSessions = liveSessions.length + manualSessions.length;
  const liveRatio =
    totalDeepWorkSessions > 0
      ? Math.round((liveSessions.length / totalDeepWorkSessions) * 100)
      : 100;

  const frogRate =
    frogTasks.length > 0 ? Math.round((frogBeforeNoon / frogTasks.length) * 100) : 0;

  return {
    totalDeepWorkMinutes: Math.round(totalDeepWorkSeconds / 60),
    liveTrackedSessionsCount: liveSessions.length,
    manualLoggedSessionsCount: manualSessions.length,
    liveFocusRatioPercentage: liveRatio,
    overtimeBonusSessionsCount: overtimeSessions.length,
    totalHabitsCompleted: habitTasks.length,
    bestActiveStreak: bestStreak,
    frogCompletedCount: frogTasks.length,
    frogCompletedBeforeNoonCount: frogBeforeNoon,
    frogMorningSuccessRate: frogRate,
    totalPointsEarnedWeek: totalPoints,
    vaultRedemptionsCount: redemptions,
    streakFreezesPurchasedCount: freezes,
  };
}

export async function generateAIRetrospective(
  user: IUser,
  tasks: ITask[],
  transactions: ITransaction[] = []
): Promise<AIRetrospectiveReport> {
  const metrics = compileWeeklyMetrics(tasks, transactions);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
You are the Lead Executive Performance Coach for "Life Metric," an elite gamified productivity system.
Analyze the user's 7-day execution log and output a JSON coaching retrospective.

User Profile:
- Name: ${user.name}
- Total Lifetime Points: ${user.totalPointsEarned}
- Current Vault Balance: ${user.vaultBalance}
- Streak Freezes: ${user.streakFreezesCount}

Weekly Metrics:
${JSON.stringify(metrics, null, 2)}

Provide your response in strictly VALID JSON format (no markdown blocks, no markdown formatting around the json, raw json only) conforming to this TypeScript schema:
{
  "grade": "S" | "A" | "B" | "C" | "D",
  "title": string,
  "executiveSummary": string,
  "keyStrengths": string[],
  "vulnerabilitiesAndPenalties": string[],
  "prescriptiveAdjustments": string[]
}

Guidelines:
- If liveFocusRatioPercentage is below 80%, highlight the 10% manual logging penalty friction.
- If overtime bonus count is high, praise sustained flow states.
- If Eat That Frog completed before noon rate is high, commend circadian discipline.
- Give 3 specific, actionable adjustments for next week.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = response.text || '';
      // Strip potential backticks
      const cleanJson = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanJson);

      return {
        grade: parsed.grade || 'A',
        title: parsed.title || 'Weekly Executive Focus Brief',
        executiveSummary: parsed.executiveSummary || 'Strong operational cadence across focus intervals.',
        keyStrengths: parsed.keyStrengths || [],
        vulnerabilitiesAndPenalties: parsed.vulnerabilitiesAndPenalties || [],
        prescriptiveAdjustments: parsed.prescriptiveAdjustments || [],
        metricsSnapshot: metrics,
        generatedAt: new Date().toISOString(),
        source: 'GEMINI_API',
      };
    } catch (error) {
      console.warn('Gemini API call failed or timed out, using heuristic coaching engine fallback:', error);
    }
  }

  // Heuristic Engine Fallback
  let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'A';
  if (metrics.liveFocusRatioPercentage < 70 || metrics.frogMorningSuccessRate < 50) {
    grade = 'B';
  } else if (metrics.totalDeepWorkMinutes > 180 && metrics.bestActiveStreak >= 7) {
    grade = 'S';
  }

  return {
    grade,
    title: 'Sunday Executive Coaching Retrospective',
    executiveSummary: `You logged ${metrics.totalDeepWorkMinutes} minutes of focused deep work with a ${metrics.liveFocusRatioPercentage}% live-stopwatch tracking compliance rate. Your active habit streak stands resilient at ${metrics.bestActiveStreak} days.`,
    keyStrengths: [
      `High live focus fidelity (${metrics.liveFocusRatioPercentage}%), minimizing manual logging penalties.`,
      `Maintained a solid ${metrics.bestActiveStreak}-day streak on anchor mindfulness & execution habits.`,
      metrics.overtimeBonusSessionsCount > 0
        ? `Unlocked ${metrics.overtimeBonusSessionsCount} overtime bonus sessions by exceeding the 20% target duration threshold.`
        : 'Sustained steady task completion across scheduled blocks.',
    ],
    vulnerabilitiesAndPenalties: [
      metrics.manualLoggedSessionsCount > 0
        ? `${metrics.manualLoggedSessionsCount} sessions were logged manually, which triggered the 10% penalty deduction.`
        : 'Zero manual penalties incurred this week—superb tracking integrity.',
      metrics.frogMorningSuccessRate < 100
        ? `Morning Frog completion rate was ${metrics.frogMorningSuccessRate}%. Completing the priority task before 12:00 PM unlocks a 1.5x point multiplier.`
        : 'Flawless Eat That Frog execution before 12:00 PM.',
    ],
    prescriptiveAdjustments: [
      'Pre-commit tomorrow’s highest-leverage task as the "Daily Frog" tonight before 10:00 PM.',
      'Initiate live Deep Work sessions directly in Zen Mode to minimize tab-switching distractions.',
      'Consider redeeming 200 points for a Streak Freeze to safeguard your progress ahead of busy weekends.',
    ],
    metricsSnapshot: metrics,
    generatedAt: new Date().toISOString(),
    source: 'HEURISTIC_ENGINE',
  };
}

