import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, typography } from './src/theme/tokens';

import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import DashboardScreen from './src/screens/owner/DashboardScreen';
import KilnFiringScreen from './src/screens/owner/KilnFiringScreen';

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Text style={styles.loadingWordmark}>
        aru<Text style={{ color: colors.clay }}>ru</Text>
      </Text>
      <ActivityIndicator color={colors.clay} style={{ marginTop: 24 }} />
    </View>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <LoginScreen navigation={{ navigate: () => {} }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <DashboardScreen
        navigation={{ navigate: () => {}, goBack: () => {} }}
        route={{ params: { tenantId: 'demo' } }}
      />
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" backgroundColor={colors.surface} />
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWordmark: {
    fontFamily: typography.display,
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -0.5,
  },
});
