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
  getFinancialReport, Expense, Subscription, CategoryStat, FinancialReport 
} from '../../services/database';
import { colors } from '../../theme/colors';
import { CONFIG, CATEGORIES, PAYMENT_TYPES } from '../../utils/constants';

export default function TrackerScreen() {
  const [viewMode, setViewMode] = useState<'expenses' | 'subscriptions'>('expenses');
  const [loading, setLoading] = useState(false);

  // Data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [report, setReport] = useState<FinancialReport | null>(null);
  
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
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES.EXPENSE[0]);
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_TYPES[0]);

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
      const currentMonth = new Date().toISOString().slice(0, 7);

      const expData = await getExpensesByMonth(currentMonth);
      const catStats = await getCategoryStats(currentMonth);
      setExpenses(expData);
      setCategoryStats(catStats);

      const subData = await getActiveSubscriptions();
      setSubscriptions(subData);

      const sal = await getMonthlySalary();
      setSalary(sal);

      const rep = await getFinancialReport(currentMonth);
      setReport(rep);

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
      setAmountInput(''); setNoteInput('');
      loadData();
    } catch (e) {
      Alert.alert("Error", "Could not save expense.");
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
      setSubName(''); setSubAmount('');
      loadData();
    } catch (e) {
      Alert.alert("Error", "Could not save sub.");
    }
  };

  const handleDeleteExpense = async (id: number) => {
    Alert.alert("Delete?", "Remove this expense?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => { await deleteExpense(id); loadData(); }}
    ]);
  };

  const handleDeleteSub = async (id: number) => {
    Alert.alert("Cancel Subscription?", "Stop tracking this?", [
      { text: "No", style: "cancel" },
      { text: "Yes", style: 'destructive', onPress: async () => { await deleteSubscription(id); loadData(); }}
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

  const renderExpense = ({ item }: { item: Expense }) => (
    <TouchableOpacity onLongPress={() => handleDeleteExpense(item.id)} style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.catDot, { backgroundColor: getCategoryColor(item.category) }]} />
        <View>
          <Text style={styles.cardTitle}>{item.note || item.category}</Text>
          <Text style={styles.cardSub}>{item.date} • {item.payment_type}</Text>
        </View>
      </View>
      <Text style={styles.cardAmount}>- {CONFIG.CURRENCY_SYMBOL}{item.amount}</Text>
    </TouchableOpacity>
  );

  const renderSub = ({ item }: { item: Subscription }) => (
    <TouchableOpacity onLongPress={() => handleDeleteSub(item.id)} style={styles.card}>
      <View style={styles.cardLeft}>
        <Ionicons name="repeat" size={24} color={colors.primary} style={{marginRight: 10}} />
        <View>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSub}>{item.billing_cycle} • Next: {item.next_billing_date}</Text>
        </View>
      </View>
      <Text style={styles.cardAmount}>{CONFIG.CURRENCY_SYMBOL}{item.amount}</Text>
    </TouchableOpacity>
  );

  function getCategoryColor(cat: string) {
    switch(cat) {
      case 'Food': return colors.chart.food;
      case 'Rent': return colors.chart.rent;
      case 'Transport': return colors.chart.transport;
      case 'Fun': return colors.chart.fun;
      default: return colors.chart.other;
    }
  }

  // --- EMPTY STATES ---
  const EmptyExpenses = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={48} color={colors.placeholder} />
      <Text style={styles.emptyText}>No expenses yet.</Text>
      <Text style={styles.emptySub}>Tap '+' to track where your money goes.</Text>
    </View>
  );

  const EmptySubs = () => (
    <View style={styles.emptyState}>
      <Ionicons name="sync-outline" size={48} color={colors.placeholder} />
      <Text style={styles.emptyText}>No subscriptions.</Text>
      <Text style={styles.emptySub}>Add Netflix, Gym, or Rent here.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.monthTitle}>Current Month</Text>
          <TouchableOpacity onPress={() => setSalaryModalVisible(true)}>
             <Ionicons name="pencil" size={16} color={colors.placeholder} />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <TouchableOpacity onPress={() => setSalaryModalVisible(true)} style={styles.statItem}>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{CONFIG.CURRENCY_SYMBOL}{salary}</Text>
          </TouchableOpacity>
          <View style={styles.statLine} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={[styles.statValue, { color: colors.danger }]}>{CONFIG.CURRENCY_SYMBOL}{totalSpent}</Text>
          </View>
          <View style={styles.statLine} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Balance</Text>
            <Text style={styles.statValue}>{CONFIG.CURRENCY_SYMBOL}{salary - totalSpent}</Text>
          </View>
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, viewMode === 'expenses' && styles.activeTab]} onPress={() => setViewMode('expenses')}>
          <Text style={[styles.tabText, viewMode === 'expenses' && styles.activeTabText]}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, viewMode === 'subscriptions' && styles.activeTab]} onPress={() => setViewMode('subscriptions')}>
          <Text style={[styles.tabText, viewMode === 'subscriptions' && styles.activeTabText]}>Subscriptions</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'expenses' ? (
        <>
          {report && report.summary !== "Start adding expenses." && (
             <View style={styles.insightBox}>
                <Ionicons name="information-circle" size={16} color={colors.primary} style={{marginRight:5}} />
                <Text style={styles.insightText}>{report.summary}</Text>
             </View>
          )}
          <FlatList 
            data={expenses} 
            renderItem={renderExpense} 
            keyExtractor={i => i.id.toString()} 
            contentContainerStyle={{paddingBottom: 100}}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            ListEmptyComponent={EmptyExpenses}
          />
          <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.subHeaderBox}>
            <Text style={styles.subHeaderTitle}>Recurring Cost: {CONFIG.CURRENCY_SYMBOL}{subTotal}/mo</Text>
            <Text style={styles.subHeaderDesc}>Tap & hold to remove.</Text>
          </View>
          <FlatList 
            data={subscriptions} 
            renderItem={renderSub} 
            keyExtractor={i => i.id.toString()} 
            contentContainerStyle={{paddingBottom: 100}}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            ListEmptyComponent={EmptySubs}
          />
          <TouchableOpacity style={styles.fab} onPress={() => setSubModalVisible(true)}>
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* MODALS */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Expense</Text>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {CATEGORIES.EXPENSE.map(c => (
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
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}><Text style={{color: colors.danger}}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddExpense} style={styles.btnSave}><Text style={{color: colors.white, fontWeight: 'bold'}}>Save</Text></TouchableOpacity>
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
              <TouchableOpacity onPress={handleAddSub} style={styles.btnSave}><Text style={{color: colors.white}}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={salaryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Monthly Income</Text>
            <TextInput placeholder="e.g. 50000" keyboardType="numeric" style={styles.input} value={salaryInput} onChangeText={setSalaryInput} />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => setSalaryModalVisible(false)} style={styles.btnCancel}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveSalary} style={styles.btnSave}><Text style={{color: colors.white}}>Update</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 50 },
  headerCard: { margin: 20, padding: 20, backgroundColor: colors.cardBg, borderRadius: 16, elevation: 4 },
  headerTop: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15, gap: 10 },
  monthTitle: { fontSize: 16, color: colors.subText, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statLine: { width: 1, height: 30, backgroundColor: colors.border },
  statLabel: { fontSize: 12, color: colors.subText, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, backgroundColor: '#e0e0e0', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: colors.cardBg, elevation: 2 },
  tabText: { color: colors.subText, fontWeight: '600' },
  activeTabText: { color: colors.primary },

  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.cardBg, marginHorizontal: 20, marginBottom: 10, padding: 15, borderRadius: 12, elevation: 1 },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: '500', color: colors.text },
  cardSub: { fontSize: 12, color: colors.subText, marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: 'bold', color: colors.danger },

  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: colors.cardBg, borderRadius: 16, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: colors.background },
  label: { fontSize: 12, color: colors.subText, marginBottom: 8, fontWeight: '600' },
  catScroll: { flexDirection: 'row', marginBottom: 15, height: 40 },
  paymentRow: { flexDirection: 'row', marginBottom: 15, gap: 10 },
  catChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, marginRight: 10 },
  payChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, flex: 1, alignItems: 'center' },
  catChipActive: { backgroundColor: colors.primary },
  catText: { fontSize: 12, color: colors.subText },
  catTextActive: { color: colors.white, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginTop: 10 },
  btnCancel: { padding: 10 },
  btnSave: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },

  subHeaderBox: { marginHorizontal: 20, marginBottom: 10, padding: 15, backgroundColor: '#e3f2fd', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: colors.primary },
  subHeaderTitle: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  subHeaderDesc: { color: colors.primary, fontSize: 12, marginTop: 4 },
  
  insightBox: { backgroundColor: '#e3f2fd', marginHorizontal: 20, marginBottom: 15, padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  insightText: { fontSize: 12, color: colors.primary, flex: 1 },

  // EMPTY STATES
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: colors.placeholder, marginTop: 10 },
  emptySub: { fontSize: 12, color: colors.placeholder, marginTop: 5 },
});