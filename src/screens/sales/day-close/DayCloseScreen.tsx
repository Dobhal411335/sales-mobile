import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors} from '../../../constants/colors';
import type {SalesStackParamList} from '../../../navigation/types';
import {useAuth} from '../../../hooks/useAuth';
import {
  closeRestaurant,
  validateDayClose,
} from '../../../services/dayCloseService';
import type {DayCloseBlockers} from '../../../types/dayClose';
import {DayCloseBlocked} from './DayCloseBlocked';
import {DayCloseConfirmation} from './DayCloseConfirmation';
import {DayCloseReady} from './DayCloseReady';

type Props = NativeStackScreenProps<SalesStackParamList, 'DayClose'>;

type ScreenPhase =
  | 'loading'
  | 'error'
  | 'blocked'
  | 'ready'
  | 'success';

export function DayCloseScreen({navigation}: Props) {
  const {width} = useWindowDimensions();
  const contentWidth = Math.min(width * 0.82, 960);
  const {logout} = useAuth();

  const [phase, setPhase] = useState<ScreenPhase>('loading');
  const [blockers, setBlockers] = useState<DayCloseBlockers | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validatingRef = useRef(false);

  const runValidation = useCallback(async () => {
    if (validatingRef.current) {
      return;
    }

    validatingRef.current = true;
    setPhase('loading');
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await validateDayClose();
    validatingRef.current = false;

    if (!result.success || !result.data) {
      setErrorMessage(
        result.message ?? 'Unable to check restaurant status.',
      );
      setPhase('error');
      return;
    }

    setBlockers(result.data);
    setPhase(result.data.canClose ? 'ready' : 'blocked');
  }, []);

  useFocusEffect(
    useCallback(() => {
      void runValidation();
    }, [runValidation]),
  );

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenConfirm = useCallback(() => {
    setConfirmVisible(true);
  }, []);

  const handleConfirmClose = useCallback(async () => {
    if (closing) {
      return;
    }

    setClosing(true);
    const result = await closeRestaurant();
    setClosing(false);
    setConfirmVisible(false);

    if (result.success) {
      setSuccessMessage(
        result.message ?? 'Restaurant closed successfully.',
      );
      setPhase('success');
      logout();
      return;
    }

    if (result.code === 'CLOSE_BLOCKED' && result.data) {
      setBlockers(result.data);
      setPhase('blocked');
      setErrorMessage(
        result.message ??
          'Clear pending orders and booked tables before day close.',
      );
      return;
    }

    setErrorMessage(result.message ?? 'Unable to close restaurant.');
    setPhase('error');
  }, [closing, logout]);

  const renderBody = () => {
    if (phase === 'loading') {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateTitle}>Checking restaurant status…</Text>
          <Text style={styles.stateHint}>
            Reviewing pending orders and booked tables.
          </Text>
        </View>
      );
    }

    if (phase === 'error') {
      return (
        <View style={styles.centerState}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.stateTitle}>
            {errorMessage ?? 'Unable to check restaurant status.'}
          </Text>
          <Pressable
            style={({pressed}) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
            onPress={() => void runValidation()}
            accessibilityRole="button"
            accessibilityLabel="Try again">
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    if (phase === 'success') {
      return (
        <View style={styles.centerState}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.stateTitle}>
            {successMessage ?? 'Restaurant closed successfully.'}
          </Text>
          <Text style={styles.stateHint}>
            All employees have been logged out.
          </Text>
        </View>
      );
    }

    if (phase === 'blocked' && blockers) {
      return (
        <DayCloseBlocked
          blockers={blockers}
          navigation={navigation}
          onCancel={handleCancel}
        />
      );
    }

    if (phase === 'ready') {
      return (
        <DayCloseReady
          closing={closing}
          onClosePress={handleOpenConfirm}
          onCancel={handleCancel}
        />
      );
    }

    return null;
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.content, {width: contentWidth}]}>
          <View style={styles.pageHeader}>
            <Pressable
              style={({pressed}) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>
            <Text style={styles.pageTitle}>Day Close</Text>
          </View>

          {renderBody()}
        </View>
      </ScrollView>

      {closing ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>Closing restaurant…</Text>
            <Text style={styles.loadingHint}>Logging out all employees…</Text>
          </View>
        </View>
      ) : null}

      <DayCloseConfirmation
        visible={confirmVisible}
        closing={closing}
        onConfirm={() => void handleConfirmClose()}
        onCancel={() => {
          if (!closing) {
            setConfirmVisible(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    gap: 20,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: colors.cream,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    maxWidth: 420,
  },
  stateHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 20,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    textAlign: 'center',
    lineHeight: 48,
    fontSize: 24,
    fontWeight: '800',
    color: colors.error,
    overflow: 'hidden',
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.success,
  },
  retryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  retryButtonPressed: {
    backgroundColor: colors.primaryHover,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    backgroundColor: colors.text,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.surface,
    textAlign: 'center',
  },
  loadingHint: {
    fontSize: 14,
    color: '#D4D4D8',
    textAlign: 'center',
  },
});
