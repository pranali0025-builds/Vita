import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { 
  getLoadHistory, calculateStabilityScore, getCategoryStats, getFinancialReport, 
  detectBurnoutLoop, getWeeklyTaskStats, 
  StabilityMetrics, LoadPoint, CategoryStat 
} from '../../services/database';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [loadHistory, setLoadHistory] = useState<LoadPoint[]>([]);
  const [stability, setStability] = useState<StabilityMetrics | null>(null);
  const [catStats, setCatStats] = useState<CategoryStat[]>([]);
  const [moneySummary, setMoneySummary] = useState('');
  
  // New States for Checklist Compliance
  const [burnoutInsights, setBurnoutInsights] = useState<string[]>([]);
  const [weeklyCompletion, setWeeklyCompletion] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // 1. Weekly Data
      const history = await getLoadHistory(7);
      setLoadHistory(history);

      // Checklist fix: Fetch Burnout Insights & Completion Rate
      const insights = await detectBurnoutLoop();
      setBurnoutInsights(insights);
      const weeklyStats = await getWeeklyTaskStats();
      setWeeklyCompletion(weeklyStats.avgCompletionRate);
      
      // 2. Stability & Score
      const stab = await calculateStabilityScore();
      setStability(stab);

      // 3. Monthly Data
      const cats = await getCategoryStats(currentMonth);
      setCatStats(cats);
      const rep = await getFinancialReport(currentMonth);
      setMoneySummary(rep.summary);
    } catch (e) {
      console.error("Error loading report data", e);
    } finally {
      setLoading(false);
    }
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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Reports & Analysis</Text>

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
            {/* WEEKLY CONTENT */}
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

            {/* Checklist Fix: Completion Rate & Stats */}
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

            {/* Checklist Fix: Burnout Insights */}
            {burnoutInsights.length > 0 && (
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
            )}
          </View>
        ) : (
          <View>
            {/* MONTHLY CONTENT */}
            {stability && (
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
  header: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 20 },
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
});