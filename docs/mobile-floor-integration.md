# Mobile Floor Integration

This document describes how the Tasty Bites web sales floor works and how the mobile app integrates with the same backend. The web implementation is the source of truth.

## 1. Floor / Area Endpoint

**`GET /api/sales/floor`**

- **File:** `Web/src/app/api/sales/floor/route.js`
- **Auth:** Employee session cookies via `withAuth` (roles: ADMIN, MANAGER, SERVER, BARTENDER)
- **Tenant:** Scoped to `request.restaurant` from JWT — never hard-code restaurant ID

"Area" in the UI maps to a **Floor** document. There is no separate Area entity.

## 2. Table Endpoint

Table layout data is returned as part of `GET /api/sales/floor` — there is no separate sales table list endpoint.

Admin table CRUD exists at `/api/floor/tables` but is not used by the sales floor screen.

## 3. Request Parameters

| Param | Location | Required | Description |
|-------|----------|----------|-------------|
| `floorId` | query | No | MongoDB Floor `_id`. If omitted or invalid, API uses first active floor |

## 4. Response Structure

```json
{
  "success": true,
  "message": "Floor data retrieved successfully",
  "data": {
    "floors": [
      { "id": "...", "name": "Main Hall Area", "width": 1200, "height": 800 }
    ],
    "activeFloorId": "...",
    "tables": [
      {
        "id": "...",
        "tableNumber": "01",
        "x": 100, "y": 200,
        "width": 80, "height": 80,
        "rotation": 0,
        "shape": "square",
        "seats": 6,
        "section": null
      }
    ],
    "sessions": [
      {
        "id": "...",
        "sessionId": "TS-ABCD1234-5678",
        "tableId": "...",
        "linkedTableIds": [],
        "tableNumbers": "01",
        "assignedEmployeeId": "...",
        "assignedEmployeeName": "Akhil Kumar",
        "guestCount": 6,
        "effectiveSeatCount": 6,
        "status": "ACTIVE",
        "openedAt": "2026-01-01T12:00:00.000Z",
        "hasActiveOrder": true,
        "orderTakerName": "Akhil"
      }
    ]
  }
}
```

## 5. Table ID

- **Unique identifier:** MongoDB `Table._id` — returned as `tables[].id`
- **Display name:** `tables[].tableNumber` (e.g. `"01"`, `"03"`)
- Navigation and API calls must use `table.id`, never the display number

## 6. Area ID

- **Area ID = Floor ID** (`floors[].id` / `activeFloorId`)
- Persist selected floor in AsyncStorage key `sales-active-floor-id` (matches web localStorage key)

**Floor selection priority (mobile):**
1. AsyncStorage `sales-active-floor-id`
2. API `activeFloorId` (first active floor when no stored preference)

> Web also uses `user.defaultFloor` from `/api/auth/me`. Mobile employee auth (`/api/employee/auth/me`) does not expose `defaultFloor`; shift `assignedFloor` is name-only.

## 7. Table Status Source

Status is **derived client-side** — not a simple database enum on `Table.status`.

Inputs:
- Open `TableSession` (`isSessionOpen: true`) matched to table via `primaryTable` + `linkedTables`
- `session.status` (e.g. `PAYMENT_PENDING`)
- `session.assignedEmployeeId` vs current user ID
- `session.hasActiveOrder` (server-computed)
- `session.linkedTableIds.length` for combined tables

`Table.status` (`Available`/`Occupied`/etc.) is updated on assign/release but **not used** for sales floor display.

## 8. Active Order Source

Server sets `session.hasActiveOrder` in `GET /api/sales/floor` by querying unpaid orders:

```
status ∈ [PENDING, CONFIRMED, Draft, Sent to Kitchen, Preparing, Ready, Served]
paymentStatus ∉ [PAID, Paid]
```

`orderTakerName` comes from the first unpaid active order's `processedBy` employee name.

**`orderId` is not returned on the floor API** — only the boolean `hasActiveOrder`.

## 9. Guest Count Source

`session.guestCount` on `TableSession`, set when opening a session (`POST /api/sales/sessions`) or via `PUT` action `UPDATE_GUESTS`.

## 10. Party / Customer Source

`Order.partyName` / `Order.guestName` — set when creating/updating orders via `POST /api/orders/employee`.

**Not available on floor API or floor cards.** Only shown after opening the order screen.

## 11. Employee / Server Assignment Source

- **Floor display:** `session.assignedEmployeeName` / `session.assignedEmployeeId`
- Set on session open (`POST /api/sales/sessions`) to current employee
- Changed via `PUT /api/sales/sessions` action `TRANSFER`

## 12. Booking Source

**No reservation/booking API exists for floor tables.**

`BOOKED` display status means **another employee's open session** — not a reservation.

## 13. Combined-Table Behavior

- Session has `linkedTableIds` (array of additional `Table._id`)
- All linked tables share the same session (matched via `sessionOwnsTable` / `findSessionForTable`)
- Open with `linkedTableIds` in `POST /api/sales/sessions` or reconfigure via `PUT` action `RECONFIGURE`
- Display status `COMBINED` when current user owns session and `linkedTableIds.length > 0`

## 14. Table Release Behavior

`PUT /api/sales/sessions` with `action: "RELEASE"`:
- Closes session (`isSessionOpen: false`, status `RELEASED`)
- Frees physical tables
- Blocks release if unpaid orders exist (unless `adminOverride`)
- Emits `table:released` socket event

Not fully implemented in mobile Phase 2 UI — documented for future phases.

## 15. Socket.IO Connection

- **Server:** `Web/server.js` — custom Node server with Socket.IO
- **Mobile client:** `Mobile/src/socket/socket.ts` — singleton `socketClient`
- **URL:** `config.API_BASE_URL`
- **Transports:** `websocket`, `polling`
- **Auth:** Cookie header (`employee_access_token`, `device_token`) via `buildCookieHeader()`

## 16. Socket.IO Room / Namespace

- Default namespace `/`
- **Auto-joined on connect:** `restaurant:{restaurantId}` (server-side)
- **Client must join:** `floor:{floorId}` via `socket.emit("join", "floor:{floorId}")`
- **Leave on floor change:** `socket.emit("leave", "floor:{previousFloorId}")`
- Room join is authorized server-side — floor must belong to authenticated restaurant

## 17. Socket.IO Authentication

Resolved from handshake cookies in `Web/src/lib/socketAuth.js`:
- `token` (admin) or `employee_access_token` (employee)
- `device_token` (activated device)

Mobile mirrors web by sending cookies in `extraHeaders.Cookie`.

## 18. Table-Related Events

| Event | Emitted from |
|-------|-------------|
| `table:assigned` | `POST /api/sales/sessions` |
| `table:updated` | `PUT /api/sales/sessions` (guests, payment pending, reconfigure) |
| `table:released` | `PUT /api/sales/sessions` RELEASE, order waive |
| `table:transferred` | `PUT /api/sales/sessions` TRANSFER |
| `order:created` | `POST /api/orders/employee` |
| `order:updated` | `POST /api/orders/employee` (update) |
| `payment:completed` | `POST /api/sales/payments` |

> Event is `table:updated` (not `table:update`).

## 19. Event Payloads

| Event | Payload |
|-------|---------|
| `table:assigned` | `{ sessionId, tableId, tableIds }` |
| `table:updated` | `{ sessionId, guestCount?, status?, effectiveSeatCount?, linkedTableIds? }` |
| `table:released` | `{ sessionId, tableId, tableIds }` |
| `table:transferred` | `{ sessionId, newEmployeeId }` |
| `order:created` | `{ orderId, sessionId }` |
| `order:updated` | `{ orderId, sessionId }` |
| `payment:completed` | `{ orderId, sessionId }` (floor room) |

Payloads contain IDs only — mobile refetches full floor data on any event (matches web).

## 20. How Web Updates UI After Events

Web (`sales/floor/page.js`):
1. Subscribes to all 7 events above
2. Each event calls `reloadCurrentFloor()` → `GET /api/sales/floor?floorId=...`
3. On socket reconnect, refetches floor data
4. Online staff polled every 30s via `GET /api/sales/online` (no socket event)

Mobile replicates this: full refetch on socket events, 30s online staff poll.

---

## Table Status Business Rules

Priority order (implemented in `Mobile/src/utils/tableStatus.ts`):

| Priority | Condition | Display |
|----------|-----------|---------|
| 1 | `session.status === 'PAYMENT_PENDING'` | PAYMENT |
| 2 | Session exists, not current user | BOOKED |
| 3 | My session + linked tables | COMBINED |
| 4 | My session + `hasActiveOrder` | ORDERING |
| 5 | My session, no order | SERVING |
| 6 | No session | AVAILABLE |

## Table Count Calculation

Client-side for current floor only:

```ts
tableCount = tables.length
activeSessionCount = sessions.length
activeOrderCount = sessions.filter(s => s.hasActiveOrder).length
```

## Session API (Table Assignment)

**Open session:** `POST /api/sales/sessions`

```json
{ "tableId": "...", "guestCount": 2, "linkedTableIds": [] }
```

Returns populated session; use `data._id` as `sessionId` for navigation.

## Online Staff

**`GET /api/sales/online`** → `{ count, online: [{ id, name, role, employeeId, loginTime }] }`

Polled every 30 seconds — no dedicated socket event.

## Known Gaps

| Item | Status |
|------|--------|
| Reservation API | Not found — BOOKED = other employee session |
| `orderId` on floor | Not in floor API |
| `PAYMENT_PENDING` UI trigger | API action exists; no web caller found |
| Party name on floor cards | Not on floor API |
| `TableGroup` model | Defined but unused |
