import {useEffect, useRef} from 'react';
import {AppState, Platform, type AppStateStatus} from 'react-native';
import {config} from '../../constants/config';
import {socketClient} from '../../socket/socket';
import {
  fetchPrinters,
  reportPrinterProbeResult,
} from '../../services/printJobService';
import {
  canPrintLocally,
  drainQueuedNetworkJobs,
  isBluetoothPrinter,
  isBuiltInUsbPrinter,
  isNetworkPrinter,
  pickLocalPrinter,
  printJobById,
  printerService,
  wasPrintJobHandledLocally,
} from '../../printer/printerService';
import {probeNetworkPrinter} from '../../printer/networkPrinter';
import {probeBuiltInUsbPrinter} from '../../printer/usbPrinter';
import {probeBluetoothPrinter} from '../../printer/bluetoothPrinter';
import {usePrinterStatusStore} from '../../store/printerStatusStore';
import type {PrintJobEventPayload, PrinterConfig} from '../../types/printJob';

const HEALTH_INTERVAL_MS = 90_000;
const PRINTER_REFRESH_MS = 60_000;

/**
 * Background auto-print agent for mobile devices (iPads / Android tablets).
 * Listens for NEW_PRINT_JOB, drains QUEUED jobs on mount/resume/printer-online,
 * and probes network + Android built-in USB printer health for Settings status.
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

  const probeAllLocalPrinters = async (reportToServer = false) => {
    const printers = await refreshPrinters();
    const local = printers.filter((p) => canPrintLocally(p));

    for (const printer of local) {
      const printerId = String(printer._id);
      if (probingRef.current.has(printerId)) continue;
      probingRef.current.add(printerId);
      setChecking(printerId);

      try {
        let online = false;
        let error: string | null = null;
        let host: string | undefined = printer.host || undefined;
        let port: number | undefined =
          printer.port || config.DEFAULT_PRINTER_PORT;

        if (isBuiltInUsbPrinter(printer)) {
          const result = await probeBuiltInUsbPrinter();
          online = !!result.success;
          error = result.error || null;
          host = result.portName || 'BUILTIN';
          port = undefined;
        } else if (isBluetoothPrinter(printer) && printer.bluetoothAddress) {
          const result = await probeBluetoothPrinter(printer.bluetoothAddress);
          online = !!result.success;
          error = result.error || null;
          host = printer.bluetoothAddress;
          port = undefined;
        } else if (isNetworkPrinter(printer) && printer.host) {
          host = printer.host;
          port = printer.port || config.DEFAULT_PRINTER_PORT;
          const result = await probeNetworkPrinter({host, port});
          online = !!result.success;
          error = result.error || null;
        } else {
          probingRef.current.delete(printerId);
          continue;
        }

        setResult(printerId, {
          status: online ? 'ONLINE' : 'OFFLINE',
          host,
          port,
          error,
          checkedAt: new Date().toISOString(),
          source: 'mobile',
        });

        if (reportToServer) {
          await reportPrinterProbeResult(printerId, {
            reachable: online,
            error: error || undefined,
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
    let bootTimer: ReturnType<typeof setTimeout> | null = null;

    const boot = async () => {
      if (cancelled) return;
      await refreshPrinters();
      if (cancelled) return;
      // Probe after UI is interactive — never block first paint / taps
      await probeAllLocalPrinters(false);
      if (cancelled) return;
      await drainQueue();
    };

    bootTimer = setTimeout(() => {
      void boot();
    }, 1500);

    const refreshTimer = setInterval(() => {
      void refreshPrinters();
    }, PRINTER_REFRESH_MS);
    const healthTimer = setInterval(() => {
      void probeAllLocalPrinters(false);
    }, HEALTH_INTERVAL_MS);

    let lastProbeAt = 0;
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        const now = Date.now();
        // Skip redundant probe if we checked recently
        if (now - lastProbeAt < 30_000) {
          void drainQueue();
          return;
        }
        lastProbeAt = now;
        void (async () => {
          await probeAllLocalPrinters(false);
          await drainQueue();
        })();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      cancelled = true;
      if (bootTimer) clearTimeout(bootTimer);
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
        if (wasPrintJobHandledLocally(jobId)) return;

        const conn = String(payload?.connectionType || '').toUpperCase();
        // Windows spooler USB stays on print-bridge (non-Android)
        if (conn === 'USB' && Platform.OS !== 'android') {
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

        let targetPrinter = pickLocalPrinter(printersRef.current, {
          printerId: payload?.printerId,
          printerTarget: payload?.printerTarget,
        });

        // Fallback: any enabled USB printer on this Android POS tablet
        if (
          (!targetPrinter || !canPrintLocally(targetPrinter)) &&
          Platform.OS === 'android'
        ) {
          targetPrinter =
            printersRef.current.find((p) => isBuiltInUsbPrinter(p)) || null;
        }

        // Last resort on Android POS: if hardware probe succeeds, print anyway
        // (covers empty printer list after reinstall / socket events with no conn)
        if (
          (!targetPrinter || !canPrintLocally(targetPrinter)) &&
          Platform.OS === 'android'
        ) {
          const probe = await probeBuiltInUsbPrinter();
          if (probe.success) {
            targetPrinter = {
              _id: payload?.printerId || 'builtin-fallback',
              name: 'Built-in Receipt',
              target: (payload?.printerTarget as PrinterConfig['target']) || 'KITCHEN',
              connectionType: 'USB',
              systemPrinterName: 'BUILTIN',
              enabled: true,
            };
            console.warn(
              '[MobilePrintAgent] using built-in USB fallback for job',
              jobId,
            );
          }
        }

        if (!targetPrinter || !canPrintLocally(targetPrinter)) {
          console.warn(
            '[MobilePrintAgent] skip job — no local printer',
            jobId,
            'conn=',
            conn,
            'target=',
            payload?.printerTarget,
            'printers=',
            printersRef.current.length,
          );
          return;
        }

        if (isBuiltInUsbPrinter(targetPrinter)) {
          const probe = await probeBuiltInUsbPrinter();
          if (!probe.success) {
            console.warn(
              '[MobilePrintAgent] built-in USB not ready',
              probe.error,
            );
            return;
          }
        }

        if (isBluetoothPrinter(targetPrinter) && targetPrinter.bluetoothAddress) {
          const probe = await probeBluetoothPrinter(
            targetPrinter.bluetoothAddress,
          );
          if (!probe.success) {
            console.warn(
              '[MobilePrintAgent] bluetooth not ready',
              probe.error,
            );
            return;
          }
        }

        processingRef.current.add(jobId);
        try {
          await new Promise<void>((resolve) =>
            setTimeout(resolve, Math.floor(Math.random() * 200) + 50),
          );
          const result = await printJobById(jobId);
          if (!result.success) {
            console.warn('[MobilePrintAgent] print result', result.message);
          }
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
        systemPrinterName?: string;
        bluetoothAddress?: string;
      }) => {
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
        if (
          !printer &&
          String(payload?.connectionType || '').toUpperCase() === 'BLUETOOTH' &&
          payload?.bluetoothAddress
        ) {
          printer = {
            _id: payload.printerId || 'test',
            name: payload.name || 'Bluetooth Printer',
            target: payload.target || 'RECEIPT',
            connectionType: 'BLUETOOTH',
            bluetoothAddress: payload.bluetoothAddress,
            enabled: true,
          };
        }
        if (
          !printer &&
          String(payload?.connectionType || '').toUpperCase() === 'USB' &&
          payload?.systemPrinterName
        ) {
          printer = {
            _id: payload.printerId || 'test',
            name: payload.name || 'Built-in Receipt',
            target: payload.target || 'RECEIPT',
            connectionType: 'USB',
            systemPrinterName: payload.systemPrinterName,
            enabled: true,
          };
        }

        if (printer && canPrintLocally(printer)) {
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
        systemPrinterName?: string;
        requestId?: string;
      }) => {
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
          const synthetic: PrinterConfig | null = cached
            ? cached
            : payload?.connectionType
              ? {
                  _id: printerId,
                  name: 'Printer',
                  target: 'RECEIPT',
                  host: payload.host,
                  port: payload.port,
                  connectionType: payload.connectionType,
                  systemPrinterName: payload.systemPrinterName,
                  enabled: true,
                }
              : null;

          if (synthetic && isBuiltInUsbPrinter(synthetic)) {
            const result = await probeBuiltInUsbPrinter();
            const online = !!result.success;
            setResult(printerId, {
              status: online ? 'ONLINE' : 'OFFLINE',
              host: result.portName || 'BUILTIN',
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
            if (online) void drainQueue();
            return;
          }

          if (
            synthetic &&
            isBluetoothPrinter(synthetic) &&
            (payload as {bluetoothAddress?: string}).bluetoothAddress
          ) {
            const address =
              (payload as {bluetoothAddress?: string}).bluetoothAddress ||
              synthetic.bluetoothAddress ||
              '';
            const result = await probeBluetoothPrinter(address);
            const online = !!result.success;
            setResult(printerId, {
              status: online ? 'ONLINE' : 'OFFLINE',
              host: address,
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
            if (online) void drainQueue();
            return;
          }

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
