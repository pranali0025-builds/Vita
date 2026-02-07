import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { colors } from '../../theme/colors';
import { loginUser, registerUser } from '../../services/database';
import { Logo } from '../../components/Logo';
import { Ionicons } from '@expo/vector-icons';

interface AuthProps {
  onLoginSuccess: () => void;
}

const { width } = Dimensions.get('window');

export const AuthScreen: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  // Start with INTRO_1 instead of WELCOME
  const [mode, setMode] = useState<'INTRO_1' | 'INTRO_2' | 'WELCOME' | 'LOGIN' | 'SIGNUP'>('INTRO_1');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill all fields');
    const success = await loginUser(email, password);
    if (success) {
      onLoginSuccess();
    } else {
      Alert.alert('Failed', 'Invalid credentials');
    }
  };

  const handleSignup = async () => {
    if (!name || !email || !password) return Alert.alert('Error', 'Please fill all fields');
    const success = await registerUser(name, email, password);
    if (success) {
      Alert.alert('Success', 'Account created! Logging in...');
      onLoginSuccess();
    } else {
      Alert.alert('Failed', 'User already exists');
    }
  };

  // --- SCREEN 1: WELCOME INTRO ---
  if (mode === 'INTRO_1') {
    return (
      <View style={styles.container}>
        <View style={styles.introContent}>
          <Logo size={160} showText={false} />
          <Text style={styles.introTitle}>Welcome to Vita</Text>
          <Text style={styles.introText}>
            Your personal companion for stability, growth, and adulting without the stress.
          </Text>
        </View>
        <View style={styles.bottomContainer}>
          <View style={styles.dotsContainer}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
          </View>
          <TouchableOpacity style={styles.fabButton} onPress={() => setMode('INTRO_2')}>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- SCREEN 2: VALUE PROP ---
  if (mode === 'INTRO_2') {
    return (
      <View style={styles.container}>
        <View style={styles.introContent}>
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#e3f2fd' }]}>
              <Ionicons name="wallet" size={32} color={colors.primary} />
            </View>
            <View style={[styles.iconCircle, { backgroundColor: '#fef9e7' }]}>
              <Ionicons name="flash" size={32} color={colors.warning} />
            </View>
            <View style={[styles.iconCircle, { backgroundColor: '#e8f8f5' }]}>
              <Ionicons name="shield-checkmark" size={32} color={colors.success} />
            </View>
          </View>
          <Text style={styles.introTitle}>Track Everything</Text>
          <Text style={styles.introText}>
            Manage money, daily tasks, life goals, and wellbeing in one secure place.
          </Text>
        </View>
        <View style={styles.bottomContainer}>
          <View style={styles.dotsContainer}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.activeDot]} />
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setMode('WELCOME')}>
            <Text style={styles.btnText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- SCREEN 3: AUTH SELECTION (Old Welcome) ---
  if (mode === 'WELCOME') {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Logo size={120} />
        </View>
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setMode('LOGIN')}>
            <Text style={styles.btnText}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setMode('SIGNUP')}>
            <Text style={styles.btnTextSecondary}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- LOGIN / SIGNUP FORMS ---
  return (
    <View style={styles.formContainer}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Logo size={60} showText={false} />
      </View>

      <Text style={styles.header}>{mode === 'LOGIN' ? 'Welcome Back' : 'Join Vita'}</Text>
      <Text style={styles.subHeader}>
        {mode === 'LOGIN' ? 'Enter your credentials to continue.' : 'Start your stability journey today.'}
      </Text>

      {mode === 'SIGNUP' && (
        <TextInput 
          placeholder="Full Name" 
          style={styles.input} 
          value={name} 
          onChangeText={setName} 
        />
      )}
      <TextInput 
        placeholder="Email Address" 
        style={styles.input} 
        keyboardType="email-address" 
        autoCapitalize="none"
        value={email} 
        onChangeText={setEmail} 
      />
      <TextInput 
        placeholder="Password" 
        style={styles.input} 
        secureTextEntry 
        value={password} 
        onChangeText={setPassword} 
      />

      <TouchableOpacity 
        style={styles.btnPrimary} 
        onPress={mode === 'LOGIN' ? handleLogin : handleSignup}
      >
        <Text style={styles.btnText}>{mode === 'LOGIN' ? 'Log In' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}>
        <Text style={styles.switchText}>
          {mode === 'LOGIN' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={{marginTop: 20}} onPress={() => setMode('WELCOME')}>
        <Text style={{color: '#999'}}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 30 },
  
  // INTRO STYLES
  introContent: { flex: 3, justifyContent: 'center', alignItems: 'center' },
  introTitle: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginTop: 30, marginBottom: 10, textAlign: 'center' },
  introText: { fontSize: 16, color: colors.subText, textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 },
  
  iconRow: { flexDirection: 'row', gap: 20 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  
  dotsContainer: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  activeDot: { backgroundColor: colors.primary, width: 20 },
  
  fabButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // EXISTING STYLES
  logoContainer: { flex: 2, justifyContent: 'center', alignItems: 'center' },
  bottomContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', gap: 15 },
  
  formContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 30 },
  header: { fontSize: 32, fontWeight: 'bold', color: colors.text, marginBottom: 10, textAlign: 'center' },
  subHeader: { fontSize: 16, color: colors.subText, marginBottom: 30, textAlign: 'center' },
  
  input: { backgroundColor: colors.cardBg, padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
  
  btnPrimary: { backgroundColor: colors.primary, padding: 18, borderRadius: 12, alignItems: 'center', width: '100%' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  btnSecondary: { backgroundColor: 'transparent', padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: colors.primary, width: '100%' },
  btnTextSecondary: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  
  switchText: { textAlign: 'center', color: colors.primary, marginTop: 15, fontWeight: '600' },
});