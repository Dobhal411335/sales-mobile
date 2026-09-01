import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {TabletModal} from '../common/TabletModal';
import {colors} from '../../constants/colors';
import {EMAIL_RE, formatBusinessDate} from '../../utils/eodFormat';

interface EmailReportModalProps {
  visible: boolean;
  businessDate: string;
  defaultEmail: string;
  apiConfigured: boolean;
  onClose: () => void;
  onSend: (email: string) => Promise<boolean>;
}

export function EmailReportModal({
  visible,
  businessDate,
  defaultEmail,
  apiConfigured,
  onClose,
  onSend,
}: EmailReportModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setEmail(defaultEmail);
      setError(null);
    }
  }, [visible, defaultEmail]);

  const handleSend = async () => {
    const to = email.trim();
    if (!EMAIL_RE.test(to)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!apiConfigured) {
      setError('Email requires backend connection.');
      return;
    }
    setSending(true);
    setError(null);
    const ok = await onSend(to);
    setSending(false);
    if (ok) {
      onClose();
    }
  };

  return (
    <TabletModal
      visible={visible}
      title="Send End-of-Day Report"
      onClose={onClose}
      maxWidth={520}
      footerActions={[
        {
          label: 'Cancel',
          onPress: onClose,
          variant: 'secondary',
          disabled: sending,
        },
        {
          label: sending ? 'Sending…' : 'Send Report',
          onPress: handleSend,
          variant: 'primary',
          disabled: sending,
          loading: sending,
        },
      ]}>
      <View style={styles.content}>
        <Text style={styles.description}>
          Email PDF and Excel for {formatBusinessDate(businessDate)}.
        </Text>

        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="manager@example.com"
          placeholderTextColor={colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!sending}
        />

        <View style={styles.attachments}>
          <Text style={styles.attachmentsTitle}>Attachments</Text>
          <Text style={styles.attachmentItem}>End-of-Day-{businessDate}.pdf</Text>
          <Text style={styles.attachmentItem}>End-of-Day-{businessDate}.xlsx</Text>
        </View>

        {!apiConfigured ? (
          <Text style={styles.apiNote}>Email requires backend connection.</Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </TabletModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  attachments: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    padding: 12,
    gap: 4,
  },
  attachmentsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  attachmentItem: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  apiNote: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
});
