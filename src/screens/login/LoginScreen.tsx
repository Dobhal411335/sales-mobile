import React, {useState} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PasswordInput} from '../../components/common/PasswordInput';
import {colors} from '../../constants/colors';
import {config} from '../../constants/config';
import {useAuth} from '../../hooks/useAuth';

export function LoginScreen() {
  const {width, height} = useWindowDimensions();
  const isLandscape = width > height;
  const {login, isLoading, error, clearError} = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(
    null,
  );

  const handleSignIn = async () => {
    Keyboard.dismiss();
    await login({username, password});
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
        <Text style={styles.label}>Username / Email</Text>
        <TextInput
          style={[
            styles.input,
            focusedField === 'username' && styles.inputFocused,
          ]}
          value={username}
          onChangeText={(value) => {
            if (error) {
              clearError();
            }
            setUsername(value);
          }}
          onFocus={() => setFocusedField('username')}
          onBlur={() => setFocusedField(null)}
          placeholder="Enter username or email"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          autoComplete="username"
          returnKeyType="next"
          editable={!isLoading}
          accessibilityLabel="Username or email"
        />
      </View>

      <PasswordInput
        label="Password"
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
          <Text style={styles.signInButtonText}>Sign In</Text>
        )}
      </Pressable>

      <Text style={styles.mockNote}>
        Temporary mock login — not connected to the real backend.
      </Text>
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
  mockNote: {
    marginTop: 16,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
