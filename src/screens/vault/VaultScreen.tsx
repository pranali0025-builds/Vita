import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, TextInput, ScrollView, Alert, RefreshControl, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { 
  addDocument, getDocuments, deleteDocument, calculatePreparednessScore, 
  Document, PreparednessReport 
} from '../../services/database';
import { colors } from '../../theme/colors';
import { CATEGORIES } from '../../utils/constants';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function VaultScreen() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [report, setReport] = useState<PreparednessReport | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES.DOCS[0]);
  const [expiry, setExpiry] = useState('');
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
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!title || !imageUri) return Alert.alert("Missing Info", "Title and Image are required.");
    await addDocument(title, category, imageUri, expiry || null);
    setModalVisible(false);
    setTitle(''); setCategory(CATEGORIES.DOCS[0]); setExpiry(''); setImageUri(null);
    loadData();
  };

  const handleDelete = async (id: number) => {
    Alert.alert("Delete", "Permanently remove document?", [
      { text: "Cancel" }, { text: "Delete", style: 'destructive', onPress: async () => { await deleteDocument(id); loadData(); }}
    ]);
  };

  const renderDoc = ({ item }: { item: Document }) => (
    <TouchableOpacity style={styles.card} onPress={() => { setSelectedDoc(item); setViewerVisible(true); }} onLongPress={() => handleDelete(item.id)}>
      <Image source={{ uri: item.uri }} style={styles.thumbnail} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSub}>{item.category}</Text>
        {item.expiry_date ? <Text style={[styles.expiry, { color: colors.danger }]}>Exp: {item.expiry_date}</Text> : <Text style={[styles.expiry, { color: colors.success }]}>No Expiry</Text>}
      </View>
      <Ionicons name="eye-outline" size={20} color={colors.primary} />
    </TouchableOpacity>
  );

  // --- EMPTY STATE ---
  const EmptyVault = () => (
    <View style={styles.empty}>
      <Ionicons name="folder-open-outline" size={48} color={colors.placeholder} />
      <Text style={styles.emptyText}>Vault is empty.</Text>
      <Text style={styles.emptySub}>Store IDs, Degrees, and Finance docs securely.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
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

      <FlatList 
        data={documents}
        renderItem={renderDoc}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={EmptyVault}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* ADD MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Document</Text>
            <Text style={styles.digitalNote}>* Works only on digital documents (Images)</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%', borderRadius: 8 }} /> : <View style={{ alignItems: 'center' }}><Ionicons name="camera" size={30} color="#ccc" /><Text style={{ color: '#aaa', marginTop: 5 }}>Tap to Select Image</Text></View>}
            </TouchableOpacity>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Aadhaar" value={title} onChangeText={setTitle} />
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CATEGORIES.DOCS.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.label}>Expiry (Optional)</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={expiry} onChangeText={setExpiry} />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.btnSave}><Text style={{color:'#fff'}}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* VIEWER MODAL */}
      <Modal visible={viewerVisible} animationType="fade" onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerContainer}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setViewerVisible(false)}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {selectedDoc && (
            <>
              <Image source={{ uri: selectedDoc.uri }} style={styles.fullImage} resizeMode="contain" />
              <View style={styles.viewerFooter}>
                <Text style={styles.viewerTitle}>{selectedDoc.title}</Text>
                <Text style={styles.viewerSub}>{selectedDoc.category} • {selectedDoc.expiry_date || 'No Expiry'}</Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 50 },
  header: { paddingHorizontal: 20, marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  scoreBox: { flexDirection: 'row', backgroundColor: colors.cardBg, borderRadius: 12, padding: 15, elevation: 2 },
  scoreLeft: { borderRightWidth: 1, borderRightColor: colors.border, paddingRight: 20, marginRight: 20 },
  scoreLabel: { fontSize: 12, color: colors.subText },
  scoreValue: { fontSize: 28, fontWeight: 'bold', color: colors.primary },
  scoreRight: { justifyContent: 'center' },
  warningText: { color: colors.danger, fontWeight: '600' },
  safeText: { color: colors.success, fontWeight: '600' },
  riskText: { fontSize: 12, color: colors.warning, marginTop: 4 },
  card: { flexDirection: 'row', backgroundColor: colors.cardBg, padding: 10, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 1 },
  thumbnail: { width: 50, height: 50, borderRadius: 8, backgroundColor: colors.border, marginRight: 15 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardSub: { fontSize: 12, color: colors.subText },
  expiry: { fontSize: 10, marginTop: 4, fontWeight: 'bold' },
  empty: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: colors.placeholder, marginTop: 10 },
  emptySub: { fontSize: 14, color: colors.placeholder },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: colors.cardBg, borderRadius: 16, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  digitalNote: { fontSize: 12, color: colors.subText, textAlign: 'center', marginBottom: 15, fontStyle: 'italic' },
  imagePicker: { height: 150, backgroundColor: colors.background, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 15, overflow: 'hidden' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: colors.background },
  label: { fontSize: 12, color: colors.subText, marginBottom: 8, fontWeight: '600' },
  chipScroll: { flexDirection: 'row', marginBottom: 15, height: 40 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, marginRight: 10 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.subText },
  chipTextActive: { color: colors.white, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btnCancel: { padding: 10, flex: 1, alignItems: 'center' },
  btnSave: { backgroundColor: colors.primary, padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  viewerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  fullImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  viewerFooter: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' },
  viewerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  viewerSub: { color: '#ccc', fontSize: 14 },
});