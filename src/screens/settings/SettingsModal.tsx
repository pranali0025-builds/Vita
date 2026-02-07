import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { getUserDetails, clearAllData, logoutUser } from '../../services/database';
import { PrivacyModal } from './PrivacyModal'; // <--- Privacy Modal Integration

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void; 
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose, onLogout }) => {
  const [profile, setProfile] = useState<{ name: string, email: string, is_premium: number } | null>(null);
  const [privacyVisible, setPrivacyVisible] = useState(false);

  useEffect(() => {
    if (visible) fetchProfile();
  }, [visible]);

  const fetchProfile = async () => {
    const data = await getUserDetails();
    setProfile(data);
  };

  const handleReset = () => {
    Alert.alert("Reset Data", "Permanently delete all expenses, tasks, and goals? You will be logged out.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete Everything", style: "destructive", onPress: async () => {
        await clearAllData();
        onLogout(); 
      }}
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to exit?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: async () => {
        await logoutUser();
        onLogout();
      }}
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          
          {/* Profile Section */}
          <View style={styles.section}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile?.name?.charAt(0) || 'U'}</Text>
              </View>
              <View>
                <Text style={styles.nameText}>{profile?.name || 'User'}</Text>
                <Text style={styles.emailText}>{profile?.email || 'No Email'}</Text>
                {profile?.is_premium === 1 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>PREMIUM MEMBER</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.section}>
            {/* Privacy & Data Row */}
            <TouchableOpacity style={styles.row} onPress={() => setPrivacyVisible(true)}>
              <View style={styles.rowLeft}>
                <Ionicons name="shield-checkmark-outline" size={24} color={colors.text} />
                <Text style={styles.rowText}>Privacy & Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.row} onPress={handleLogout}>
              <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={24} color={colors.text} />
                <Text style={styles.rowText}>Log Out</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.row} onPress={handleReset}>
              <View style={styles.rowLeft}>
                <Ionicons name="trash-outline" size={24} color={colors.danger} />
                <Text style={[styles.rowText, { color: colors.danger }]}>Reset All Data</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Vita App v1.0.0</Text>
            <Text style={styles.footerText}>Built for Stability</Text>
          </View>

        </ScrollView>

        {/* Nested Privacy Modal */}
        <PrivacyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.cardBg },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  closeBtn: { padding: 5 },
  
  section: { backgroundColor: colors.cardBg, borderRadius: 12, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: colors.subText, marginBottom: 8, marginLeft: 5, textTransform: 'uppercase' },
  
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  nameText: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  emailText: { fontSize: 14, color: colors.subText, marginTop: 2 },
  badge: { backgroundColor: colors.warning, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 5, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  rowText: { fontSize: 16, color: colors.text },

  footer: { alignItems: 'center', marginTop: 20 },
  footerText: { color: colors.placeholder, fontSize: 12, marginBottom: 5 },
});