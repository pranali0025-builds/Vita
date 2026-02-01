import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import TrackerScreen from '../screens/tracker/TrackerScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import VaultScreen from '../screens/vault/VaultScreen';
import GoalsScreen from '../screens/goals/GoalsScreen'; // <--- NEW IMPORT

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2f95dc',
        tabBarInactiveTintColor: 'gray',
        // Add a little padding for the 5-tab layout
        tabBarStyle: { height: 60, paddingBottom: 5 },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === 'Tracker') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Goals') {
            iconName = focused ? 'trophy' : 'trophy-outline'; // <--- NEW ICON
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