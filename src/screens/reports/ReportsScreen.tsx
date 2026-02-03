import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Alert } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  getLoadHistory, calculateStabilityScore, getCategoryStats, getFinancialReport, 
  detectBurnoutLoop, getWeeklyTaskStats, 
  getPremiumStatus, setPremiumStatus, seedDemoData, 
  StabilityMetrics, LoadPoint, CategoryStat 
} from '../../services/database';
import { detectMoneyLeaks, LeakReport } from '../../services/ai/moneyLeak'; 
// IMPORT NEW AI SERVICE
import { analyzeSavings, SavingsReport } from '../../services/ai/savingsPlanner';

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
  const [leakReport, setLeakReport] = useState<LeakReport | null>(null);
  
  // NEW STATE: Savings Report
  const [savingsReport, setSavingsReport] = useState<SavingsReport | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const premium = await getPremiumStatus();
      setIsPremium(premium);

      // 1. Weekly Data
      const history = await getLoadHistory(7);
      setLoadHistory(history);
      const weeklyStats = await getWeeklyTaskStats();
      setWeeklyCompletion(weeklyStats.avgCompletionRate);
      
      // 2. Monthly Data
      const cats = await getCategoryStats(currentMonth);
      setCatStats(cats);
      const rep = await getFinancialReport(currentMonth);
      setMoneySummary(rep.summary);

      // 3. AI Data (Fetched but hidden if not premium)
      const insights = await detectBurnoutLoop();
      setBurnoutInsights(insights);
      
      const stab = await calculateStabilityScore();
      setStability(stab);
      
      const leaks = await detectMoneyLeaks(currentMonth);
      setLeakReport(leaks);

      // NEW: Savings Analysis
      const savingStats = await analyzeSavings(currentMonth);
      setSavingsReport(savingStats);

    } catch (e) {
      console.error("Error loading report data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockPremium = async () => {
    Alert.alert("Upgrade to Vita+", "Unlock Smart Savings Planner & AI Insights?", [
      { text: "Cancel", style: "cancel" },
      { text: "Unlock (Demo)", onPress: async () => {
        await setPremiumStatus(true);
        loadData();
        Alert.alert("Welcome to Premium!", "AI Features are now active.");
      }}
    ]);
  };

  const handleDemoSeed = async () => {
    Alert.alert("Inject Demo Data?", "This will add fake expenses, tasks, and goals for presentation purposes.", [
      { text: "Cancel", style: "cancel" },
      { text: "Inject Data", onPress: async () => {
        await seedDemoData();
        loadData();
        Alert.alert("Success", "Demo data loaded.");
      }}
    ]);
  };

  const barData = loadHistory.map(item => ({
    value: item.effort,
    label: item.label,
    frontColor: item.effort > 300 ? '#c0392b' : (item.effort > 120 ? '#f39c12' : '#27ae60'),
  }));

  const pieData = catStats.map(c => ({
    value: c.total,
    color: getCategoryColor(c.category),
    text: `${Math.round(c.percentage)}%`
  }));

  function getCategoryColor(cat: string) {
    switch(cat) {
      case 'Food': return '#FF6384';
      case 'Rent': return '#36A2EB';
      case 'Transport': return '#FFCE56';
      case 'Fun': return '#4BC0C0';
      default: return '#9966FF';
    }
  }

  const getLeakColor = (status: string) => {
    if (status === 'Critical') return '#c0392b';
    if (status === 'Warning') return '#e67e22';
    return '#27ae60';
  };

  const renderPaywall = (featureName: string) => (
    <TouchableOpacity style={styles.paywallCard} onPress={handleUnlockPremium}>
      <Ionicons name="lock-closed" size={32} color="#f39c12" />
      <Text style={styles.paywallTitle}>{featureName}</Text>
      <Text style={styles.paywallSub}>Upgrade to Vita+ to see AI Insights</Text>
      <View style={styles.unlockBtn}>
        <Text style={styles.unlockText}>Unlock Now</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Reports</Text>
        <TouchableOpacity onPress={handleDemoSeed} style={styles.iconBtn}>
          <Ionicons name="construct-outline" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'Weekly' && styles.activeTab]} onPress={() => setActiveTab('Weekly')}>
          <Text style={[styles.tabText, activeTab === 'Weekly' && styles.activeTabText]}>Weekly Load</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'Monthly' && styles.activeTab]} onPress={() => setActiveTab('Monthly')}>
          <Text style={[styles.tabText, activeTab === 'Monthly' && styles.activeTabText]}>Monthly Stability</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 50 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
        {activeTab === 'Weekly' ? (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Load Trend (Last 7 Days)</Text>
              <View style={{ height: 200, marginTop: 20 }}>
                <BarChart 
                  data={barData} 
                  barWidth={22} 
                  noOfSections={3} 
                  barBorderRadius={4} 
                  frontColor="#2f95dc" 
                  yAxisThickness={0} 
                  xAxisThickness={0} 
                  height={150}
                  width={SCREEN_WIDTH - 80}
                  labelWidth={30}
                />
              </View>
              <Text style={styles.legend}>Red = Overload (> 5 hrs)</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.statBox, { backgroundColor: '#e8f8f5' }]}>
                 <Text style={[styles.statValue, { color: '#27ae60' }]}>{weeklyCompletion}%</Text>
                 <Text style={styles.statLabel}>Avg Completion</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#fdedec' }]}>
                 <Text style={[styles.statValue, { color: '#c0392b' }]}>
                   {loadHistory.filter(d => d.effort > 300).length}
                 </Text>
                 <Text style={styles.statLabel}>Overload Days</Text>
              </View>
            </View>

            {isPremium ? (
              burnoutInsights.length > 0 && (
                <View style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Ionicons name="pulse" size={18} color="#c0392b" />
                    <Text style={styles.insightTitle}>Pattern Detection</Text>
                  </View>
                  {burnoutInsights.map((text, index) => (
                    <View key={index} style={styles.insightRow}>
                      <Ionicons name="alert-circle" size={14} color="#555" style={{ marginTop: 2 }} />
                      <Text style={styles.insightText}>{text}</Text>
                    </View>
                  ))}
                </View>
              )
            ) : (
              renderPaywall("Burnout Analysis Locked")
            )}
          </View>
        ) : (
          <View>
            {/* AI FEATURE 2: STABILITY SCORE */}
            {isPremium && stability ? (
              <View style={styles.scoreCard}>
                <View style={styles.scoreHeader}>
                  <Ionicons name="shield-checkmark" size={24} color="#2f95dc" />
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
              renderPaywall("Stability Score Locked")
            )}

            {/* AI FEATURE 4: SMART SAVINGS PLANNER (NEW) */}
            {isPremium ? (
              savingsReport && (
                <View style={styles.savingsCard}>
                  <View style={styles.savingsHeader}>
                    <Ionicons name="wallet" size={22} color="#27ae60" />
                    <Text style={styles.savingsTitle}>Smart Savings Planner</Text>
                  </View>
                  
                  <View style={styles.savingsRow}>
                    <View style={styles.savingsCol}>
                      <Text style={styles.savingsLabel}>Actual Savings</Text>
                      <Text style={[styles.savingsValue, { color: savingsReport.actualSavings > 0 ? '#27ae60' : '#c0392b' }]}>
                        ₹{savingsReport.actualSavings.toFixed(0)}
                      </Text>
                    </View>
                    <View style={styles.savingsCol}>
                      <Text style={styles.savingsLabel}>Safe Potential</Text>
                      <Text style={[styles.savingsValue, { color: '#2980b9' }]}>
                        ₹{savingsReport.savingsPotential.toFixed(0)}
                      </Text>
                    </View>
                  </View>

                  {/* Needs vs Wants Visual Bar */}
                  <View style={styles.barContainer}>
                    <View style={[styles.barSegment, { flex: savingsReport.needs, backgroundColor: '#e67e22' }]} />
                    <View style={[styles.barSegment, { flex: savingsReport.wants, backgroundColor: '#9b59b6' }]} />
                    {/* Remaining is savings, if positive */}
                    {savingsReport.actualSavings > 0 && (
                      <View style={[styles.barSegment, { flex: savingsReport.actualSavings, backgroundColor: '#27ae60' }]} />
                    )}
                  </View>
                  <View style={styles.legendRow}>
                    <Text style={styles.legendText}><Text style={{color:'#e67e22'}}>●</Text> Needs</Text>
                    <Text style={styles.legendText}><Text style={{color:'#9b59b6'}}>●</Text> Wants</Text>
                    <Text style={styles.legendText}><Text style={{color:'#27ae60'}}>●</Text> Savings</Text>
                  </View>

                  {/* Insights List */}
                  {savingsReport.insights.map((insight, index) => (
                    <View key={index} style={styles.insightRow}>
                      <Ionicons name="bulb-outline" size={14} color="#f39c12" style={{ marginTop: 2 }} />
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              )
            ) : (
              renderPaywall("Smart Savings Plan Locked")
            )}

            {/* AI FEATURE 3: MONEY LEAK DETECTOR */}
            {isPremium ? (
              leakReport && leakReport.leaks.length > 0 && (
                <View style={[styles.aiCard, { borderColor: getLeakColor(leakReport.status) }]}>
                  <View style={styles.aiHeader}>
                    <Ionicons name="analytics" size={20} color={getLeakColor(leakReport.status)} />
                    <Text style={[styles.aiTitle, { color: getLeakColor(leakReport.status) }]}>
                      Money Leak Detector ({leakReport.status})
                    </Text>
                  </View>
                  
                  <Text style={styles.aiSuggestion}>💡 {leakReport.actionableSuggestion}</Text>
                  
                  {leakReport.leaks.map((leak, i) => (
                    <View key={i} style={styles.leakRow}>
                      <View style={styles.leakBadge}>
                        <Text style={styles.leakBadgeText}>{leak.type}</Text>
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.leakTitle}>{leak.title}</Text>
                        <Text style={styles.leakDesc}>{leak.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )
            ) : (
              // Don't duplicate paywalls excessively; users see locked savings above
              null 
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Expense Breakdown</Text>
              <Text style={styles.subTitle}>{moneySummary}</Text>
              {pieData.length > 0 ? (
                <View style={styles.chartContainer}>
                  <PieChart 
                    data={pieData} 
                    donut 
                    radius={80} 
                    innerRadius={60} 
                    showText 
                    textSize={10} 
                    textColor="black"
                  />
                  <View style={{marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10}}>
                    {catStats.slice(0,3).map(c => (
                      <View key={c.category} style={{flexDirection: 'row', alignItems: 'center'}}>
                         <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: getCategoryColor(c.category), marginRight: 4}} />
                         <Text style={{fontSize: 10, color: '#666'}}>{c.category}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={{textAlign: 'center', color: '#aaa', marginVertical: 30}}>No spending data yet.</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 20 },
  header: { fontSize: 24, fontWeight: 'bold' },
  iconBtn: { padding: 5 },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, backgroundColor: '#e0e0e0', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  tabText: { color: '#777', fontWeight: '600' },
  activeTabText: { color: '#2f95dc' },
  card: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 15, padding: 20, borderRadius: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  subTitle: { fontSize: 12, color: '#666', marginBottom: 15 },
  legend: { fontSize: 10, color: '#999', textAlign: 'center', marginTop: 10 },
  row: { flexDirection: 'row', marginHorizontal: 20, gap: 15, marginBottom: 20 },
  statBox: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#666' },
  insightCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#c0392b', elevation: 2 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  insightTitle: { fontWeight: 'bold', marginLeft: 8, color: '#c0392b' },
  insightRow: { flexDirection: 'row', marginBottom: 5, paddingRight: 10 },
  insightText: { fontSize: 12, color: '#555', marginLeft: 8 },
  scoreCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, padding: 25, borderRadius: 16, elevation: 4, alignItems: 'center' },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  scoreTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 10 },
  scoreBig: { fontSize: 48, fontWeight: 'bold', color: '#2f95dc' },
  scoreLabel: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 15 },
  scoreRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  scoreSub: { fontSize: 12, color: '#888' },
  chartContainer: { alignItems: 'center', justifyContent: 'center' },
  paywallCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, padding: 30, borderRadius: 16, elevation: 2, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  paywallTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10 },
  paywallSub: { fontSize: 13, color: '#777', textAlign: 'center', marginVertical: 10 },
  unlockBtn: { backgroundColor: '#2f95dc', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 5 },
  unlockText: { color: '#fff', fontWeight: 'bold' },
  aiCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, padding: 15, borderRadius: 16, elevation: 3, borderTopWidth: 4 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  aiTitle: { fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
  aiSuggestion: { fontSize: 14, fontWeight: '600', color: '#34495e', marginBottom: 15, fontStyle: 'italic' },
  leakRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  leakBadge: { backgroundColor: '#eee', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 10, marginTop: 2 },
  leakBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#555' },
  leakTitle: { fontWeight: 'bold', fontSize: 13, color: '#333' },
  leakDesc: { fontSize: 12, color: '#666' },

  // SAVINGS CARD STYLES
  savingsCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 16, elevation: 3, borderTopWidth: 4, borderColor: '#27ae60' },
  savingsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  savingsTitle: { fontWeight: 'bold', marginLeft: 8, fontSize: 16, color: '#27ae60' },
  savingsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  savingsCol: { alignItems: 'center', flex: 1 },
  savingsLabel: { fontSize: 12, color: '#7f8c8d' },
  savingsValue: { fontSize: 20, fontWeight: 'bold' },
  barContainer: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10, backgroundColor: '#eee' },
  barSegment: { height: '100%' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 15 },
  legendText: { fontSize: 10, color: '#666' },
});