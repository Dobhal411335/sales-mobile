import {useCallback, useEffect, useState} from 'react';
import {
  downloadEodExport,
  emailEodReport,
  fetchEodHistory,
  fetchEodReport,
  isEodApiConfigured,
  saveEodReport,
} from '../services/eodService';
import type {
  EodActionFeedback,
  EodExportKind,
  EodHistoryRow,
  EodReport,
} from '../types/eod';
import {parseDepositInput, todayLocalISO} from '../utils/eodFormat';
import {shareEodExportFile} from '../utils/eodExport';

interface UseEodReportResult {
  businessDate: string;
  setBusinessDate: (date: string) => void;
  report: EodReport | null;
  saved: boolean;
  preferLive: boolean;
  actualDeposit: string;
  setActualDeposit: (value: string) => void;
  defaultEmail: string;
  loading: boolean;
  saving: boolean;
  downloading: EodExportKind | null;
  history: EodHistoryRow[];
  historyLoading: boolean;
  error: string | null;
  feedback: EodActionFeedback;
  clearFeedback: () => void;
  refreshLive: () => Promise<void>;
  saveReport: () => Promise<void>;
  downloadExport: (kind: EodExportKind) => Promise<void>;
  downloadExportForDate: (date: string, kind: EodExportKind) => Promise<void>;
  sendEmail: (to: string) => Promise<boolean>;
  loadHistory: () => Promise<void>;
  viewHistoryDate: (date: string) => void;
  apiConfigured: boolean;
}

export function useEodReport(): UseEodReportResult {
  const [businessDate, setBusinessDateState] = useState(todayLocalISO());
  const [report, setReport] = useState<EodReport | null>(null);
  const [saved, setSaved] = useState(false);
  const [preferLive, setPreferLive] = useState(true);
  const [actualDeposit, setActualDeposit] = useState('');
  const [defaultEmail, setDefaultEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<EodExportKind | null>(null);
  const [history, setHistory] = useState<EodHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<EodActionFeedback>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const loadReport = useCallback(async () => {
    if (!businessDate) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchEodReport(businessDate, preferLive);
      if (!response.success || !response.data) {
        setReport(null);
        setError(
          response.message ??
            'Unable to load the End-of-Day report.',
        );
        return;
      }
      setReport(response.data.report);
      setSaved(Boolean(response.data.saved));
      const email = response.data.report.meta?.restaurantEmail ?? '';
      if (email) {
        setDefaultEmail(email);
      }
      const dep = response.data.report.cashDeposit?.actualDeposit;
      setActualDeposit(dep != null && dep !== 0 ? String(dep) : '');
    } catch {
      setReport(null);
      setError('Unable to load the End-of-Day report.');
    } finally {
      setLoading(false);
    }
  }, [businessDate, preferLive]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetchEodHistory();
      if (response.success && response.data) {
        setHistory(response.data.history);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport, reloadToken]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const setBusinessDate = useCallback((date: string) => {
    setBusinessDateState(date);
    setPreferLive(date === todayLocalISO());
    setFeedback(null);
  }, []);

  const refreshLive = useCallback(async () => {
    if (loading) {
      return;
    }
    setPreferLive(true);
    setReloadToken((t) => t + 1);
  }, [loading]);

  const saveReport = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await saveEodReport(
        businessDate,
        parseDepositInput(actualDeposit),
      );
      if (!response.success || !response.data) {
        setFeedback({
          type: 'error',
          message: response.message ?? 'Unable to save report. Try again.',
        });
        return;
      }
      setReport(response.data.report);
      setSaved(true);
      setPreferLive(false);
      if (!response.data.reconciliation?.ok) {
        setFeedback({
          type: 'warning',
          message:
            'Report saved — totals require attention before relying on them.',
        });
      } else {
        setFeedback({
          type: 'success',
          message: 'Report saved successfully.',
        });
      }
      loadHistory();
    } catch {
      setFeedback({
        type: 'error',
        message: 'Unable to save report. Try again.',
      });
    } finally {
      setSaving(false);
    }
  }, [actualDeposit, businessDate, loadHistory]);

  const runExport = useCallback(
    async (date: string, kind: EodExportKind, live: boolean) => {
      setDownloading(kind);
      setFeedback({
        type: 'info',
        message: kind === 'excel' ? 'Generating Excel...' : 'Generating PDF...',
      });
      try {
        const response = await downloadEodExport(kind, date, live);
        if (!response.success || !response.data) {
          setFeedback({
            type: 'error',
            message:
              response.message ?? 'Unable to generate report. Try again.',
          });
          return;
        }
        const shareResult = await shareEodExportFile(
          response.data,
          response.filename ??
            `End-of-Day-${date}.${kind === 'excel' ? 'xlsx' : 'pdf'}`,
          kind,
        );
        if (!shareResult.success) {
          setFeedback({
            type: 'error',
            message:
              shareResult.message ?? 'Unable to generate report. Try again.',
          });
          return;
        }
        setFeedback({
          type: 'success',
          message: `${kind === 'excel' ? 'Excel' : 'PDF'} report ready.`,
        });
      } catch {
        setFeedback({
          type: 'error',
          message: 'Unable to generate report. Try again.',
        });
      } finally {
        setDownloading(null);
      }
    },
    [],
  );

  const downloadExport = useCallback(
    async (kind: EodExportKind) => {
      if (loading || !report) {
        return;
      }
      await runExport(businessDate, kind, preferLive);
    },
    [businessDate, loading, preferLive, report, runExport],
  );

  const downloadExportForDate = useCallback(
    async (date: string, kind: EodExportKind) => {
      await runExport(date, kind, false);
    },
    [runExport],
  );

  const sendEmail = useCallback(
    async (to: string): Promise<boolean> => {
      setFeedback({type: 'info', message: 'Sending report...'});
      try {
        const response = await emailEodReport(businessDate, to, true);
        if (!response.success) {
          setFeedback({
            type: 'error',
            message: response.message ?? 'Unable to send report. Try again.',
          });
          return false;
        }
        setFeedback({
          type: 'success',
          message: `Report sent to ${to}`,
        });
        return true;
      } catch {
        setFeedback({
          type: 'error',
          message: 'Unable to send report. Try again.',
        });
        return false;
      }
    },
    [businessDate],
  );

  const viewHistoryDate = useCallback((date: string) => {
    setPreferLive(false);
    setBusinessDateState(date);
    setFeedback(null);
  }, []);

  const clearFeedback = useCallback(() => setFeedback(null), []);

  return {
    businessDate,
    setBusinessDate,
    report,
    saved,
    preferLive,
    actualDeposit,
    setActualDeposit,
    defaultEmail,
    loading,
    saving,
    downloading,
    history,
    historyLoading,
    error,
    feedback,
    clearFeedback,
    refreshLive,
    saveReport,
    downloadExport,
    downloadExportForDate,
    sendEmail,
    loadHistory,
    viewHistoryDate,
    apiConfigured: isEodApiConfigured(),
  };
}
