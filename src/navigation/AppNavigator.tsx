import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import TrackerScreen from '../screens/tracker/TrackerScreen';
import ReportsScreen from '../screens/reports/ReportsScreen'; // <--- NEW IMPORT

// We still have one placeholder left for the Vault (Feature 4)
const VaultPlaceholder = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Document Vault (Coming Soon)</Text>
  </View>
);

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2f95dc',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            // Dashboard is now the "Daily Tasks" view
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === 'Tracker') {
            iconName = focused ? 'wallet' : 'wallet-outline';
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
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Vault" component={VaultPlaceholder} />
    </Tab.Navigator>
  );
}