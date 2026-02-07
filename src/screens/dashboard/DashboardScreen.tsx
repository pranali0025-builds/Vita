import React, { useState, useCallback, useContext } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, ScrollView, RefreshControl, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  addTask, getTasksByDate, toggleTaskCompletion, deleteTask, getDailyLoad, 
  Task, DailyLoad 
} from '../../services/database';
import { AuthContext } from '../../context/AuthContext'; 
// IMPORT SETTINGS MODAL
import { SettingsModal } from '../settings/SettingsModal';

const PRIORITIES = ['Low', 'Medium', 'High'];
const EFFORTS = [15, 30, 45, 60, 90, 120]; 
const CATEGORIES = ['Work', 'Personal', 'Admin'];

export default function DashboardScreen() {
  const { signOut } = useContext(AuthContext); 
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadStats, setLoadStats] = useState<DailyLoad | null>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false); // <--- NEW

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [effort, setEffort] = useState(30);
  const [category, setCategory] = useState('Work');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const t = await getTasksByDate(date);
      const l = await getDailyLoad(date);
      setTasks(t);
      setLoadStats(l);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAddTask = async () => {
    if (!title.trim()) return Alert.alert("Required", "Please enter a task title.");
    try {
      await addTask(title, priority, effort, category, date);
      setModalVisible(false);
      setTitle(''); setPriority('Medium'); setEffort(30); setCategory('Work');
      loadData();
    } catch (e) {
      Alert.alert("Error", "Could not add task.");
    }
  };

  const handleToggle = async (task: Task) => {
    await toggleTaskCompletion(task.id, task.is_completed);
    loadData();
  };

  const handleDelete = async (id: number) => {
    Alert.alert("Delete Task", "Remove this task?", [
      { text: "Cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
        await deleteTask(id);
        loadData();
      }}
    ]);
  };

  const getLoadColor = (level: string) => {
    switch(level) {
      case 'Light': return '#27ae60';
      case 'Normal': return '#f39c12';
      case 'Heavy': return '#c0392b';
      default: return '#2f95dc';
    }
  };

  const renderTaskItem = (item: Task) => (
    <TouchableOpacity 
      key={item.id}
      style={[styles.taskCard, item.is_completed ? styles.taskCompleted : null]} 
      onLongPress={() => handleDelete(item.id)}
      onPress={() => handleToggle(item)}
    >
      <View style={styles.checkbox}>
        {item.is_completed === 1 && <Ionicons name="checkmark" size={18} color="#fff" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskTitle, item.is_completed ? styles.textStrike : null]}>{item.title}</Text>
        <View style={styles.taskMetaRow}>
          <View style={[styles.badge, { backgroundColor: '#eef2f5' }]}>
            <Text style={styles.badgeText}>{item.estimated_effort}m</Text>
          </View>
          {item.priority === 'High' && (
             <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
             <Text style={[styles.badgeText, { color: '#ef4444' }]}>High</Text>
           </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const workTasks = tasks.filter(t => t.category === 'Work');
  const personalTasks = tasks.filter(t => t.category === 'Personal');
  const adminTasks = tasks.filter(t => t.category === 'Admin');

  return (
    <View style={styles.container}>
      {/* HEADER WITH SETTINGS */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.dateText}>Today's Load</Text>
        </View>
        <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.logoutBtn}>
          <Ionicons name="settings-outline" size={24} color="#555" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}>
        {/* LOAD INDICATOR */}
        <View style={{paddingHorizontal: 20}}>
          {loadStats && (
            <View style={styles.loadContainer}>
              <View style={[styles.loadBar, { backgroundColor: getLoadColor(loadStats.loadLevel), width: `${Math.min((loadStats.totalEffort / 300) * 100, 100)}%` }]} />
              <Text style={styles.loadText}>
                {loadStats.loadLevel} • {loadStats.totalEffort} min planned
              </Text>
              <Text style={styles.statusMsg}>{loadStats.statusMessage}</Text>
            </View>
          )}
        </View>

        {/* TASK SECTIONS */}
        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No tasks yet.</Text>
            <Text style={styles.emptySub}>Add tasks to see your daily load.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {workTasks.length > 0 && <View style={styles.section}><Text style={styles.sectionHeader}>💼 Work</Text>{workTasks.map(renderTaskItem)}</View>}
            {personalTasks.length > 0 && <View style={styles.section}><Text style={styles.sectionHeader}>🧘 Personal</Text>{personalTasks.map(renderTaskItem)}</View>}
            {adminTasks.length > 0 && <View style={styles.section}><Text style={styles.sectionHeader}>📄 Admin</Text>{adminTasks.map(renderTaskItem)}</View>}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* ADD MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Task</Text>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} placeholder="e.g. Finish Report" value={title} onChangeText={setTitle} />
            <Text style={styles.label}>Effort (Minutes)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {EFFORTS.map(m => (
                <TouchableOpacity key={m} style={[styles.chip, effort === m && styles.chipActive]} onPress={() => setEffort(m)}>
                  <Text style={[styles.chipText, effort === m && styles.chipTextActive]}>{m}m</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.row}>
              {PRIORITIES.map(p => (
                <TouchableOpacity key={p} style={[styles.chip, priority === p && styles.chipActive, { flex: 1, alignItems: 'center' }]} onPress={() => setPriority(p)}>
                  <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Category</Text>
            <View style={styles.row}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive, { flex: 1, alignItems: 'center' }]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.row, { marginTop: 20 }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}><Text style={{ color: 'red' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddTask} style={styles.btnSave}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Task</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SETTINGS MODAL (NEW) */}
      <SettingsModal 
        visible={settingsVisible} 
        onClose={() => setSettingsVisible(false)} 
        onLogout={signOut} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  logoutBtn: { padding: 5 },
  dateText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  loadContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 15, elevation: 2 },
  loadBar: { height: 6, borderRadius: 3, marginBottom: 10 },
  loadText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  statusMsg: { fontSize: 12, color: '#666', marginTop: 2 },
  listContainer: { paddingHorizontal: 20 },
  section: { marginBottom: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#555', marginBottom: 10, marginTop: 5 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  taskCompleted: { opacity: 0.6, backgroundColor: '#fafafa' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#2f95dc', marginRight: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  taskTitle: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 6 },
  textStrike: { textDecorationLine: 'line-through', color: '#aaa' },
  taskMetaRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, color: '#555', fontWeight: '600' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#aaa', marginTop: 10 },
  emptySub: { fontSize: 14, color: '#ccc' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2f95dc', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 12, color: '#888', marginBottom: 8, marginTop: 10, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fafafa' },
  chipScroll: { flexDirection: 'row', height: 40 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10 },
  chipActive: { backgroundColor: '#2f95dc' },
  chipText: { fontSize: 12, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 10 },
  btnCancel: { padding: 10, flex: 1, alignItems: 'center' },
  btnSave: { backgroundColor: '#2f95dc', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
});