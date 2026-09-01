import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {useAuthStore} from '../store/authStore';
import {AuthNavigator} from './AuthNavigator';
import {SalesNavigator} from './SalesNavigator';

export function AppNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <NavigationContainer>
      {isAuthenticated ? <SalesNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
