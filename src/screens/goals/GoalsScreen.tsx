import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  addGoal, getGoals, updateGoalProgress, deleteGoal, detectGoalRisks, 
  Goal 
} from '../../services/database';
import { colors } from '../../theme/colors';
import { CATEGORIES } from '../../utils/constants';

const FILTER_CATS = ['All', ...CATEGORIES.GOAL];

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [risks, setRisks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES.GOAL[0]);
  const [targetDate, setTargetDate] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [newProgress, setNewProgress] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const g = await getGoals();
      const r = await detectGoalRisks();
      setGoals(g);
      setRisks(r);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAddGoal = async () => {
    if (!title || !targetDate) return Alert.alert("Missing Info", "Title and Target Date are required.");
    await addGoal(title, category, targetDate, '');
    setModalVisible(false);
    setTitle(''); setCategory(CATEGORIES.GOAL[0]); setTargetDate('');
    loadData();
  };

  const handleUpdateProgress = async () => {
    if (!selectedGoal) return;
    const prog = parseInt(newProgress);
    if (isNaN(prog) || prog < 0 || prog > 100) return Alert.alert("Invalid", "0-100 only.");
    await updateGoalProgress(selectedGoal.id, prog);
    setProgressModalVisible(false);
    loadData();
  };

  const handleDelete = async (id: number) => {
    Alert.alert("Delete", "Remove this goal?", [
      { text: "Cancel" }, { text: "Delete", style: 'destructive', onPress: async () => { await deleteGoal(id); loadData(); }}
    ]);
  };

  const renderGoal = ({ item }: { item: Goal }) => (
    <TouchableOpacity style={styles.card} onPress={() => { setSelectedGoal(item); setNewProgress(item.progress.toString()); setProgressModalVisible(true); }} onLongPress={() => handleDelete(item.id)}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
           <Text style={styles.cardTitle}>{item.title}</Text>
           {item.status === 'Completed' && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
        </View>
        <Text style={styles.cardCategory}>{item.category}</Text>
      </View>
      <Text style={styles.targetDate}>Target: {item.target_date}</Text>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${item.progress}%`, backgroundColor: item.progress === 100 ? colors.success : colors.primary }]} />
      </View>
      <View style={styles.progressTextRow}>
        <Text style={styles.progressText}>{item.progress}%</Text>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  const filteredGoals = activeFilter === 'All' ? goals : goals.filter(g => g.category === activeFilter);

  // --- EMPTY STATE ---
  const EmptyGoals = () => (
    <View style={styles.empty}>
      <Ionicons name="trophy-outline" size={48} color={colors.placeholder} />
      <Text style={styles.emptyText}>No goals yet.</Text>
      <Text style={styles.emptySub}>Set a target for Finance, Career, or Health.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Goals & Targets</Text>
      
      {risks.length > 0 && (
        <View style={styles.riskBox}>
          {risks.map((risk, index) => (
            <View key={index} style={styles.riskRow}>
              <Ionicons name="warning" size={16} color={colors.danger} />
              <Text style={styles.riskText}>{risk}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{height: 50, marginBottom: 10}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_CATS.map(cat => (
            <TouchableOpacity key={cat} style={[styles.filterChip, activeFilter === cat && styles.filterChipActive]} onPress={() => setActiveFilter(cat)}>
              <Text style={[styles.filterText, activeFilter === cat && styles.filterTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList 
        data={filteredGoals} 
        renderItem={renderGoal} 
        keyExtractor={i => i.id.toString()} 
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} 
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={EmptyGoals}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* ADD GOAL MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Goal</Text>
            <Text style={styles.label}>Goal Title</Text>
            <TextInput style={styles.input} placeholder="e.g. Save 1 Lakh" value={title} onChangeText={setTitle} />
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CATEGORIES.GOAL.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.label}>Target Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} placeholder="2024-12-31" value={targetDate} onChangeText={setTargetDate} />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}><Text style={{color: colors.danger}}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddGoal} style={styles.btnSave}><Text style={{color:'#fff', fontWeight: 'bold'}}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* UPDATE PROGRESS MODAL */}
      <Modal visible={progressModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>Update Progress</Text>
            <Text style={{marginBottom: 10, color: colors.subText}}>Enter new percentage (0-100):</Text>
            <TextInput style={[styles.input, {textAlign:'center', fontSize:24}]} placeholder="50" keyboardType="numeric" value={newProgress} onChangeText={setNewProgress} />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => setProgressModalVisible(false)} style={styles.btnCancel}><Text style={{color: colors.subText}}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateProgress} style={styles.btnSave}><Text style={{color:'#fff', fontWeight: 'bold'}}>Update</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 50 },
  header: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 15, color: colors.text },
  riskBox: { backgroundColor: '#fdedec', marginHorizontal: 20, marginBottom: 15, padding: 10, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: colors.danger },
  riskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  riskText: { color: colors.danger, marginLeft: 8, fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: colors.cardBg, padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  cardCategory: { fontSize: 12, color: colors.subText, backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  targetDate: { fontSize: 12, color: colors.placeholder, marginBottom: 10 },
  progressContainer: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 5 },
  progressBar: { height: '100%', borderRadius: 4 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 12, fontWeight: 'bold', color: colors.primary },
  statusText: { fontSize: 10, color: colors.subText },
  
  // Empty State
  empty: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: colors.placeholder, marginTop: 10 },
  emptySub: { fontSize: 14, color: colors.placeholder, marginTop: 5 },

  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: colors.cardBg, borderRadius: 16, padding: 25, elevation: 5 },
  modalContentSmall: { width: '70%', backgroundColor: colors.cardBg, borderRadius: 16, padding: 20, elevation: 5, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: colors.background, width: '100%' },
  label: { fontSize: 12, color: colors.subText, marginBottom: 8, fontWeight: '600', alignSelf: 'flex-start' },
  chipScroll: { flexDirection: 'row', marginBottom: 15, height: 40 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, marginRight: 10 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.subText },
  chipTextActive: { color: colors.white, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10, width: '100%' },
  btnCancel: { padding: 10, flex: 1, alignItems: 'center' },
  btnSave: { backgroundColor: colors.primary, padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  
  // Filters
  filterScroll: { paddingHorizontal: 20 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.cardBg, marginRight: 10, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, color: colors.subText },
  filterTextActive: { color: colors.white, fontWeight: 'bold' },
});