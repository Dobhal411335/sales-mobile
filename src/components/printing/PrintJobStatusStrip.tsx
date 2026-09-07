import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';
import {fetchPrintJob, retryPrintJob} from '../../services/printJobService';
import {socketClient} from '../../socket/socket';
import type {PrintJobEventPayload, PrintJobStatus} from '../../types/printJob';
import {getPrintJobStatusLabel} from '../../utils/printJobDisplay';

interface PrintJobStatusStripProps {
  printJobId: string | null | undefined;
  onViewJob?: (jobId: string) => void;
  label?: string;
  printingText?: string;
}

export function PrintJobStatusStrip({
  printJobId,
  onViewJob,
  label = 'Print job',
  printingText,
}: PrintJobStatusStripProps) {
  const [status, setStatus] = useState<PrintJobStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const loadStatus = useCallback(
    async (isSilent = false) => {
      if (!printJobId) {
        setStatus(null);
        setErrorMessage(null);
        return;
      }

      if (!isSilent) {
        setLoading(true);
      }
      try {
        const response = await fetchPrintJob(printJobId);
        if (response.success && response.data?.job) {
          setStatus(response.data.job.status);
          setErrorMessage(response.data.job.errorMessage ?? null);
        }
      } catch {
        // Keep last known status
      } finally {
        if (!isSilent) {
          setLoading(false);
        }
      }
    },
    [printJobId],
  );

  useEffect(() => {
    void loadStatus();

    // Socket listener for instant updates
    const socket = socketClient.getInstance();
    const handleJobUpdated = (payload: PrintJobEventPayload) => {
      if (String(payload?.printJobId) === String(printJobId)) {
        if (payload?.status) {
          setStatus(payload.status);
        }
        if (payload?.errorMessage !== undefined) {
          setErrorMessage(payload.errorMessage ?? null);
        }
      }
    };

    if (socket) {
      socket.on('PRINT_JOB_UPDATED', handleJobUpdated);
    }

    // Poll every 1.5s while the job is in-flight (QUEUED, PRINTING, or initial fetch)
    const isTerminal =
      status === 'PRINTED' || status === 'FAILED' || status === 'CANCELLED';

    let interval: ReturnType<typeof setInterval> | null = null;
    if (printJobId && !isTerminal) {
      interval = setInterval(() => {
        void loadStatus(true);
      }, 1500);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (socket) {
        socket.off('PRINT_JOB_UPDATED', handleJobUpdated);
      }
    };
  }, [printJobId, status, loadStatus]);

  const handleRetry = async () => {
    if (!printJobId) {
      return;
    }
    setRetrying(true);
    try {
      const result = await retryPrintJob(printJobId);
      if (result.success && result.data?.job) {
        setStatus(result.data.job.status);
        setErrorMessage(result.data.job.errorMessage ?? null);
      }
    } finally {
      setRetrying(false);
    }
  };

  if (!printJobId) {
    return (
      <View style={styles.container}>
        <Text style={styles.mutedText}>No print job was created.</Text>
      </View>
    );
  }

  const isPrinting =
    status === 'QUEUED' ||
    status === 'PRINTING' ||
    (!status && loading);
  const isFailed = status === 'FAILED';
  const isPrinted = status === 'PRINTED';

  const defaultPrintingText = label.toLowerCase().includes('bar')
    ? 'Bar ticket is printing...'
    : label.toLowerCase().includes('receipt')
    ? 'Receipt is printing...'
    : 'KOT is printing...';

  const statusDisplay = isPrinting
    ? (printingText || defaultPrintingText)
    : status
    ? getPrintJobStatusLabel(status)
    : 'Loading...';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{label}</Text>
      <View style={styles.statusRow}>
        {isPrinting ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : null}
        <Text
          style={[
            styles.statusText,
            isPrinting && styles.statusPrinting,
            isFailed && styles.statusFailed,
            isPrinted && styles.statusSuccess,
          ]}>
          {statusDisplay}
        </Text>
      </View>
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      <View style={styles.actions}>
        {isFailed ? (
          <Pressable
            style={styles.retryButton}
            onPress={handleRetry}
            disabled={retrying}
            accessibilityRole="button"
            accessibilityLabel="Retry print job">
            <Text style={styles.retryText}>
              {retrying ? 'Retrying...' : 'Retry Print'}
            </Text>
          </Pressable>
        ) : null}
        {onViewJob ? (
          <Pressable
            style={styles.linkButton}
            onPress={() => onViewJob(printJobId)}
            accessibilityRole="button"
            accessibilityLabel="View print job">
            <Text style={styles.linkText}>View Print Job</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  statusPrinting: {
    color: colors.primary,
    fontWeight: '700',
  },
  statusFailed: {
    color: colors.error,
  },
  statusSuccess: {
    color: colors.success,
  },
  mutedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.surface,
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
