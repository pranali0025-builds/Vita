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

export interface LoadPoint {
  date: string;
  effort: number;
  label: string;
}

export interface StabilityMetrics {
  score: number;
  label: 'Excellent' | 'Good' | 'Fair' | 'Unstable';
  moneyScore: number;
  taskScore: number;
}

// --- DOCUMENT MODELS (Feature 4) ---
export interface Document {
  id: number;
  title: string;
  category: 'Identity' | 'Education' | 'Work' | 'Finance' | 'Other';
  uri: string; // Local file path
  expiry_date?: string; // YYYY-MM-DD
  is_important: number;
}

export interface PreparednessReport {
  score: number; // 0-100
  missingEssentials: string[]; // ["Aadhaar", "Resume"]
  expiredCount: number;
  expiringSoonCount: number;
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
    
    // NEW DOCUMENT TABLE
    await db.runAsync(`CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, category TEXT, uri TEXT, expiry_date TEXT, is_important INTEGER DEFAULT 0);`, []);

    // Migrations
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

export const addTask = async (title: string, priority: string, effort: number, category: string, date: string) => { const database = await getDB(); await database.runAsync(`INSERT INTO tasks (title, priority, estimated_effort, category, date, is_completed) VALUES (?, ?, ?, ?, ?, 0)`, [title, priority, effort, category, date]); };
export const getTasksByDate = async (date: string): Promise<Task[]> => { const database = await getDB(); return await database.getAllAsync<Task>(`SELECT * FROM tasks WHERE date = ? ORDER BY is_completed ASC, priority DESC`, [date]); };
export const toggleTaskCompletion = async (id: number, currentStatus: number) => { const database = await getDB(); const newStatus = currentStatus === 1 ? 0 : 1; await database.runAsync('UPDATE tasks SET is_completed = ? WHERE id = ?', [newStatus, id]); };
export const deleteTask = async (id: number) => { const database = await getDB(); await database.runAsync('DELETE FROM tasks WHERE id = ?', [id]); };
export const getDailyLoad = async (date: string): Promise<DailyLoad> => {
  const tasks = await getTasksByDate(date);
  const totalEffort = tasks.reduce((sum, t) => sum + t.estimated_effort, 0);
  const completedEffort = tasks.filter(t => t.is_completed === 1).reduce((sum, t) => sum + t.estimated_effort, 0);
  let loadLevel: 'Light' | 'Normal' | 'Heavy' = 'Light'; let statusMessage = "Smooth sailing.";
  if (totalEffort > 300) { loadLevel = 'Heavy'; statusMessage = "High Load! Watch your energy."; } else if (totalEffort > 120) { loadLevel = 'Normal'; statusMessage = "Balanced day."; }
  const completionRate = tasks.length > 0 ? (tasks.filter(t => t.is_completed).length / tasks.length) * 100 : 0;
  return { totalEffort, completedEffort, taskCount: tasks.length, loadLevel, completionRate, statusMessage };
};

// --- 5. DOCUMENT FUNCTIONS (Feature 4) ---

export const addDocument = async (title: string, category: string, uri: string, expiry: string | null) => {
  const database = await getDB();
  await database.runAsync(
    `INSERT INTO documents (title, category, uri, expiry_date, is_important) VALUES (?, ?, ?, ?, 0)`,
    [title, category, uri, expiry]
  );
};

export const getDocuments = async (): Promise<Document[]> => {
  const database = await getDB();
  return await database.getAllAsync<Document>(`SELECT * FROM documents ORDER BY category ASC`, []);
};

export const deleteDocument = async (id: number) => {
  const database = await getDB();
  await database.runAsync('DELETE FROM documents WHERE id = ?', [id]);
};

// AI HOOK: Preparedness Score
export const calculatePreparednessScore = async (): Promise<PreparednessReport> => {
  const docs = await getDocuments();
  const essentials = ['Identity', 'Finance', 'Education', 'Work'];
  const missing: string[] = [];
  
  // Check category coverage
  essentials.forEach(cat => {
    if (!docs.some(d => d.category === cat)) {
      missing.push(cat);
    }
  });

  // Calculate Score (Simple: Coverage %)
  const score = Math.round(((essentials.length - missing.length) / essentials.length) * 100);

  // Check Expiry
  const today = new Date().toISOString().slice(0, 10);
  let expiredCount = 0;
  let expiringSoonCount = 0;

  docs.forEach(d => {
    if (d.expiry_date) {
      if (d.expiry_date < today) expiredCount++;
      else {
        // Check if within 30 days
        const exp = new Date(d.expiry_date);
        const now = new Date();
        const diffTime = Math.abs(exp.getTime() - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays <= 30) expiringSoonCount++;
      }
    }
  });

  return { score, missingEssentials: missing, expiredCount, expiringSoonCount };
};

// --- 6. REPORTING ---

export const getLoadHistory = async (days: number = 7): Promise<LoadPoint[]> => {
  const history: LoadPoint[] = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const dateStr = d.toISOString().slice(0, 10);
    const load = await getDailyLoad(dateStr);
    history.push({ date: dateStr, label: i === 0 ? 'Today' : daysOfWeek[d.getDay()], effort: load.totalEffort });
  }
  return history;
};

export const getWeeklyTaskStats = async () => {
  const database = await getDB();
  let heavyDays = 0; let totalMinutes = 0; let daysWithData = 0; let totalCompletionSum = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i); const dateStr = d.toISOString().slice(0, 10);
    const tasks = await getTasksByDate(dateStr);
    if (tasks.length > 0) {
      daysWithData++;
      const effort = tasks.reduce((sum, t) => sum + t.estimated_effort, 0);
      totalMinutes += effort;
      if (effort > 300) heavyDays++;
      const completedCount = tasks.filter(t => t.is_completed).length;
      totalCompletionSum += (completedCount / tasks.length);
    }
  }
  const avgLoad = daysWithData > 0 ? Math.round(totalMinutes / daysWithData) : 0;
  const avgCompletionRate = daysWithData > 0 ? Math.round((totalCompletionSum / daysWithData) * 100) : 0;
  return { heavyDays, avgLoad, daysWithData, avgCompletionRate };
};

export const detectBurnoutLoop = async (): Promise<string[]> => {
  const stats = await getWeeklyTaskStats();
  const insights: string[] = [];
  if (stats.daysWithData >= 5) insights.push("✅ High Consistency: You tracked tasks for 5+ days this week.");
  if (stats.heavyDays >= 3) insights.push("🛑 Burnout Pattern: 3+ heavy load days this week.");
  if (stats.avgLoad > 240) insights.push("⚠️ High Average Load: Your baseline is > 4 hours/day.");
  if (stats.avgCompletionRate < 50 && stats.daysWithData > 2) insights.push("📉 Low Completion: You are planning more than you finish.");
  return insights;
};

export const detectSpendingInstability = async (): Promise<number> => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const stats = await getCategoryStats(currentMonth);
  const salary = await getMonthlySalary();
  if (!stats || stats.length === 0) return 0;
  const totalSpent = stats.reduce((acc, curr) => acc + curr.total, 0);
  let instability = 0;
  if (salary > 0 && totalSpent > salary) instability += 50; else if (salary > 0 && totalSpent > (salary * 0.9)) instability += 30;
  const topCat = stats[0]; if (topCat && topCat.percentage > 60) instability += 20;
  return Math.min(instability, 100);
};

export const calculateStabilityScore = async (): Promise<StabilityMetrics> => {
  const instability = await detectSpendingInstability();
  const moneyScore = Math.max(0, 100 - instability);
  const history = await getLoadHistory(7);
  let consistentDays = 0; let heavyDays = 0;
  history.forEach(day => { if (day.effort > 0) consistentDays++; if (day.effort > 300) heavyDays++; });
  let taskScore = 50;
  if (consistentDays >= 5) taskScore += 30; else if (consistentDays >= 3) taskScore += 10;
  if (heavyDays >= 3) taskScore -= 30;
  taskScore = Math.max(0, Math.min(100, taskScore));
  const totalScore = Math.round((moneyScore * 0.5) + (taskScore * 0.5));
  let label: StabilityMetrics['label'] = 'Good';
  if (totalScore >= 80) label = 'Excellent'; else if (totalScore < 50) label = 'Unstable'; else if (totalScore < 70) label = 'Fair';
  return { score: totalScore, label, moneyScore, taskScore };
};

// --- RESET ---
export const clearAllData = async () => { const database = await getDB(); await database.execAsync(`DELETE FROM expenses; DELETE FROM subscriptions; DELETE FROM user_profile; DELETE FROM tasks; DELETE FROM documents;`); };