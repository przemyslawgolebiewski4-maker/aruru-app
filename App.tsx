import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/hooks/useAuth';
import { AppNavigationContainer } from './src/navigation';
import { colors } from './src/theme/tokens';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" backgroundColor={colors.surface} />
        <AppNavigationContainer />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
