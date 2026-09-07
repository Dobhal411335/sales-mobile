import TcpSocket from 'react-native-tcp-socket';
import {config} from '../constants/config';

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const HOSTNAME_RE =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const DEFAULT_PRINT_TIMEOUT_MS = 10000;

export interface PrintTarget {
  host: string;
  port?: number;
}

export interface NetworkPrintResult {
  success: boolean;
  host?: string;
  port?: number;
  error?: string;
}

export function validatePrintTarget(target: PrintTarget): {host: string; port: number} {
  const host = String(target?.host || '').trim();
  if (!host) {
    throw new Error('Printer host IP or hostname is required');
  }
  if (!IPV4_RE.test(host) && !HOSTNAME_RE.test(host)) {
    throw new Error(`Invalid printer host: "${host}"`);
  }
  const numericPort = Number(target.port) || config.DEFAULT_PRINTER_PORT;
  if (numericPort < 1 || numericPort > 65535) {
    throw new Error(`Invalid printer port: ${numericPort}`);
  }
  return {host, port: numericPort};
}

/**
 * Sends raw ESC/POS binary data or base64 payload to a network thermal printer over TCP (port 9100).
 */
export async function sendRawToNetworkPrinter(
  target: PrintTarget,
  data: Uint8Array | string,
  timeoutMs: number = DEFAULT_PRINT_TIMEOUT_MS,
): Promise<NetworkPrintResult> {
  let validated: {host: string; port: number};
  try {
    validated = validatePrintTarget(target);
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Invalid printer target',
    };
  }

  const {host, port} = validated;

  if (!data || (typeof data !== 'string' && data.length === 0)) {
    return {
      success: false,
      host,
      port,
      error: 'Print data is empty',
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    let client: ReturnType<typeof TcpSocket.createConnection> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (client) {
        try {
          client.destroy();
        } catch {
          // ignore
        }
        client = null;
      }
    };

    const finish = (result: NetworkPrintResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    timer = setTimeout(() => {
      finish({
        success: false,
        host,
        port,
        error: `Printer connection timed out (${host}:${port})`,
      });
    }, timeoutMs);

    try {
      client = TcpSocket.createConnection({host, port}, () => {
        if (!client || settled) return;
        const writeCallback = (writeErr?: Error) => {
          if (writeErr) {
            finish({
              success: false,
              host,
              port,
              error: writeErr.message || 'Failed to write to printer',
            });
            return;
          }
          if (client) {
            try {
              client.end();
            } catch {
              // ignore
            }
          }
          finish({success: true, host, port});
        };

        if (typeof data === 'string') {
          // If string, write as base64
          client.write(data, 'base64', writeCallback);
        } else {
          client.write(data, undefined, writeCallback);
        }
      });

      client.on('error', (err: {message?: string}) => {
        finish({
          success: false,
          host,
          port,
          error: err?.message || 'Printer connection failed',
        });
      });

      client.on('timeout', () => {
        finish({
          success: false,
          host,
          port,
          error: `Printer connection timed out (${host}:${port})`,
        });
      });
    } catch (err: unknown) {
      finish({
        success: false,
        host,
        port,
        error: err instanceof Error ? err.message : 'Failed to create TCP socket',
      });
    }
  });
}
