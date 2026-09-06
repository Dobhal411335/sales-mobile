import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, useWindowDimensions, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {TastyBitesLogo} from '../components/branding/TastyBitesLogo';
import {colors} from '../constants/colors';
import {useEmployeeSessionRefresh} from '../hooks/useEmployeeSessionRefresh';
import {useSocketLifecycle} from '../socket/socket';
import {useAuthStore} from '../store/authStore';
import {AuthNavigator} from './AuthNavigator';
import {SalesNavigator} from './SalesNavigator';

function AuthenticatedApp() {
  useEmployeeSessionRefresh(true);
  useSocketLifecycle();
  return <SalesNavigator />;
}

export function AppNavigator() {
  const {width, height} = useWindowDimensions();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const initialize = useAuthStore((state) => state.initialize);

  const splashLogoSize = Math.min(
    Math.max(Math.round(Math.min(width, height) * 0.35), 160),
    260,
  );

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (isInitializing) {
    return (
      <View style={styles.bootstrap}>
        <TastyBitesLogo
          variant="full"
          size={splashLogoSize}
          accessibilityLabel="Tasty Bites Restaurant POS"
        />
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.bootstrapSpinner}
        />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AuthenticatedApp /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  bootstrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  bootstrapSpinner: {
    marginTop: 24,
  },
});
