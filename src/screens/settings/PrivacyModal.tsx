import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Data & Privacy</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 25 }}>
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={50} color={colors.success} />
            </View>
            <Text style={styles.mainTitle}>Your Data is Yours.</Text>
            <Text style={styles.mainSub}>Vita is built with a "Privacy-First" architecture.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="server-outline" size={24} color={colors.primary} style={{ marginRight: 15 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>100% Local Storage</Text>
                <Text style={styles.rowText}>All expenses, tasks, and documents are stored in an SQLite database directly on your device. Nothing is uploaded to the cloud.</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="hardware-chip-outline" size={24} color={colors.warning} style={{ marginRight: 15 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Offline AI Processing</Text>
                <Text style={styles.rowText}>Our algorithms (Leak Detector, Burnout Predictor) run locally on your phone's processor. No API keys, no data sharing.</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="lock-closed-outline" size={24} color={colors.danger} style={{ marginRight: 15 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Zero Tracking</Text>
                <Text style={styles.rowText}>We do not collect analytics, crash reports, or personal identifiers. What happens in Vita, stays in Vita.</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Understood</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.cardBg },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  closeBtn: { padding: 5 },
  
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e8f8f5', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  mainTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
  mainSub: { fontSize: 14, color: colors.subText, textAlign: 'center' },

  card: { backgroundColor: colors.cardBg, padding: 20, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  rowTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
  rowText: { fontSize: 13, color: colors.subText, lineHeight: 20 },

  btn: { backgroundColor: colors.primary, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});