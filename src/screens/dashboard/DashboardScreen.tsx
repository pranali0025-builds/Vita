import React, { useState, useCallback, useContext } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, RefreshControl, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  addTask, getTasksByDate, toggleTaskCompletion, deleteTask, getDailyLoad, 
  logDailyEnergy, getDailyEnergy,
  Task, DailyLoad 
} from '../../services/database';
import { AuthContext } from '../../context/AuthContext'; 
import { SettingsModal } from '../settings/SettingsModal';
import { colors } from '../../theme/colors';
import { CATEGORIES, PRIORITIES, TASK_EFFORTS } from '../../utils/constants';

const ENERGY_LEVELS = [
  { val: 1, icon: 'battery-dead', color: colors.danger, label: 'Drained' },
  { val: 3, icon: 'battery-half', color: colors.warning, label: 'Okay' },
  { val: 5, icon: 'battery-full', color: colors.success, label: 'Charged' }
];

export default function DashboardScreen() {
  const { signOut } = useContext(AuthContext); 
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadStats, setLoadStats] = useState<DailyLoad | null>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [energy, setEnergy] = useState(5);

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false); 

  // Form State
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState(PRIORITIES[1]); // Medium default
  const [effort, setEffort] = useState(30);
  const [category, setCategory] = useState(CATEGORIES.TASK[0]); // Work default

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
      const e = await getDailyEnergy(date);
      setTasks(t);
      setLoadStats(l);
      setEnergy(e);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleEnergyUpdate = async (level: number) => {
    setEnergy(level);
    await logDailyEnergy(level, date);
  };

  const handleAddTask = async () => {
    if (!title.trim()) return Alert.alert("Required", "Please enter a task title.");
    try {
      await addTask(title, priority, effort, category, date);
      setModalVisible(false);
      // Reset form
      setTitle(''); setPriority(PRIORITIES[1]); setEffort(30); setCategory(CATEGORIES.TASK[0]);
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
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
        await deleteTask(id);
        loadData();
      }}
    ]);
  };

  const getLoadColor = (level: string) => {
    switch(level) {
      case 'Light': return colors.success;
      case 'Normal': return colors.warning;
      case 'Heavy': return colors.danger;
      default: return colors.primary;
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
        {item.is_completed === 1 && <Ionicons name="checkmark" size={18} color={colors.white} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskTitle, item.is_completed ? styles.textStrike : null]}>{item.title}</Text>
        <View style={styles.taskMetaRow}>
          <View style={[styles.badge, { backgroundColor: colors.background }]}>
            <Text style={styles.badgeText}>{item.estimated_effort}m</Text>
          </View>
          {item.priority === 'High' && (
             <View style={[styles.badge, { backgroundColor: '#fdedec' }]}>
             <Text style={[styles.badgeText, { color: colors.danger }]}>High</Text>
           </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const workTasks = tasks.filter(t => t.category === 'Work');
  const personalTasks = tasks.filter(t => t.category === 'Personal');
  const adminTasks = tasks.filter(t => t.category === 'Admin');

  // --- EMPTY STATE ---
  const EmptyTasks = () => (
    <View style={styles.emptyState}>
      <Ionicons name="leaf-outline" size={48} color={colors.placeholder} />
      <Text style={styles.emptyText}>No tasks today.</Text>
      <Text style={styles.emptySub}>Enjoy your free time or plan ahead.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER WITH SETTINGS */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.dateText}>Today's Load</Text>
        </View>
        <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.iconBtn}>
          <Ionicons name="settings-outline" size={24} color={colors.subText} />
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

        {/* ENERGY CHECK-IN */}
        <View style={styles.energyCard}>
          <Text style={styles.sectionHeaderSmall}>Energy Check-in</Text>
          <View style={styles.energyRow}>
            {ENERGY_LEVELS.map((lvl) => (
              <TouchableOpacity 
                key={lvl.val} 
                style={[styles.energyBtn, energy === lvl.val && { backgroundColor: lvl.color + '20', borderColor: lvl.color }]}
                onPress={() => handleEnergyUpdate(lvl.val)}
              >
                <Ionicons name={lvl.icon as any} size={24} color={energy === lvl.val ? lvl.color : colors.placeholder} />
                <Text style={[styles.energyLabel, energy === lvl.val && { color: lvl.color }]}>{lvl.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* TASK SECTIONS */}
        {tasks.length === 0 ? (
          <EmptyTasks />
        ) : (
          <View style={styles.listContainer}>
            {workTasks.length > 0 && <View style={styles.section}><Text style={styles.sectionHeader}>💼 Work</Text>{workTasks.map(renderTaskItem)}</View>}
            {personalTasks.length > 0 && <View style={styles.section}><Text style={styles.sectionHeader}>🧘 Personal</Text>{personalTasks.map(renderTaskItem)}</View>}
            {adminTasks.length > 0 && <View style={styles.section}><Text style={styles.sectionHeader}>📄 Admin</Text>{adminTasks.map(renderTaskItem)}</View>}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color={colors.white} />
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
              {TASK_EFFORTS.map(m => (
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
              {CATEGORIES.TASK.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive, { flex: 1, alignItems: 'center' }]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={[styles.row, { marginTop: 20 }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}><Text style={{ color: colors.danger }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddTask} style={styles.btnSave}><Text style={{ color: colors.white, fontWeight: 'bold' }}>Save Task</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SETTINGS MODAL */}
      <SettingsModal 
        visible={settingsVisible} 
        onClose={() => setSettingsVisible(false)} 
        onLogout={signOut} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  iconBtn: { padding: 5 },
  dateText: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  
  loadContainer: { backgroundColor: colors.cardBg, borderRadius: 12, padding: 15, elevation: 2 },
  loadBar: { height: 6, borderRadius: 3, marginBottom: 10 },
  loadText: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  statusMsg: { fontSize: 12, color: colors.subText, marginTop: 2 },
  
  listContainer: { paddingHorizontal: 20 },
  section: { marginBottom: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: colors.subText, marginBottom: 10, marginTop: 5 },
  sectionHeaderSmall: { fontSize: 14, fontWeight: '600', color: colors.subText, marginBottom: 10 },
  
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  taskCompleted: { opacity: 0.6, backgroundColor: colors.background },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, marginRight: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  
  taskTitle: { fontSize: 16, fontWeight: '500', color: colors.text, marginBottom: 6 },
  textStrike: { textDecorationLine: 'line-through', color: colors.placeholder },
  taskMetaRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, color: colors.subText, fontWeight: '600' },
  
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: colors.placeholder, marginTop: 10 },
  emptySub: { fontSize: 14, color: colors.placeholder },
  
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: colors.cardBg, borderRadius: 16, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: colors.text },
  label: { fontSize: 12, color: colors.subText, marginBottom: 8, marginTop: 10, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: colors.background },
  chipScroll: { flexDirection: 'row', height: 40 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, marginRight: 10 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.subText },
  chipTextActive: { color: colors.white, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 10 },
  btnCancel: { padding: 10, flex: 1, alignItems: 'center' },
  btnSave: { backgroundColor: colors.primary, padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },

  // ENERGY STYLES
  energyCard: { backgroundColor: colors.cardBg, marginHorizontal: 20, marginTop: 15, marginBottom: 15, padding: 15, borderRadius: 12, elevation: 1 },
  energyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  energyBtn: { alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', flex: 1, marginHorizontal: 5 },
  energyLabel: { fontSize: 10, marginTop: 5, color: colors.placeholder, fontWeight: '600' },
});