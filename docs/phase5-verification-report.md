# Phase 5 Verification Report

Order creation → payment → bill/receipt lifecycle audit. Web/backend is source of truth.

**Static gates:** `npm run typecheck` — PASS. Phase 5 files eslint — PASS.

**Live API / hardware:** NOT VERIFIED in this session (no `API_BASE_URL` against production backend; no restaurant print agent).

---

## Audit items (mobile-payment-integration.md)

| # | Topic | Status | Notes |
|---|--------|--------|-------|
| 1 | Order create `POST /api/orders/employee` | VERIFIED (static) | `orderService.submitOrder` maps response including `printJobId` |
| 2 | Order update (same POST) | VERIFIED (static) | Incremental KOT via `sentQty` |
| 3 | Order fetch session/orderId/today | FIXED | Today list now uses `?today=true`; payment hydrates via `fetchOrderById` |
| 4 | Order status values | VERIFIED (static) | Aligned with Order model |
| 5 | Order source values | VERIFIED (static) | POS/WALK_IN/STAFF/ONLINE |
| 6 | Payment `POST /api/sales/payments` | VERIFIED (static) | `paymentService.processPayment` |
| 7 | Payment required `orderId` | VERIFIED (static) | PaymentScreen blocks without order |
| 8 | Payment optional fields | VERIFIED (static) | Tip, discount, gift card, SC, split tender |
| 9 | Payment response + `printJobId` | FIXED | `mapPaymentResponseToSnapshot` + `taxBreakdown` |
| 10 | Payment status UNPAID→PAID | VERIFIED (static) | Server sets PAID on success |
| 11 | Payment method strings | VERIFIED (static) | Label built in PaymentScreen |
| 12 | Cash overpay → tip | VERIFIED (static) | Client sends `tipAmount` / `tipMethod` |
| 13 | Card without PAN/CVV | VERIFIED (static) | `cardType` + amounts only |
| 14 | Gift card verify + redeem | VERIFIED (static) | `verifyGiftCard` + payment POST fields |
| 15 | Discount at payment | VERIFIED (static) | Staff discount server-side; coupon via API |
| 16 | Tax / service charge | FIXED | Live mode no longer falls back to `MOCK_SERVICE_TAX` |
| 17 | Bill = same Order | VERIFIED (static) | No separate bill API |
| 18 | Receipt = paid Order | VERIFIED (static) | `ReceiptPreview` uses `orderSnapshot` |
| 19 | Receipt print job | VERIFIED (static) | `printJobId` on payment response; status strip polls API |
| 20 | Table release manual | VERIFIED (static) | `releaseTableSession` on Receipt Done |
| 21 | Socket events | VERIFIED (static) | `useFloorRealtime` / print job realtime exist |
| 22 | Errors 400/404/409 | FIXED | 409 → `alreadyPaid`; recovery before retry |

---

## Lifecycle test matrix

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 23 | Table create → KOT → pay → receipt | NOT VERIFIED | Requires live backend + device run |
| 24 | Direct walking order + AsyncStorage clear | NOT VERIFIED | Code path present; needs live run |
| 25 | Staff order + staff discount | NOT VERIFIED | Hydration applies staff discount when API returns STAFF |
| 26 | Online order — Pay hidden | VERIFIED (static) | `canPayTodayOrder` matches web |
| 27 | Existing order edit same `orderId` | NOT VERIFIED | Needs live session reopen |
| 28 | Discount total matches payment | NOT VERIFIED | Needs live coupon apply |
| 29 | Gift card valid/invalid | NOT VERIFIED | Needs live gift card API |
| 30 | Cash overpay / tip POST | NOT VERIFIED | Needs live payment |
| 31 | Payment failure UI not success | VERIFIED (static) | Failed state + message; no navigation to Receipt |
| 32 | Double Pay — 409 / disabled | FIXED | `processing` disables button; 409 + recovery |
| 33 | Network timeout recovery | FIXED | `fetchPaymentRecoveryState` (today list fallback for PAID) |
| 34 | Receipt print fail, order PAID | NOT VERIFIED | Payment independent of print job status |
| 35 | Two devices / socket floor | NOT VERIFIED | Needs multi-device live test |
| 36 | Reopen paid table | NOT VERIFIED | Backend rules per web |

*Note: matrix extended beyond 29 for traceability; primary deliverable count uses items 1–29 below.*

---

## Consolidated 29-point summary

| # | Item | Status |
|---|------|--------|
| 1 | Order create API wired | VERIFIED (static) |
| 2 | Order update / incremental KOT | VERIFIED (static) |
| 3 | Order fetch for payment hydrate | FIXED |
| 4 | Today orders live API | FIXED |
| 5 | Waive bill PATCH | FIXED |
| 6 | Payment POST wired | VERIFIED (static) |
| 7 | Payment payload alignment | VERIFIED (static) |
| 8 | Payment response → receipt snapshot | FIXED |
| 9 | PAID guard on Payment mount | FIXED |
| 10 | Service charge without mock leak | FIXED |
| 11 | Gift card via service only | FIXED |
| 12 | Discount via service only | FIXED |
| 13 | Cash / card / gift methods | VERIFIED (static) |
| 14 | Tip from overpay | VERIFIED (static) |
| 15 | Bill preview from server order | VERIFIED (static) |
| 16 | Receipt from payment snapshot | VERIFIED (static) |
| 17 | `taxBreakdown` on receipt | FIXED |
| 18 | `printJobId` through navigation | VERIFIED (static) |
| 19 | Print job status polling | VERIFIED (static) |
| 20 | Print Bill retries FAILED job | FIXED |
| 21 | Table release after receipt | VERIFIED (static) |
| 22 | Direct order storage cleared after pay | VERIFIED (static) |
| 23 | `orderNumber` passed to Payment | FIXED |
| 24 | Pay from Today hydrates cart | FIXED |
| 25 | `canPayTodayOrder` vs waive | FIXED |
| 26 | 409 already paid handling | FIXED |
| 27 | Timeout / ambiguous failure recovery | FIXED |
| 28 | ONLINE Pay Now hidden | VERIFIED (static) |
| 29 | Physical receipt printing | NOT VERIFIED — Electron print agent + LAN hardware required |

---

## Files created / modified

| Action | Path |
|--------|------|
| Create | `Mobile/docs/mobile-payment-integration.md` |
| Create | `Mobile/docs/phase5-verification-report.md` |
| Fix | `Mobile/src/services/todayOrdersService.ts` |
| Fix | `Mobile/src/utils/todayOrderHelpers.ts` |
| Fix | `Mobile/src/components/orders/OrderDetailPanel.tsx` |
| Fix | `Mobile/src/services/paymentService.ts` |
| Fix | `Mobile/src/screens/sales/payment/PaymentScreen.tsx` |
| Fix | `Mobile/src/screens/sales/create-order/CreateOrderScreen.tsx` |
| Fix | `Mobile/src/screens/sales/payment/ReceiptScreen.tsx` |
| Fix | `Mobile/src/printer/printerService.ts` |
| Types | `Mobile/src/types/payment.ts`, `Mobile/src/types/receipt.ts` |

---

## Backend gaps (unchanged)

- Mixed kitchen + bar items → single KOT to kitchen (web behavior).
- ONLINE in-POS payment not supported on web (external provider UNKNOWN).

## Hardware gaps

- Physical printing requires Electron print agent; mobile has no Star SDK (`mobile-printing-integration.md`).

## Tests

| Test | Result |
|------|--------|
| `npm run typecheck` | PASS |
| eslint Phase 5 files | PASS |
| Manual live API matrix | BLOCKED — no live backend in CI |
| Physical print | BLOCKED — no hardware |
