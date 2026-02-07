import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface LogoProps {
  size?: number; // Dynamic sizing
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 80, showText = true }) => {
  return (
    <View style={styles.container}>
      {/* Icon Circle */}
      <View style={[
        styles.iconCircle, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2 
        }
      ]}>
        <Ionicons name="leaf" size={size * 0.6} color={colors.white} />
      </View>

      {/* Text Branding */}
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.title, { fontSize: size * 0.4 }]}>Vita</Text>
          <Text style={styles.subtitle}>The Adulting OS</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8, // Shadow for Android
    shadowColor: colors.primary, // Shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 10,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: colors.subText,
    marginTop: 2,
    letterSpacing: 0.5,
  }
});