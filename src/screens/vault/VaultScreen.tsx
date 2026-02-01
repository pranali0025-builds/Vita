import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, TextInput, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { 
  addDocument, getDocuments, deleteDocument, calculatePreparednessScore, 
  Document, PreparednessReport 
} from '../../services/database';

const CATEGORIES = ['Identity', 'Education', 'Work', 'Finance', 'Other'];

export default function VaultScreen() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [report, setReport] = useState<PreparednessReport | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Identity');
  const [expiry, setExpiry] = useState(''); // YYYY-MM-DD
  const [imageUri, setImageUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const docs = await getDocuments();
      const rep = await calculatePreparednessScore();
      setDocuments(docs);
      setReport(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    // Request permission (optional on some OS versions but good practice)
    // No explicit permission request needed for launchImageLibraryAsync in modern Expo Go
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5, // Compress image to save space
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!title || !imageUri) {
      return Alert.alert("Missing Info", "Please provide a title and select an image.");
    }
    try {
      // For expiry, we accept empty string if user leaves it blank
      await addDocument(title, category, imageUri, expiry || null);
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (e) {
      Alert.alert("Error", "Could not save document.");
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert("Delete Document", "This cannot be undone.", [
      { text: "Cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
        await deleteDocument(id);
        loadData();
      }}
    ]);
  };

  const resetForm = () => {
    setTitle(''); setCategory('Identity'); setExpiry(''); setImageUri(null);
  };

  const renderDoc = ({ item }: { item: Document }) => (
    <TouchableOpacity style={styles.card} onLongPress={() => handleDelete(item.id)}>
      <Image source={{ uri: item.uri }} style={styles.thumbnail} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSub}>{item.category}</Text>
        {item.expiry_date ? (
          <Text style={[styles.expiry, { color: '#c0392b' }]}>Exp: {item.expiry_date}</Text>
        ) : (
          <Text style={[styles.expiry, { color: '#27ae60' }]}>No Expiry</Text>
        )}
      </View>
      <Ionicons name="ellipsis-vertical" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 1. HEADER & PREPAREDNESS SCORE */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Document Vault</Text>
        {report && (
          <View style={styles.scoreBox}>
            <View style={styles.scoreLeft}>
              <Text style={styles.scoreLabel}>Preparedness</Text>
              <Text style={styles.scoreValue}>{report.score}%</Text>
            </View>
            <View style={styles.scoreRight}>
              {report.missingEssentials.length > 0 ? (
                <Text style={styles.warningText}>Missing: {report.missingEssentials[0]}</Text>
              ) : (
                <Text style={styles.safeText}>All Essentials Found</Text>
              )}
              {report.expiringSoonCount > 0 && (
                <Text style={styles.riskText}>⚠️ {report.expiringSoonCount} Expiring Soon</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* 2. DOC LIST */}
      <FlatList 
        data={documents}
        renderItem={renderDoc}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Vault is empty.</Text>
            <Text style={styles.emptySub}>Store IDs, Degrees, and Finance docs securely.</Text>
          </View>
        }
      />

      {/* 3. FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* 4. MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Document</Text>

            {/* Image Picker */}
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="camera" size={30} color="#ccc" />
                  <Text style={{ color: '#aaa', marginTop: 5 }}>Tap to Select Image</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Document Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Aadhaar Card" value={title} onChangeText={setTitle} />

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Expiry Date (Optional)</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={expiry} onChangeText={setExpiry} />

            <View style={styles.row}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}><Text style={{color: 'red'}}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.btnSave}><Text style={{color:'#fff'}}>Secure Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 50 },
  header: { paddingHorizontal: 20, marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  
  scoreBox: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 15, elevation: 2 },
  scoreLeft: { borderRightWidth: 1, borderRightColor: '#eee', paddingRight: 20, marginRight: 20 },
  scoreLabel: { fontSize: 12, color: '#888' },
  scoreValue: { fontSize: 28, fontWeight: 'bold', color: '#2f95dc' },
  scoreRight: { justifyContent: 'center' },
  warningText: { color: '#c0392b', fontWeight: '600' },
  safeText: { color: '#27ae60', fontWeight: '600' },
  riskText: { fontSize: 12, color: '#f39c12', marginTop: 4 },

  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 1 },
  thumbnail: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#eee', marginRight: 15 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  cardSub: { fontSize: 12, color: '#888' },
  expiry: { fontSize: 10, marginTop: 4, fontWeight: 'bold' },

  empty: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#aaa', marginTop: 10 },
  emptySub: { fontSize: 14, color: '#ccc' },

  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2f95dc', justifyContent: 'center', alignItems: 'center', elevation: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  imagePicker: { height: 150, backgroundColor: '#f0f0f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 15, overflow: 'hidden' },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#fafafa' },
  label: { fontSize: 12, color: '#888', marginBottom: 8, fontWeight: '600' },
  chipScroll: { flexDirection: 'row', marginBottom: 15, height: 40 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10 },
  chipActive: { backgroundColor: '#2f95dc' },
  chipText: { fontSize: 12, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btnCancel: { padding: 10, flex: 1, alignItems: 'center' },
  btnSave: { backgroundColor: '#2f95dc', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
});