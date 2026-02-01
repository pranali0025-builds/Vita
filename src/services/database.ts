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

export interface FinancialReport {
  summary: string;
  status: 'Stable' | 'Warning' | 'Critical';
  insights: string[];
}

// --- TASK MODELS ---
export interface Task {
  id: number;
  title: string;
  is_completed: number;
  priority: 'Low' | 'Medium' | 'High';
  estimated_effort: number;
  category: 'Work' | 'Personal' | 'Admin';
  date: string;
}

export interface DailyLoad {
  totalEffort: number;
  completedEffort: number;
  taskCount: number;
  loadLevel: 'Light' | 'Normal' | 'Heavy';
  completionRate: number;
  statusMessage: string;
}

// --- 2. INITIALIZATION ---

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    if (db) return db;

    db = await SQLite.openDatabaseAsync('vita.db');
    await db.runAsync('PRAGMA journal_mode = WAL;', []);

    await db.runAsync(`CREATE TABLE IF NOT EXISTS user_profile (id INTEGER PRIMARY KEY NOT NULL, name TEXT, monthly_salary REAL DEFAULT 0, setup_completed INTEGER DEFAULT 0);`, []);
    await db.runAsync(`CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL NOT NULL, category TEXT NOT NULL, date TEXT NOT NULL, note TEXT, payment_type TEXT DEFAULT 'UPI');`, []);
    await db.runAsync(`CREATE TABLE IF NOT EXISTS subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, amount REAL NOT NULL, billing_cycle TEXT DEFAULT 'Monthly', next_billing_date TEXT, category TEXT, is_active INTEGER DEFAULT 1);`, []);
    await db.runAsync(`CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, is_completed INTEGER DEFAULT 0, type TEXT, date TEXT, priority TEXT DEFAULT 'Medium', estimated_effort INTEGER DEFAULT 30, category TEXT DEFAULT 'Work');`, []);
    await db.runAsync(`CREATE TABLE IF NOT EXISTS daily_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, energy_level INTEGER, date TEXT);`, []);

    try { await db.runAsync("ALTER TABLE expenses ADD COLUMN note TEXT;", []); } catch (e) {}
    try { await db.runAsync("ALTER TABLE expenses ADD COLUMN payment_type TEXT DEFAULT 'UPI';", []); } catch (e) {}
    try { await db.runAsync("ALTER TABLE user_profile ADD COLUMN monthly_salary REAL DEFAULT 0;", []); } catch (e) {}
    try { await db.runAsync("ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'Medium';", []); } catch (e) {}
    try { await db.runAsync("ALTER TABLE tasks ADD COLUMN estimated_effort INTEGER DEFAULT 30;", []); } catch (e) {}
    try { await db.runAsync("ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT 'Work';", []); } catch (e) {}

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

// --- 3. MONEY FUNCTIONS ---

export const addExpense = async (amount: number, category: string, date: string, note: string, paymentType: string) => { const database = await getDB(); await database.runAsync(`INSERT INTO expenses (amount, category, date, note, payment_type) VALUES (?, ?, ?, ?, ?)`, [amount, category, date, note, paymentType]); };
export const getExpensesByMonth = async (monthStr: string) => { const database = await getDB(); return await database.getAllAsync<Expense>(`SELECT * FROM expenses WHERE date LIKE ? ORDER BY date DESC`, [`${monthStr}%`]); };
export const deleteExpense = async (id: number) => { const database = await getDB(); await database.runAsync('DELETE FROM expenses WHERE id = ?', [id]); };
export const addSubscription = async (name: string, amount: number, billingCycle: string, nextDate: string, category: string) => { const database = await getDB(); await database.runAsync(`INSERT INTO subscriptions (name, amount, billing_cycle, next_billing_date, category, is_active) VALUES (?, ?, ?, ?, ?, 1)`, [name, amount, billingCycle, nextDate, category]); };
export const getActiveSubscriptions = async () => { const database = await getDB(); return await database.getAllAsync<Subscription>(`SELECT * FROM subscriptions WHERE is_active = 1 ORDER BY next_billing_date ASC`, []); };
export const deleteSubscription = async (id: number) => { const database = await getDB(); await database.runAsync('DELETE FROM subscriptions WHERE id = ?', [id]); };
export const setMonthlySalary = async (amount: number) => { const database = await getDB(); const existing = await database.getAllAsync('SELECT * FROM user_profile WHERE id = 1', []); if (existing.length > 0) { await database.runAsync('UPDATE user_profile SET monthly_salary = ? WHERE id = 1', [amount]); } else { await database.runAsync('INSERT INTO user_profile (id, monthly_salary) VALUES (1, ?)', [amount]); } };
export const getMonthlySalary = async () => { const database = await getDB(); const res = await database.getAllAsync<{ monthly_salary: number }>('SELECT monthly_salary FROM user_profile WHERE id = 1', []); return res.length > 0 ? res[0].monthly_salary : 0; };
export const getCategoryStats = async (monthStr: string): Promise<CategoryStat[]> => { const database = await getDB(); const results = await database.getAllAsync<{ category: string; total: number }>(`SELECT category, SUM(amount) as total FROM expenses WHERE date LIKE ? GROUP BY category ORDER BY total DESC`, [`${monthStr}%`]); const grandTotal = results.reduce((acc, curr) => acc + (curr.total || 0), 0); return results.map(r => ({ category: r.category, total: r.total || 0, percentage: grandTotal > 0 ? ((r.total || 0) / grandTotal) * 100 : 0 })); };
export const getFinancialReport = async (monthStr: string): Promise<FinancialReport> => {
  const categories = await getCategoryStats(monthStr); const salary = await getMonthlySalary(); const subs = await getActiveSubscriptions();
  const totalSpent = categories.reduce((sum, c) => sum + c.total, 0); const subTotal = subs.reduce((sum, s) => sum + s.amount, 0);
  let summary = "Start adding expenses."; if (categories.length > 0) { summary = `Top spend: ${categories[0].category} (₹${categories[0].total}).`; }
  const insights: string[] = []; let status: 'Stable' | 'Warning' | 'Critical' = 'Stable';
  if (salary > 0 && (subTotal / salary) > 0.15) { insights.push(`⚠️ Recurring bills take ${Math.round((subTotal/salary)*100)}% of income.`); status = 'Warning'; }
  if (salary > 0 && totalSpent > (salary * 0.85)) { insights.push(`🔥 High Spending (>85% of income).`); status = 'Critical'; }
  return { summary, status, insights };
};

// --- 4. TASK FUNCTIONS ---

export const addTask = async (title: string, priority: string, effort: number, category: string, date: string) => {
  const database = await getDB();
  await database.runAsync(
    `INSERT INTO tasks (title, priority, estimated_effort, category, date, is_completed) VALUES (?, ?, ?, ?, ?, 0)`,
    [title, priority, effort, category, date]
  );
};

export const getTasksByDate = async (date: string): Promise<Task[]> => {
  const database = await getDB();
  return await database.getAllAsync<Task>(
    `SELECT * FROM tasks WHERE date = ? ORDER BY is_completed ASC, priority DESC`,
    [date]
  );
};

export const toggleTaskCompletion = async (id: number, currentStatus: number) => {
  const database = await getDB();
  const newStatus = currentStatus === 1 ? 0 : 1;
  await database.runAsync('UPDATE tasks SET is_completed = ? WHERE id = ?', [newStatus, id]);
};

export const deleteTask = async (id: number) => {
  const database = await getDB();
  await database.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
};

// --- 5. DAILY LOAD LOGIC ---

export const getDailyLoad = async (date: string): Promise<DailyLoad> => {
  const tasks = await getTasksByDate(date);
  
  const totalEffort = tasks.reduce((sum, t) => sum + t.estimated_effort, 0);
  const completedEffort = tasks.filter(t => t.is_completed === 1).reduce((sum, t) => sum + t.estimated_effort, 0);
  
  // Logic: < 120 (Light), 120-300 (Normal), > 300 (Heavy)
  let loadLevel: 'Light' | 'Normal' | 'Heavy' = 'Light';
  let statusMessage = "Smooth sailing.";

  if (totalEffort > 300) { 
    loadLevel = 'Heavy';
    statusMessage = "High Load! Watch your energy.";
  } else if (totalEffort > 120) {
    loadLevel = 'Normal';
    statusMessage = "Balanced day.";
  }

  const completionRate = tasks.length > 0 ? (tasks.filter(t => t.is_completed).length / tasks.length) * 100 : 0;

  return { totalEffort, completedEffort, taskCount: tasks.length, loadLevel, completionRate, statusMessage };
};

// --- 6. ADVANCED AI & REPORTING (Weekly/Monthly) - CHECKLIST ITEM 5 & 6 ---

// Returns stats for the last 7 days
export const getWeeklyTaskStats = async () => {
  const database = await getDB();
  // Fetch tasks from last 7 days. Note: SQLite 'date' modifier usage depends on version, doing simple JS filter for robustness across Android versions.
  // Actually, for simplicity and robustness in this environment, we will fetch last 7 days individually.
  
  let heavyDays = 0;
  let totalMinutes = 0;
  let daysWithData = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    
    const tasks = await getTasksByDate(dateStr);
    if (tasks.length > 0) {
      daysWithData++;
      const effort = tasks.reduce((sum, t) => sum + t.estimated_effort, 0);
      totalMinutes += effort;
      if (effort > 300) heavyDays++;
    }
  }

  const avgLoad = daysWithData > 0 ? Math.round(totalMinutes / daysWithData) : 0;
  return { heavyDays, avgLoad, daysWithData };
};

// Detects long-term burnout patterns (AI Hook)
export const detectBurnoutLoop = async (): Promise<string[]> => {
  const stats = await getWeeklyTaskStats();
  const insights: string[] = [];

  // Rule 1: Consistency Score (Consistency is good, but Overload is bad)
  if (stats.daysWithData >= 5) {
    insights.push("✅ High Consistency: You tracked tasks for 5+ days this week.");
  }

  // Rule 2: Burnout Pattern (More than 3 heavy days in a week)
  if (stats.heavyDays >= 3) {
    insights.push("🛑 Burnout Pattern Detected: 3+ heavy load days this week. Schedule a light day.");
  }

  // Rule 3: Avg Load Check
  if (stats.avgLoad > 240) { // Avg > 4 hours planned daily
    insights.push("⚠️ High Average Load: Your baseline is very high.");
  }

  return insights;
};

// --- RESET ---
export const clearAllData = async () => {
  const database = await getDB();
  await database.execAsync(`DELETE FROM expenses; DELETE FROM subscriptions; DELETE FROM user_profile; DELETE FROM tasks;`);
};