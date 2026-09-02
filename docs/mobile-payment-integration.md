# Mobile Payment Integration

This document audits the order → payment → bill/receipt lifecycle against the Tasty Bites web POS and backend. Web is source of truth.

Related docs: [`mobile-order-integration.md`](mobile-order-integration.md), [`mobile-printing-integration.md`](mobile-printing-integration.md).

## 1. Order creation endpoint

**`POST /api/orders/employee`**

Creates or updates POS order. Returns `orderNumber`, `items`, `kotPayload`, `ticketType`, `printJobId`, totals, `invoiceNumber` (assigned at first create).

## 2. Order update endpoint

Same **`POST /api/orders/employee`** with `orderId` or active `sessionId`. Incremental KOT via `sentQty`.

## 3. Order retrieval endpoint

| Query | Purpose |
|-------|---------|
| `GET /api/orders/employee?sessionId=` | Active table order |
| `GET /api/orders/employee?orderId=` | Direct order |
| `GET /api/orders/employee?today=true` | All restaurant orders today |

## 4. Order status values

`PENDING`, `CONFIRMED`, `COMPLETED`, `PAID`, `CANCELLED`, `WAIVED`

Client UI may show `DRAFT` before first KOT (not persisted).

## 5. Order type / source values

Persisted **`Order.source`:** `POS`, `WALK_IN`, `STAFF`, `ONLINE`

Mobile `orderType` maps to `source` on submit (see mobile-order-integration.md).

## 6. Payment endpoint

**`POST /api/sales/payments`**

Auth: `ADMIN`, `MANAGER`, `SERVER`, `BARTENDER`

## 7. Payment request (required)

| Field | Required |
|-------|----------|
| `orderId` | Yes |

## 8. Payment request (common optional fields)

| Field | Notes |
|-------|-------|
| `amount` | Client total for validation (±$0.02); server recomputes authoritative total |
| `method` | e.g. `Card - Visa`, `Cash`, `Gift Card + Cash` |
| `sessionId` | Table session Mongo `_id` |
| `tipAmount`, `tipMethod` | Tip from overpay; blocked if service charge applied |
| `discountTotal`, `discountCode` | Coupon; STAFF orders use server staff discount |
| `guestName`, `partyName`, `guestCount` | Party fields |
| `cashAmount`, `cardAmount` | Split tender |
| `cardType` | Visa, Mastercard, etc. — no PAN/CVV |
| `giftCardCode`, `giftCardUsedAmount`, `splitAmount` | Gift card redeem |
| `applyServiceCharge`, `serviceChargeTotal`, `serviceChargeName` | Service tax |

## 9. Payment response

```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": { /* paid Order */ "printJobId": "...", "processedByName": "..." }
}
```

Mobile maps `data` to `PaidOrderSnapshot` via `mapPaymentResponseToSnapshot`.

## 10. Payment status

`paymentStatus`: `UNPAID`, `PARTIAL`, `PAID`, `REFUNDED`

After successful POST: `status` and `paymentStatus` become `PAID`.

## 11. Supported payment methods

Recorded as `paymentMethod` string on order (not a fixed enum). Examples: `Cash`, `Card - Visa`, `Gift Card + Card - Cash`.

No payment gateway in repo — card is manual/terminal record only.

## 12. Cash behavior

Client sends `cashAmount`. Overpay above due amount becomes `tipAmount` (web modal). Server validates totals.

## 13. Card behavior

Client sends `cardType` + `cardAmount`. **Never** send card number, CVV, or track data.

## 14. Gift card behavior

- Verify: `GET /api/menu/giftcards?code={CODE}`
- Redeem: `giftCardCode` + `giftCardUsedAmount` on payment POST
- Server `redeemGiftCardAtomic` before marking paid
- Balance authoritative on server only

## 15. Discount behavior

- List: `GET /api/orders/discount`
- Validate: `POST /api/orders/discount` `{ code }`
- Staff orders: server applies `staffDiscount` % at payment (not client coupon)
- Payment-phase only for session POS (after KOT)

## 16. Tax behavior

Order carries `taxTotal` from repriced lines. Payment may set `taxBreakdown[]` on save.

Service charge: optional `GET /api/tax/servicetax?active=1`; applied at payment when `applyServiceCharge: true`.

## 17. Bill generation

**No separate bill API.** Pre-pay summary is the same `Order` document. UI label only.

## 18. Receipt generation

Post-payment receipt is the **same paid `Order`** rendered in `ReceiptPreview` (`mode: customer`).

## 19. Receipt print job

After successful payment save, server `createReceiptPrintJob()` → `printJobId` in response.

`printType: RECEIPT`, `printerTarget: RECEIPT`. Idempotency: `receipt:{orderId}:paid`.

## 20. Table release behavior

Payment does **not** auto-release table.

**`PUT /api/sales/sessions`** `{ sessionId, action: "RELEASE" }` — manual after receipt (mobile `releaseTableSession`).

Socket: `table:released` on `floor:{floorId}`.

## 21. Socket.IO events

| Event | When |
|-------|------|
| `payment:completed` | After payment save (`floor:{id}` or `restaurant:{id}`) |
| `NEW_PRINT_JOB` | Receipt job created |
| `order:updated` | Order changes (not on payment alone) |

Mobile: `useFloorRealtime` reloads floor; `usePrintJobRealtime` updates print queue.

## 22. Error responses

| HTTP | Typical message |
|------|-----------------|
| 400 | Validation (amount mismatch, invalid discount, tip+SC, gift card) |
| 404 | Order not found |
| 409 | **This order has already been paid** |
| 500 | Server error |

## Idempotency / duplicate protection

- Payment: **409** if already paid (no idempotency-key header)
- UI: disable Pay button while `processing`
- Mobile Phase 5: `fetchPaymentRecoveryState` checks server before retry after timeout
- Receipt print: server idempotency key prevents duplicate receipt jobs

## Online orders

Web **Today** page hides Pay Now for `source === ONLINE` (view/KOT only). Mobile matches via `canPayTodayOrder`.

Note: `mobile-order-integration.md` §12 suggested staff pay online orders — **web does not support in-POS payment for ONLINE**.

## Waive unpaid bill

**`PATCH /api/orders/employee`** `{ orderId, action: "waive", reason }`

May auto-release table session if linked.

## Mobile service mapping

| Step | Service / screen |
|------|------------------|
| Create/update order | `orderService.submitOrder` |
| Today list | `todayOrdersService.fetchTodayOrders` |
| Payment | `paymentService.processPayment` |
| Recovery | `paymentService.fetchPaymentRecoveryState` |
| Receipt preview | `ReceiptScreen` + `PaidOrderSnapshot` from API |
| Receipt print status | `PrintJobStatusStrip` + `printJobId` |
| Table release | `sessionService.releaseTableSession` |

## UNKNOWN / verification notes

| Item | Status |
|------|--------|
| External ONLINE payment provider | UNKNOWN — not in this repo |
| Payment network timeout recovery | Mobile polls order status; cannot verify without live failure injection |
| Physical receipt printing | See `mobile-printing-integration.md` PRINTER HARDWARE BLOCKER |
