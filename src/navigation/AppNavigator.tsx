import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
// IMPORT SAFE AREA HOOK
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import TrackerScreen from '../screens/tracker/TrackerScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import VaultScreen from '../screens/vault/VaultScreen';
import GoalsScreen from '../screens/goals/GoalsScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  // Get dynamic safe area insets (top, bottom, left, right)
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2f95dc',
        tabBarInactiveTintColor: 'gray',
        
        // DYNAMIC STYLING
        tabBarStyle: { 
          // Base height (60) + whatever space the system buttons need
          height: 60 + insets.bottom, 
          // Push icons up by the system button height + a little buffer
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10, 
          paddingTop: 10,
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 10, // Shadow for Android
          shadowColor: '#000', // Shadow for iOS
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
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