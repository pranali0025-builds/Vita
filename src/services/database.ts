import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

// --- 1. DATA MODELS ---

export interface Expense {
  id: number;
  amount: number;
  category: string;
  date: string;
  note: string;
  payment_type: string;
}

export interface Subscription {
  id: number;
  name: string;
  amount: number;
  billing_cycle: 'Monthly' | 'Yearly';
  next_billing_date: string;
  category: string;
  is_active: number;
}

export interface CategoryStat {
  category: string;
  total: number;
  percentage: number;
}

// New Interface for Reports (Checklist Item #5)
export interface FinancialReport {
  summary: string; // "You spent most on Food..."
  status: 'Stable' | 'Warning' | 'Critical';
  insights: string[]; // List of AI detected patterns
}

// --- 2. INITIALIZATION ---

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    if (db) return db;

    db = await SQLite.openDatabaseAsync('vita.db');
    await db.runAsync('PRAGMA journal_mode = WAL;', []);

    // Create Tables
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT,
        monthly_salary REAL DEFAULT 0,
        setup_completed INTEGER DEFAULT 0
      );
    `, []);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        note TEXT,
        payment_type TEXT DEFAULT 'UPI'
      );
    `, []);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        billing_cycle TEXT DEFAULT 'Monthly',
        next_billing_date TEXT,
        category TEXT,
        is_active INTEGER DEFAULT 1
      );
    `, []);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        is_completed INTEGER DEFAULT 0,
        type TEXT,
        date TEXT
      );
    `, []);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS daily_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        energy_level INTEGER,
        date TEXT
      );
    `, []);

    // Migrations
    try { await db.runAsync("ALTER TABLE expenses ADD COLUMN note TEXT;", []); } catch (e) {}
    try { await db.runAsync("ALTER TABLE expenses ADD COLUMN payment_type TEXT DEFAULT 'UPI';", []); } catch (e) {}
    try { await db.runAsync("ALTER TABLE user_profile ADD COLUMN monthly_salary REAL DEFAULT 0;", []); } catch (e) {}

    console.log("Database initialized & Migrated");
    return db;
  } catch (error) {
    console.error("DB Init Error:", error);
    throw error;
  }
};

const getDB = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  return await initDatabase();
};

// --- 3. BASIC CRUD (Expenses & Subs) ---

export const addExpense = async (amount: number, category: string, date: string, note: string, paymentType: string) => {
  const database = await getDB();
  await database.runAsync(
    `INSERT INTO expenses (amount, category, date, note, payment_type) VALUES (?, ?, ?, ?, ?)`,
    [amount, category, date, note, paymentType]
  );
};

export const getExpensesByMonth = async (monthStr: string) => {
  const database = await getDB();
  return await database.getAllAsync<Expense>(
    `SELECT * FROM expenses WHERE date LIKE ? ORDER BY date DESC`,
    [`${monthStr}%`]
  );
};

export const deleteExpense = async (id: number) => {
  const database = await getDB();
  await database.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
};

export const addSubscription = async (name: string, amount: number, billingCycle: string, nextDate: string, category: string) => {
  const database = await getDB();
  await database.runAsync(
    `INSERT INTO subscriptions (name, amount, billing_cycle, next_billing_date, category, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
    [name, amount, billingCycle, nextDate, category]
  );
};

export const getActiveSubscriptions = async () => {
  const database = await getDB();
  return await database.getAllAsync<Subscription>(
    `SELECT * FROM subscriptions WHERE is_active = 1 ORDER BY next_billing_date ASC`,
    []
  );
};

export const deleteSubscription = async (id: number) => {
  const database = await getDB();
  await database.runAsync('DELETE FROM subscriptions WHERE id = ?', [id]);
};

export const setMonthlySalary = async (amount: number) => {
  const database = await getDB();
  const existing = await database.getAllAsync('SELECT * FROM user_profile WHERE id = 1', []);
  if (existing.length > 0) {
    await database.runAsync('UPDATE user_profile SET monthly_salary = ? WHERE id = 1', [amount]);
  } else {
    await database.runAsync('INSERT INTO user_profile (id, monthly_salary) VALUES (1, ?)', [amount]);
  }
};

export const getMonthlySalary = async () => {
  const database = await getDB();
  const res = await database.getAllAsync<{ monthly_salary: number }>('SELECT monthly_salary FROM user_profile WHERE id = 1', []);
  return res.length > 0 ? res[0].monthly_salary : 0;
};

// --- 4. ADVANCED REPORTING & AI LOGIC (Checklist #5 & #6) ---

export const getCategoryStats = async (monthStr: string): Promise<CategoryStat[]> => {
  const database = await getDB();
  const results = await database.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount) as total FROM expenses WHERE date LIKE ? GROUP BY category ORDER BY total DESC`,
    [`${monthStr}%`]
  );
  const grandTotal = results.reduce((acc, curr) => acc + (curr.total || 0), 0);
  return results.map(r => ({
    category: r.category,
    total: r.total || 0,
    percentage: grandTotal > 0 ? ((r.total || 0) / grandTotal) * 100 : 0
  }));
};

/**
 * AI-READY HOOK: Generates the monthly report and insights
 */
export const getFinancialReport = async (monthStr: string): Promise<FinancialReport> => {
  const categories = await getCategoryStats(monthStr);
  const salary = await getMonthlySalary();
  const subs = await getActiveSubscriptions();
  
  // Calculate Totals
  const totalSpent = categories.reduce((sum, c) => sum + c.total, 0);
  const subTotal = subs.reduce((sum, s) => sum + s.amount, 0);
  
  // 1. GENERATE SUMMARY (Checklist Item #5)
  let summary = "Start adding expenses to see your spending patterns.";
  if (categories.length > 0) {
    const top = categories[0];
    summary = `You spent most on ${top.category} (₹${top.total}) this month, which is ${Math.round(top.percentage)}% of your total spending.`;
  }

  // 2. DETECT INSIGHTS (Checklist Item #6 - AI Hooks)
  const insights: string[] = [];
  let status: 'Stable' | 'Warning' | 'Critical' = 'Stable';

  // Hook A: Subscription Overload (Simple Rule: > 15% of income)
  if (salary > 0 && (subTotal / salary) > 0.15) {
    insights.push(`⚠️ Subscription Overload: Recurring bills take ${Math.round((subTotal/salary)*100)}% of your income.`);
    status = 'Warning';
  }

  // Hook B: High Spending Alert (Simple Rule: > 85% of income)
  if (salary > 0 && totalSpent > (salary * 0.85)) {
    insights.push(`🔥 High Spending: You have used over 85% of your salary.`);
    status = 'Critical';
  }

  // Hook C: Unused Subscription (Simple Heuristic: If sub exists but no "Fun" spending)
  const funSpending = categories.find(c => c.category === 'Fun')?.total || 0;
  if (subs.length > 0 && funSpending === 0) {
    insights.push(`💡 Usage Check: You have active subscriptions but logged 0 'Fun' expenses. Are you using them?`);
  }

  return { summary, status, insights };
};

// --- RESET ---
export const clearAllData = async () => {
  const database = await getDB();
  await database.execAsync(`DELETE FROM expenses; DELETE FROM subscriptions; DELETE FROM user_profile;`);
};