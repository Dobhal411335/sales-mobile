import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PasswordInput} from '../../components/common/PasswordInput';
import {colors} from '../../constants/colors';
import {config} from '../../constants/config';
import {useAuth} from '../../hooks/useAuth';

export function LoginScreen() {
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const {
    login,
    activateAndLogin,
    isLoading,
    error,
    clearError,
    deviceRegistered,
    refreshDeviceStatus,
    rememberEmployeeId,
    loadRememberedEmployeeId,
  } = useAuth();

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passcodeVisible, setPasscodeVisible] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [focusedField, setFocusedField] = useState<
    'employeeId' | 'password' | 'passcode' | null
  >(null);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [pendingCredentials, setPendingCredentials] = useState<{
    employeeId: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    void refreshDeviceStatus();
    void loadRememberedEmployeeId().then((savedId) => {
      if (savedId) {
        setEmployeeId(savedId);
        setRememberDevice(true);
      }
    });
  }, [loadRememberedEmployeeId, refreshDeviceStatus]);

  const finishRememberDevice = useCallback(
    async (id: string) => {
      if (rememberDevice && id.trim()) {
        await rememberEmployeeId(id.trim());
      } else if (!rememberDevice) {
        await rememberEmployeeId(null);
      }
    },
    [rememberDevice, rememberEmployeeId],
  );

  const handleSignIn = async () => {
    Keyboard.dismiss();
    const usingPasscode = deviceRegistered && passcode.trim().length > 0;

    const result = usingPasscode
      ? await login({passcode}, {usePasscode: true})
      : await login({employeeId, password});

    if (result.success) {
      await finishRememberDevice(employeeId);
      return;
    }

    if ('needsActivation' in result && result.needsActivation) {
      setPendingCredentials({employeeId: employeeId.trim(), password});
      setShowActivationModal(true);
    }
  };

  const handleActivationSubmit = async () => {
    if (!pendingCredentials) {
      return;
    }

    const result = await activateAndLogin({
      employeeId: pendingCredentials.employeeId,
      password: pendingCredentials.password,
      activationCode,
    });

    if (result.success) {
      setShowActivationModal(false);
      setActivationCode('');
      setPendingCredentials(null);
      await finishRememberDevice(pendingCredentials.employeeId);
    }
  };

  const brandPanel = (
    <View style={[styles.brandPanel, !isLandscape && styles.brandPanelPortrait]}>
      <Text style={styles.brandName} accessibilityRole="header">
        {config.APP_NAME}
      </Text>
      <Text style={styles.brandSubtitle}>{config.APP_SUBTITLE}</Text>
      <Text style={styles.brandNote}>
        Logo asset can be added later. Text branding is temporary.
      </Text>
    </View>
  );

  const formPanel = (
    <View style={[styles.formPanel, !isLandscape && styles.formPanelPortrait]}>
      <Text style={styles.formTitle}>Employee Login</Text>
      <Text style={styles.formHint}>Sign in to start your shift</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Employee ID</Text>
        <TextInput
          style={[
            styles.input,
            focusedField === 'employeeId' && styles.inputFocused,
          ]}
          value={employeeId}
          onChangeText={(value) => {
            if (error) {
              clearError();
            }
            setEmployeeId(value);
          }}
          onFocus={() => setFocusedField('employeeId')}
          onBlur={() => setFocusedField(null)}
          placeholder="e.g. EMP-001"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
          autoCorrect={false}
          textContentType="username"
          autoComplete="username"
          returnKeyType="next"
          editable={!isLoading}
          accessibilityLabel="Employee ID"
        />
      </View>

      <PasswordInput
        label="PIN / Password"
        value={password}
        onChangeText={(value) => {
          if (error) {
            clearError();
          }
          setPassword(value);
        }}
        onFocus={() => setFocusedField('password')}
        onBlur={() => setFocusedField(null)}
        isFocused={focusedField === 'password'}
        visible={passwordVisible}
        onToggleVisibility={() => setPasswordVisible((prev) => !prev)}
        placeholder="Enter password"
        editable={!isLoading}
        onSubmitEditing={handleSignIn}
      />

      <Pressable
        style={styles.rememberRow}
        onPress={() => setRememberDevice((prev) => !prev)}
        disabled={isLoading}
        accessibilityRole="checkbox"
        accessibilityState={{checked: rememberDevice}}>
        <View style={[styles.checkbox, rememberDevice && styles.checkboxChecked]}>
          {rememberDevice ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.rememberLabel}>Remember me on this terminal</Text>
      </Pressable>

      {deviceRegistered ? (
        <>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <PasswordInput
            label="Passcode"
            value={passcode}
            onChangeText={(value) => {
              if (error) {
                clearError();
              }
              setPasscode(value);
            }}
            onFocus={() => setFocusedField('passcode')}
            onBlur={() => setFocusedField(null)}
            isFocused={focusedField === 'passcode'}
            visible={passcodeVisible}
            onToggleVisibility={() => setPasscodeVisible((prev) => !prev)}
            placeholder="Enter passcode"
            editable={!isLoading}
            keyboardType="number-pad"
            onSubmitEditing={handleSignIn}
          />
        </>
      ) : null}

      {error ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Pressable
        style={({pressed}) => [
          styles.signInButton,
          pressed && !isLoading && styles.signInButtonPressed,
          isLoading && styles.signInButtonDisabled,
        ]}
        onPress={handleSignIn}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
        accessibilityState={{disabled: isLoading, busy: isLoading}}>
        {isLoading ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.signInButtonText}>Clock In</Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
            <View
              style={[
                styles.content,
                isLandscape ? styles.contentLandscape : styles.contentPortrait,
              ]}>
              {brandPanel}
              {formPanel}
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showActivationModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isLoading) {
            setShowActivationModal(false);
          }
        }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Activate POS Device</Text>
            <Text style={styles.modalDescription}>
              This device has not yet been registered. Enter the activation code
              provided by your administrator.
            </Text>

            <Text style={styles.label}>Activation Code</Text>
            <TextInput
              style={[styles.input, styles.activationInput]}
              value={activationCode}
              onChangeText={setActivationCode}
              placeholder="EMP-XXXX-XXXX"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isLoading}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalSecondaryButton}
                onPress={() => setShowActivationModal(false)}
                disabled={isLoading}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalPrimaryButton, isLoading && styles.signInButtonDisabled]}
                onPress={handleActivationSubmit}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.modalPrimaryText}>Activate Device</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    minHeight: '100%',
  },
  contentLandscape: {
    flexDirection: 'row',
  },
  contentPortrait: {
    flexDirection: 'column',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  brandPanel: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingVertical: 40,
  },
  brandPanelPortrait: {
    flex: 0,
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 32,
  },
  brandName: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.surface,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.surface,
    opacity: 0.95,
    marginBottom: 16,
  },
  brandNote: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.surface,
    opacity: 0.8,
    maxWidth: 280,
  },
  formPanel: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingVertical: 40,
    backgroundColor: colors.cream,
  },
  formPanelPortrait: {
    flex: 0,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  formHint: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 28,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  rememberLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 12,
  },
  signInButton: {
    marginTop: 8,
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonPressed: {
    backgroundColor: colors.primaryHover,
  },
  signInButtonDisabled: {
    opacity: 0.75,
  },
  signInButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.surface,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  activationInput: {
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalSecondaryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalPrimaryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
});
