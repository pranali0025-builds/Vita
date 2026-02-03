import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, 
  RefreshControl, Alert, Modal, ActivityIndicator 
} from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Services
import { 
  getLoadHistory, calculateStabilityScore, getCategoryStats, getFinancialReport, 
  detectBurnoutLoop, getWeeklyTaskStats, 
  getPremiumStatus, setPremiumStatus, seedDemoData, 
  StabilityMetrics, LoadPoint, CategoryStat 
} from '../../services/database';
import { detectMoneyLeaks, LeakReport } from '../../services/ai/moneyLeak'; 
import { analyzeSavings, SavingsReport } from '../../services/ai/savingsPlanner';
import { calculateLifeLoad, LifeLoadReport } from '../../services/ai/lifeLoad';

// Constants & Theme
import { colors } from '../../theme/colors';
import { CONFIG } from '../../utils/constants';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  
  // Data State
  const [loadHistory, setLoadHistory] = useState<LoadPoint[]>([]);
  const [stability, setStability] = useState<StabilityMetrics | null>(null);
  const [catStats, setCatStats] = useState<CategoryStat[]>([]);
  const [moneySummary, setMoneySummary] = useState('');
  const [burnoutInsights, setBurnoutInsights] = useState<string[]>([]);
  const [weeklyCompletion, setWeeklyCompletion] = useState(0);
  
  // AI Reports
  const [leakReport, setLeakReport] = useState<LeakReport | null>(null);
  const [savingsReport, setSavingsReport] = useState<SavingsReport | null>(null);
  const [lifeLoad, setLifeLoad] = useState<LifeLoadReport | null>(null);

  // UI State
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [processing, setProcessing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // 0. Check Premium Status
      const premium = await getPremiumStatus();
      setIsPremium(premium);

      // 1. Weekly Data
      const history = await getLoadHistory(7);
      setLoadHistory(history);
      const weeklyStats = await getWeeklyTaskStats();
      setWeeklyCompletion(weeklyStats.avgCompletionRate);
      
      // FEATURE 3: Life Load AI
      const loadReport = await calculateLifeLoad();
      setLifeLoad(loadReport);

      // 2. Monthly Data
      const cats = await getCategoryStats(currentMonth);
      setCatStats(cats);
      const rep = await getFinancialReport(currentMonth);
      setMoneySummary(rep.summary);

      // 3. AI Data (Logic runs locally)
      const insights = await detectBurnoutLoop();
      setBurnoutInsights(insights);
      const stab = await calculateStabilityScore();
      setStability(stab);
      const leaks = await detectMoneyLeaks(currentMonth);
      setLeakReport(leaks);
      const savingStats = await analyzeSavings(currentMonth);
      setSavingsReport(savingStats);

    } catch (e) {
      console.error("Error loading report data", e);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleOpenPaywall = () => setPaywallVisible(true);

  const handleMockPayment = async () => {
    setProcessing(true);
    // Simulate API latency
    setTimeout(async () => {
      await setPremiumStatus(true);
      setIsPremium(true);
      setProcessing(false);
      setPaywallVisible(false);
      loadData();
      Alert.alert("Success", "Welcome to Vita Premium! AI Features Unlocked.");
    }, 1500);
  };

  const handleDemoSeed = async () => {
    Alert.alert("Inject Demo Data?", "Adds fake expenses, tasks, and goals.", [
      { text: "Cancel", style: "cancel" },
      { text: "Inject Data", onPress: async () => {
        await seedDemoData();
        loadData();
        Alert.alert("Success", "Demo data loaded.");
      }}
    ]);
  };

  // --- UI HELPERS ---
  const barData = loadHistory.map(item => ({
    value: item.effort,
    label: item.label,
    frontColor: item.effort > 300 ? colors.danger : (item.effort > 120 ? colors.warning : colors.success),
  }));

  const pieData = catStats.map(c => ({
    value: c.total,
    color: getCategoryColor(c.category),
    text: `${Math.round(c.percentage)}%`
  }));

  function getCategoryColor(cat: string) {
    switch(cat) {
      case 'Food': return colors.chart.food;
      case 'Rent': return colors.chart.rent;
      case 'Transport': return colors.chart.transport;
      case 'Fun': return colors.chart.fun;
      default: return colors.chart.other;
    }
  }

  const getStatusColor = (status: string) => {
    if (status === 'Critical' || status === 'Overload Risk') return colors.danger;
    if (status === 'Warning' || status === 'Heavy') return colors.warning;
    return colors.success;
  };

  const renderPaywallTrigger = (featureName: string) => (
    <TouchableOpacity style={styles.paywallTrigger} onPress={handleOpenPaywall}>
      <Ionicons name="lock-closed" size={24} color={colors.warning} />
      <View style={{marginLeft: 15, flex: 1}}>
        <Text style={styles.triggerTitle}>{featureName} Locked</Text>
        <Text style={styles.triggerSub}>Tap to unlock AI Insights</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={styles.header}>Reports</Text>
          {isPremium && <View style={styles.proBadge}><Text style={styles.proText}>PRO</Text></View>}
        </View>
        <TouchableOpacity onPress={handleDemoSeed} style={styles.iconBtn}>
          <Ionicons name="construct-outline" size={24} color={colors.subText} />
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'Weekly' && styles.activeTab]} onPress={() => setActiveTab('Weekly')}>
          <Text style={[styles.tabText, activeTab === 'Weekly' && styles.activeTabText]}>Weekly Load</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'Monthly' && styles.activeTab]} onPress={() => setActiveTab('Monthly')}>
          <Text style={[styles.tabText, activeTab === 'Monthly' && styles.activeTabText]}>Monthly Stability</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
        {activeTab === 'Weekly' ? (
          <View>
            {/* FEATURE 3: LIFE LOAD */}
            {lifeLoad && (
              <View style={[styles.aiCard, { borderColor: getStatusColor(lifeLoad.status) }]}>
                <View style={styles.aiHeader}>
                  <Ionicons name="speedometer" size={24} color={getStatusColor(lifeLoad.status)} />
                  <View style={{marginLeft: 10}}>
                    <Text style={styles.aiTitle}>Life Load: {lifeLoad.status}</Text>
                    <Text style={styles.aiSub}>Weekly Stress Score: {lifeLoad.score}/100</Text>
                  </View>
                </View>

                {isPremium ? (
                  <View style={{marginTop: 10}}>
                    <Text style={styles.sectionLabel}>Stress Contributors:</Text>
                    <View style={styles.chipRow}>
                      {lifeLoad.contributors.length > 0 ? (
                        lifeLoad.contributors.map((c, i) => (
                          <View key={i} style={styles.causeChip}><Text style={styles.causeText}>{c}</Text></View>
                        ))
                      ) : (
                        <Text style={styles.safeText}>None. You are balanced.</Text>
                      )}
                    </View>
                    <Text style={styles.sectionLabel}>AI Suggestions:</Text>
                    {lifeLoad.suggestions.map((s, i) => (
                      <View key={i} style={styles.insightRow}>
                        <Ionicons name="bulb-outline" size={16} color={colors.warning} style={{marginTop:2}} />
                        <Text style={styles.insightText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  renderPaywallTrigger("Burnout Analysis")
                )}
              </View>
            )}

            {/* CHARTS (Free) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Load Trend (Last 7 Days)</Text>
              <View style={{ height: 200, marginTop: 20 }}>
                <BarChart 
                  data={barData} barWidth={22} noOfSections={3} barBorderRadius={4} 
                  frontColor={colors.primary} yAxisThickness={0} xAxisThickness={0} 
                  height={150} width={SCREEN_WIDTH - 80} labelWidth={30} 
                />
              </View>
              <Text style={styles.legend}>Red = Overload (> 5 hrs)</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.statBox, { backgroundColor: '#e8f8f5' }]}>
                 <Text style={[styles.statValue, { color: colors.success }]}>{weeklyCompletion}%</Text>
                 <Text style={styles.statLabel}>Avg Completion</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#fdedec' }]}>
                 <Text style={[styles.statValue, { color: colors.danger }]}>
                   {loadHistory.filter(d => d.effort > 300).length}
                 </Text>
                 <Text style={styles.statLabel}>Overload Days</Text>
              </View>
            </View>
          </View>
        ) : (
          <View>
            {/* FEATURE 2: STABILITY */}
            {isPremium && stability ? (
              <View style={styles.scoreCard}>
                <View style={styles.scoreHeader}>
                  <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                  <Text style={styles.scoreTitle}>Stability Score</Text>
                </View>
                <Text style={styles.scoreBig}>{stability.score}</Text>
                <Text style={styles.scoreLabel}>{stability.label}</Text>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreSub}>Money: {stability.moneyScore}/100</Text>
                  <Text style={styles.scoreSub}>Tasks: {stability.taskScore}/100</Text>
                </View>
              </View>
            ) : (
              renderPaywallTrigger("Stability Score")
            )}

            {/* FEATURE 4: SAVINGS */}
            {isPremium && savingsReport ? (
              <View style={styles.savingsCard}>
                <View style={styles.savingsHeader}>
                  <Ionicons name="wallet" size={22} color={colors.success} />
                  <Text style={styles.savingsTitle}>Smart Savings Planner</Text>
                </View>
                <View style={styles.savingsRow}>
                  <View style={styles.savingsCol}>
                    <Text style={styles.savingsLabel}>Actual Savings</Text>
                    <Text style={[styles.savingsValue, { color: savingsReport.actualSavings > 0 ? colors.success : colors.danger }]}>
                      {CONFIG.CURRENCY_SYMBOL}{savingsReport.actualSavings.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.savingsCol}>
                    <Text style={styles.savingsLabel}>Safe Potential</Text>
                    <Text style={[styles.savingsValue, { color: colors.primary }]}>
                      {CONFIG.CURRENCY_SYMBOL}{savingsReport.savingsPotential.toFixed(0)}
                    </Text>
                  </View>
                </View>
                <View style={styles.barContainer}>
                  <View style={[styles.barSegment, { flex: savingsReport.needs, backgroundColor: '#e67e22' }]} />
                  <View style={[styles.barSegment, { flex: savingsReport.wants, backgroundColor: '#9b59b6' }]} />
                  {savingsReport.actualSavings > 0 && <View style={[styles.barSegment, { flex: savingsReport.actualSavings, backgroundColor: colors.success }]} />}
                </View>
                <View style={styles.legendRow}>
                  <Text style={styles.legendText}><Text style={{color:'#e67e22'}}>●</Text> Needs</Text>
                  <Text style={styles.legendText}><Text style={{color:'#9b59b6'}}>●</Text> Wants</Text>
                  <Text style={styles.legendText}><Text style={{color:colors.success}}>●</Text> Savings</Text>
                </View>
                {savingsReport.insights.map((insight, index) => (
                  <View key={index} style={styles.insightRow}>
                    <Ionicons name="bulb-outline" size={14} color={colors.warning} style={{ marginTop: 2 }} />
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))}
              </View>
            ) : (
              renderPaywallTrigger("Smart Savings Plan")
            )}

            {/* FEATURE 1: LEAK DETECTOR */}
            {isPremium && leakReport && leakReport.leaks.length > 0 ? (
              <View style={[styles.aiCard, { borderColor: getStatusColor(leakReport.status) }]}>
                <View style={styles.aiHeader}>
                  <Ionicons name="analytics" size={20} color={getStatusColor(leakReport.status)} />
                  <Text style={[styles.aiTitle, { color: getStatusColor(leakReport.status) }]}>
                    Money Leak Detector ({leakReport.status})
                  </Text>
                </View>
                <Text style={styles.aiSuggestion}>💡 {leakReport.actionableSuggestion}</Text>
                {leakReport.leaks.map((leak, i) => (
                  <View key={i} style={styles.leakRow}>
                    <View style={styles.leakBadge}><Text style={styles.leakBadgeText}>{leak.type}</Text></View>
                    <View style={{flex: 1}}>
                      <Text style={styles.leakTitle}>{leak.title}</Text>
                      <Text style={styles.leakDesc}>{leak.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              null // Avoid clutter
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Expense Breakdown</Text>
              <Text style={styles.subTitle}>{moneySummary}</Text>
              {pieData.length > 0 ? (
                <View style={styles.chartContainer}>
                  <PieChart 
                    data={pieData} donut radius={80} innerRadius={60} showText textSize={10} textColor={colors.text} 
                  />
                  <View style={{marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10}}>
                    {catStats.slice(0,3).map(c => (
                      <View key={c.category} style={{flexDirection: 'row', alignItems: 'center'}}>
                         <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: getCategoryColor(c.category), marginRight: 4}} />
                         <Text style={{fontSize: 10, color: colors.subText}}>{c.category}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="pie-chart-outline" size={48} color={colors.placeholder} />
                  <Text style={styles.emptyText}>No spending data yet.</Text>
                  <Text style={styles.emptySub}>Start tracking to see charts.</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* --- PREMIUM MODAL --- */}
      <Modal visible={paywallVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.paywallModal}>
            <View style={styles.modalHeader}>
              <Ionicons name="diamond" size={40} color={colors.warning} />
              <Text style={styles.paywallMainTitle}>Unlock Vita Premium</Text>
              <Text style={styles.paywallMainSub}>Get actionable intelligence on your life.</Text>
            </View>

            <View style={styles.benefitList}>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.benefitText}>Money Leak Detector</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.benefitText}>Burnout Prediction</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.benefitText}>Smart Savings Planner</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.benefitText}>Personal Stability Score</Text>
              </View>
            </View>

            {processing ? (
              <View style={styles.processingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{marginTop: 10, color: colors.subText}}>Processing Payment...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.subscribeBtn} onPress={handleMockPayment}>
                  <Text style={styles.subscribeText}>Subscribe - {CONFIG.PREMIUM_PRICE}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPaywallVisible(false)} style={styles.closeBtn}>
                  <Text style={styles.closeText}>Maybe Later</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  iconBtn: { padding: 5 },
  proBadge: { backgroundColor: colors.proBadge, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  proText: { color: colors.white, fontSize: 10, fontWeight: 'bold' },
  
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, backgroundColor: '#e0e0e0', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: colors.cardBg, elevation: 2 },
  tabText: { color: '#777', fontWeight: '600' },
  activeTabText: { color: colors.primary },
  
  card: { backgroundColor: colors.cardBg, marginHorizontal: 20, marginBottom: 15, padding: 20, borderRadius: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
  subTitle: { fontSize: 12, color: colors.subText, marginBottom: 15 },
  legend: { fontSize: 10, color: colors.subText, textAlign: 'center', marginTop: 10 },
  row: { flexDirection: 'row', marginHorizontal: 20, gap: 15, marginBottom: 20 },
  statBox: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 12, color: colors.subText },
  
  chartContainer: { alignItems: 'center', justifyContent: 'center' },

  // EMPTY STATE
  emptyState: { alignItems: 'center', marginVertical: 30 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: colors.placeholder, marginTop: 10 },
  emptySub: { fontSize: 12, color: colors.placeholder },

  // PAYWALL TRIGGER
  paywallTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: colors.warning },
  triggerTitle: { fontWeight: 'bold', fontSize: 16, color: colors.text },
  triggerSub: { fontSize: 12, color: colors.subText },

  // PAYWALL MODAL
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  paywallModal: { width: '85%', backgroundColor: colors.cardBg, borderRadius: 24, padding: 30, elevation: 10, alignItems: 'center' },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  paywallMainTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginTop: 15 },
  paywallMainSub: { fontSize: 14, color: colors.subText, textAlign: 'center', marginTop: 5 },
  benefitList: { width: '100%', marginBottom: 25 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  benefitText: { fontSize: 14, color: '#444', marginLeft: 10 },
  subscribeBtn: { backgroundColor: colors.primary, width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', elevation: 3 },
  subscribeText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  closeBtn: { marginTop: 15, padding: 10 },
  closeText: { color: colors.subText },
  processingBox: { alignItems: 'center', padding: 20 },

  // AI & LEAK STYLES
  aiCard: { backgroundColor: colors.cardBg, marginHorizontal: 20, marginBottom: 20, padding: 15, borderRadius: 16, elevation: 3, borderTopWidth: 4 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  aiTitle: { fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
  aiSub: { fontSize: 12, color: colors.subText, marginLeft: 8 },
  aiSuggestion: { fontSize: 14, fontWeight: '600', color: '#34495e', marginBottom: 15, fontStyle: 'italic', lineHeight: 20 },
  leakRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  leakBadge: { backgroundColor: '#eee', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 10, marginTop: 2 },
  leakBadgeText: { fontSize: 10, fontWeight: 'bold', color: colors.subText },
  leakTitle: { fontWeight: 'bold', fontSize: 13, color: colors.text },
  leakDesc: { fontSize: 12, color: colors.subText },
  
  // SAVINGS CARD STYLES
  savingsCard: { backgroundColor: colors.cardBg, marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 16, elevation: 3, borderTopWidth: 4, borderColor: colors.success },
  savingsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  savingsTitle: { fontWeight: 'bold', marginLeft: 8, fontSize: 16, color: colors.success },
  savingsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  savingsCol: { alignItems: 'center', flex: 1 },
  savingsLabel: { fontSize: 12, color: '#7f8c8d' },
  savingsValue: { fontSize: 20, fontWeight: 'bold' },
  barContainer: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10, backgroundColor: colors.border },
  barSegment: { height: '100%' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 15 },
  legendText: { fontSize: 10, color: colors.subText },

  // Life Load specific
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: colors.text, marginTop: 10, marginBottom: 5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  causeChip: { backgroundColor: '#fdedec', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  causeText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  safeText: { color: colors.success, fontSize: 12, fontStyle: 'italic' },
  insightRow: { flexDirection: 'row', marginBottom: 8, paddingRight: 10 },
  insightText: { fontSize: 13, color: colors.subText, marginLeft: 8, lineHeight: 18 },
  scoreCard: { backgroundColor: colors.cardBg, marginHorizontal: 20, marginBottom: 20, padding: 25, borderRadius: 16, elevation: 4, alignItems: 'center' },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  scoreTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginLeft: 10 },
  scoreBig: { fontSize: 48, fontWeight: 'bold', color: colors.primary },
  scoreLabel: { fontSize: 16, fontWeight: '600', color: colors.subText, marginBottom: 15 },
  scoreRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15 },
  scoreSub: { fontSize: 12, color: colors.subText },
});