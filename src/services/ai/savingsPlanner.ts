import { 
  getMonthlySalary, 
  getExpensesByMonth, 
  getActiveSubscriptions,
  Expense
} from '../database';

// --- DATA MODELS ---
export interface SavingsReport {
  income: number;
  totalExpenses: number;
  needs: number;
  wants: number;
  savingsPotential: number; // Recommended savings amount
  actualSavings: number;    // Income - Total Expenses
  healthScore: number;      // 0-100
  status: 'Critical' | 'Fair' | 'Healthy' | 'Excellent';
  insights: string[];
}

/**
 * CORE AI FUNCTION: SMART SAVINGS PLANNER
 * Classifies expenses into Needs/Wants and calculates financial health.
 */
export const analyzeSavings = async (monthStr: string): Promise<SavingsReport> => {
  // 1. FETCH DATA
  const salary = await getMonthlySalary();
  const expenses = await getExpensesByMonth(monthStr);
  const subs = await getActiveSubscriptions();

  // 2. CLASSIFY EXPENSES (Needs vs Wants)
  let needs = 0;
  let wants = 0;

  // Rule A: Subscriptions are generally Wants (Entertainment)
  // unless categorized otherwise (e.g., 'Work' tools). For MVP, we treat subs as Wants.
  subs.forEach(s => {
    wants += s.amount;
  });

  expenses.forEach(e => {
    const cat = e.category;
    const note = e.note ? e.note.toLowerCase() : '';

    // Rule B: Category Heuristics
    if (cat === 'Rent' || cat === 'Transport') {
      needs += e.amount;
    } else if (cat === 'Food') {
      // Advanced Rule: Delivery apps vs Groceries
      if (note.includes('zomato') || note.includes('swiggy') || note.includes('uber') || note.includes('pizza')) {
        wants += e.amount;
      } else {
        needs += e.amount; // Basic groceries assumed as need
      }
    } else if (cat === 'Fun') {
      wants += e.amount;
    } else {
      wants += e.amount; // 'Other' defaults to Want
    }
  });

  const totalExpenses = needs + wants;
  const actualSavings = salary - totalExpenses;
  
  // 3. SAVINGS CAPACITY CALCULATION (The 50/30/20 Rule)
  // Ideal: 50% Needs, 30% Wants, 20% Savings
  const recommendedSavings = Math.max(0, salary * 0.20);
  
  // 4. FINANCIAL HEALTH SCORE (0-100)
  let score = 50; // Base score

  // Metric 1: Savings Rate (+/- 30 pts)
  const savingsRate = salary > 0 ? (actualSavings / salary) : 0;
  if (savingsRate >= 0.20) score += 30; // Excellent saver
  else if (savingsRate >= 0.10) score += 15; // Okay saver
  else if (savingsRate < 0) score -= 20; // In debt

  // Metric 2: Needs Limit (+/- 10 pts)
  // Needs shouldn't exceed 50-60% of income
  if (salary > 0 && (needs / salary) < 0.60) score += 10;
  else if (salary > 0 && (needs / salary) > 0.80) score -= 10; // Living beyond means

  // Metric 3: Wants Control (+/- 10 pts)
  if (salary > 0 && (wants / salary) < 0.30) score += 10;

  // Clamp score
  score = Math.min(100, Math.max(0, score));

  // Determine Status
  let status: SavingsReport['status'] = 'Fair';
  if (score >= 80) status = 'Excellent';
  else if (score >= 60) status = 'Healthy';
  else if (score < 40) status = 'Critical';

  // 5. GENERATE INSIGHTS (Actionable Advice)
  const insights: string[] = [];

  if (actualSavings < recommendedSavings) {
    insights.push(`📉 Savings Gap: You saved ₹${actualSavings > 0 ? actualSavings.toFixed(0) : 0}, but safe target is ₹${recommendedSavings.toFixed(0)}.`);
  } else {
    insights.push(`✅ On Track: You are saving ${Math.round(savingsRate * 100)}% of your income!`);
  }

  if (salary > 0 && (wants / salary) > 0.35) {
    insights.push(`💸 High Wants: 'Wants' (Fun, Shopping) take ${Math.round((wants/salary)*100)}% of income. Aim for <30%.`);
  }

  if (salary > 0 && (needs / salary) > 0.70) {
    insights.push(`🏠 High Fixed Costs: Needs take ${Math.round((needs/salary)*100)}% of income. Rent/Transport might be too high.`);
  }

  return {
    income: salary,
    totalExpenses,
    needs,
    wants,
    savingsPotential: recommendedSavings,
    actualSavings,
    healthScore: score,
    status,
    insights
  };
};