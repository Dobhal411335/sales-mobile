# Mobile Printing Integration

This document describes how the Tasty Bites web POS handles order tickets, payments, receipts, and print jobs, and how the mobile app integrates with the same backend. The web implementation is the source of truth.

## 1. Order creation endpoint

**`POST /api/orders/employee`**

- Creates or updates POS order; server reprices items
- On success: enqueues KOT or bar print job server-side, returns `kotPayload`, `ticketType`, `printJobId`
- Incremental KOT: `sentQty` on lines; `kotPayload` contains only unprinted qty delta

## 2. KOT flow

1. Client POST cart to `/api/orders/employee`
2. Server saves order, builds `kotPayload` delta
3. Server `createKotPrintJob` if `routeToKitchen === true`
4. Socket `NEW_PRINT_JOB` to `floor:{floorId}` and `restaurant:{restaurantId}`
5. Client shows preview from `kotPayload` (browser `window.print` on web)

**Routing rule:** `cartHasKitchenItem()` — if any line `productType !== "BAR"` → KOT → `printerTarget: KITCHEN`. Else bar receipt → `COUNTER`.

## 3. Bar ticket flow

Same POST as KOT. When **all** cart items are `productType === "BAR"`:

- `createBarReceiptPrintJob` with `printType: BAR_RECEIPT`, `printerTarget: COUNTER`
- Response `ticketType: "BAR_RECEIPT"`

## 4. Receipt / bill flow

**`POST /api/sales/payments`** only after successful payment:

1. Server marks order PAID, validates amount against server-computed total
2. `createReceiptPrintJob` → `printType: RECEIPT`, `printerTarget: RECEIPT` (counter)
3. Returns `{ ...order, printJobId, processedByName }`
4. Socket `payment:completed` + `NEW_PRINT_JOB`

Mobile preview uses paid order object; physical print tracked via print job status.

## 5. Print job API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/sales/print-jobs?status=&limit=` | List jobs |
| GET | `/api/sales/print-jobs/:id` | Detail + order + kotItems |
| PATCH | `/api/sales/print-jobs/:id` | `mark_printed`, `retry`, `cancel` |
| POST | `/api/sales/print-jobs/:id/print-test` | Run server adapter |
| POST | `/api/sales/print-jobs/:id/complete` | Hardware agent reports result (Electron) |
| GET | `/api/sales/printers` | Enabled printer configs |

## 6. Print job response

List/detail returns `PrintJob` with `_id`, `orderId`, `printType`, `printerTarget`, `status`, `attemptCount`, `errorMessage`, `metadata`, timestamps.

Socket payload (`toPrintJobEventPayload`): `printJobId`, `orderId`, `orderNumber`, `printType`, `printerTarget`, `status`, `attemptCount`, `createdAt`, `errorMessage`, `tableNo`.

## 7. Print job status values

`QUEUED` → `PRINTING` → `PRINTED` | `FAILED` | `CANCELLED`

## 8. Printer target values

`KITCHEN`, `COUNTER`, `RECEIPT` (matches `PrinterConfig.target`)

## 9. Printer routing rules

- KOT → `KITCHEN`
- BAR_RECEIPT → `COUNTER`
- RECEIPT (customer bill) → `RECEIPT`
- Routing set at job creation on server; mobile does not pick printer IP

## 10. Printer configuration source

**Database:** `PrinterConfig` — `target` (purpose), `connectionType` (`USB` | `NETWORK` | `LAN` | `BLUETOOTH`), `systemPrinterName` (USB), `host`/`port` (network only), `location`, `type` (`THERMAL`), `enabled`.

Admin: `/api/admin/printers`. Sales agents: `GET /api/sales/printers`.

## 11. Printer ID

`PrinterConfig._id` — stored on `PrintJob.printerId` when created; also in `NEW_PRINT_JOB` payload as `printerId` + `connectionType` + `systemPrinterName`.

## 12. Printer IP / hostname

Stored in `PrinterConfig.host` + `port` for **NETWORK/LAN only**. USB printers do **not** use IP. **Never hard-code in mobile.**

## 13. Printer model

Optional `type` field (default `THERMAL`). Display name is `PrinterConfig.name`.

## 14. Printer connection type

- **USB:** Windows local print-bridge (`127.0.0.1:9105`) → Spooler RAW → USB thermal (e.g. KPC307-UEWB)
- **NETWORK/LAN:** Electron `printRaw` TCP :9100 ESC/POS
- **BLUETOOTH:** reserved (not in Milestone 1)

## 15. Adapter architecture

- `getPrinterAdapter()` — `PRINT_ADAPTER` env: `mock` (default) or `star` (placeholder fails)
- `executePrintJob()` runs adapter on retry/print-test only
- Jobs created as `QUEUED`; hardware agents (Electron / print-bridge) print and call `/complete`

## 16. Star integration

`StarPrinterAdapter.js` exists but returns failure. Production browser path uses **ElectronPrintAgent** + ESC/POS bytes, not Star SDK in browser.

## 17. Mock printer behavior

`MockPrinterAdapter`: 800ms delay, optional `simulateFailure`; no hardware contact.

## 18. Socket.IO print events

| Event | Rooms | When |
|-------|-------|------|
| `NEW_PRINT_JOB` | `floor:{floorId}`, `restaurant:{restaurantId}` | Job created |
| `PRINT_JOB_UPDATED` | Same | Status change, retry, complete |
| `PRINTER_TEST` | `restaurant:{restaurantId}` | Admin printer test |

Payload includes `printJobId`, `printerId`, `connectionType`, `systemPrinterName` (no payment secrets).

Mobile: `usePrintJobRealtime` in `socket.ts` listens `NEW_PRINT_JOB`, `PRINT_JOB_UPDATED`.

## 19. Retry behavior

`PATCH` action `retry` → resets to `QUEUED`, runs `executePrintJob()`. Retries **print job ID**, not order creation. USB bridge also listens for re-queued `NEW_PRINT_JOB` / status updates if re-emitted.

## 20. Failure behavior

Job → `FAILED` with `errorMessage`. Payment still succeeds if receipt job creation fails (logged server-side).

## 21. Duplicate print protection

Idempotency keys: `kot:{orderId}:{sig}`, `bar:{orderId}:{sig}`, `receipt:{orderId}:paid`. Mobile retry must use existing `printJobId`.

## 22. Tenant isolation

All APIs scoped by authenticated `request.restaurant`. Printer configs and jobs per restaurant.

---

## Milestone 1 — USB print bridge (locked architecture)

```
Android App (Android Studio on Windows laptop)
    ↓  HTTPS APIs only — NO USB printer libraries
Hostinger Next.js Backend
    ↓  Existing PrintJob + idempotency
Socket.IO NEW_PRINT_JOB
    ↓
Windows print-bridge on 127.0.0.1:9105 (same laptop as USB printer)
    ↓
Windows Spooler RAW
    ↓
KPC307-UEWB USB Printer
```

### Hard rules for Mobile

- **Do NOT** add Android USB printer SDKs or ESC/POS-over-USB from the app
- **Do NOT** call `127.0.0.1:9105` from Android
- Android only creates sales/orders and tracks print-job status via existing APIs/sockets
- Physical print is solely the Windows print-bridge’s responsibility

### Printer registration example (USB receipt)

- name: `Receipt Printer`
- type: `THERMAL`
- connectionType: `USB`
- systemPrinterName: `KPC307-UEWB`
- host/port: null
- location: `COUNTER`
- target/purpose: `RECEIPT`
- enabled: true

---

## BACKEND GAP: Mixed kitchen + bar orders

If cart contains both kitchen and bar items, web sends **one** KOT to kitchen (entire ticket). No split into separate kitchen KOT + bar ticket in one POST. Mobile follows this behavior.

## PRINTER HARDWARE PATHS

1. Backend creates `QUEUED` print jobs after successful order/payment
2. Socket emits `NEW_PRINT_JOB`
3. **USB:** Windows `print-bridge` listens, builds ESC/POS, sends Spooler RAW, `POST .../complete`
4. **NETWORK/LAN:** Electron desktop (`ElectronPrintAgent`) TCP :9100, then `complete`

**Mobile does not talk to USB or the local print bridge.**

Do not claim physical printing works without testing on restaurant hardware.

---

## Payment APIs (Phase 4)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/sales/payments` | Process payment, create receipt print job |
| `GET /api/orders/discount` | List active coupons |
| `POST /api/orders/discount` | Validate coupon code |
| `GET /api/menu/giftcards?code=` | Verify gift card balance (POS redeem) |
| `GET /api/tax/servicetax?active=1` | Active service charge config |
| `PUT /api/sales/sessions` | `action: "RELEASE"` — release table after pay |

## Table release

After payment, optional UI releases session via `PUT /api/sales/sessions` with `sessionId` + `action: "RELEASE"`. Emits `table:released` on floor room.

## Mobile mapping

| Flow | Mobile behavior |
|------|----------------|
| KOT | `submitOrder` → show preview + track `printJobId` status |
| Payment | `processPayment` → `POST /api/sales/payments` |
| Receipt | Preview from server response; track receipt `printJobId` |
| Print retry | `retryPrintJob(printJobId)` |
| Local printer | `PrinterService` backend mode — no fake success |
