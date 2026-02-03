import {
  getWeeklyTaskStats,
  getGoals,
  detectSpendingInstability
} from '../database';

export interface LifeLoadReport {
  score: number; // 0-100
  status: 'Balanced' | 'Heavy' | 'Overload Risk';
  contributors: string[]; // Top stress factors
  suggestions: string[]; // Actionable advice
  breakdown: {
    taskScore: number;
    goalScore: number;
    moneyScore: number;
  };
}

/**
 * CORE AI FUNCTION: LIFE LOAD DETECTOR
 * Fuses Task, Goal, and Money data into a single stress metric.
 */
export const calculateLifeLoad = async (): Promise<LifeLoadReport> => {
  // 1. INPUT: Task Load (40% weight)
  // Logic: 300 mins/day avg is considered "Full Capacity" (100% score)
  const taskStats = await getWeeklyTaskStats();
  let taskScore = (taskStats.avgLoad / 300) * 100;
  taskScore = Math.min(100, Math.max(0, taskScore));

  // 2. INPUT: Goal Pressure (30% weight)
  // Logic: Goals due in < 7 days add significant pressure
  const goals = await getGoals();
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  const todayStr = today.toISOString().slice(0, 10);
  const nextWeekStr = nextWeek.toISOString().slice(0, 10);

  const urgentGoals = goals.filter(g => 
    g.status !== 'Completed' && 
    g.target_date >= todayStr && 
    g.target_date <= nextWeekStr
  );
  
  // Scoring: 1 urgent goal = 25 pressure points
  let goalScore = urgentGoals.length * 25;
  goalScore = Math.min(100, goalScore);

  // 3. INPUT: Money Stress (30% weight)
  // Logic: Reuse the spending instability metric we already built
  const moneyScore = await detectSpendingInstability();

  // 4. WEIGHTED CALCULATION
  const totalScore = Math.round(
    (taskScore * 0.4) + 
    (goalScore * 0.3) + 
    (moneyScore * 0.3)
  );

  // 5. CLASSIFICATION
  let status: LifeLoadReport['status'] = 'Balanced';
  if (totalScore > 70) status = 'Overload Risk';
  else if (totalScore > 40) status = 'Heavy';

  // 6. CAUSE ANALYSIS & SUGGESTIONS
  const contributors: string[] = [];
  const suggestions: string[] = [];

  if (taskScore > 60) {
    contributors.push("High Task Volume");
    suggestions.push("📉 Workload is high. Delegate or reschedule 20% of tasks.");
  }
  if (goalScore > 50) {
    contributors.push("Deadline Pressure");
    suggestions.push("🎯 Multiple deadlines imminent. Pick 1 priority goal, postpone others.");
  }
  if (moneyScore > 50) {
    contributors.push("Financial Instability");
    suggestions.push("💰 Money stress detected. Initiate a 3-day spending freeze.");
  }

  if (status === 'Balanced' && contributors.length === 0) {
    suggestions.push("✨ Great balance! You are in a sustainable rhythm.");
  }

  return {
    score: totalScore,
    status,
    contributors,
    suggestions,
    breakdown: { taskScore, goalScore, moneyScore }
  };
};