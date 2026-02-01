import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  addGoal, getGoals, updateGoalProgress, deleteGoal, detectGoalRisks, 
  Goal 
} from '../../services/database';

const CATEGORIES = ['Career', 'Personal', 'Health', 'Finance'];

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [risks, setRisks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Add Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Personal');
  const [targetDate, setTargetDate] = useState(''); // YYYY-MM-DD
  const [notes, setNotes] = useState('');

  // Update Progress Modal State
  const [progressModalVisible, setProgressModalVisible] = useState(false);
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async () => {
    if (!title || !targetDate) {
      return Alert.alert("Missing Info", "Title and Target Date (YYYY-MM-DD) are required.");
    }
    try {
      await addGoal(title, category, targetDate, notes);
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (e) {
      Alert.alert("Error", "Could not save goal.");
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedGoal) return;
    const prog = parseInt(newProgress);
    if (isNaN(prog) || prog < 0 || prog > 100) {
      return Alert.alert("Invalid", "Enter a number between 0 and 100.");
    }
    await updateGoalProgress(selectedGoal.id, prog);
    setProgressModalVisible(false);
    setSelectedGoal(null);
    setNewProgress('');
    loadData();
  };

  const handleDelete = async (id: number) => {
    Alert.alert("Delete Goal", "Remove this goal?", [
      { text: "Cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
        await deleteGoal(id);
        loadData();
      }}
    ]);
  };

  const openProgressModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setNewProgress(goal.progress.toString());
    setProgressModalVisible(true);
  };

  const resetForm = () => {
    setTitle(''); setCategory('Personal'); setTargetDate(''); setNotes('');
  };

  const renderGoal = ({ item }: { item: Goal }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => openProgressModal(item)}
      onLongPress={() => handleDelete(item.id)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
           <Text style={styles.cardTitle}>{item.title}</Text>
           {item.status === 'Completed' && <Ionicons name="checkmark-circle" size={18} color="#27ae60" />}
        </View>
        <Text style={styles.cardCategory}>{item.category}</Text>
      </View>
      
      <Text style={styles.targetDate}>Target: {item.target_date}</Text>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${item.progress}%`, backgroundColor: item.progress === 100 ? '#27ae60' : '#2f95dc' }]} />
      </View>
      <View style={styles.progressTextRow}>
        <Text style={styles.progressText}>{item.progress}%</Text>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Goals & Targets</Text>

      {/* RISKS ALERT */}
      {risks.length > 0 && (
        <View style={styles.riskBox}>
          {risks.map((risk, index) => (
            <View key={index} style={styles.riskRow}>
              <Ionicons name="warning" size={16} color="#c0392b" />
              <Text style={styles.riskText}>{risk}</Text>
            </View>
          ))}
        </View>
      )}

      <FlatList 
        data={goals}
        renderItem={renderGoal}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No goals set.</Text>
            <Text style={styles.emptySub}>Add a target to stay focused.</Text>
          </View>
        }
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
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Target Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} placeholder="2024-12-31" value={targetDate} onChangeText={setTargetDate} />

            <View style={styles.row}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}><Text style={{color: 'red'}}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddGoal} style={styles.btnSave}><Text style={{color:'#fff'}}>Set Goal</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* UPDATE PROGRESS MODAL */}
      <Modal visible={progressModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>Update Progress</Text>
            <Text style={{marginBottom: 10, color: '#666'}}>Enter new percentage (0-100):</Text>
            <TextInput 
              style={[styles.input, {textAlign: 'center', fontSize: 24}]} 
              placeholder="50" 
              keyboardType="numeric"
              value={newProgress} 
              onChangeText={setNewProgress} 
            />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => setProgressModalVisible(false)} style={styles.btnCancel}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateProgress} style={styles.btnSave}><Text style={{color:'#fff'}}>Update</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 50 },
  header: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 15 },

  riskBox: { backgroundColor: '#fdedec', marginHorizontal: 20, marginBottom: 15, padding: 10, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#c0392b' },
  riskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  riskText: { color: '#c0392b', marginLeft: 8, fontSize: 12, fontWeight: '600' },

  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardCategory: { fontSize: 12, color: '#888', backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  targetDate: { fontSize: 12, color: '#aaa', marginBottom: 10 },
  
  progressContainer: { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden', marginBottom: 5 },
  progressBar: { height: '100%', borderRadius: 4 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 12, fontWeight: 'bold', color: '#2f95dc' },
  statusText: { fontSize: 10, color: '#999' },

  empty: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#aaa', marginTop: 10 },
  emptySub: { fontSize: 14, color: '#ccc' },

  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2f95dc', justifyContent: 'center', alignItems: 'center', elevation: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 25, elevation: 5 },
  modalContentSmall: { width: '70%', backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 5, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#fafafa', width: '100%' },
  label: { fontSize: 12, color: '#888', marginBottom: 8, fontWeight: '600', alignSelf: 'flex-start' },
  chipScroll: { flexDirection: 'row', marginBottom: 15, height: 40 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10 },
  chipActive: { backgroundColor: '#2f95dc' },
  chipText: { fontSize: 12, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10, width: '100%' },
  btnCancel: { padding: 10, flex: 1, alignItems: 'center' },
  btnSave: { backgroundColor: '#2f95dc', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
});