# Mobile Order Integration

This document describes how the Tasty Bites web sales order page works and how the mobile app integrates with the same backend. The web implementation is the source of truth.

## 1. Order creation endpoint

**`POST /api/orders/employee`**

- **File:** `Web/src/app/api/orders/employee/route.js`
- **Auth:** Employee session cookies; roles: EMPLOYEE, MANAGER, ADMIN, SERVER, BARTENDER
- **Behavior:** Create (201) or update (200) POS order; server reprices cart via `repricePosCartItems`
- **Response includes:** `orderNumber`, `items`, `kotPayload`, `ticketType` (`KOT` | `BAR_RECEIPT`), `processedByName`

## 2. Order update endpoint

Same as creation: **`POST /api/orders/employee`** with `orderId` (direct) or active `sessionId` (table).

## 3. Order fetch endpoint

| Query | Purpose |
|-------|---------|
| `GET /api/orders/employee?sessionId={mongoId}` | Active table order (`PENDING` / `CONFIRMED`) |
| `GET /api/orders/employee?orderId={id}` | Direct order (`WALK_IN`, `STAFF`, `POS`) |
| `GET /api/orders/employee?today=true` | All restaurant orders today |
| `GET /api/orders/employee` | Current employee's orders |

Returns `null` in `data` when no active order exists.

## 4. Product endpoint

**`GET /api/menu/products?active=1`**

- Populated `category`, `discount`, `taxes`
- Modifiers inline: `variants`, `addons`, `choiceOptions`, `preparationStyles`, `productType`

## 5. Category endpoint

**`GET /api/menu/categories?active=1`**

## 6. Modifier endpoint

**No standalone modifiers API.** Modifier data lives on products and category addons.

## 7. Customer / party endpoint

No separate customer CRUD on POS. Party fields sent on **`POST /api/orders/employee`**:

- `guestName`, `partyName`, `contactNumber`, `guestCountryCode`, `guestEmail`, `guestCount`

## 8. Order session behavior

**Table:** Mongo `TableSession._id` passed as `sessionId` to order APIs.

**Direct (walk-in / staff):** No session; order id stored client-side (`direct-order-walk-in`, `direct-order-staff` — web uses `sessionStorage`; mobile uses AsyncStorage).

## 9. Table order behavior

1. `GET /api/sales/sessions?sessionId={id}` — guest count, table, floor
2. `GET /api/orders/employee?sessionId={id}` — hydrate cart if order exists
3. First KOT creates order with `source: POS` (default)
4. Subsequent KOT updates same order for session

## 10. Walking / direct order behavior

- Web route: `/sales/orders/walk-in`
- Mobile: `orderType: walking` → `source: WALK_IN`
- No table; optional party name
- Persist `orderId` in AsyncStorage key `direct-order-walk-in`

## 11. Staff order behavior

- Web route: `/sales/orders/staff`
- `source: STAFF`, requires `staffForId`, optional `staffOrderReason`
- Staff list: `GET /api/sales/employees`
- Staff discount applied at payment (not cart) via employee `staffDiscount`

## 12. Online order behavior

- Web: **Online Order → `/sales/today`** with ONLINE filter
- Staff view/pay/waive; **no** order-builder creation via employee API
- Mobile: Floor **Online** navigates to Orders screen (not Create Order)

## 13. Employee / staff assignment

- Table session: `assignedEmployeeId` on `TableSession` (session open / transfer)
- Order: `processedBy` set server-side on create/update
- Staff order: `staffForId` in POST body

## 14. Customer / party assignment

Set on order create/update via POST body. Table fallback: `resolvePartyName()` uses table + guests when name empty.

## 15. Order status

**DB `Order.status`:** `PENDING`, `CONFIRMED`, `COMPLETED`, `PAID`, `CANCELLED`, `WAIVED`

**Client UI:** `"Draft"` before first KOT (not persisted)

**`paymentStatus`:** `UNPAID`, `PARTIAL`, `PAID`, `REFUNDED`

## 16. Order type

**Persisted `Order.source`:** `POS`, `WALK_IN`, `STAFF`, `ONLINE`

POST field `orderType` (e.g. `"Dine-in"`) is **not persisted** — use `source`.

## 17. Order number generation

Server-side via `getNextOrderNumber` / `getNextInvoiceNumber` in employee route.

## 18. Cart persistence

| Phase | Table | Direct |
|-------|-------|--------|
| Before KOT | Client cart only | Client cart + optional stored orderId |
| After KOT | Server order + synced items | Same + AsyncStorage orderId |
| Pay | Requires `hasSentKot` equivalent | Same |

## 19. Existing order reopening

Table: navigate with `sessionId` → fetch order → `buildCartFromOrderItems`

Direct: read stored orderId → `GET ?orderId=`

## 20. Order notes

`specialNote` on order; sent in POST body.

## 21. Discount handling

Payment-phase: `GET/POST /api/orders/discount`. Order may carry `discountCode` / `discountTotal` from server after KOT.

## 22. Gift card handling

Payment-phase: `GET /api/menu/giftcards?code=` — not order screen Phase 3.

## 23. KOT behavior

On successful POST, response includes `kotPayload` (new/unprinted items only on update) and `ticketType`. Print jobs enqueued server-side.

## 24. Socket.IO events

| Event | Room | Payload |
|-------|------|---------|
| `order:created` | `floor:{floorId}` | `{ orderId, sessionId }` |
| `order:updated` | `floor:{floorId}` | `{ orderId, sessionId }` |
| `payment:completed` | `floor:{floorId}` | `{ orderId, sessionId? }` |

Mobile order screen listens on same floor room; does not overwrite local cart when `dirty`.

## 25. Realtime order updates

Web refetches order on socket events without dirty-state guard.

**Concurrent editing:** UNKNOWN — needs verification. Mobile sets `remoteUpdatePending` when dirty and socket fires.

## 26. Backend limitations

| Item | Status |
|------|--------|
| `orderId` on floor API | Not returned — must fetch order by session |
| Party name on floor cards | Not on floor API |
| ONLINE order creation via employee API | Not supported on web |
| Offline order queue | Not implemented |

## Mobile mapping

| Mobile `orderType` | Backend `source` | Direct storage key |
|--------------------|------------------|-------------------|
| `table` | `POS` | — |
| `walking` | `WALK_IN` | `direct-order-walk-in` |
| `staff` | `STAFF` | `direct-order-staff` |
| `online` | — | Navigate to Orders, not Create Order |
