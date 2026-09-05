import React from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {colors} from './src/constants/colors';
import {ToastProvider} from './src/components/common/Toast';
import {AppNavigator} from './src/navigation/AppNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <AppNavigator />
        <ToastProvider />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
});

export default App;
