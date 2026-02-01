import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import TrackerScreen from '../screens/tracker/TrackerScreen'; 

// Temporary Placeholder for Vault (We will build this later)
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
        headerShown: false, // We hide the default header to use our own
        tabBarActiveTintColor: '#2f95dc',
        tabBarInactiveTintColor: 'gray',
        // Dynamic Icon Logic
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Tracker') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Vault') {
            iconName = focused ? 'folder-open' : 'folder-open-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tracker" component={TrackerScreen} />
      <Tab.Screen name="Vault" component={VaultPlaceholder} />
    </Tab.Navigator>
  );
}