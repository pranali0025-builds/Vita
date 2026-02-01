import React, { useState, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, ScrollView, RefreshControl
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  addExpense, getExpensesByMonth, deleteExpense, 
  addSubscription, getActiveSubscriptions, deleteSubscription,
  setMonthlySalary, getMonthlySalary, getCategoryStats,
  getFinancialReport, 
  Expense, Subscription, CategoryStat, FinancialReport 
} from '../../services/database';

const CATEGORIES = ['Food', 'Rent', 'Transport', 'Fun', 'Other'];
const PAYMENT_TYPES = ['UPI', 'Cash', 'Card'];

export default function TrackerScreen() {
  const [viewMode, setViewMode] = useState<'expenses' | 'subscriptions'>('expenses');
  const [loading, setLoading] = useState(false);

  // Data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(30); // Default to a safe number
  
  // Money Summary
  const [salary, setSalary] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [subTotal, setSubTotal] = useState(0);

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [salaryModalVisible, setSalaryModalVisible] = useState(false);

  // Inputs
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [selectedPayment, setSelectedPayment] = useState('UPI');

  // Sub Inputs
  const [subName, setSubName] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subCycle, setSubCycle] = useState('Monthly');
  const [salaryInput, setSalaryInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // "YYYY-MM"

      // --- DATE LOGIC FOR INSIGHTS ---
      // Get the last day of the current month
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const totalDaysInMonth = lastDay.getDate();
      const currentDay = now.getDate();
      const remaining = totalDaysInMonth - currentDay;
      setDaysRemaining(remaining);

      // --- FETCH CORE DATA ---
      const expData = await getExpensesByMonth(currentMonth);
      const catStats = await getCategoryStats(currentMonth);
      setExpenses(expData);
      setCategoryStats(catStats);

      const subData = await getActiveSubscriptions();
      setSubscriptions(subData);

      const sal = await getMonthlySalary();
      setSalary(sal);

      // --- CONDITIONAL REPORT FETCH ---
      // Only fetch report if we are in the last week (<= 7 days remaining)
      if (remaining <= 7) {
        const rep = await getFinancialReport(currentMonth);
        setReport(rep);
      } else {
        setReport(null); // Hide report if it's too early
      }

      const spent = expData.reduce((sum, item) => sum + item.amount, 0);
      const subCost = subData.reduce((sum, item) => sum + item.amount, 0);
      
      setTotalSpent(spent);
      setSubTotal(subCost);

    } catch (e) {
      console.error("Failed to load tracker data", e);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---

  const handleAddExpense = async () => {
    const val = parseFloat(amountInput);
    if (!amountInput || isNaN(val) || val <= 0) {
      return Alert.alert("Invalid Amount", "Please enter a valid number greater than 0.");
    }
    
    try {
      const today = new Date().toISOString().slice(0, 10);
      const safeNote = noteInput.trim() || selectedCategory; 
      const safePayment = selectedPayment || 'UPI';

      await addExpense(val, selectedCategory, today, safeNote, safePayment);
      
      setModalVisible(false);
      resetInputs();
      loadData();
    } catch (e) {
      Alert.alert("Error", "Could not save expense: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleAddSub = async () => {
    const val = parseFloat(subAmount);
    if (!subName || isNaN(val) || val <= 0) {
      return Alert.alert("Invalid Input", "Please enter a name and valid amount.");
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      await addSubscription(subName, val, subCycle, today, 'Other');
      setSubModalVisible(false);
      resetInputs();
      loadData();
    } catch (e) {
      Alert.alert("Error", "Could not save sub: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleDeleteExpense = async (id: number) => {
    Alert.alert("Delete?", "Remove this expense?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
        await deleteExpense(id);
        loadData();
      }}
    ]);
  };

  const handleDeleteSub = async (id: number) => {
    Alert.alert("Cancel Subscription?", "Stop tracking this?", [
      { text: "No", style: "cancel" },
      { text: "Yes", style: 'destructive', onPress: async () => {
        await deleteSubscription(id);
        loadData();
      }}
    ]);
  };

  const handleSaveSalary = async () => {
    const val = parseFloat(salaryInput);
    if (!isNaN(val) && val > 0) {
      await setMonthlySalary(val);
      setSalary(val);
      setSalaryModalVisible(false);
    } else {
      Alert.alert("Invalid", "Please enter a valid salary.");
    }
  };

  const resetInputs = () => {
    setAmountInput(''); setNoteInput(''); setSubName(''); setSubAmount('');
  };

  // --- CHART DATA ---
  const pieData = categoryStats.map(c => ({
    value: c.total,
    color: getCategoryColor(c.category),
    text: `${Math.round(c.percentage)}%`
  }));

  function getCategoryColor(cat: string) {
    switch(cat) {
      case 'Food': return '#FF6384';
      case 'Rent': return '#36A2EB';
      case 'Transport': return '#FFCE56';
      case 'Fun': return '#4BC0C0';
      default: return '#9966FF';
    }
  }

  // --- RENDERERS ---

  const renderExpense = ({ item }: { item: Expense }) => (
    <TouchableOpacity onLongPress={() => handleDeleteExpense(item.id)} style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.catDot, { backgroundColor: getCategoryColor(item.category) }]} />
        <View>
          <Text style={styles.cardTitle}>{item.note || item.category}</Text>
          <Text style={styles.cardSub}>{item.date} • {item.payment_type}</Text>
        </View>
      </View>
      <Text style={styles.cardAmount}>- ₹{item.amount}</Text>
    </TouchableOpacity>
  );

  const renderSub = ({ item }: { item: Subscription }) => (
    <TouchableOpacity onLongPress={() => handleDeleteSub(item.id)} style={styles.card}>
      <View style={styles.cardLeft}>
        <Ionicons name="repeat" size={24} color="#2f95dc" style={{marginRight: 10}} />
        <View>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSub}>{item.billing_cycle} • Next: {item.next_billing_date}</Text>
        </View>
      </View>
      <Text style={styles.cardAmount}>₹{item.amount}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.monthTitle}>Current Month</Text>
          <TouchableOpacity onPress={() => setSalaryModalVisible(true)}>
             <Ionicons name="pencil" size={16} color="#aaa" />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <TouchableOpacity onPress={() => setSalaryModalVisible(true)} style={styles.statItem}>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={styles.statValueGreen}>₹{salary}</Text>
          </TouchableOpacity>
          <View style={styles.statLine} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={styles.statValueRed}>₹{totalSpent}</Text>
          </View>
          <View style={styles.statLine} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Balance</Text>
            <Text style={styles.statValue}>₹{salary - totalSpent}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, viewMode === 'expenses' && styles.activeTab]} 
          onPress={() => setViewMode('expenses')}
        >
          <Text style={[styles.tabText, viewMode === 'expenses' && styles.activeTabText]}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, viewMode === 'subscriptions' && styles.activeTab]} 
          onPress={() => setViewMode('subscriptions')}
        >
          <Text style={[styles.tabText, viewMode === 'subscriptions' && styles.activeTabText]}>Subscriptions</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'expenses' ? (
        <>
          {/* --- REPORT SECTION --- */}
          {report ? (
            <View style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Ionicons name="analytics" size={18} color="#555" />
                <Text style={styles.reportTitle}>Monthly Insight</Text>
              </View>
              <Text style={styles.reportSummary}>{report.summary}</Text>
              
              {report.insights.length > 0 && (
                <View style={styles.insightBox}>
                  {report.insights.map((insight, index) => (
                    <View key={index} style={styles.insightRow}>
                      <Ionicons name="bulb" size={16} color="#f39c12" style={{marginRight: 8, marginTop: 2}} />
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            // --- LOCKED STATE ---
            <View style={styles.lockedCard}>
              <Ionicons name="lock-closed-outline" size={24} color="#999" />
              <View style={{flex: 1, marginLeft: 15}}>
                 <Text style={styles.lockedTitle}>Insights Generating...</Text>
                 <Text style={styles.lockedText}>
                   Analysis unlocks in {daysRemaining} days (End of Month).
                 </Text>
              </View>
            </View>
          )}

          {pieData.length > 0 && (
            <View style={styles.chartContainer}>
              <PieChart 
                data={pieData} 
                donut 
                radius={80} 
                innerRadius={60} 
                showText 
                textSize={10} 
                textColor="black"
                isAnimated
              />
              <View style={styles.legend}>
                {categoryStats.slice(0, 3).map(c => (
                  <View key={c.category} style={styles.legendItem}>
                    <View style={[styles.catDot, { backgroundColor: getCategoryColor(c.category) }]} />
                    <Text style={{fontSize: 12, color: '#555'}}>
                      {c.category}: {Math.round(c.percentage)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <FlatList 
            data={expenses} 
            renderItem={renderExpense} 
            keyExtractor={i => i.id.toString()} 
            contentContainerStyle={{paddingBottom: 100}}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            ListEmptyComponent={<Text style={styles.emptyText}>No expenses yet. Tap + to add.</Text>}
          />

          <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.subHeaderBox}>
            <Text style={styles.subHeaderTitle}>Recurring Cost: ₹{subTotal}/mo</Text>
            <Text style={styles.subHeaderDesc}>Tap & hold a subscription to remove it.</Text>
          </View>
          <FlatList 
            data={subscriptions} 
            renderItem={renderSub} 
            keyExtractor={i => i.id.toString()} 
            contentContainerStyle={{paddingBottom: 100}}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            ListEmptyComponent={<Text style={styles.emptyText}>No active subscriptions.</Text>}
          />
          <TouchableOpacity style={styles.fab} onPress={() => setSubModalVisible(true)}>
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* MODALS - Unchanged */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Expense</Text>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.catChip, selectedCategory === c && styles.catChipActive]} onPress={() => setSelectedCategory(c)}>
                  <Text style={[styles.catText, selectedCategory === c && styles.catTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.paymentRow}>
              {PAYMENT_TYPES.map(p => (
                 <TouchableOpacity key={p} style={[styles.payChip, selectedPayment === p && styles.catChipActive]} onPress={() => setSelectedPayment(p)}>
                 <Text style={[styles.catText, selectedPayment === p && styles.catTextActive]}>{p}</Text>
               </TouchableOpacity>
              ))}
            </View>
            <TextInput placeholder="Amount (₹)" keyboardType="numeric" style={styles.input} value={amountInput} onChangeText={setAmountInput} />
            <TextInput placeholder="Note (e.g. Starbucks)" style={styles.input} value={noteInput} onChangeText={setNoteInput} />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}><Text style={{color: 'red'}}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddExpense} style={styles.btnSave}><Text style={{color: '#fff', fontWeight: 'bold'}}>Save Expense</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={subModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Subscription</Text>
            <TextInput placeholder="Name (e.g. Netflix)" style={styles.input} value={subName} onChangeText={setSubName} />
            <TextInput placeholder="Amount (₹)" keyboardType="numeric" style={styles.input} value={subAmount} onChangeText={setSubAmount} />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => setSubModalVisible(false)} style={styles.btnCancel}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddSub} style={styles.btnSave}><Text style={{color:'#fff'}}>Save Sub</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={salaryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Monthly Income</Text>
            <Text style={styles.label}>Enter your monthly take-home salary:</Text>
            <TextInput placeholder="e.g. 50000" keyboardType="numeric" style={styles.input} value={salaryInput} onChangeText={setSalaryInput} />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => setSalaryModalVisible(false)} style={styles.btnCancel}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveSalary} style={styles.btnSave}><Text style={{color:'#fff'}}>Update Salary</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 50 },
  headerCard: { margin: 20, padding: 20, backgroundColor: '#fff', borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15, gap: 10 },
  monthTitle: { fontSize: 16, color: '#888', textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statLine: { width: 1, height: 30, backgroundColor: '#eee' },
  statLabel: { fontSize: 12, color: '#aaa', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statValueGreen: { fontSize: 18, fontWeight: 'bold', color: '#27ae60' },
  statValueRed: { fontSize: 18, fontWeight: 'bold', color: '#e74c3c' },
  
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, backgroundColor: '#e0e0e0', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  tabText: { color: '#777', fontWeight: '600' },
  activeTabText: { color: '#2f95dc' },

  // --- REPORT STYLES ---
  reportCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 15, padding: 15, borderRadius: 12, elevation: 1 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reportTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#333' },
  reportSummary: { fontSize: 14, color: '#555', lineHeight: 20 },
  insightBox: { marginTop: 10, padding: 10, backgroundColor: '#fff3cd', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#f39c12' },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  insightText: { fontSize: 13, color: '#856404', flex: 1 },

  // --- LOCKED STATE STYLES ---
  lockedCard: { backgroundColor: '#eee', marginHorizontal: 20, marginBottom: 15, padding: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  lockedTitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 4 },
  lockedText: { fontSize: 12, color: '#888' },

  chartContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginHorizontal: 20, padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  legend: { marginLeft: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },

  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10, padding: 15, borderRadius: 12, elevation: 1 },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: '500', color: '#333' },
  cardSub: { fontSize: 12, color: '#999', marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: 'bold', color: '#e74c3c' },

  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2f95dc', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#2f95dc', shadowOpacity: 0.3, shadowRadius: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#fafafa' },
  label: { fontSize: 12, color: '#888', marginBottom: 8, fontWeight: '600' },
  catScroll: { flexDirection: 'row', marginBottom: 15, height: 40 },
  paymentRow: { flexDirection: 'row', marginBottom: 15, gap: 10 },
  catChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10 },
  payChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', flex: 1, alignItems: 'center' },
  catChipActive: { backgroundColor: '#2f95dc' },
  catText: { fontSize: 12, color: '#555' },
  catTextActive: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginTop: 10 },
  btnCancel: { padding: 10 },
  btnSave: { backgroundColor: '#2f95dc', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },

  subHeaderBox: { marginHorizontal: 20, marginBottom: 10, padding: 15, backgroundColor: '#e3f2fd', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#2f95dc' },
  subHeaderTitle: { color: '#1565c0', fontWeight: 'bold', fontSize: 16 },
  subHeaderDesc: { color: '#5472d3', fontSize: 12, marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#aaa', marginTop: 30, fontStyle: 'italic' },
});