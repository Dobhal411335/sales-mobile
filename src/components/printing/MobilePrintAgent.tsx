import {useEffect, useRef} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {config} from '../../constants/config';
import {socketClient} from '../../socket/socket';
import {
  fetchPrinters,
  reportPrinterProbeResult,
} from '../../services/printJobService';
import {
  drainQueuedNetworkJobs,
  isNetworkPrinter,
  pickNetworkPrinter,
  printJobById,
  printerService,
} from '../../printer/printerService';
import {probeNetworkPrinter} from '../../printer/networkPrinter';
import {usePrinterStatusStore} from '../../store/printerStatusStore';
import type {PrintJobEventPayload, PrinterConfig} from '../../types/printJob';

const HEALTH_INTERVAL_MS = 90_000;
const PRINTER_REFRESH_MS = 60_000;

/**
 * Background auto-print agent for mobile devices (iPads / Android tablets).
 * Listens for NEW_PRINT_JOB, drains QUEUED jobs on mount/resume/printer-online,
 * and probes network printer health for Settings status.
 */
export function MobilePrintAgent() {
  const printersRef = useRef<PrinterConfig[]>([]);
  const processingRef = useRef<Set<string>>(new Set());
  const probingRef = useRef<Set<string>>(new Set());
  const drainingRef = useRef(false);
  const setChecking = usePrinterStatusStore((s) => s.setChecking);
  const setResult = usePrinterStatusStore((s) => s.setResult);

  const refreshPrinters = async () => {
    try {
      const res = await fetchPrinters();
      if (res.success && res.data) {
        printersRef.current = res.data;
        return res.data;
      }
    } catch {
      // keep cached
    }
    return printersRef.current;
  };

  const drainQueue = async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    try {
      await refreshPrinters();
      await drainQueuedNetworkJobs(processingRef.current);
    } catch (err) {
      console.warn('[MobilePrintAgent] drain failed:', err);
    } finally {
      drainingRef.current = false;
    }
  };

  const probeAllNetworkPrinters = async (reportToServer = false) => {
    const printers = await refreshPrinters();
    const network = printers.filter((p) => isNetworkPrinter(p));

    for (const printer of network) {
      const printerId = String(printer._id);
      if (probingRef.current.has(printerId)) continue;
      probingRef.current.add(printerId);
      setChecking(printerId);

      try {
        const host = printer.host!;
        const port = printer.port || config.DEFAULT_PRINTER_PORT;
        const result = await probeNetworkPrinter({host, port});
        const online = !!result.success;

        setResult(printerId, {
          status: online ? 'ONLINE' : 'OFFLINE',
          host,
          port,
          error: result.error || null,
          checkedAt: new Date().toISOString(),
          source: 'mobile',
        });

        if (reportToServer) {
          await reportPrinterProbeResult(printerId, {
            reachable: online,
            error: result.error,
            source: 'mobile',
          });
        }

        if (online) {
          void drainQueue();
        }
      } catch (err) {
        setResult(printerId, {
          status: 'OFFLINE',
          host: printer.host,
          port: printer.port || config.DEFAULT_PRINTER_PORT,
          error: err instanceof Error ? err.message : 'Probe failed',
          checkedAt: new Date().toISOString(),
          source: 'mobile',
        });
      } finally {
        probingRef.current.delete(printerId);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (cancelled) return;
      await refreshPrinters();
      if (cancelled) return;
      await probeAllNetworkPrinters(false);
      if (cancelled) return;
      await drainQueue();
    };

    void boot();
    const refreshTimer = setInterval(() => {
      void refreshPrinters();
    }, PRINTER_REFRESH_MS);
    const healthTimer = setInterval(() => {
      void probeAllNetworkPrinters(false);
    }, HEALTH_INTERVAL_MS);

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void (async () => {
          await probeAllNetworkPrinters(false);
          await drainQueue();
        })();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
      clearInterval(healthTimer);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once agent
  }, []);

  useEffect(() => {
    let cleanupSocket: (() => void) | null = null;
    let checkTimer: ReturnType<typeof setInterval> | null = null;

    const setup = () => {
      const socket = socketClient.getInstance();
      if (!socket || cleanupSocket) return;

      const onNewJob = async (payload: PrintJobEventPayload) => {
        const jobId = payload?.printJobId;
        if (!jobId || (payload?.status && payload.status !== 'QUEUED')) return;

        if (
          payload?.connectionType &&
          String(payload.connectionType).toUpperCase() === 'USB'
        ) {
          return;
        }

        if (processingRef.current.has(jobId)) return;

        try {
          const res = await fetchPrinters();
          if (res.success && res.data) {
            printersRef.current = res.data;
          }
        } catch {
          // keep cached list
        }

        const targetPrinter = pickNetworkPrinter(printersRef.current, {
          printerId: payload?.printerId,
          printerTarget: payload?.printerTarget,
        });

        if (!targetPrinter || !targetPrinter.host) {
          return;
        }

        processingRef.current.add(jobId);
        try {
          await new Promise<void>((resolve) =>
            setTimeout(resolve, Math.floor(Math.random() * 200) + 50),
          );
          await printJobById(jobId);
        } catch (err) {
          console.warn('[MobilePrintAgent] print failed:', err);
        } finally {
          processingRef.current.delete(jobId);
        }
      };

      const onPrinterTest = async (payload: {
        printerId?: string;
        target?: PrinterConfig['target'];
        name?: string;
        host?: string;
        port?: number;
        connectionType?: string;
      }) => {
        const conn = String(payload?.connectionType || '').toUpperCase();
        if (conn === 'USB') return;

        let printer = printersRef.current.find(
          (p) => String(p._id) === String(payload?.printerId),
        );
        if (!printer && payload?.host) {
          printer = {
            _id: payload.printerId || 'test',
            name: payload.name || 'Network Printer',
            target: payload.target || 'RECEIPT',
            host: payload.host,
            port: payload.port || config.DEFAULT_PRINTER_PORT,
            connectionType: payload.connectionType || 'LAN',
            enabled: true,
          };
        }

        if (printer && isNetworkPrinter(printer)) {
          try {
            await printerService.testPrinterDirect(printer);
          } catch (err) {
            console.warn('[MobilePrintAgent] test print failed:', err);
          }
        }
      };

      const onPrinterProbe = async (payload: {
        printerId?: string;
        host?: string;
        port?: number;
        connectionType?: string;
        requestId?: string;
      }) => {
        const conn = String(payload?.connectionType || '').toUpperCase();
        if (conn === 'USB') return;

        const printerId = payload?.printerId;
        if (!printerId) return;

        const probeKey = payload.requestId || printerId;
        if (probingRef.current.has(probeKey)) return;
        probingRef.current.add(probeKey);
        setChecking(printerId);

        try {
          const cached = printersRef.current.find(
            (p) => String(p._id) === String(printerId),
          );
          const host = payload.host || cached?.host;
          const port =
            payload.port || cached?.port || config.DEFAULT_PRINTER_PORT;

          if (!host) {
            setResult(printerId, {
              status: 'OFFLINE',
              error: 'No host configured for probe',
              checkedAt: new Date().toISOString(),
              source: 'mobile',
            });
            await reportPrinterProbeResult(printerId, {
              reachable: false,
              error: 'No host configured for probe',
              source: 'mobile',
              requestId: payload.requestId,
            });
            return;
          }

          const result = await probeNetworkPrinter({host, port});
          const online = !!result.success;
          setResult(printerId, {
            status: online ? 'ONLINE' : 'OFFLINE',
            host,
            port,
            error: result.error || null,
            checkedAt: new Date().toISOString(),
            source: 'mobile',
          });
          await reportPrinterProbeResult(printerId, {
            reachable: online,
            error: result.error,
            source: 'mobile',
            requestId: payload.requestId,
          });
          if (online) {
            void drainQueue();
          }
        } catch (err) {
          console.warn('[MobilePrintAgent] probe failed:', err);
          setResult(printerId, {
            status: 'OFFLINE',
            error:
              err instanceof Error ? err.message : 'Probe failed on mobile',
            checkedAt: new Date().toISOString(),
            source: 'mobile',
          });
          try {
            await reportPrinterProbeResult(printerId, {
              reachable: false,
              error:
                err instanceof Error ? err.message : 'Probe failed on mobile',
              source: 'mobile',
              requestId: payload.requestId,
            });
          } catch {
            // ignore
          }
        } finally {
          probingRef.current.delete(probeKey);
        }
      };

      const onConnect = () => {
        void drainQueue();
      };

      socket.on('NEW_PRINT_JOB', onNewJob);
      socket.on('PRINTER_TEST', onPrinterTest);
      socket.on('PRINTER_PROBE', onPrinterProbe);
      socket.on('connect', onConnect);

      cleanupSocket = () => {
        socket.off('NEW_PRINT_JOB', onNewJob);
        socket.off('PRINTER_TEST', onPrinterTest);
        socket.off('PRINTER_PROBE', onPrinterProbe);
        socket.off('connect', onConnect);
        cleanupSocket = null;
      };
    };

    setup();
    checkTimer = setInterval(() => {
      if (!cleanupSocket) {
        setup();
      }
    }, 2000);

    return () => {
      if (checkTimer) clearInterval(checkTimer);
      if (cleanupSocket) cleanupSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once agent
  }, []);

  return null;
}
