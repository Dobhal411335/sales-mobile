# Phase 6 — Mobile Backend Integration

This document records backend contracts discovered from the Tasty Bites **Web** application and how the **Mobile** client integrates with them. The web/backend is the source of truth.

**Integration status:** Phase 6 completed — mock data removed from Notifications, Print Jobs, EOD, and Day Close. Socket.IO uses a single managed connection per authenticated session.

---

## Global Configuration

| Setting | Mobile path | Notes |
|---------|-------------|-------|
| API base URL | `Mobile/src/constants/apiConfig.ts` | Required for all Phase 6 features |
| Auth | `Mobile/src/store/authStore.ts` | Live-only; cookie session via Axios |
| API client | `Mobile/src/services/api.ts` | Cookie header, 401 refresh |

When `API_BASE_URL` is empty, Phase 6 services return a user-friendly configuration error (no mock fallback).

---

## 1. Notifications

### Web reference
- Page: `Web/src/app/sales/notifications/page.js`
- Bell: `Web/src/components/common/NotificationBell.jsx`
- Service: `Web/src/lib/notifications/notificationService.js`
- Model: `Web/src/models/Notification.js`
- Sound: `Web/src/lib/notifications/notificationSound.js`

### API endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/sales/notifications?filter=&page=&limit=` | Paginated list + `unreadCount` |
| GET | `/api/sales/notifications?unreadOnly=true` | Lightweight unread count |
| PATCH | `/api/sales/notifications/:id` | Mark one read |
| PATCH | `/api/sales/notifications` body `{ action: "read_all" }` | Mark all read |

**Filters (backend):** `ALL`, `UNREAD`, `Orders`, `Payments`, `Tables`, `Employees`, `System`

**Search:** Not supported by backend (web has no search either).

### Client notification shape
```json
{
  "id": "string",
  "_id": "ObjectId",
  "type": "NEW_ORDER | ORDER_UPDATED | ...",
  "title": "string",
  "message": "string",
  "priority": "low | normal | high",
  "orderId": "string|null",
  "tableId": "string|null",
  "tableSessionId": "string|null",
  "employeeId": "string|null",
  "printJobId": "string|null",
  "metadata": {},
  "recipientScope": "RESTAURANT | USER",
  "isRead": false,
  "readAt": "Date|null",
  "createdAt": "ISO date",
  "category": "Orders | Payments | Tables | Employees | System"
}
```

Socket `notification.created` adds `recipientId`, `playSound`.

### Notification types (model)
`NEW_ORDER`, `ORDER_UPDATED`, `ORDER_CANCELLED`, `ORDER_COMPLETED`, `PAYMENT_COMPLETED`, `PAYMENT_FAILED`, `REFUND`, `KOT_CREATED`, `KOT_READY`, `TABLE_ASSIGNED`, `TABLE_RELEASED`, `TABLE_TRANSFERRED`, `TABLE_REASSIGNED`, `EMPLOYEE_LOGIN`, `EMPLOYEE_LOGOUT`, `OVERTIME`, `PRINT_FAILED`, `SYSTEM_ALERT`

**Scope:** Today only (restaurant local day). Audience: `RESTAURANT` or `USER` + `recipientId`.

### Sound (client-only)
- Preference key: `tastybites_notification_sound` (`on` / `off`)
- Mobile: AsyncStorage via `notificationSoundService.ts`
- Sound types (server sets `playSound` on emit): `NEW_ORDER`, `PAYMENT_COMPLETED`, `KOT_READY`, `PRINT_FAILED`, `PAYMENT_FAILED`, `ORDER_CANCELLED`, `EMPLOYEE_LOGIN`
- Also plays when `playSound === true`, `priority === "high"`, or `type === "EMPLOYEE_LOGIN"`

### Mobile architecture
```
GET/PATCH /api/sales/notifications
        ↓
notificationService.ts
        ↓
notificationStore.ts (single source)
        ↓
NotificationBell + NotificationsScreen
```

Navigation: `Mobile/src/utils/notificationNavigation.ts` — structured by `type` + entity IDs.

### Permissions
`withSalesOrDeviceAuth` — roles: ADMIN, MANAGER, SERVER, BARTENDER, EMPLOYEE, STAFF (+ expansions). Device token allowed.

---

## 2. Socket.IO

### Web reference
- Client: `Web/src/components/providers/SocketProvider.js`
- Server auth: `Web/src/lib/socketAuth.js`
- Server: `Web/server.js`

### Connection
| Setting | Value |
|---------|-------|
| URL | Same as `API_BASE_URL` |
| Auth | Cookie header (`employee_access_token`, `device_token`, admin `token`) |
| Transports | `websocket`, `polling` |
| Reconnection | `reconnectionAttempts: 5`, `reconnectionDelay: 1000` |
| Auto room | `restaurant:{restaurantId}` on connect (server-side) |

### Client → server
| Event | Payload |
|-------|---------|
| `join` | `"restaurant:..."` \| `"floor:..."` \| `"employee:..."` |
| `leave` | room string |

### Server → client (Phase 6)
| Event | Mobile handler |
|-------|----------------|
| `notification.created` | `notificationStore.handleIncoming` |
| `notification.read` | `notificationStore.handleReadEvent` |
| `notification.read_all` | `notificationStore.handleReadAllEvent` |
| `NEW_PRINT_JOB` | `printJobStore.handleNewJob` → silent list refresh |
| `PRINT_JOB_UPDATED` | `printJobStore.patchJobFromEvent` |
| `auth:force-logout` | `authStore.logout()` when `reason === "RESTAURANT_CLOSED"` |

**Also used (Floor/Orders — Phase 2/5):** `table:assigned`, `table:updated`, `table:released`, `table:transferred`, `order:created`, `order:updated`, `payment:completed`

### Mobile architecture
```
Login → useSocketLifecycle() → socketClient.connect()
                              → attachCoreSocketListeners()
Logout → socketClient.reset()
Reconnect → silent API refetch (notifications + print jobs)
```

**Implementation:** `Mobile/src/socket/socket.ts` — singleton, no `removeAllListeners` on partial cleanup.

### UNKNOWN — requires verification
- Socket.IO cookie auth on physical devices over LAN (depends on `apiConfig.ts` host)
- Whether missed events are replayed after reconnect (assume no — API refetch used)

---

## 3. Print Jobs

### Web reference
- Pages: `Web/src/app/sales/print-jobs/page.js`, `[id]/page.js`
- Service: `Web/src/lib/printing/printJobService.js`
- Model: `Web/src/models/PrintJob.js`

### API endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/sales/print-jobs?status=&limit=` | List jobs |
| GET | `/api/sales/print-jobs/:id` | Detail + order + KOT |
| PATCH | `/api/sales/print-jobs/:id` | `{ action: "retry" \| "mark_printed" \| "cancel" }` |
| POST | `/api/sales/print-jobs/:id/print-test` | `{ simulateFailure? }` |
| GET | `/api/sales/printers` | Printer configs |

**Note:** `POST /api/sales/print-jobs/:id/complete` is for Electron print agent — **mobile does not call it**.

### Status values
`QUEUED`, `PRINTING`, `PRINTED`, `FAILED`, `CANCELLED`

### Print types
`RECEIPT`, `KOT`, `BAR_RECEIPT`

### Physical printing
**Out of scope for Phase 6.** Mobile uses `printer/printerService.ts` adapter separately. Print Jobs screen shows queue state only.

### Permissions
`withAuth` + role checks. Retry/mark/test require print admin roles per web.

---

## 4. EOD Report

### Web reference
- UI: `Web/src/components/eod/EodReportPage.jsx`
- Builder: `Web/src/lib/eod/buildEodReport.js`

### API endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/eod?date=YYYY-MM-DD&preferSaved=0\|1` | Load report |
| POST | `/api/eod/save` | Save snapshot + `actualDeposit` |
| GET | `/api/eod/history?limit=` | Saved reports |
| GET | `/api/eod/excel?date=&preferSaved=` | Excel blob |
| GET | `/api/eod/pdf?date=&preferSaved=` | PDF blob |
| POST | `/api/eod/email` | `{ date, to, preferSaved }` |

**Calculations:** Server-side only. Mobile displays `report.summary`, sections, `reconciliation`.

**Business date:** Backend restaurant timezone — do not assume device calendar day.

**Export:** Blob download → native share sheet (`eodExport.ts`).

**Email:** Backend sends via Brevo — no SMTP in mobile.

### Permissions
`EOD_ALLOWED_ROLES`: ADMIN, MANAGER, SERVER, BARTENDER, EMPLOYEE, STAFF (+ expansions).

---

## 5. Day Close

### Web reference
- API: `Web/src/app/api/employees/close-restaurant/route.js`
- UI: `Web/src/components/employee/EmployeeTopNav.jsx`

### API endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/employees/close-restaurant` | Validation / blockers |
| POST | `/api/employees/close-restaurant` | Execute close |

### Validation response
```json
{
  "pendingOrders": [{ "id", "orderNumber", "status", "tableNo", "source", "partyName" }],
  "bookedTables": [{ "sessionId", "tableNumber", "employeeName", "status", "guestCount" }],
  "pendingOrderCount": 0,
  "bookedTableCount": 0,
  "canClose": true
}
```

**Blockers:** Unsettled orders (not PAID/CANCELLED/WAIVED) OR open table sessions.

**POST success:** Clears sessions, emits `auth:force-logout`, mobile logs out.

**409 CLOSE_BLOCKED:** Same blocker shape — show updated state (multi-tablet safety).

### Permissions
Any authenticated employee with valid session + device binding (`withAuth`, no extra role filter in API).

---

## Phase 6 Step Completion Log

| Step | Status | Notes |
|------|--------|-------|
| 1 Notifications | Complete | Mock removed; live API only |
| 2 Socket.IO | Complete | Centralized lifecycle; reconnect refetch |
| 3 Print Jobs | Complete | Mock removed |
| 4 EOD | Complete | Mock removed |
| 5 Day Close | Complete | Validate mock removed |

---

## Known Gaps / Live Testing

| Item | Status |
|------|--------|
| Live notification API on emulator | UNKNOWN — requires verification with running backend |
| Socket cookie auth on physical device | UNKNOWN — requires LAN IP in apiConfig |
| Notification sound (react-native-sound) | Requires native rebuild if module not linked; falls back to vibration |
| EOD export share on Android | UNKNOWN — requires device test |
| Day Close multi-tablet race | Handled via 409 + re-validation on focus |

---

## Mock Data Removed (Phase 6)

- `src/mocks/notificationMockData.ts` — deleted
- `src/mocks/printJobMockData.ts` — deleted
- `src/mocks/dayCloseMockData.ts` — deleted
- `src/services/eodMockData.ts` — deleted

Other mocks (floor, menu, payment, orders) remain for unrelated phases.

---

## Phase 6 Final Integration Report

### 1. Notifications API discovered
- `GET/PATCH /api/sales/notifications` (list, unread count, mark read, mark all read)

### 2. Notifications API connected
- `notificationService.ts` — live only via shared Axios client + cookies

### 3. Notification data model
- Matches web `NotificationClient` shape in `types/notification.ts`

### 4. Notification Socket.IO events
- `notification.created`, `notification.read`, `notification.read_all`

### 5. Socket.IO connection architecture
- Singleton `socketClient` in `socket/socket.ts`
- `useSocketLifecycle()` in `AppNavigator` (connect on auth, reset on logout)
- Floor/order hooks reuse same instance for room joins

### 6. Socket authentication method
- Cookie header on handshake (`employee_access_token`, `device_token`)

### 7. Socket rooms
- Auto: `restaurant:{restaurantId}` (server)
- Client join: `floor:{floorId}` via `useFloorRealtime`

### 8. Socket events implemented
- Notifications, print jobs, `auth:force-logout`, plus existing floor/order events

### 9. Reconnection behavior
- `reconnectionAttempts: 5`, `reconnectionDelay: 1000`
- Silent API refetch of notifications + print jobs on reconnect and app foreground

### 10. Print Jobs APIs
- `GET/PATCH/POST /api/sales/print-jobs/*`, `GET /api/sales/printers`

### 11. Print Job Socket.IO events
- `NEW_PRINT_JOB`, `PRINT_JOB_UPDATED`

### 12. Printer integration status
- Queue API connected; physical printer adapter unchanged (`printer/printerService.ts`)

### 13. EOD APIs
- Full `/api/eod/*` suite (report, save, history, excel, pdf, email)

### 14. EOD export implementation
- Blob download → `react-native-blob-util` + `react-native-share`

### 15. EOD email implementation
- `POST /api/eod/email` via backend (Brevo)

### 16. Day Close validation API
- `GET /api/employees/close-restaurant`

### 17. Day Close operation API
- `POST /api/employees/close-restaurant`

### 18. Day Close business rules
- Backend blockers: unsettled orders + open table sessions; 409 on stale close

### 19. Permissions implemented
- Mapped via API 401/403 responses; no duplicate mobile permission system

### 20. Mock data removed
- Notifications, print jobs, EOD, day close validate mocks deleted

### 21. Files created
- `docs/phase-6-integration.md`
- `src/utils/apiGuard.ts`

### 22. Files modified
- `src/services/notificationService.ts`
- `src/services/notificationSoundService.ts`
- `src/services/printJobService.ts`
- `src/services/eodService.ts`
- `src/services/dayCloseService.ts`
- `src/socket/socket.ts`
- `src/navigation/AppNavigator.tsx`
- `src/navigation/SalesNavigator.tsx`

### 23. Files deleted
- `src/mocks/notificationMockData.ts`
- `src/mocks/printJobMockData.ts`
- `src/mocks/dayCloseMockData.ts`
- `src/services/eodMockData.ts`

### 24. Backend gaps
- None identified in contracts; live behavior UNKNOWN until tested against running backend

### 25. Mobile-specific gaps
- Notification sound requires `react-native-sound` native module + rebuild (vibration fallback)
- EOD blob export uses FileReader (verify on device)
- Socket cookie auth on physical devices requires correct LAN IP in `apiConfig.ts`

### 26. Tests completed
- TypeScript: `npm run typecheck` — pass
- Live API/socket/device tests: UNKNOWN — requires running backend + emulator/device

### 27. Known issues
- `POST /api/sales/print-jobs/:id/complete` intentionally not called (Electron agent only)
- Search on notifications: not supported by backend (N/A)
