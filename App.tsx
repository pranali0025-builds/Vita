import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, ActivityIndicator } from 'react-native';
import { initDatabase } from './src/services/database'; // Import the DB logic we wrote earlier
import AppNavigator from './src/navigation/AppNavigator'; // Import the navigation we just wrote

export default function App() {
  const [dbLoaded, setDbLoaded] = useState(false);

  // This runs ONCE when the app launches
  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase(); // Create tables if they don't exist
        console.log('Database initialized successfully');
        setDbLoaded(true);
      } catch (e) {
        console.error('Database failed to load:', e);
      }
    };

    setup();
  }, []);

  // Show a loading spinner while waiting for SQLite
  if (!dbLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Initializing Vita...</Text>
      </View>
    );
  }

  // Once loaded, show the App
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}