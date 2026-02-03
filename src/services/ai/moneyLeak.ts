import { 
  getExpensesByMonth, 
  getMonthlySalary, 
  getCategoryStats, 
  getActiveSubscriptions,
  Expense,
  CategoryStat
} from '../database';

// --- DATA MODELS ---
export interface LeakReport {
  score: number; // 0-100 (Higher is worse)
  status: 'Stable' | 'Warning' | 'Critical';
  leaks: LeakItem[];
  actionableSuggestion: string;
}

export interface LeakItem {
  type: 'Overspend' | 'Micro' | 'Subscription' | 'Spike';
  title: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
  amount?: number;
}

// --- THRESHOLDS ---
const THRESHOLDS = {
  FOOD: 0.25, // 25%
  SHOPPING: 0.15,
  ENTERTAINMENT: 0.10,
  MICRO_LIMIT: 300, // Rs
  MICRO_FREQ: 8, // times per month
  SPIKE_PERCENT: 0.20 // 20%
};

/**
 * CORE AI FUNCTION: DETECT MONEY LEAKS
 * Aggregates data and runs 4 types of heuristic analysis.
 */
export const detectMoneyLeaks = async (currentMonth: string): Promise<LeakReport> => {
  // 1. FETCH DATA
  const salary = await getMonthlySalary();
  const expenses = await getExpensesByMonth(currentMonth);
  const categories = await getCategoryStats(currentMonth);
  const subscriptions = await getActiveSubscriptions();
  
  // Previous month data for comparison
  const prevDate = new Date(currentMonth + "-01");
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth = prevDate.toISOString().slice(0, 7);
  const prevExpenses = await getExpensesByMonth(prevMonth);

  const leaks: LeakItem[] = [];
  let leakScore = 0;

  // --- LEAK TYPE 1: CATEGORY OVERSPEND ---
  if (salary > 0) {
    categories.forEach(cat => {
      const ratio = cat.total / salary;
      let limit = 0.10; // Default
      
      if (cat.category === 'Food') limit = THRESHOLDS.FOOD;
      if (cat.category === 'Shopping' || cat.category === 'Fun') limit = THRESHOLDS.SHOPPING;
      
      if (ratio > limit) {
        leaks.push({
          type: 'Overspend',
          title: `High ${cat.category} Spend`,
          description: `You spent ${Math.round(ratio * 100)}% of income on ${cat.category} (Limit: ${limit * 100}%).`,
          severity: 'High',
          amount: cat.total
        });
        leakScore += 30;
      }
    });
  }

  // --- LEAK TYPE 2: RECURRING MICRO-EXPENSES ---
  // Group expenses < 300 by title (simple fuzzy match via title)
  const microGroups: Record<string, { count: number, total: number }> = {};
  
  expenses.forEach(e => {
    if (e.amount < THRESHOLDS.MICRO_LIMIT) {
      const key = e.note ? e.note.trim().toLowerCase() : e.category; // Use note if available, else category
      if (!microGroups[key]) microGroups[key] = { count: 0, total: 0 };
      microGroups[key].count++;
      microGroups[key].total += e.amount;
    }
  });

  Object.entries(microGroups).forEach(([key, val]) => {
    if (val.count >= THRESHOLDS.MICRO_FREQ) {
      leaks.push({
        type: 'Micro',
        title: 'Frequent Small Buys',
        description: `Small daily expenses on "${key}" added up to ₹${val.total}/mo.`,
        severity: 'Medium',
        amount: val.total
      });
      leakScore += 25;
    }
  });

  // --- LEAK TYPE 3: UNUSED SUBSCRIPTIONS ---
  // (Heuristic: Sub exists, but no "Fun" expenses detected if it's an entertainment sub?)
  // Better Heuristic for MVP: Just alert if Sub cost is > 5% of income
  const totalSubCost = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  if (salary > 0 && (totalSubCost / salary) > 0.05) {
    leaks.push({
      type: 'Subscription',
      title: 'Subscription Fatigue',
      description: `Recurring bills take ${Math.round((totalSubCost/salary)*100)}% of your income.`,
      severity: 'Medium',
      amount: totalSubCost
    });
    leakScore += 20;
  }

  // --- LEAK TYPE 4: MONTH-ON-MONTH SPIKE ---
  const currentTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const prevTotal = prevExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (prevTotal > 0) {
    const growth = (currentTotal - prevTotal) / prevTotal;
    if (growth > THRESHOLDS.SPIKE_PERCENT) {
      leaks.push({
        type: 'Spike',
        title: 'Spending Spike',
        description: `Expenses increased by ${Math.round(growth * 100)}% compared to last month.`,
        severity: 'High',
        amount: currentTotal - prevTotal
      });
      leakScore += 25;
    }
  }

  // --- SCORING & CLASSIFICATION ---
  leakScore = Math.min(leakScore, 100);
  
  let status: 'Stable' | 'Warning' | 'Critical' = 'Stable';
  if (leakScore > 60) status = 'Critical';
  else if (leakScore > 30) status = 'Warning';

  // --- ACTIONABLE SUGGESTION ---
  let suggestion = "Great job! Your spending is stable.";
  if (leaks.length > 0) {
    // Sort leaks by severity/amount to give the best advice
    const topLeak = leaks.sort((a, b) => (b.amount || 0) - (a.amount || 0))[0];
    
    if (topLeak.type === 'Overspend') suggestion = `Reducing ${topLeak.title.replace('High ', '')} can save you the most money right now.`;
    else if (topLeak.type === 'Micro') suggestion = `Try cutting out the daily small purchases to save ₹${topLeak.amount}.`;
    else if (topLeak.type === 'Subscription') suggestion = "Review your subscriptions and cancel one you don't use.";
    else if (topLeak.type === 'Spike') suggestion = "Check what caused the sudden spike this month.";
  }

  return {
    score: leakScore,
    status,
    leaks,
    actionableSuggestion: suggestion
  };
};