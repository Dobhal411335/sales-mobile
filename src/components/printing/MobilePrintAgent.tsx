import {useEffect, useRef} from 'react';
import {config} from '../../constants/config';
import {socketClient} from '../../socket/socket';
import {
  fetchPrinters,
  reportPrinterProbeResult,
} from '../../services/printJobService';
import {
  isNetworkPrinter,
  printJobById,
  printerService,
} from '../../printer/printerService';
import {probeNetworkPrinter} from '../../printer/networkPrinter';
import type {PrintJobEventPayload, PrinterConfig} from '../../types/printJob';

/**
 * Background auto-print agent for mobile devices (iPads / Android tablets).
 * Listens for NEW_PRINT_JOB socket events, formats ESC/POS, streams over TCP :9100,
 * and calls the /complete API.
 * Mirrors ElectronPrintAgent from the desktop app.
 */
export function MobilePrintAgent() {
  const printersRef = useRef<PrinterConfig[]>([]);
  const processingRef = useRef<Set<string>>(new Set());
  const probingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadPrinters = async () => {
      try {
        const res = await fetchPrinters();
        if (!cancelled && res.success && res.data) {
          printersRef.current = res.data;
        }
      } catch {
        // silent
      }
    };

    loadPrinters();
    const refreshTimer = setInterval(loadPrinters, 60_000);

    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
    };
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

        // USB jobs are strictly handled by the Windows print-bridge
        if (
          payload?.connectionType &&
          String(payload.connectionType).toUpperCase() === 'USB'
        ) {
          return;
        }

        if (processingRef.current.has(jobId)) return;

        // Refresh so Turn Off/On is respected promptly
        try {
          const res = await fetchPrinters();
          if (res.success && res.data) {
            printersRef.current = res.data;
          }
        } catch {
          // keep cached list
        }

        // Check if we have an enabled network printer configured
        const target = payload?.printerTarget;
        const targetPrinter = printersRef.current.find(
          (p) =>
            p.enabled !== false &&
            isNetworkPrinter(p) &&
            (p.target === target ||
              (payload?.printerId && String(p._id) === String(payload.printerId))),
        );

        if (!targetPrinter || !targetPrinter.host) {
          return; // turned off / missing — leave QUEUED
        }

        processingRef.current.add(jobId);
        try {
          // Stagger slightly (50-250ms) to prevent multi-device TCP port contention on the thermal printer
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

        try {
          const cached = printersRef.current.find(
            (p) => String(p._id) === String(printerId),
          );
          const host = payload.host || cached?.host;
          const port =
            payload.port || cached?.port || config.DEFAULT_PRINTER_PORT;

          if (!host) {
            await reportPrinterProbeResult(printerId, {
              reachable: false,
              error: 'No host configured for probe',
              source: 'mobile',
              requestId: payload.requestId,
            });
            return;
          }

          const result = await probeNetworkPrinter({host, port});
          await reportPrinterProbeResult(printerId, {
            reachable: !!result.success,
            error: result.error,
            source: 'mobile',
            requestId: payload.requestId,
          });
        } catch (err) {
          console.warn('[MobilePrintAgent] probe failed:', err);
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

      socket.on('NEW_PRINT_JOB', onNewJob);
      socket.on('PRINTER_TEST', onPrinterTest);
      socket.on('PRINTER_PROBE', onPrinterProbe);

      cleanupSocket = () => {
        socket.off('NEW_PRINT_JOB', onNewJob);
        socket.off('PRINTER_TEST', onPrinterTest);
        socket.off('PRINTER_PROBE', onPrinterProbe);
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
  }, []);

  return null;
}
