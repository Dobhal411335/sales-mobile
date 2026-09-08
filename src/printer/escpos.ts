/* eslint-disable no-bitwise */
/**
 * ESC/POS byte builder for 80mm thermal printers (Font A, 48 cols / 576 dots).
 * Compatible with network thermal printers (LAN / Wi-Fi) on port 9100.
 * Layout matches KitchenOrderTicket, BarReceipt, and CustomerReceipt templates.
 */

import type {KotLineItem, ReceiptOrder, TaxBreakdownLine} from '../types/receipt';
import type {PrintJob, PrintJobRestaurant} from '../types/printJob';
import {config} from '../constants/config';

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Printable columns for Font A on 576-dot (≈80mm) paper */
export const WIDTH = 48;

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += B64_CHARS[b0 >> 2];
    result += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < len ? B64_CHARS[b2 & 63] : '=';
  }
  return result;
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = clean.length;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const byteLen = Math.floor((len * 3) / 4) - padding;
  const bytes = new Uint8Array(byteLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c0 = B64_CHARS.indexOf(clean[i]);
    const c1 = B64_CHARS.indexOf(clean[i + 1]);
    const c2 = clean[i + 2] === '=' ? 0 : B64_CHARS.indexOf(clean[i + 2]);
    const c3 = clean[i + 3] === '=' ? 0 : B64_CHARS.indexOf(clean[i + 3]);
    if (p < byteLen) bytes[p++] = (c0 << 2) | (c1 >> 4);
    if (p < byteLen) bytes[p++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (p < byteLen) bytes[p++] = ((c2 & 3) << 6) | c3;
  }
  return bytes;
}

export interface EscPosEncoder {
  init: () => EscPosEncoder;
  text: (str: string) => EscPosEncoder;
  raw: (bytes: number[] | Uint8Array) => EscPosEncoder;
  line: (str?: string) => EscPosEncoder;
  align: (mode: 0 | 1 | 2) => EscPosEncoder;
  bold: (on?: boolean) => EscPosEncoder;
  size: (width?: number, height?: number) => EscPosEncoder;
  resetStyle: () => EscPosEncoder;
  cut: () => EscPosEncoder;
  toUint8Array: () => Uint8Array;
  toBase64: () => string;
}

export function encoder(): EscPosEncoder {
  const chunks: Uint8Array[] = [];
  const self: EscPosEncoder = {
    init() {
      self.raw([ESC, 0x40]);
      return self;
    },
    text(str: string) {
      const s = String(str);
      const buf = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) {
        buf[i] = s.charCodeAt(i) & 0xff;
      }
      chunks.push(buf);
      return self;
    },
    raw(bytes: number[] | Uint8Array) {
      chunks.push(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
      return self;
    },
    line(str = '') {
      self.text(str);
      self.raw([LF]);
      return self;
    },
    align(mode: 0 | 1 | 2) {
      self.raw([ESC, 0x61, mode]);
      return self;
    },
    bold(on = true) {
      self.raw([ESC, 0x45, on ? 1 : 0]);
      return self;
    },
    size(width = 1, height = 1) {
      const w = Math.max(1, Math.min(8, width));
      const h = Math.max(1, Math.min(8, height));
      const n = ((w - 1) << 4) | (h - 1);
      self.raw([GS, 0x21, n]);
      return self;
    },
    resetStyle() {
      self.size(1, 1).bold(false).align(0);
      return self;
    },
    cut() {
      self.raw([GS, 0x56, 0x00]);
      return self;
    },
    toUint8Array(): Uint8Array {
      const total = chunks.reduce((sum, c) => sum + c.length, 0);
      const out = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
      }
      return out;
    },
    toBase64(): string {
      const bytes = self.toUint8Array();
      return uint8ArrayToBase64(bytes);
    },
  };
  return self;
}

export function divider(char = '-', width = WIDTH): string {
  return char.repeat(width);
}

/** Keep thermal output ASCII-safe (avoids CP437 garbage like "Ca" from UTF-8 ellipsis). */
export function toPrinterText(str: unknown): string {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u2026/g, '...')
    .replace(/[×✕✖⨯]/g, 'x')
    .replace(/[–—−]/g, '-')
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[^\x20-\x7E\n]/g, '');
}

export function money(n: unknown, opts: {signed?: boolean} = {}): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '$0.00';
  const abs = Math.abs(v).toFixed(2);
  if (opts.signed) {
    return v < 0 ? `-$${abs}` : `$${abs}`;
  }
  if (v < 0) return `-$${abs}`;
  return `$${abs}`;
}

export function formatTwoColumnLine(label: string, value: string, width = WIDTH): string {
  const l = toPrinterText(label);
  const r = toPrinterText(value);
  if (l.length + r.length >= width) {
    const maxL = Math.max(1, width - r.length - 1);
    const trimmed =
      l.length > maxL ? `${l.slice(0, Math.max(1, maxL - 3))}...` : l;
    const spaces = Math.max(1, width - trimmed.length - r.length);
    return `${trimmed}${' '.repeat(spaces)}${r}`;
  }
  const spaces = Math.max(1, width - l.length - r.length);
  return `${l}${' '.repeat(spaces)}${r}`;
}

export function wrapText(text: string, width = WIDTH): string[] {
  const s = toPrinterText(text).trim();
  if (!s) return [];
  if (s.length <= width) return [s];
  const lines: string[] = [];
  let remaining = s;
  while (remaining.length > width) {
    let breakAt = remaining.lastIndexOf(' ', width);
    if (breakAt < Math.floor(width / 2)) breakAt = width;
    lines.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining) lines.push(remaining);
  return lines;
}

function writeWrapped(e: EscPosEncoder, text: string, width = WIDTH): void {
  for (const line of wrapText(text, width)) e.line(line);
}

export function formatSentAt(dateLike?: string | Date | null): string {
  const d = dateLike ? new Date(dateLike) : new Date();
  if (Number.isNaN(d.getTime())) return toPrinterText(new Date().toLocaleString());
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const month = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hh = String(hours).padStart(2, '0');
  return `${month} ${day}, ${year} at ${hh}:${minutes} ${ampm}`;
}

function isDirectSaleOrder(order?: Partial<ReceiptOrder> | null): boolean {
  const source = order?.source;
  return source === 'WALK_IN' || source === 'STAFF';
}

function shouldShowTable(order?: Partial<ReceiptOrder> | null): boolean {
  return Boolean(order?.tableNo) && !isDirectSaleOrder(order);
}

function stripFloorSuffix(value?: string | null): {tables: string; floor: string} {
  const text = String(value ?? '').trim();
  const separator = text.lastIndexOf(' · ');
  if (separator === -1) return {tables: text, floor: ''};
  return {
    tables: text.slice(0, separator).trim(),
    floor: text.slice(separator + 3).trim(),
  };
}

function normalizeTableToken(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .replace(/^(tables?|tbl)\s+/i, '')
    .trim();
}

function joinTableNumbers(numbers?: Array<string | null | undefined>): string {
  const tokens: string[] = [];
  for (const value of numbers || []) {
    const raw = String(value ?? '').trim();
    if (!raw) continue;
    const {tables} = stripFloorSuffix(raw);
    for (const part of tables.split(/\s*,\s*/)) {
      const token = normalizeTableToken(part);
      if (token) tokens.push(token);
    }
  }
  const unique = [...new Set(tokens)];
  unique.sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, ''), 10);
    const nb = parseInt(String(b).replace(/\D/g, ''), 10);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a).localeCompare(String(b), undefined, {numeric: true});
  });
  return unique.join(', ');
}

function formatTableNumbersWithFloor(tableNo?: string | null, floorName?: string | null): string {
  const parsed = stripFloorSuffix(tableNo);
  const numbers = joinTableNumbers([parsed.tables || tableNo]);
  const floor = String(floorName || parsed.floor || '').trim();
  if (!numbers) return floor;
  if (!floor) return numbers;
  if (numbers.toLowerCase().includes(floor.toLowerCase())) return numbers;
  return `${numbers}.${floor}`;
}

function formatTableLocation(tableNo?: string | null, floorName?: string | null): string {
  const body = formatTableNumbersWithFloor(tableNo, floorName);
  if (!body) return '';
  if (/^tables?\b/i.test(body)) {
    return body.replace(/^tables?\b/i, 'Table');
  }
  const numbers = joinTableNumbers([tableNo]);
  if (!numbers) return body;
  return `Table ${body}`;
}

function resolveFloorName(job?: PrintJob | null, order?: Partial<ReceiptOrder> | null): string | null {
  const meta = job?.metadata as Record<string, unknown> | undefined;
  return (
    (meta?.floorName as string | undefined) ||
    order?.floorName ||
    null
  );
}

function resolveTableNo(job?: PrintJob | null, order?: Partial<ReceiptOrder> | null): string | null {
  return (
    (job?.metadata?.tableNo != null ? String(job.metadata.tableNo) : null) ||
    (order?.tableNo != null ? String(order.tableNo) : null)
  );
}

export type AnyTicketItem = {
  name?: string;
  productName?: string;
  qty?: number;
  quantity?: number;
  price?: number;
  productCode?: string;
  category?: string;
  size?: string;
  course?: string;
  options?: string[];
  choices?: string[];
  drinks?: string[];
  inclusions?: string[];
  choiceSelections?: Array<{name: string; subChoices: string[]}>;
  addonChoiceSelections?: Array<{name: string; subChoices: string[]}>;
  modifier?: string;
  preparationStyle?: string;
  isOffer?: boolean;
  seat?: string | number;
  seats?: Array<string | number>;
  [key: string]: unknown;
};

function isOfferItem(item?: AnyTicketItem | null): boolean {
  if (!item) return false;
  if (item.isOffer) return true;
  return /^offers?$/i.test(String(item.category || ''));
}

function cleanList(list?: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((value) => String(value).trim()).filter(Boolean);
}

function isStyleOption(opt: unknown, preparationStyle?: string): boolean {
  const value = String(opt || '').trim();
  const lower = value.toLowerCase();
  if (lower.startsWith('style:')) return true;
  if (
    preparationStyle &&
    lower === String(preparationStyle).trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

export function getReceiptModifierLines(item?: AnyTicketItem | null): string[] {
  const lines: string[] = [];
  const isOffer = isOfferItem(item);
  const style = String(item?.preparationStyle || (!isOffer ? item?.modifier : '') || '').trim();
  if (style) lines.push(`+ ${style}`);

  if (isOffer) {
    const inclusions = cleanList(item?.inclusions);
    const choices = cleanList(item?.choices);
    const drinks = cleanList(item?.drinks);
    if (inclusions.length) lines.push(`Includes: ${inclusions.join(', ')}`);
    if (choices.length) lines.push(`Choices: ${choices.join(', ')}`);
    if (drinks.length) lines.push(`Drinks: ${drinks.join(', ')}`);
    if (lines.length > (style ? 1 : 0)) return lines;

    for (const opt of item?.options || []) {
      const text = String(opt || '').trim();
      if (/^(includes|choices|drinks)\s*:/i.test(text)) lines.push(text);
    }
    return lines;
  }

  if (Array.isArray(item?.choiceSelections)) {
    for (const group of item.choiceSelections) {
      const name = String(group?.name || '').trim();
      const sub = cleanList(group?.subChoices).join(', ');
      if (name && sub) lines.push(`${name}: ${sub}`);
    }
  }
  if (Array.isArray(item?.addonChoiceSelections)) {
    for (const group of item.addonChoiceSelections) {
      const name = String(group?.name || '').trim();
      const sub = cleanList(group?.subChoices).join(', ');
      if (name && sub) lines.push(`${name}: ${sub}`);
    }
  }
  for (const opt of item?.options || []) {
    if (isStyleOption(opt, item?.preparationStyle as string | undefined)) continue;
    const label = String(opt || '').trim();
    if (label) lines.push(`+ ${label}`);
  }
  return lines;
}

function buildTicketItemName(
  item: AnyTicketItem,
  {includeSeats = false} = {},
): string {
  const parts: string[] = [];
  if (item.productCode) parts.push(String(item.productCode).trim());
  parts.push(String(item.name || item.productName || 'Item'));
  let name = parts.filter(Boolean).join(' ');
  if (item.size && item.size !== 'Standard') {
    name += ` (${item.size})`;
  }
  if (includeSeats) {
    const seatBits: unknown[] = [];
    if (item.seat) seatBits.push(item.seat);
    if (Array.isArray(item.seats)) {
      item.seats.filter(Boolean).forEach((s) => seatBits.push(s));
    }
    if (seatBits.length) {
      name += ` (${seatBits
        .map((s) => `S${String(s).replace(/^S/i, '')}`)
        .join(', ')})`;
    }
  }
  return toPrinterText(name);
}

function writeTicketItem(
  e: EscPosEncoder,
  item: AnyTicketItem,
  {qtySep = 'x', includeSeats = false} = {},
): void {
  const qty = item.qty ?? item.quantity ?? 1;
  const name = buildTicketItemName(item, {includeSeats});
  e.bold(true);
  writeWrapped(e, `${qty} ${qtySep} ${name}`);
  e.bold(false);
  if (item.course) {
    writeWrapped(e, `       Course: ${item.course}`);
  }
  for (const line of getReceiptModifierLines(item)) {
    writeWrapped(e, `       ${line}`);
  }
}

export function formatKotItemLine(name: string, qty: number, width = WIDTH): string {
  const left = `${qty}x  ${name || 'Item'}`;
  const lines = wrapText(left, width);
  return lines[0] || left;
}

export function formatReceiptItemLine(
  name: string,
  qty: number,
  unitPrice: number,
  width = WIDTH,
): string {
  const lineTotal = (Number(unitPrice) || 0) * (Number(qty) || 1);
  const right = money(lineTotal);
  const left = Number(qty) > 1 ? `${qty} x ${name || 'Item'}` : `${name || 'Item'}`;
  return formatTwoColumnLine(left, right, width);
}

function writeReceiptItem(
  e: EscPosEncoder,
  item: AnyTicketItem,
): void {
  const qty = item.qty ?? 1;
  const name = buildTicketItemName(item);
  const left = Number(qty) > 1 ? `${qty} x ${name}` : name;
  const right = money((Number(item.price) || 0) * Number(qty || 1));
  const first = formatTwoColumnLine(left, right);
  const maxLeft = WIDTH - right.length - 1;
  if (toPrinterText(left).length > maxLeft) {
    e.line(first);
    const overflow = toPrinterText(left).slice(maxLeft - 3);
    writeWrapped(e, overflow);
  } else {
    e.line(first);
  }
  for (const line of getReceiptModifierLines(item)) {
    writeWrapped(e, `   ${line}`);
  }
}

export interface TestTicketParams {
  name?: string;
  target?: string;
  host?: string;
  port?: number;
  connectionType?: string;
  systemPrinterName?: string;
}

export function buildTestTicket(params: TestTicketParams): string {
  const {name, target, host, port, connectionType, systemPrinterName} = params;
  const e = encoder();
  e.init();
  e.align(1).bold(true).line(config.APP_NAME.toUpperCase()).bold(false);
  e.line('PRINTER TEST');
  e.resetStyle();
  e.line(divider());
  e.line(`Printer: ${name || 'Test'}`);
  e.line(`Target:  ${target || '-'}`);
  e.line(`Conn:    ${connectionType || '-'}`);
  if (systemPrinterName) {
    e.line(`System:  ${systemPrinterName}`);
  } else if (host) {
    e.line(`Address: ${host}:${port || config.DEFAULT_PRINTER_PORT}`);
  }
  e.line(`Width:   ${WIDTH} cols (Font A / 576 dots)`);
  e.line(divider());
  e.align(1).line(toPrinterText(new Date().toLocaleString()));
  e.resetStyle();
  e.line('');
  e.cut();
  return e.toBase64();
}

export interface KotTicketParams {
  job?: PrintJob | null;
  order?: Partial<ReceiptOrder> | null;
  kotItems?: KotLineItem[] | AnyTicketItem[];
  restaurantName?: string;
  serverName?: string | null;
  guestCount?: number | string | null;
  isReprint?: boolean;
}

export function buildKotTicket(params: KotTicketParams): string {
  const {
    job,
    order,
    kotItems = [],
    restaurantName,
    serverName,
    guestCount,
    isReprint = false,
  } = params;

  const e = encoder();
  e.init();

  const brand =
    restaurantName || job?.metadata?.restaurantName || config.APP_NAME.toUpperCase();
  const orderNumber =
    job?.metadata?.orderNumber || order?.orderNumber || '-';
  const tableNo = resolveTableNo(job, order);
  const floorName = resolveFloorName(job, order);
  const tableLabel = formatTableLocation(tableNo, floorName);
  const directSale = isDirectSaleOrder(order);
  const partyLabel =
    job?.metadata?.partyName ||
    order?.partyName ||
    order?.guestName ||
    job?.metadata?.guestName ||
    (directSale ? 'Walk-in' : '');
  const note = job?.metadata?.specialNote || order?.specialNote;
  const items = (kotItems.length
    ? kotItems
    : job?.metadata?.kotItems || order?.items || []) as AnyTicketItem[];
  const reprint =
    isReprint ||
    Boolean(job?.parentPrintJobId || job?.metadata?.isReprint) ||
    (Number(job?.attemptCount) || 0) > 1;

  e.align(1).bold(true).line(toPrinterText(String(brand).toUpperCase()));
  e.bold(false);
  e.align(1).bold(true).line('KOT').bold(false);
  if (reprint) {
    e.align(1).bold(true).line('*** REPRINT ***').bold(false);
  }
  e.align(1)
    .bold(true)
    .line(
      toPrinterText(
        directSale
          ? partyLabel || 'Walk-in'
          : tableLabel || 'Takeaway / No Table',
      ),
    )
    .bold(false);
  e.resetStyle();
  e.line(divider('='));

  e.line(`Order #: ${orderNumber}`);
  e.line(`Sent: ${formatSentAt(order?.createdAt || job?.createdAt)}`);
  if (serverName) e.line(`Server: ${toPrinterText(serverName)}`);
  if (partyLabel) e.line(`Party: ${toPrinterText(partyLabel)}`);
  const resolvedGuests =
    guestCount != null && (guestCount as unknown) !== ''
      ? guestCount
      : order?.guestCount != null
        ? order.guestCount
        : null;
  if (resolvedGuests != null) {
    e.line(`Guests: ${resolvedGuests}`);
  }

  e.line(divider('='));

  const grouped: Record<string, AnyTicketItem[]> = {};
  for (const item of items) {
    const groupName = isOfferItem(item)
      ? 'Offers'
      : item.category || 'ITEMS';
    if (!grouped[groupName]) grouped[groupName] = [];
    grouped[groupName].push(item);
  }

  const groups = Object.keys(grouped);
  if (!groups.length) {
    e.line('(no items)');
  } else {
    for (const group of groups) {
      e.bold(true).line(toPrinterText(String(group).toUpperCase())).bold(false);
      e.line(divider('-'));
      for (const item of grouped[group]) {
        writeTicketItem(e, item, {qtySep: 'x'});
        e.line('');
      }
    }
  }

  if (note) {
    e.line(divider('-'));
    writeWrapped(e, `NOTES: ${note}`);
  }

  e.line(divider('='));
  e.align(1).line(`*** KOT #${orderNumber} ***`);
  e.resetStyle();
  e.line('');
  e.cut();
  return e.toBase64();
}

export function buildBarTicket(params: KotTicketParams): string {
  const {
    job,
    order,
    kotItems = [],
    restaurantName,
    serverName,
    guestCount,
    isReprint = false,
  } = params;

  const e = encoder();
  e.init();

  const brand =
    restaurantName || job?.metadata?.restaurantName || config.APP_NAME.toUpperCase();
  const orderNumber =
    job?.metadata?.orderNumber || order?.orderNumber || '-';
  const tableNo = resolveTableNo(job, order);
  const floorName = resolveFloorName(job, order);
  const tableLabel = formatTableNumbersWithFloor(tableNo, floorName);
  const directSale = isDirectSaleOrder(order);
  const partyLabel =
    job?.metadata?.partyName ||
    order?.partyName ||
    order?.guestName ||
    job?.metadata?.guestName ||
    (directSale ? 'Walk-in' : '');
  const covers =
    guestCount != null && guestCount !== '' ? Number(guestCount) : null;
  const note = job?.metadata?.specialNote || order?.specialNote;
  const items = (kotItems.length
    ? kotItems
    : job?.metadata?.barItems || job?.metadata?.kotItems || order?.items || []) as AnyTicketItem[];
  const reprint =
    isReprint ||
    Boolean(job?.parentPrintJobId || job?.metadata?.isReprint) ||
    (Number(job?.attemptCount) || 0) > 1;

  e.align(1).bold(true).line(toPrinterText(String(brand).toUpperCase()));
  e.bold(false);
  e.align(1).bold(true).line('BAR RECEIPT').bold(false);
  if (reprint) {
    e.align(1).bold(true).line('*** REPRINT ***').bold(false);
  }
  e.resetStyle();

  if (partyLabel || covers != null) {
    const partyLine =
      partyLabel && covers != null
        ? `Party: ${partyLabel} (${covers})`
        : `Party: ${partyLabel || covers}`;
    e.bold(true).line(toPrinterText(partyLine.toUpperCase())).bold(false);
  }
  if (!directSale) {
    e.bold(true)
      .line(toPrinterText(`Table: ${tableLabel || 'Takeaway'}`.toUpperCase()))
      .bold(false);
  }

  e.line(divider('-'));

  e.line(`Sent: ${formatSentAt(order?.createdAt || job?.createdAt)}`);
  if (!directSale && tableLabel) {
    const coverBit =
      covers != null ? `, ${covers} Cover${covers === 1 ? '' : 's'}` : '';
    e.line(toPrinterText(`Table: ${tableLabel}${coverBit}`));
  }
  e.line(`Order: ${orderNumber}`);
  if (partyLabel) e.line(`Party Name: ${toPrinterText(partyLabel)}`);
  if (serverName) e.line(`Server: ${toPrinterText(serverName)}`);

  if (note) {
    e.line('');
    e.bold(true).line('NOTES').bold(false);
    writeWrapped(e, note);
  }

  e.line(divider('='));
  e.bold(true).line('DRINKS').bold(false);
  e.line('');

  if (!items.length) {
    e.line('(no items)');
  } else {
    for (const item of items) {
      writeTicketItem(e, item, {qtySep: 'x', includeSeats: true});
      e.line('');
    }
  }

  e.line(divider('='));
  e.align(1).line(`*** BAR #${orderNumber} ***`);
  e.resetStyle();
  e.line('');
  e.cut();
  return e.toBase64();
}

export interface ReceiptTicketParams {
  job?: PrintJob | null;
  order?: Partial<ReceiptOrder> | null;
  restaurantName?: string;
  restaurantDetails?: PrintJobRestaurant | null;
  serverName?: string | null;
  guestCount?: number | string | null;
  isReprint?: boolean;
}

export function buildReceiptTicket(params: ReceiptTicketParams): string {
  const {
    job,
    order,
    restaurantName,
    restaurantDetails,
    serverName,
    guestCount,
    isReprint = false,
  } = params;

  const e = encoder();
  const rest = (restaurantDetails || {}) as Record<string, string>;
  const brand =
    rest.name ||
    restaurantName ||
    job?.metadata?.restaurantName ||
    config.APP_NAME.toUpperCase();
  const restAddress =
    rest.address ||
    '345 Main Street South\nExeter, ON, Canada, N0M 1S6';
  const restPhone = rest.phone || '519 235 0050';
  const hstNumber = rest.hstNumber || '740811146';
  const thankYou = rest.thankYouMessage || 'Thank You! Please Come Again!';

  const reprint =
    isReprint ||
    Boolean(job?.parentPrintJobId || job?.metadata?.isReprint) ||
    (Number(job?.attemptCount) || 0) > 1;

  const orderNumber =
    job?.metadata?.orderNumber || order?.orderNumber || '-';
  const invoiceNumber = ((order as Record<string, unknown> | undefined)?.invoiceNumber as string | undefined) || '-';
  const tableNo = resolveTableNo(job, order);
  const floorName = resolveFloorName(job, order);
  const tableLabel = formatTableNumbersWithFloor(tableNo, floorName);
  const partyLabel =
    order?.partyName ||
    order?.guestName ||
    job?.metadata?.partyName ||
    job?.metadata?.guestName ||
    '';

  const orderTaxBreakdown = (order as {taxBreakdown?: TaxBreakdownLine[]})?.taxBreakdown;
  const taxBreakdown = (Array.isArray(orderTaxBreakdown)
    ? orderTaxBreakdown
    : []) as TaxBreakdownLine[];
  const hstAmount =
    taxBreakdown.length > 0
      ? taxBreakdown.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      : Number(order?.taxTotal || 0);

  const rawOrder = (order || {}) as Record<string, unknown>;
  const meta = (job?.metadata || {}) as Record<string, unknown>;

  const methodStr = String(
    rawOrder.paymentMethod ||
    meta.paymentMethod ||
    rawOrder.method ||
    meta.method ||
    '',
  ).trim();

  const tip = Number(rawOrder.tipAmount ?? meta.tipAmount ?? 0);
  const discount = Number(rawOrder.discountTotal ?? meta.discountTotal ?? 0);
  const serviceCharge = Number(
    rawOrder.serviceChargeTotal ?? meta.serviceChargeTotal ?? 0,
  );
  const giftUsed = Number(
    rawOrder.giftcardUsedAmount ??
    rawOrder.giftCardUsedAmount ??
    rawOrder.giftCardUsed ??
    meta.giftcardUsedAmount ??
    meta.giftCardUsedAmount ??
    meta.giftCardUsed ??
    0,
  );
  const cash = Number(rawOrder.cashAmount ?? meta.cashAmount ?? 0);
  const card = Number(rawOrder.cardAmount ?? meta.cardAmount ?? 0);
  const orderTotal = Number(
    rawOrder.totalAmount ?? meta.totalAmount ?? rawOrder.amount ?? 0,
  );
  const grandTotal = orderTotal + tip;

  const cardLabelMatch = methodStr.match(/Card\s*-\s*([^+/]+)/i);
  const cardLabel = cardLabelMatch
    ? `Card (${cardLabelMatch[1].trim()})`
    : 'Card';

  const tipMethod = String(rawOrder.tipMethod || meta.tipMethod || '').trim();
  let tipLabel = 'Tip';
  if (tip > 0) {
    if (/gift/i.test(tipMethod)) tipLabel = 'Tip (Gift Card)';
    else if (/cash/i.test(tipMethod)) tipLabel = 'Tip (Cash)';
    else if (/card/i.test(tipMethod)) tipLabel = 'Tip (Card)';
    else if (/gift\s*card/i.test(methodStr) && !/cash|card\s*-/i.test(methodStr)) {
      tipLabel = 'Tip (Gift Card)';
    } else if (/cash/i.test(methodStr) && !/card/i.test(methodStr)) {
      tipLabel = 'Tip (Cash)';
    } else if (/card/i.test(methodStr) && !/cash/i.test(methodStr)) {
      tipLabel = 'Tip (Card)';
    } else if (/cash/i.test(methodStr)) tipLabel = 'Tip (Cash)';
    else if (/card/i.test(methodStr)) tipLabel = 'Tip (Card)';
  }

  const hasPaymentSplit =
    giftUsed > 0 || cash > 0 || card > 0 || Boolean(methodStr);

  const rawItems = ((order?.items || []) as unknown[]) as AnyTicketItem[];
  const regularItems = rawItems.filter((item) => !isOfferItem(item));
  const offerItems = rawItems.filter((item) => isOfferItem(item));

  const discountPct = (() => {
    if (order?.discountPercent != null && Number(order.discountPercent) > 0) {
      return Number(order.discountPercent);
    }
    const numSub = Number(order?.subTotal || 0);
    const numDisc = Number(discount || 0);
    if (numSub > 0 && numDisc > 0) {
      return Math.round((numDisc / numSub) * 1000) / 10;
    }
    return null;
  })();

  const discountLabel = (() => {
    if (discountPct != null && discountPct > 0) {
      return `Discount (${discountPct}%)`;
    }
    if (discount > 0) {
      return `Discount ($${discount.toFixed(2)})`;
    }
    return 'Discount';
  })();

  const totalHstRate = (() => {
    const breakdownRatesSum = taxBreakdown.reduce(
      (sum, t) => sum + (Number(t.rate) || 0),
      0,
    );
    if (breakdownRatesSum > 0) {
      return Math.round(breakdownRatesSum * 10) / 10;
    }
    const sub = Number(order?.subTotal || 0);
    const taxableBase = Math.max(0, sub - Number(discount || 0));
    if (
      taxableBase > 0 &&
      (hstAmount > 0 || Number(order?.taxTotal || 0) > 0)
    ) {
      return (
        Math.round(
          (Number(order?.taxTotal || hstAmount) / taxableBase) * 1000,
        ) / 10
      );
    }
    if (
      sub > 0 &&
      (hstAmount > 0 || Number(order?.taxTotal || 0) > 0)
    ) {
      return (
        Math.round(
          (Number(order?.taxTotal || hstAmount) / sub) * 1000,
        ) / 10
      );
    }
    return null;
  })();

  const hstLabel =
    totalHstRate != null && totalHstRate > 0
      ? `HST (${totalHstRate}%)`
      : 'HST';

  e.init();

  e.align(1).bold(true).line(toPrinterText(String(brand).toUpperCase()));
  e.bold(false);
  if (reprint) {
    e.align(1).bold(true).line('*** REPRINT ***').bold(false);
  }
  for (const addrLine of String(restAddress).split(/\r?\n/)) {
    e.line(toPrinterText(addrLine));
  }
  e.line(toPrinterText(restPhone));
  e.line(formatSentAt(order?.createdAt || job?.createdAt));
  e.resetStyle();
  e.line(divider('-'));

  e.line(
    formatTwoColumnLine(
      `Order #: ${orderNumber}`,
      `Invoice No: ${invoiceNumber}`,
    ),
  );
  e.line(`Server: ${toPrinterText(serverName || 'Server')}`);
  if (shouldShowTable({tableNo: tableNo || undefined, source: order?.source})) {
    e.line(`Table: ${toPrinterText(tableLabel)}`);
  }
  if (partyLabel || !shouldShowTable({tableNo: tableNo || undefined, source: order?.source})) {
    e.line(`Party: ${toPrinterText(partyLabel || 'Walk-in')}`);
  }
  if (guestCount != null && guestCount !== '') {
    e.line(`Guests: ${guestCount}`);
  }
  e.line(`HST: ${toPrinterText(hstNumber)}`);

  e.line(divider('-'));
  e.bold(true).line(formatTwoColumnLine('ITEM', 'AMOUNT')).bold(false);
  e.line(divider('-'));

  for (const item of regularItems) writeReceiptItem(e, item);
  if (offerItems.length) {
    if (regularItems.length) e.line(divider('-'));
    e.bold(true).line('OFFERS').bold(false);
    e.line(divider('-'));
    for (const item of offerItems) writeReceiptItem(e, item);
  }
  if (!rawItems.length) e.line('(no items)');

  e.line(divider('-'));
  e.line(formatTwoColumnLine('Subtotal', money(order?.subTotal)));
  if (discount > 0) {
    e.line(formatTwoColumnLine(discountLabel, `-${money(discount).slice(1)}`));
    e.line(
      formatTwoColumnLine(
        'Net Amount',
        money(Math.max(0, Number(order?.subTotal || 0) - discount)),
      ),
    );
  }
  if (hstAmount > 0 || (discount > 0 && totalHstRate != null && totalHstRate > 0)) {
    e.line(formatTwoColumnLine(hstLabel, money(hstAmount)));
  }
  if (serviceCharge > 0) {
    e.line(
      formatTwoColumnLine(
        order?.serviceChargeName || 'Server Charge',
        money(serviceCharge),
      ),
    );
  }
  if (tip > 0) {
    e.line(formatTwoColumnLine(tipLabel, money(tip)));
  }

  e.line(divider('-'));
  e.bold(true)
    .line(formatTwoColumnLine('TOTAL', money(grandTotal)))
    .bold(false);

  if (hasPaymentSplit) {
    e.line(divider('-'));
    e.bold(true).line('PAYMENT METHOD').bold(false);
    if (giftUsed > 0) {
      e.line(formatTwoColumnLine('Gift Card', money(giftUsed)));
    }
    if (cash > 0) e.line(formatTwoColumnLine('Cash', money(cash)));
    if (card > 0) e.line(formatTwoColumnLine(cardLabel, money(card)));
    if (giftUsed <= 0 && cash <= 0 && card <= 0 && methodStr) {
      const displayAmount = grandTotal > 0 ? money(grandTotal) : money(orderTotal);
      if (methodStr.includes('+')) {
        e.line(formatTwoColumnLine(toPrinterText(methodStr), displayAmount));
      } else if (/gift/i.test(methodStr)) {
        e.line(formatTwoColumnLine('Gift Card', displayAmount));
      } else if (/cash/i.test(methodStr)) {
        e.line(formatTwoColumnLine('Cash', displayAmount));
      } else if (/card/i.test(methodStr)) {
        e.line(formatTwoColumnLine(cardLabel, displayAmount));
      } else {
        e.line(formatTwoColumnLine(toPrinterText(methodStr), displayAmount));
      }
    }
  }

  e.line(divider('-'));
  e.align(1).bold(true).line(toPrinterText(thankYou)).bold(false);
  e.resetStyle();
  e.line('');
  e.cut();
  return e.toBase64();
}

export interface BuildTicketFromJobParams {
  job: PrintJob;
  order?: Partial<ReceiptOrder> | null;
  kotItems?: KotLineItem[];
  restaurantName?: string;
  restaurantDetails?: PrintJobRestaurant | null;
  serverName?: string | null;
  guestCount?: number | string | null;
  isReprint?: boolean;
}

export function buildTicketFromJob(params: BuildTicketFromJobParams): string {
  const {
    job,
    order,
    kotItems = [],
    restaurantName,
    restaurantDetails = null,
    serverName,
    guestCount,
    isReprint,
  } = params;

  const reprintFlag =
    isReprint !== undefined
      ? isReprint
      : Boolean(job?.parentPrintJobId || job?.metadata?.isReprint) ||
        (Number(job?.attemptCount) || 0) > 1;

  const printType = job?.printType || 'KOT';
  if (printType === 'RECEIPT') {
    return buildReceiptTicket({
      job,
      order,
      restaurantName,
      restaurantDetails,
      serverName,
      guestCount,
      isReprint: reprintFlag,
    });
  }
  if (printType === 'BAR_RECEIPT') {
    return buildBarTicket({
      job,
      order,
      kotItems,
      restaurantName,
      serverName,
      guestCount,
      isReprint: reprintFlag,
    });
  }
  return buildKotTicket({
    job,
    order,
    kotItems,
    restaurantName,
    serverName,
    guestCount,
    isReprint: reprintFlag,
  });
}
