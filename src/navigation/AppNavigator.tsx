import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (isInitializing) {
    return (
      <View style={styles.bootstrap}>
        <ActivityIndicator size="large" color={colors.primary} />
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
});
