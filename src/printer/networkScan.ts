import {config} from '../constants/config';
import {probeNetworkPrinter} from './networkPrinter';

export interface DiscoveredPrinter {
  host: string;
  port: number;
}

export interface NetworkScanOptions {
  /** First three octets, e.g. "192.168.1" */
  subnetPrefix: string;
  port?: number;
  /** Inclusive start host octet (default 1) */
  fromHost?: number;
  /** Inclusive end host octet (default 254) */
  toHost?: number;
  /** Parallel probes (default 24) */
  concurrency?: number;
  /** Per-host probe timeout ms (default 400) */
  timeoutMs?: number;
  signal?: {cancelled: boolean};
  onProgress?: (done: number, total: number) => void;
}

/**
 * Best-effort local subnet scan for raw ESC/POS printers (TCP connect on port).
 * Not guaranteed on every router; empty results are valid — use manual IP fallback.
 */
export async function scanSubnetForPrinters(
  options: NetworkScanOptions,
): Promise<DiscoveredPrinter[]> {
  const prefix = String(options.subnetPrefix || '')
    .trim()
    .replace(/\.$/, '');
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(prefix)) {
    throw new Error('Subnet must look like 192.168.1');
  }

  const port = Number(options.port) || config.DEFAULT_PRINTER_PORT;
  const fromHost = Math.max(1, options.fromHost ?? 1);
  const toHost = Math.min(254, options.toHost ?? 254);
  const concurrency = Math.max(1, Math.min(48, options.concurrency ?? 24));
  const timeoutMs = Math.max(200, options.timeoutMs ?? 400);

  const hosts: string[] = [];
  for (let i = fromHost; i <= toHost; i += 1) {
    hosts.push(`${prefix}.${i}`);
  }

  const found: DiscoveredPrinter[] = [];
  let done = 0;

  const worker = async (queue: string[]) => {
    while (queue.length) {
      if (options.signal?.cancelled) return;
      const host = queue.shift();
      if (!host) return;
      try {
        const result = await probeNetworkPrinter({host, port}, timeoutMs);
        if (result.success) {
          found.push({host, port});
        }
      } catch {
        // ignore per-host failures
      } finally {
        done += 1;
        options.onProgress?.(done, hosts.length);
      }
    }
  };

  const queue = [...hosts];
  const workers = Array.from({length: concurrency}, () => worker(queue));
  await Promise.all(workers);

  found.sort((a, b) => {
    const aa = Number(a.host.split('.').pop() || 0);
    const bb = Number(b.host.split('.').pop() || 0);
    return aa - bb;
  });

  return found;
}

/** Derive "192.168.1" from "192.168.1.50" when possible. */
export function subnetPrefixFromHost(host?: string | null): string | null {
  const trimmed = String(host || '').trim();
  const m = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  return m ? m[1] : null;
}
