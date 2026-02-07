import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
// IMPORT SAFE AREA PROVIDER
import { SafeAreaProvider } from 'react-native-safe-area-context'; 

import { initDatabase, checkSession } from './src/services/database';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/auth/AuthScreens';
import { AuthContext } from './src/context/AuthContext'; 

export default function App() {
  const [dbLoaded, setDbLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
        const hasSession = await checkSession();
        setIsAuthenticated(hasSession);
      } catch (e) {
        console.error('Startup failed:', e);
      } finally {
        setDbLoaded(true);
        setCheckingAuth(false);
      }
    };

    setup();
  }, []);

  const authContext = React.useMemo(
    () => ({
      signOut: () => {
        setIsAuthenticated(false);
      },
    }),
    []
  );

  if (!dbLoaded || checkingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2f95dc" />
        <Text style={{ marginTop: 10 }}>Initializing Vita...</Text>
      </View>
    );
  }

  return (
    // WRAP EVERYTHING IN SAFE AREA PROVIDER
    <SafeAreaProvider>
      <AuthContext.Provider value={authContext}>
        <StatusBar style="dark" />
        <NavigationContainer>
          {isAuthenticated ? (
            <AppNavigator />
          ) : (
            <AuthScreen onLoginSuccess={() => setIsAuthenticated(true)} />
          )}
        </NavigationContainer>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}