import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native'; // Import Platform to tweak Android vs iOS

// Import Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import TrackerScreen from '../screens/tracker/TrackerScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import VaultScreen from '../screens/vault/VaultScreen';
import GoalsScreen from '../screens/goals/GoalsScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2f95dc',
        tabBarInactiveTintColor: 'gray',
        // TWEAKED STYLES FOR SAFE AREA
        tabBarStyle: { 
          height: Platform.OS === 'android' ? 70 : 85, // Taller bar for Android buttons
          paddingBottom: Platform.OS === 'android' ? 10 : 30, // Push icons up away from system bar
          paddingTop: 10
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === 'Tracker') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Goals') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Reports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Vault') {
            iconName = focused ? 'folder-open' : 'folder-open-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tracker" component={TrackerScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} /> 
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Vault" component={VaultScreen} />
    </Tab.Navigator>
  );
}